// src/kernel/geometryGraph/geometryGraphCore.ts
// Phase 1 — Canonical Three-Graph Geometry Graph Core
// Strictly implementing the AAM-V1 Design-from-Knowledge specifications.

export type NodeType = 'POINT' | 'SEGMENT' | 'LINE' | 'CIRCLE' | 'POLYGON';
export type ConstraintState = 'SATISFIED' | 'VIOLATED';
export type EpistemicState = 'VERIFIED' | 'REFUTED' | 'VANISHED';
export type BlastRadiusClass = 'LOCAL' | 'PATH' | 'GLOBAL';

export interface ConstructionNode {
  id: string; // stable portableId (e.g., "pt_A", "seg_AB")
  type: NodeType;
  parentIds: string[];
  childrenIds: string[];
  properties: Record<string, any>; // e.g., coordinates { x, y }, radius, etc.
}

export interface ConstraintNode {
  id: string; // stable constraint portableId (e.g., "const_collinear_ABC")
  type: string; // "DISTANCE" | "COLLINEARITY" | "ORTHOGONALITY" | "INCIDENCE"
  targetIds: string[]; // references construction portableIds
  state: ConstraintState;
  residual: number;
}

export interface KnowledgeNode {
  id: string; // stable claim identity (e.g., "claim_sum_angles_180")
  type: string; // "TRIANGLE_ANGLE_SUM" | "THALES_DIAMETER" | "CYCLIC_CHORD_LAW"
  description: string;
  state: EpistemicState;
  dependentConstraintIds: string[]; // references constraint IDs
}

export interface StateTransition {
  nodeId: string;
  from: string;
  to: string;
}

export interface GraphDelta {
  triggerEvent: string;
  affectedConstructionEntities: string[];
  affectedConstraints: string[];
  affectedKnowledgeClaims: string[];
  stateTransitions: StateTransition[];
  blastClassification: BlastRadiusClass;
}

export class ConstructionGraph {
  public nodes: Map<string, ConstructionNode> = new Map();

  public addNode(id: string, type: NodeType, parentIds: string[] = [], properties: Record<string, any> = {}): void {
    const node: ConstructionNode = {
      id,
      type,
      parentIds,
      childrenIds: [],
      properties,
    };
    this.nodes.set(id, node);

    // Wire up DAG children relationships
    for (const parentId of parentIds) {
      const parent = this.nodes.get(parentId);
      if (parent) {
        if (!parent.childrenIds.includes(id)) {
          parent.childrenIds.push(id);
        }
      }
    }
  }

  public getNode(id: string): ConstructionNode | undefined {
    return this.nodes.get(id);
  }

  public updateNodeProperties(id: string, properties: Record<string, any>): void {
    const node = this.nodes.get(id);
    if (node) {
      node.properties = { ...node.properties, ...properties };
    }
  }

  /**
   * Returns a list of transitively affected nodes in topological order using BFS/DFS.
   */
  public getAffectedSubtree(startId: string): string[] {
    const visited = new Set<string>();
    const queue: string[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = this.nodes.get(currentId);
      if (node) {
        for (const childId of node.childrenIds) {
          if (!visited.has(childId)) {
            visited.add(childId);
            queue.push(childId);
          }
        }
      }
    }

    return Array.from(visited);
  }
}

export class ConstraintGraph {
  public constraints: Map<string, ConstraintNode> = new Map();

  public addConstraint(id: string, type: string, targetIds: string[], evaluator: (nodes: Map<string, ConstructionNode>) => { state: ConstraintState; residual: number }): void {
    const evaluated = evaluator(new Map());
    this.constraints.set(id, {
      id,
      type,
      targetIds,
      state: 'SATISFIED',
      residual: 0,
    });
  }

  public getConstraintsForTargets(targetIds: string[]): string[] {
    const matched: string[] = [];
    for (const [id, constraint] of this.constraints.entries()) {
      if (constraint.targetIds.some((tId) => targetIds.includes(tId))) {
        matched.push(id);
      }
    }
    return matched;
  }
}

export class KnowledgeGraph {
  public claims: Map<string, KnowledgeNode> = new Map();

  public addClaim(id: string, type: string, description: string, dependentConstraintIds: string[]): void {
    this.claims.set(id, {
      id,
      type,
      description,
      state: 'VERIFIED',
      dependentConstraintIds,
    });
  }
}

export class GeometryGraphManager {
  public construction: ConstructionGraph = new ConstructionGraph();
  public constraint: ConstraintGraph = new ConstraintGraph();
  public knowledge: KnowledgeGraph = new KnowledgeGraph();

  // Internal constraint evaluator storage to simulate geometry core evaluations
  private constraintEvaluators: Map<string, (nodes: Map<string, ConstructionNode>) => { state: ConstraintState; residual: number }> = new Map();

  public registerConstraint(
    id: string,
    type: string,
    targetIds: string[],
    evaluator: (nodes: Map<string, ConstructionNode>) => { state: ConstraintState; residual: number }
  ): void {
    this.constraint.constraints.set(id, {
      id,
      type,
      targetIds,
      state: 'SATISFIED',
      residual: 0,
    });
    this.constraintEvaluators.set(id, evaluator);
  }

  public registerClaim(id: string, type: string, description: string, dependentConstraintIds: string[]): void {
    this.knowledge.addClaim(id, type, description, dependentConstraintIds);
  }

