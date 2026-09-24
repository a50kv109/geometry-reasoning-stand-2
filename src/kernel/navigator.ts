// src/kernel/navigator.ts
// Deterministic Navigator implementing DISCOVER, CHECK, SELECT, EXECUTE, TRACE

import { DerivationPath, FactMap, CheckResult, ExecutionTrace, TraceStep, FactValue } from './types';

// Helper: Deterministically sort steps into topological order
// If step B depends on step A (requires step A's provides), step A precedes step B.
// If two steps are mutually independent, tie-break deterministically by edge ID.
function canonicalizePath(steps: DerivationPath[]): DerivationPath[] {
  const n = steps.length;
  if (n <= 1) return steps;

  const adj: number[][] = Array.from({ length: n }, () => []);
  const inDegree: number[] = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && steps[j].requires.includes(steps[i].provides)) {
        adj[i].push(j);
        inDegree[j]++;
      }
    }
  }

  const available: number[] = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) available.push(i);
  }
  available.sort((a, b) => steps[a].id.localeCompare(steps[b].id));

  const result: DerivationPath[] = [];
  while (available.length > 0) {
    const u = available.shift()!;
    result.push(steps[u]);
    for (const v of adj[u]) {
      inDegree[v]--;
      if (inDegree[v] === 0) {
        available.push(v);
        available.sort((a, b) => steps[a].id.localeCompare(steps[b].id));
      }
    }
  }

  return result.length === n ? result : steps;
}

export class DeterministicNavigator {
  private graph: readonly DerivationPath[];

  constructor(graph: readonly DerivationPath[]) {
    this.graph = graph;
  }

  /**
   * DISCOVER: Recursively searches for structural derivation paths leading to target.
   * Returns an array of candidate paths (each path is an ordered list of DerivationPath steps).
   *
   * Enforces structural search discipline:
   * 1. Ancestor Cycle Prevention (no backward loops to ancestor targets in stack)
   * 2. Inverse Edge Exclusion (no ping-pong between dual representations e.g. A->B->A)
   * 3. Trans-Cluster Directionality (no sides -> radial -> triplet -> sides cluster cycles)
   * 4. Single Producer Rule (a candidate path may derive any fact at most once)
   * 5. Canonical Topological Step Ordering (independent prerequisites do not multiply permutations)
   */
  public discover(
    target: string,
    visited: Set<string> = new Set(),
    visitedEdges: Set<string> = new Set(),
    depth: number = 0
  ): DerivationPath[][] {
    if (visited.has(target) || depth > 8) {
      return [];
    }
    const newVisited = new Set(visited).add(target);

    const candidates: DerivationPath[][] = [];

    for (const edge of this.graph) {
      if (edge.provides === target) {
        if (visitedEdges.has(edge.id)) {
          continue;
        }

        // 1. Ancestor Cycle Check: If any requirement is already an ancestor target in the backward search stack,
        // using this edge would form a cyclic dependency loop.
        if (edge.requires.some(req => visited.has(req))) {
          continue;
        }

        // 2. Inverse Edge Exclusion: If an edge in visitedEdges converted target -> req,
        // then this edge converting req -> target is an inverse no-op loop (e.g. chord_BC <-> side_a).
        let hasInverseInHistory = false;
        for (const visitedEdgeId of visitedEdges) {
          const visitedEdge = this.graph.find(e => e.id === visitedEdgeId);
          if (visitedEdge && visitedEdge.requires.includes(edge.provides) && edge.requires.includes(visitedEdge.provides)) {
            hasInverseInHistory = true;
            break;
          }
        }
        if (hasInverseInHistory) {
          continue;
        }

        // 3. Cluster Flow Protection:
        // Reconstruction (Radial -> Triplet -> Sides) must not be reversed into Projection (Sides -> Radial)
        if (
          edge.id === 'DP-RADIAL-TRIPLET-TO-SIDES' &&
          (visitedEdges.has('DP-SIDE-A-TO-RADIAL-DIST') ||
            visitedEdges.has('DP-SIDE-B-TO-RADIAL-DIST') ||
            visitedEdges.has('DP-SIDE-C-TO-RADIAL-DIST'))
        ) {
          continue;
        }
        if (edge.id.endsWith('-TO-RADIAL-DIST') && visitedEdges.has('DP-RADIAL-TRIPLET-TO-SIDES')) {
          continue;
        }

        const newVisitedEdges = new Set(visitedEdges).add(edge.id);

        // Find paths for all requirements
        const reqPathsList: DerivationPath[][][] = edge.requires.map(req => {
          const subPaths = this.discover(req, newVisited, newVisitedEdges, depth + 1);
          // An empty sub-path [[]] represents that 'req' might already be present in knowns
          return [[] as DerivationPath[], ...subPaths];
        });

        // Cartesian product of requirement paths with compatibility filtering
        let combinations: DerivationPath[][] = [[]];
        for (const list of reqPathsList) {
          const nextCombos: DerivationPath[][] = [];
          for (const a of combinations) {
            for (const b of list) {
              // Compatibility: Single Producer Rule (steps in a and b must not derive the same fact via different edges)
              let compatible = true;
              const providedInA = new Set<string>();
              for (const step of a) providedInA.add(step.provides);
              for (const step of b) {
                if (providedInA.has(step.provides) && !a.some(e => e.id === step.id)) {
                  compatible = false;
                  break;
                }
              }
              if (compatible) {
                nextCombos.push([...a, ...b]);
              }
            }
          }
          combinations = nextCombos;
        }

        for (const combo of combinations) {
          // Deduplicate edges and enforce single producer rule
          const flat: DerivationPath[] = [];
          const seenIds = new Set<string>();
          const seenProvides = new Set<string>();
          let valid = true;

          for (const e of combo) {
            if (!seenIds.has(e.id)) {
              if (seenProvides.has(e.provides)) {
                valid = false;
                break;
              }
              seenIds.add(e.id);
              seenProvides.add(e.provides);
              flat.push(e);
            }
          }

          if (valid && !seenIds.has(edge.id) && !seenProvides.has(edge.provides)) {
            const rawPath = [...flat, edge];
            candidates.push(canonicalizePath(rawPath));
          }
        }
      }
    }

    // Deterministic deduplication and sorting by path length (shortest first), then by lexicographical path IDs
    const seen = new Set<string>();
    const uniqueCandidates: DerivationPath[][] = [];
    for (const c of candidates) {
      const key = c.map(e => e.id).join('->');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCandidates.push(c);
      }
    }

