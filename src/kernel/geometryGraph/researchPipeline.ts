// src/kernel/geometryGraph/researchPipeline.ts
// Phase 2 — Research Pipeline and ACP Adapter
// Detached, pure observational pipeline implementing the PoC Policy rules.

import { GraphDelta, EpistemicState, ConstraintState } from './geometryGraphCore';

export type PatternMatchResult = 'EXACT_MATCH' | 'STRUCTURAL_MATCH' | 'STRUCTURAL_VARIANT' | 'NEW_PATTERN';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ResearchSignal = 'MAINTAIN' | 'THROTTLE' | 'DEGRADE_TRUST' | 'EMERGENCY_STOP';

export interface StructuralFingerprint {
  triggerEventClass: string; // e.g., "MOVE_VERTEX", "CONSTRUCT"
  blastRadiusClass: string;  // "LOCAL" | "PATH" | "GLOBAL"
  constraintTransitions: string[]; // sorted list of transitions, e.g., ["SATISFIED -> VIOLATED"]
  knowledgeTransitions: string[];  // sorted list of transitions, e.g., ["VERIFIED -> VANISHED"]
}

export class PatternComparator {
  // Database of known, registered structural fingerprints
  private patternBase: Map<string, StructuralFingerprint> = new Map();

  public registerPattern(id: string, fingerprint: StructuralFingerprint): void {
    this.patternBase.set(id, fingerprint);
  }

  public compare(target: StructuralFingerprint): PatternMatchResult {
    let bestMatch: PatternMatchResult = 'NEW_PATTERN';

    for (const [id, pattern] of this.patternBase.entries()) {
      const triggerMatches = pattern.triggerEventClass === target.triggerEventClass;
      const blastMatches = pattern.blastRadiusClass === target.blastRadiusClass;
      const constsMatch = this.arraysEqual(pattern.constraintTransitions, target.constraintTransitions);
      const knowledgesMatch = this.arraysEqual(pattern.knowledgeTransitions, target.knowledgeTransitions);

      if (triggerMatches && blastMatches && constsMatch && knowledgesMatch) {
        return 'EXACT_MATCH';
      }

      if (constsMatch && knowledgesMatch) {
        // Same transitions, but different trigger or blast details
        bestMatch = 'STRUCTURAL_MATCH';
      } else if (this.hasOverlap(pattern.constraintTransitions, target.constraintTransitions) ||
                 this.hasOverlap(pattern.knowledgeTransitions, target.knowledgeTransitions)) {
        if (bestMatch !== 'STRUCTURAL_MATCH') {
          bestMatch = 'STRUCTURAL_VARIANT';
        }
      }
    }

    return bestMatch;
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private hasOverlap(a: string[], b: string[]): boolean {
    return a.some((val) => b.includes(val));
  }
}

export interface PolicyState {
  novelty: number; // [0, 1]
  impact: ImpactLevel;
  researchWear: number; // accumulated research-level wear [0, 1]
  stability: number; // [0, 1] ratio
}

export class PolicyLayer {
  private wearAccumulator: number = 0.0; // Persistent Research Wear Accumulator (PROPOSED)

  public resetWear(): void {
    this.wearAccumulator = 0.0;
  }

