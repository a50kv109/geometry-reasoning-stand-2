// src/kernel/types.ts
// Semantic contracts and minimal transport types for Deterministic Geometry Kernel

export interface Point2D {
  x: number;
  y: number;
}

/**
 * MinorCentralAngle: Central angle strictly bounded to [0°, 180°] (or [0, π] radians).
 * Represents the minimal, non-reflex, unsigned angular separation between two radial lines.
 */
export type MinorCentralAngle = number;

/**
 * OrientedCentralAngle: Orientation-aware angular representation requiring appropriate winding context.
 * Represents a signed angular displacement (e.g., [-180°, 180°] or [0°, 360°)) relative to a reference axis or directed arc.
 */
export interface OrientedCentralAngle {
  readonly deg: number;
  readonly winding: 'CW' | 'CCW';
}

/**
 * ReflexArc: Circular arc representation strictly > 180° (major arc subtending > π radians).
 * Conjugate to the corresponding minor arc (reflex_deg = 360° - minor_deg).
 */
export interface ReflexArc {
  /** Angular measure of the reflex arc in degrees. Invariant: 180 < deg <= 360 */
  readonly deg: number;
  /** Conjugate minor angle in degrees: minorDeg = 360 - deg. Invariant: 0 <= minorDeg < 180 */
  readonly minorDeg: number;
}

/**
 * RadialDistance: Distance from the circle center O to a chord line.
 *
 * CRITICAL EPISTEMIC INVARIANT:
 * RadialDistance is NOT an independent geometric degree of freedom.
 * It is a derived metric representation of a chord (d = √(R² - (c/2)²)) and,
 * when unsigned, intrinsically loses side-of-center and spatial orientation information.
 */
export interface RadialDistance {
  /** Unsigned perpendicular distance from circle center O to the chord line. Invariant: 0 <= d <= R */
  readonly d: number;
  /** Radius of the circumscribing circle C(O, R) */
  readonly R: number;
  /**
   * Indicates whether side-of-center / orientation context is preserved.
   * When false (unsigned distance), spatial orientation and half-plane location are lost.
   */
  readonly isSigned: boolean;
}

export interface SidesTriplet {
  readonly side_a: number;
  readonly side_b: number;
  readonly side_c: number;
}

export type FactValue = number | string | boolean | Point2D | OrientedCentralAngle | ReflexArc | RadialDistance | SidesTriplet;

export type FactMap = Record<string, FactValue>;

export type CheckStatus = 'VALID' | 'MISSING_INPUT' | 'PRECONDITION_FAILED';

export interface CheckResult {
  status: CheckStatus;
  reason?: string;
  sandbox: FactMap;
}

export interface DerivationPath {
  id: string;
  description: string;
  requires: readonly string[];
  provides: string;
  operation: (knowledge: FactMap) => FactValue;
  precondition?: (knowledge: FactMap) => boolean;
}

export interface TraceStep {
  stepIndex: number;
  pathId: string;
  description: string;
  requires: readonly string[];
  inputsUsed: Record<string, FactValue>;
  provides: string;
  outputProduced: FactValue;
  preconditionChecked: boolean;
  preconditionPassed: boolean;
}

export interface ExecutionTrace {
  target: string;
  initialFacts: FactMap;
  candidatePathsFound: number;
  selectedPathIds: string[];
  steps: TraceStep[];
  finalValue: FactValue | null;
  status: 'SUCCESS' | 'NO_VALID_PATH' | 'PRECONDITION_FAILED' | 'MISSING_INPUT';
  message?: string;
}

export type HypothesisStatus = 'VERIFIED' | 'FALSIFIED' | 'INCONCLUSIVE' | 'UNKNOWN';

export interface Hypothesis {
  id: string;
  source: string;
  target: string;
  proposedPath: DerivationPath[];
  expectedValue?: FactValue;
}

export interface ExplorationTrace {
  hypothesisId: string;
  inputsUsed: FactMap;
  target: string;
  stepsExecuted: string[];
  status: HypothesisStatus;
  reason: string;
  computedResult?: FactValue;
}