    return uniqueCandidates.sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      const aIds = a.map(e => e.id).join('->');
      const bIds = b.map(e => e.id).join('->');
      return aIds.localeCompare(bIds);
    });
  }

  /**
   * CHECK: Evaluates a candidate path against known facts using dynamic sandbox state.
   * Intermediate results produced by prior steps are added to the sandbox and available for subsequent preconditions/inputs.
   */
  public check(candidatePath: DerivationPath[], knowns: FactMap): CheckResult {
    const sandbox: FactMap = { ...knowns };

    for (const edge of candidatePath) {
      // 1. Check missing inputs in current sandbox
      for (const req of edge.requires) {
        if (!(req in sandbox) || sandbox[req] === undefined || sandbox[req] === null) {
          return {
            status: 'MISSING_INPUT',
            reason: `Missing required input '${req}' for step ${edge.id}`,
            sandbox,
          };
        }
      }

      // 2. Check precondition on sandbox state
      if (edge.precondition) {
        const passed = edge.precondition(sandbox);
        if (!passed) {
          return {
            status: 'PRECONDITION_FAILED',
            reason: `Precondition failed for step ${edge.id}`,
            sandbox,
          };
        }
      }

      // 3. Dynamic propagation: execute step in sandbox
      try {
        const result = edge.operation(sandbox);
        sandbox[edge.provides] = result;
      } catch (err: any) {
        return {
          status: 'PRECONDITION_FAILED',
          reason: `Operation execution error at ${edge.id}: ${err?.message || String(err)}`,
          sandbox,
        };
      }
    }

    return {
      status: 'VALID',
      sandbox,
    };
  }

  /**
   * SELECT: Deterministically chooses a single path from valid candidates.
   * Policy: shortest path (min length), then stable deterministic tie-breaker.
   */
  public select(validPaths: DerivationPath[][]): DerivationPath[] | null {
    if (validPaths.length === 0) return null;
    return validPaths[0]; // Candidates are already sorted by length and ID order
  }

  /**
   * SOLVE: Complete pipeline:
   * DISCOVER -> CHECK -> SELECT -> EXECUTE -> TRACE
   */
  public solve(knowns: FactMap, target: string): ExecutionTrace {
    // 1. DISCOVER
    const candidates = this.discover(target);

    // 2. CHECK each candidate
    const evaluatedCandidates = candidates.map(path => {
      const checkResult = this.check(path, knowns);
      return { path, checkResult };
    });

    const validCandidates = evaluatedCandidates
      .filter(item => item.checkResult.status === 'VALID')
      .map(item => item.path);

    // If no valid candidates
    if (validCandidates.length === 0) {
      // Find representative failure reason: prioritize PRECONDITION_FAILED over MISSING_INPUT
      const precondFailure = evaluatedCandidates.find(item => item.checkResult.status === 'PRECONDITION_FAILED')?.checkResult;
      const firstFailure = precondFailure || evaluatedCandidates[0]?.checkResult;
      return {
        target,
        initialFacts: { ...knowns },
        candidatePathsFound: candidates.length,
        selectedPathIds: [],
        steps: [],
        finalValue: null,
        status: firstFailure ? (firstFailure.status as any) : 'NO_VALID_PATH',
        message: firstFailure?.reason || `No valid derivation path found for target '${target}'`,
      };
    }

    // 3. SELECT
    const selected = this.select(validCandidates)!;

    // 4. EXECUTE with step-by-step TRACE capture
    const state: FactMap = { ...knowns };
    const traceSteps: TraceStep[] = [];

    for (let i = 0; i < selected.length; i++) {
      const edge = selected[i];
      const inputsUsed: Record<string, FactValue> = {};
      for (const req of edge.requires) {
        inputsUsed[req] = state[req];
      }

      const preconditionPassed = edge.precondition ? edge.precondition(state) : true;
      const outputProduced = edge.operation(state);
      state[edge.provides] = outputProduced;

      traceSteps.push({
        stepIndex: i + 1,
        pathId: edge.id,
        description: edge.description,
        requires: edge.requires,
        inputsUsed,
        provides: edge.provides,
        outputProduced,
        preconditionChecked: !!edge.precondition,
        preconditionPassed,
      });
    }

    return {
      target,
      initialFacts: { ...knowns },
      candidatePathsFound: candidates.length,
      selectedPathIds: selected.map(e => e.id),
      steps: traceSteps,
      finalValue: state[target] ?? null,
      status: 'SUCCESS',
    };
  }
}