  /**
   * Primary entry point for geometry mutations (e.g. MOVE_VERTEX).
   * Runs the full unidirectional pipeline:
   * Mutation -> Construction updated -> Constraint evaluation -> Knowledge transition -> Observation.
   */
  public mutateCoordinates(nodeId: string, x: number, y: number): GraphDelta {
    const triggerEvent = `MOVE_VERTEX(${nodeId})`;
    const affectedConstruction = this.construction.getAffectedSubtree(nodeId);

    // Update the mutated node properties
    this.construction.updateNodeProperties(nodeId, { x, y });

    // Propagate updates dynamically to child geometries (e.g. lengths of segments, midpoints etc)
    this.recomputeTopologyCascade(affectedConstruction);

    const affectedConstraints = this.constraint.getConstraintsForTargets(affectedConstruction);
    const affectedKnowledge: string[] = [];

    const stateTransitions: StateTransition[] = [];

    // Evaluate constraints
    for (const constId of affectedConstraints) {
      const constraint = this.constraint.constraints.get(constId);
      const evaluator = this.constraintEvaluators.get(constId);
      if (constraint && evaluator) {
        const previousState = constraint.state;
        const result = evaluator(this.construction.nodes);
        constraint.state = result.state;
        constraint.residual = result.residual;

        if (previousState !== constraint.state) {
          stateTransitions.push({
            nodeId: constId,
            from: previousState,
            to: constraint.state,
          });
        }
      }
    }

    // Evaluate knowledge claims based on constraints
    for (const [claimId, claim] of this.knowledge.claims.entries()) {
      let isAffected = false;
      for (const dcId of claim.dependentConstraintIds) {
        if (affectedConstraints.includes(dcId)) {
          isAffected = true;
          break;
        }
      }

      if (isAffected) {
        affectedKnowledge.push(claimId);
        const previousState = claim.state;

        // Check the states of all dependent constraints
        let allSatisfied = true;
        for (const dcId of claim.dependentConstraintIds) {
          const cNode = this.constraint.constraints.get(dcId);
          if (cNode && cNode.state === 'VIOLATED') {
            allSatisfied = false;
          }
        }

        const nextState: EpistemicState = allSatisfied ? 'VERIFIED' : 'VANISHED';
        if (previousState !== nextState) {
          claim.state = nextState;
          stateTransitions.push({
            nodeId: claimId,
            from: previousState,
            to: nextState,
          });
        }
      }
    }

    // Enforce Epistemic Invariant Guard: Constraint = VIOLATED + Knowledge = VERIFIED => Exception
    this.enforceEpistemicGuard();

    // Determine semantic blast radius classification
    const blastClassification = this.determineSemanticBlastRadius(nodeId, affectedConstruction);

    return {
      triggerEvent,
      affectedConstructionEntities: affectedConstruction,
      affectedConstraints,
      affectedKnowledgeClaims: affectedKnowledge,
      stateTransitions,
      blastClassification,
    };
  }

  private recomputeTopologyCascade(affectedNodeIds: string[]): void {
    // Simulated geometric topology cascade logic (AAM-V1 constraint propagation)
    for (const id of affectedNodeIds) {
      const node = this.construction.getNode(id);
      if (node && node.type === 'SEGMENT') {
        const [p1Id, p2Id] = node.parentIds;
        const p1 = this.construction.getNode(p1Id);
        const p2 = this.construction.getNode(p2Id);
        if (p1 && p2) {
          const dx = p2.properties.x - p1.properties.x;
          const dy = p2.properties.y - p1.properties.y;
          node.properties.length = Math.sqrt(dx * dx + dy * dy);
        }
      }
    }
  }

  private enforceEpistemicGuard(): void {
    for (const [claimId, claim] of this.knowledge.claims.entries()) {
      if (claim.state === 'VERIFIED') {
        for (const dcId of claim.dependentConstraintIds) {
          const constraint = this.constraint.constraints.get(dcId);
          if (constraint && constraint.state === 'VIOLATED') {
            throw new Error(
              `ARCHITECTURAL_INVARIANT_VIOLATED: Inconsistent state detected. Knowledge Claim '${claimId}' is VERIFIED while dependent Constraint '${dcId}' is VIOLATED.`
            );
          }
        }
      }
    }
  }

  private determineSemanticBlastRadius(startId: string, affectedIds: string[]): BlastRadiusClass {
    const node = this.construction.getNode(startId);
    if (!node) return 'LOCAL';

    // 1. LOCAL: Cascade is isolated strictly to immediate children (depth <= 1)
    let maxDepth = 0;
    const depths = new Map<string, number>();
    depths.set(startId, 0);

    const queue: string[] = [startId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const curDepth = depths.get(current) || 0;
      const curNode = this.construction.getNode(current);
      if (curNode) {
        for (const childId of curNode.childrenIds) {
          if (!depths.has(childId)) {
            const nextDepth = curDepth + 1;
            depths.set(childId, nextDepth);
            if (nextDepth > maxDepth) {
              maxDepth = nextDepth;
            }
            queue.push(childId);
          }
        }
      }
    }

    if (maxDepth <= 1) {
      return 'LOCAL';
    }

    // 2. GLOBAL: Mutated node itself is a root node (no parent dependencies)
    if (node.parentIds.length === 0) {
      return 'GLOBAL';
    }

    // 3. PATH: Transitive propagation deeper than 1 level, but originating from a non-root dependent node (single branch/sub-tree)
    return 'PATH';
  }
}
