// src/environment/types.ts
// Formal Interface & Type Definitions for Geometry Reasoning Verification Stand

import { FactMap, ExecutionTrace, FactValue } from '../kernel/types';

export type EnvironmentMode = 'AGENT' | 'LEARNER' | 'DEBUG';

export type ResultVerificationStatus = 'MATCH' | 'MISMATCH' | 'INDETERMINATE' | 'INVALID_TARGET';

export type StepVerificationStatus = 'VALID' | 'PRECONDITION_FAILED' | 'MISSING_INPUT' | 'UNKNOWN_STEP';

export type ClaimVerificationStatus = 'VALID' | 'FALSIFIED' | 'INSUFFICIENT_DATA';

export interface StateObservation {
  stepCount: number;
  mode: EnvironmentMode;
  knownFacts: FactMap;
  availableTargets: string[];
  appliedRulesHistory: string[];
}

export interface StepActionResult {
  status: StepVerificationStatus;
  ruleId: string;
  producedFactName?: string;
  producedValue?: FactValue;
  feedback: string;
  traceStepIndex?: number;
}

export interface ResultVerificationReport {
  target: string;
  proposedValue: FactValue;
  status: ResultVerificationStatus;
  canonicalValue?: FactValue | null;
  difference?: number;
  tolerance: number;
  evidence: string;
  trace?: ExecutionTrace;
}

export interface ClaimVerificationReport {
  claimDescription: string;
  status: ClaimVerificationStatus;
  evidence: string;
  evaluatedPredicates: {
    predicate: string;
    passed: boolean;
    observedValue?: any;
    expectedCondition?: string;
  }[];
}

export interface IGeometryEnvironment {
  reset(initialState?: FactMap): StateObservation;
  observe(): StateObservation;
  setMode(mode: EnvironmentMode): void;
  getMode(): EnvironmentMode;
  
  // SOLVE: Canonical ground truth solver (Oracle mode)
  solve(target: string): ExecutionTrace;
  
  // STEP: Learner step proposal (Interactive derivation mode)
  step(ruleId: string): StepActionResult;
  
  // VERIFY RESULT: Numerical verification of an agent's calculation
  verifyResult(target: string, proposedValue: FactValue, tolerance?: number): ResultVerificationReport;
  
  // VERIFY CLAIM: Semantic/geometric predicate verification
  verifyClaim(
    claimDescription: string,
    predicate: (facts: FactMap) => { valid: boolean; evidence: string; details?: any }
  ): ClaimVerificationReport;
}