  public evaluate(
    matchResult: PatternMatchResult,
    delta: GraphDelta,
    verifiedClaimsCount: number,
    totalClaimsCount: number
  ): PolicyState {
    // 1. Compute Novelty (PoC POLICY)
    let novelty = 1.0;
    if (matchResult === 'EXACT_MATCH' || matchResult === 'STRUCTURAL_MATCH') {
      novelty = 0.0;
    } else if (matchResult === 'STRUCTURAL_VARIANT') {
      novelty = 0.5;
    }

    // 2. Compute Impact
    let impact: ImpactLevel = 'LOW';
    const hasViolations = delta.stateTransitions.some((t) => t.to === 'VIOLATED' || t.to === 'VANISHED');
    const isRecovery = delta.stateTransitions.some((t) => t.from === 'VANISHED' && t.to === 'VERIFIED');

    if (delta.blastClassification === 'GLOBAL' || hasViolations) {
      impact = 'HIGH';
    } else if (delta.blastClassification === 'PATH' || isRecovery) {
      impact = 'MEDIUM';
    }

    // 3. Compute Research Wear (PROPOSED Wear Accumulator)
    if (isRecovery) {
      this.wearAccumulator = Math.max(0.0, this.wearAccumulator - 0.5);
    } else if (hasViolations) {
      this.wearAccumulator = Math.min(1.0, this.wearAccumulator + 0.9);
    }

    // 4. Compute Stability
    const stability = totalClaimsCount > 0 ? verifiedClaimsCount / totalClaimsCount : 1.0;

    return {
      novelty,
      impact,
      researchWear: this.wearAccumulator,
      stability,
    };
  }
}

export interface ACPInterface {
  process(effort: number, velocity: number, wear: number, stability: number): ResearchSignal;
}

// Global connectivity constant to explicitly document that real ACP-Core is NOT CONNECTED
export const ACP_CORE_STATUS = 'NOT_CONNECTED';

export class ACPMock implements ACPInterface {
  public process(effort: number, velocity: number, wear: number, stability: number): ResearchSignal {
    // Frozen reflexive decision rules
    if (wear >= 0.8 || stability <= 0.3) {
      return 'DEGRADE_TRUST';
    }
    if (effort >= 0.9 || velocity >= 0.9) {
      return 'THROTTLE';
    }
    if (wear >= 1.0 || stability === 0.0) {
      return 'EMERGENCY_STOP';
    }
    return 'MAINTAIN';
  }
}

export class ACPAdapter {
  private acpCore: ACPInterface;

  constructor(acpCore: ACPInterface) {
    this.acpCore = acpCore;
  }

  public adaptAndProcess(policy: PolicyState, effort: number = 0.5, velocity: number = 0.5): ResearchSignal {
    // Map internal policy states into normalized ACP inputs
    const normalizedWear = Math.min(1.0, Math.max(0.0, policy.researchWear));
    return this.acpCore.process(effort, velocity, normalizedWear, policy.stability);
  }
}

export class ResearchDispatcher {
  public comparator: PatternComparator = new PatternComparator();
  public policy: PolicyLayer = new PolicyLayer();
  public adapter: ACPAdapter;
  public acpCore: ACPInterface;

  // A simple bypass flag to simulate "Research OFF vs Research ON" behavior
  public isResearchEnabled: boolean = true;

  constructor(acpCore: ACPInterface = new ACPMock()) {
    this.acpCore = acpCore;
    this.adapter = new ACPAdapter(acpCore);
  }

  public createFingerprint(delta: GraphDelta): StructuralFingerprint {
    // 1. Extract trigger event class (exclude specific node IDs)
    let triggerEventClass = 'MUTATION';
    if (delta.triggerEvent.startsWith('MOVE_VERTEX')) {
      triggerEventClass = 'MOVE_VERTEX';
    }

    // 2. Extract transitions, sorting them to maintain deterministic coordinate-invariance
    const constraintTransitions = delta.stateTransitions
      .filter((t) => t.from === 'SATISFIED' || t.from === 'VIOLATED')
      .map((t) => `${t.from} -> ${t.to}`)
      .sort();

    const knowledgeTransitions = delta.stateTransitions
      .filter((t) => t.from === 'VERIFIED' || t.from === 'VANISHED')
      .map((t) => `${t.from} -> ${t.to}`)
      .sort();

    return {
      triggerEventClass,
      blastRadiusClass: delta.blastClassification,
      constraintTransitions,
      knowledgeTransitions,
    };
  }

  public dispatch(
    delta: GraphDelta,
    verifiedClaimsCount: number,
    totalClaimsCount: number,
    effort: number = 0.5,
    velocity: number = 0.5
  ): { signal: ResearchSignal | 'ACP_UNAVAILABLE_FALLBACK'; policy: PolicyState | null } {
    if (!this.isResearchEnabled) {
      return { signal: 'MAINTAIN', policy: null };
    }

    try {
      const fingerprint = this.createFingerprint(delta);
      const matchResult = this.comparator.compare(fingerprint);
      const policyState = this.policy.evaluate(matchResult, delta, verifiedClaimsCount, totalClaimsCount);
      const signal = this.adapter.adaptAndProcess(policyState, effort, velocity);

      return {
        signal,
        policy: policyState,
      };
    } catch (err) {
      // Graceful degradation when ACP or the pipeline experiences an unhandled failure
      return {
        signal: 'ACP_UNAVAILABLE_FALLBACK',
        policy: null,
      };
    }
  }
}
