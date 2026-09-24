export type VertexId = 'A' | 'B' | 'C';

export interface VertexPoint {
  id: VertexId;
  u: number; // Normalized cyclic position [0, 1) where angle = u * 2 * Math.PI
  x: number;
  y: number;
  angleRad: number;
  angleDeg: number;
}

export type TriangleClass = 'acute' | 'right' | 'obtuse';

export interface ArcInfo {
  startId: VertexId;
  endId: VertexId;
  oppositeVertexId: VertexId;
  label: string; // e.g., 'Arc AB'
  chordLabel: string; // e.g., 'AB'
  fraction: number; // proportion of circle [0, 1)
  deg: number; // fraction * 360
  fractionFormatted: string; // e.g. "1/3 круга" or "0.33 круга"
  isDiameter: boolean;
  color: string;
}

export interface OpCount {
  addSub: number;
  mulDiv: number;
  sqrt: number;
  trig: number;
  total: number;
}

export interface EngineResult {
  engineName: 'classical' | 'matrix';
  engineDisplayName: string;
  // Arcs (AB, BC, CA)
  arcs: {
    AB: number; // fraction of circle
    BC: number;
    CA: number;
  };
  // Inscribed Angles at vertices A, B, C (in degrees)
  angles: {
    A: number;
    B: number;
    C: number;
  };
  // Chords / Side lengths
  chords: {
    AB: number;
    BC: number;
    CA: number;
  };
  perimeter: number;
  area: number;
  classification: TriangleClass;
  classificationName: string;
  centerPositionDesc: string;
  isRightAngleVertex?: VertexId;
  diameterSide?: string;
  ops: OpCount;
  computationSteps: string[];
}

export interface FrozenSnapshot {
  timestamp: number;
  points: { A: number; B: number; C: number };
  R: number;
  classicalResult: EngineResult;
  matrixResult: EngineResult;
}

/**
 * CANONICAL ARCHITECTURAL CONTRACTS (SOL + Minimal Temporal Layer)
 */

export interface GeometrySource {
  readonly pointsU: { readonly A: number; readonly B: number; readonly C: number };
  readonly R: number;
  readonly scale: number;
  readonly onBoundary?: { readonly [key in VertexId]?: boolean };
}

export type InvariantPreservationStatus =
  | 'PRESERVED'
  | 'BROKEN'
  | 'DEGENERATE'
  | 'NOT_APPLICABLE';

export interface InvariantEvidence {
  readonly passedPreconditions: readonly string[];
  readonly failedPreconditions: readonly string[];
  readonly reason: string;
}

export interface StructuralInvariantStatus {
  readonly id: string;
  readonly targetFact: string;
  readonly basis: string;
  readonly status: InvariantPreservationStatus;
  readonly preservedValue: number | string | boolean | null;
  readonly evidence: InvariantEvidence;
}

export interface StructuralInvariantDefinition {
  readonly id: string;
  readonly targetFact: string;
  readonly preconditions: readonly string[];
  readonly basis: string;
}

export interface GeometrySnapshot {
  readonly timestamp: number;
  readonly source: GeometrySource;
  readonly arcs: { readonly AB: number; readonly BC: number; readonly CA: number };
  readonly angles: { readonly A: number; readonly B: number; readonly C: number };
  readonly chords: { readonly AB: number; readonly BC: number; readonly CA: number };
  readonly area: number;
  readonly perimeter: number;
  readonly classification: TriangleClass;
}

export interface GeometryDelta {
  readonly deltaArcs: { readonly AB: number; readonly BC: number; readonly CA: number };
  readonly deltaAngles: { readonly A: number; readonly B: number; readonly C: number };
  readonly deltaChords: { readonly AB: number; readonly BC: number; readonly CA: number };
  readonly deltaArea: number;
  readonly deltaPerimeter: number;
}

export interface GeometryTransition {
  readonly from: GeometrySnapshot;
  readonly to: GeometrySnapshot;
  readonly changedVertex: VertexId | null;
  readonly deltas: GeometryDelta;
  readonly invariantStatuses?: readonly StructuralInvariantStatus[];
}

export interface TraceStep {
  readonly stepNumber: number;
  readonly from: string;
  readonly relation: string;
  readonly operation: string;
  readonly to: string;
  readonly value: string;
  readonly explanation: string;
}

export interface GeometryTrace {
  readonly target: string;
  readonly finalValue: string;
  readonly steps: readonly TraceStep[];
}

export type ScaleMode = 'degrees' | 'radians' | 'fractions';

export type ActiveHighlight = 
  | { type: 'vertex'; id: VertexId }
  | { type: 'side'; id: 'AB' | 'BC' | 'CA' }
  | { type: 'arc'; id: 'AB' | 'BC' | 'CA' }
  | { type: 'center' }
  | { type: 'ratio'; kind: 'pi' | 'radian' }
  | null;

export type {
  MinorCentralAngle,
  OrientedCentralAngle,
  ReflexArc,
  RadialDistance,
} from './kernel/types';

