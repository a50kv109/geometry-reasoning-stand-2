// src/environment/GeometryEnvironment.ts
// Implementation of the Deterministic Geometry Reasoning Stand

import { FactMap, ExecutionTrace, DerivationPath, FactValue } from '../kernel/types';
import { DeterministicNavigator } from '../kernel/navigator';
import { CANONICAL_GRAPH } from '../kernel/canonicalPaths';
import {
  IGeometryEnvironment,
  EnvironmentMode,
  StateObservation,
  StepActionResult,
  ResultVerificationReport,
  ClaimVerificationReport,
} from './types';

export class GeometryEnvironment implements IGeometryEnvironment {
  private initialFacts: FactMap;
  private currentFacts: FactMap;
  private navigator: DeterministicNavigator;
  private mode: EnvironmentMode;
  private stepCount: number;
  private appliedRulesHistory: string[];

  constructor(initialState?: FactMap, mode: EnvironmentMode = 'AGENT') {
    this.initialFacts = initialState ? { ...initialState } : this.getDefaultInitialFacts();
    this.currentFacts = { ...this.initialFacts };
    this.navigator = new DeterministicNavigator(CANONICAL_GRAPH);
    this.mode = mode;
    this.stepCount = 0;
    this.appliedRulesHistory = [];
  }

  private getDefaultInitialFacts(): FactMap {
    return {
      R: 5,
      angle_A: 30,
      angle_B: 60,
      coord_A: { x: 0, y: -5 },
      coord_B: { x: 4.330127, y: 2.5 },
      coord_C: { x: 0, y: 5 },
    };
  }

  public reset(initialState?: FactMap): StateObservation {
    if (initialState) {
      this.initialFacts = { ...initialState };
    }
    this.currentFacts = { ...this.initialFacts };
    this.stepCount = 0;
    this.appliedRulesHistory = [];
    return this.observe();
  }

  public setMode(mode: EnvironmentMode): void {
    this.mode = mode;
  }

  public getMode(): EnvironmentMode {
    return this.mode;
  }

  public observe(): StateObservation {
    const availableTargets = Array.from(
      new Set(CANONICAL_GRAPH.map((edge: DerivationPath) => edge.provides))
    );

    let filteredFacts: FactMap;
    if (this.mode === 'AGENT') {
      filteredFacts = {};
      for (const [k, v] of Object.entries(this.currentFacts)) {
        if (
          k === 'R' ||
          k === 'angle_A' ||
          k === 'angle_B' ||
          k.startsWith('coord_') ||
          k.startsWith('leg_')
        ) {
          filteredFacts[k] = v;
        }
      }
    } else {
      filteredFacts = { ...this.currentFacts };
    }

    return {
      stepCount: this.stepCount,
      mode: this.mode,
      knownFacts: filteredFacts,
      availableTargets,
      appliedRulesHistory: [...this.appliedRulesHistory],
    };
  }

  public solve(target: string): ExecutionTrace {
    return this.navigator.solve(this.currentFacts, target);
  }

  public step(ruleId: string): StepActionResult {
    const rule = CANONICAL_GRAPH.find((r: DerivationPath) => r.id === ruleId);
    if (!rule) {
      return {
        status: 'UNKNOWN_STEP',
        ruleId,
        feedback: `Rule '${ruleId}' does not exist in the canonical geometry graph.`,
      };
    }

    for (const req of rule.requires) {
      if (this.currentFacts[req] === undefined || this.currentFacts[req] === null) {
        return {
          status: 'MISSING_INPUT',
          ruleId,
          feedback: `Rule '${ruleId}' cannot be applied: Missing required input '${req}'.`,
        };
      }
    }

    if (rule.precondition) {
      const passed = rule.precondition(this.currentFacts);
      if (!passed) {
        return {
          status: 'PRECONDITION_FAILED',
          ruleId,
          feedback: `Rule '${ruleId}' failed precondition check on current geometry facts.`,
        };
      }
    }

    const value = rule.operation(this.currentFacts);
    this.currentFacts[rule.provides] = value;
    this.stepCount++;
    this.appliedRulesHistory.push(ruleId);

    return {
      status: 'VALID',
      ruleId,
      producedFactName: rule.provides,
      producedValue: value,
      feedback: `Step verified and executed: Derived '${rule.provides}' = ${JSON.stringify(value)}.`,
      traceStepIndex: this.stepCount - 1,
    };
  }

  public verifyResult(
    target: string,
    proposedValue: FactValue,
    tolerance: number = 0.001
  ): ResultVerificationReport {
    const canonicalTrace = this.navigator.solve(this.currentFacts, target);

    if (canonicalTrace.status !== 'SUCCESS' || canonicalTrace.finalValue === null) {
      return {
        target,
        proposedValue,
        status: 'INVALID_TARGET',
        tolerance,
        evidence: `Cannot solve for '${target}': ${canonicalTrace.message || 'No valid canonical path found'}.`,
        trace: canonicalTrace,
      };
    }

    const canonicalVal = canonicalTrace.finalValue;

    if (typeof proposedValue === 'number' && typeof canonicalVal === 'number') {
      const diff = Math.abs(proposedValue - canonicalVal);
      const match = diff <= tolerance;
      return {
        target,
        proposedValue,
        status: match ? 'MATCH' : 'MISMATCH',
        canonicalValue: canonicalVal,
        difference: diff,
        tolerance,
        evidence: match
          ? `Value matches canonical calculation within tolerance ${tolerance}.`
          : `Mismatch: proposed value ${proposedValue} differs from canonical ${canonicalVal} by ${diff.toFixed(4)} (tolerance: ${tolerance}).`,
        trace: canonicalTrace,
      };
    }

    const match = JSON.stringify(proposedValue) === JSON.stringify(canonicalVal);
    return {
      target,
      proposedValue,
      status: match ? 'MATCH' : 'MISMATCH',
      canonicalValue: canonicalVal,
      tolerance,
      evidence: match
        ? `Value strictly matches canonical value '${JSON.stringify(canonicalVal)}'.`
        : `Mismatch: proposed value '${JSON.stringify(proposedValue)}' does not match canonical '${JSON.stringify(canonicalVal)}'.`,
      trace: canonicalTrace,
    };
  }

  public verifyClaim(
    claimDescription: string,
    predicate: (facts: FactMap) => { valid: boolean; evidence: string; details?: any }
  ): ClaimVerificationReport {
    try {
      const evalResult = predicate(this.currentFacts);
      return {
        claimDescription,
        status: evalResult.valid ? 'VALID' : 'FALSIFIED',
        evidence: evalResult.evidence,
        evaluatedPredicates: [
          {
            predicate: claimDescription,
            passed: evalResult.valid,
            observedValue: evalResult.details,
          },
        ],
      };
    } catch (err: any) {
      return {
        claimDescription,
        status: 'INSUFFICIENT_DATA',
        evidence: `Error evaluating claim predicate: ${err.message}`,
        evaluatedPredicates: [
          {
            predicate: claimDescription,
            passed: false,
            expectedCondition: 'Exception thrown during evaluation',
          },
        ],
      };
    }
  }
}
