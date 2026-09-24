import {
  GeometrySource,
  GeometrySnapshot,
  GeometryTransition,
  GeometryDelta,
  GeometryTrace,
  VertexId,
  StructuralInvariantDefinition,
  StructuralInvariantStatus,
  InvariantEvidence,
} from '../types';
import { computeGeometryBase } from './geometryState';

/**
 * Canonical dynamic structural invariants
 */
export const DYNAMIC_THALES_INVARIANT: StructuralInvariantDefinition = {
  id: 'INV-DYN-THALES',
  targetFact: 'angle_C',
  preconditions: ['DIAMETER_AB', 'C_ON_CIRCLE_BOUNDARY', 'NON_DEGENERATE_VERTICES'],
  basis: 'PKG-04: RULE-THALES-02-REV / PKG-DYN-THALES-INVARIANT',
};

export const INV_THALES_DIAM_AB: StructuralInvariantDefinition = {
  id: 'INV-THALES-DIAM-AB',
  targetFact: 'is_diameter_AB',
  preconditions: ['DIAMETER_AB'],
  basis: 'PKG-01 / PKG-02: Chord AB is Diameter',
};

export const INV_THALES_C_BOUNDARY: StructuralInvariantDefinition = {
  id: 'INV-THALES-C-BOUNDARY',
  targetFact: 'c_on_boundary',
  preconditions: ['C_ON_CIRCLE_BOUNDARY'],
  basis: 'PKG-01: Vertex C lies on CircleBoundary',
};

export const INV_PYTHAGOREAN_RELATION: StructuralInvariantDefinition = {
  id: 'INV-PYTHAGOREAN-RELATION',
  targetFact: 'pythagorean_identity_holds',
  preconditions: ['DIAMETER_AB', 'C_ON_CIRCLE_BOUNDARY', 'NON_DEGENERATE_VERTICES'],
  basis: 'PKG-03: AC^2 + BC^2 = AB^2 in right triangle',
};

export const INV_ACUTE_ANGLES_COMPLEMENT: StructuralInvariantDefinition = {
  id: 'INV-ACUTE-ANGLES-COMPLEMENT',
  targetFact: 'acute_angles_sum_90',
  preconditions: ['DIAMETER_AB', 'C_ON_CIRCLE_BOUNDARY', 'NON_DEGENERATE_VERTICES'],
  basis: 'PKG-03: angle_A + angle_B = 90° when angle_C = 90°',
};

export const CANONICAL_INVARIANT_SUITE: readonly StructuralInvariantDefinition[] = [
  INV_THALES_DIAM_AB,
  INV_THALES_C_BOUNDARY,
  DYNAMIC_THALES_INVARIANT,
  INV_PYTHAGOREAN_RELATION,
  INV_ACUTE_ANGLES_COMPLEMENT,
] as const;

/**
 * Computes shortest distance between two points on a normalized [0, 1) circle.
 */
export function cyclicDistance(u1: number, u2: number): number {
  const norm1 = ((u1 % 1) + 1) % 1;
  const norm2 = ((u2 % 1) + 1) % 1;
  const diff = Math.abs(norm1 - norm2);
  return Math.min(diff, 1 - diff);
}

/**
 * Evaluates structural preconditions for a dynamic invariant on a GeometrySnapshot.
 * Structural premises valid -> invariant preserved.
 * Fluctuation / numeric equality alone is NEVER proof.
 */
export function evaluateStructuralInvariant(
  invariant: StructuralInvariantDefinition,
  snapshot: GeometrySnapshot
): StructuralInvariantStatus {
  const passedPreconditions: string[] = [];
  const failedPreconditions: string[] = [];

  const uA = snapshot.source.pointsU.A;
  const uB = snapshot.source.pointsU.B;
  const uC = snapshot.source.pointsU.C;

  // Check each required precondition
  for (const pre of invariant.preconditions) {
    if (pre === 'DIAMETER_AB') {
      const isDiameter =
        Math.abs(snapshot.arcs.AB - 0.5) < 0.008 ||
        Math.abs(cyclicDistance(uA, uB) - 0.5) < 0.008;
      if (isDiameter) {
        passedPreconditions.push(pre);
      } else {
        failedPreconditions.push(pre);
      }
    } else if (pre === 'C_ON_CIRCLE_BOUNDARY') {
      const onBoundary = snapshot.source.onBoundary?.C !== false;
      if (onBoundary) {
        passedPreconditions.push(pre);
      } else {
        failedPreconditions.push(pre);
      }
    } else if (pre === 'NON_DEGENERATE_VERTICES') {
      const distCA = cyclicDistance(uC, uA);
      const distCB = cyclicDistance(uC, uB);
      const distAB = cyclicDistance(uA, uB);
      const eps = 1e-4;
      const isNonDegenerate = distCA >= eps && distCB >= eps && distAB >= eps;
      if (isNonDegenerate) {
        passedPreconditions.push(pre);
      } else {
        failedPreconditions.push(pre);
      }
    } else {
      // Unknown precondition fails safely
      failedPreconditions.push(pre);
    }
  }

  // Degeneracy guard takes precedence
  if (failedPreconditions.includes('NON_DEGENERATE_VERTICES')) {
    return {
      id: invariant.id,
      targetFact: invariant.targetFact,
      basis: invariant.basis,
      status: 'DEGENERATE',
      preservedValue: null,
      evidence: {
        passedPreconditions,
        failedPreconditions,
        reason:
          'Degenerate configuration: vertices coincide (cyclic distance < 1e-4). Cannot preserve angle fact.',
      },
    };
  }

  // If any other precondition failed, invariant is broken
  if (failedPreconditions.length > 0) {
    return {
      id: invariant.id,
      targetFact: invariant.targetFact,
      basis: invariant.basis,
      status: 'BROKEN',
      preservedValue: null,
      evidence: {
        passedPreconditions,
        failedPreconditions,
        reason: `Structural precondition broken: failed [${failedPreconditions.join(', ')}].`,
      },
    };
  }

  // All preconditions valid -> PRESERVED
  let preservedValue: number | string | boolean | null = null;
  if (invariant.targetFact === 'angle_C' || invariant.targetFact === 'acute_angles_sum_90') {
    preservedValue = 90;
  } else if (
    invariant.targetFact === 'is_diameter_AB' ||
    invariant.targetFact === 'c_on_boundary' ||
    invariant.targetFact === 'pythagorean_identity_holds'
  ) {
    preservedValue = true;
  }

  return {
    id: invariant.id,
    targetFact: invariant.targetFact,
    basis: invariant.basis,
    status: 'PRESERVED',
    preservedValue,
    evidence: {
      passedPreconditions,
      failedPreconditions: [],
      reason: `All structural premises verified: [${passedPreconditions.join(', ')}]. Invariant remains applicable.`,
    },
  };
}

/**
 * Evaluates an array of invariants against a snapshot.
 */
export function evaluateStructuralInvariants(
  snapshot: GeometrySnapshot,
  invariants: readonly StructuralInvariantDefinition[] = [DYNAMIC_THALES_INVARIANT]
): StructuralInvariantStatus[] {
  return invariants.map((inv) => evaluateStructuralInvariant(inv, snapshot));
}

/**
 * Native temporal session managing bounded history of snapshots and transitions.
 * Does NOT mutate Knowledge Graph or Navigator.
 */
export class NativeGeometryTemporalSession {
  private snapshots: GeometrySnapshot[] = [];
  private transitions: GeometryTransition[] = [];
  private readonly maxCapacity: number;
  private activeInvariants: readonly StructuralInvariantDefinition[];

  constructor(
    maxCapacity: number = 1000,
    invariants: readonly StructuralInvariantDefinition[] = [DYNAMIC_THALES_INVARIANT]
  ) {
    this.maxCapacity = Math.max(10, maxCapacity);
    this.activeInvariants = invariants;
  }

  public record(snapshot: GeometrySnapshot): GeometryTransition | null {
    const prev = this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxCapacity) {
      this.snapshots.shift();
    }

    if (!prev) {
      return null;
    }

    const transition = computeTransition(prev, snapshot);
    if (transition) {
      this.transitions.push(transition);
      if (this.transitions.length > this.maxCapacity) {
        this.transitions.shift();
      }
    }
    return transition;
  }

  public getHistory(): readonly GeometrySnapshot[] {
    return this.snapshots;
  }

  public getTransitions(): readonly GeometryTransition[] {
    return this.transitions;
  }

  public getLatestSnapshot(): GeometrySnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  public checkInvariants(snapshot?: GeometrySnapshot): StructuralInvariantStatus[] {
    const target = snapshot ?? this.getLatestSnapshot();
    if (!target) return [];
    return evaluateStructuralInvariants(target, this.activeInvariants);
  }

  public reset(initialSnapshot?: GeometrySnapshot): void {
    this.snapshots = [];
    this.transitions = [];
    if (initialSnapshot) {
      this.record(initialSnapshot);
    }
  }
}

/**
 * Creates an immutable GeometrySnapshot strictly from source parameters,
 * ensuring zero dependence on whether Classical or Matrix engine is active.
 */
export function createGeometrySnapshot(
  source: GeometrySource,
  timestamp: number = Date.now()
): GeometrySnapshot {
  const base = computeGeometryBase(source.pointsU, source.R);

  const arcAB = base.arcs.AB.fraction;
  const arcBC = base.arcs.BC.fraction;
  const arcCA = base.arcs.CA.fraction;

  // Inscribed Angle Theorem (opposite arc)
  const angleA = arcBC * 180;
  const angleB = arcCA * 180;
  const angleC = arcAB * 180;

  // Exact chord lengths via circle relationship: 2R * sin(arc * pi)
  const chordAB = 2 * source.R * Math.sin(arcAB * Math.PI);
  const chordBC = 2 * source.R * Math.sin(arcBC * Math.PI);
  const chordCA = 2 * source.R * Math.sin(arcCA * Math.PI);

  const perimeter = chordAB + chordBC + chordCA;
  const s = perimeter / 2;
  const area = Math.sqrt(Math.max(0, s * (s - chordAB) * (s - chordBC) * (s - chordCA)));

  const maxArc = Math.max(arcAB, arcBC, arcCA);
  let classification: 'acute' | 'right' | 'obtuse' = 'acute';
  if (Math.abs(maxArc - 0.5) < 0.008) {
    classification = 'right';
  } else if (maxArc > 0.5) {
    classification = 'obtuse';
  }

  return {
    timestamp,
    source: {
      pointsU: { ...source.pointsU },
      R: source.R,
      scale: source.scale,
      onBoundary: source.onBoundary ? { ...source.onBoundary } : undefined,
    },
    arcs: { AB: arcAB, BC: arcBC, CA: arcCA },
    angles: { A: angleA, B: angleB, C: angleC },
    chords: { AB: chordAB, BC: chordBC, CA: chordCA },
    area,
    perimeter,
    classification,
  };
}

/**
 * Computes state transition between two snapshots.
 * Returns null if geometry did not change.
 */
export function computeTransition(
  prev: GeometrySnapshot,
  curr: GeometrySnapshot
): GeometryTransition | null {
  const eps = 1e-6;
  const dA = Math.abs(prev.source.pointsU.A - curr.source.pointsU.A);
  const dB = Math.abs(prev.source.pointsU.B - curr.source.pointsU.B);
  const dC = Math.abs(prev.source.pointsU.C - curr.source.pointsU.C);
  const dR = Math.abs(prev.source.R - curr.source.R);

  if (dA < eps && dB < eps && dC < eps && dR < eps) {
    return null;
  }

  let changedVertex: VertexId | null = null;
  if (dA >= dB && dA >= dC && dA >= eps) changedVertex = 'A';
  else if (dB >= dA && dB >= dC && dB >= eps) changedVertex = 'B';
  else if (dC >= dA && dC >= dB && dC >= eps) changedVertex = 'C';

  const deltas: GeometryDelta = {
    deltaArcs: {
      AB: (curr.arcs.AB - prev.arcs.AB) * 360,
      BC: (curr.arcs.BC - prev.arcs.BC) * 360,
      CA: (curr.arcs.CA - prev.arcs.CA) * 360,
    },
    deltaAngles: {
      A: curr.angles.A - prev.angles.A,
      B: curr.angles.B - prev.angles.B,
      C: curr.angles.C - prev.angles.C,
    },
    deltaChords: {
      AB: (curr.chords.AB - prev.chords.AB) * curr.source.scale,
      BC: (curr.chords.BC - prev.chords.BC) * curr.source.scale,
      CA: (curr.chords.CA - prev.chords.CA) * curr.source.scale,
    },
    deltaArea: (curr.area - prev.area) * (curr.source.scale * curr.source.scale),
    deltaPerimeter: (curr.perimeter - prev.perimeter) * curr.source.scale,
  };

  const invariantStatuses = evaluateStructuralInvariants(curr, [DYNAMIC_THALES_INVARIANT]);

  return {
    from: prev,
    to: curr,
    changedVertex,
    deltas,
    invariantStatuses,
  };
}

/**
 * Builds an explanatory Trace for why an inscribed angle has its specific value.
 */
export function buildAngleTrace(
  vertexId: VertexId,
  snapshot: GeometrySnapshot
): GeometryTrace {
  const oppMap: Record<VertexId, { arcKey: 'BC' | 'CA' | 'AB'; arcVertices: string }> = {
    A: { arcKey: 'BC', arcVertices: 'B и C' },
    B: { arcKey: 'CA', arcVertices: 'C и A' },
    C: { arcKey: 'AB', arcVertices: 'A и B' },
  };

  const { arcKey, arcVertices } = oppMap[vertexId];
  const arcFraction = snapshot.arcs[arcKey];
  const centralDeg = arcFraction * 360;
  const inscribedDeg = snapshot.angles[vertexId];

  return {
    target: `Угол ${vertexId}`,
    finalValue: `${inscribedDeg.toFixed(1)}°`,
    steps: [
      {
        stepNumber: 1,
        from: `Вершины ${arcVertices}`,
        relation: 'ограничивают дугу',
        operation: 'круговой интервал',
        to: `Дуга ${arcKey}`,
        value: `${(arcFraction * 100).toFixed(1)}% круга`,
        explanation: `Точки ${arcVertices} на окружности задают дугу ${arcKey}, противоположную вершине ${vertexId}.`,
      },
      {
        stepNumber: 2,
        from: `Дуга ${arcKey}`,
        relation: 'центральный угол',
        operation: 'доля × 360°',
        to: `Центральный угол`,
        value: `${centralDeg.toFixed(1)}°`,
        explanation: `Центральный угол, опирающийся на дугу ${arcKey}, равен ${centralDeg.toFixed(1)}°.`,
      },
      {
        stepNumber: 3,
        from: `Центральный угол (${centralDeg.toFixed(1)}°)`,
        relation: 'теорема о вписанном угле',
        operation: 'деление на 2',
        to: `Угол ${vertexId}`,
        value: `${inscribedDeg.toFixed(1)}°`,
        explanation: `Вписанный угол равен половине центрального угла: ${centralDeg.toFixed(1)}° / 2 = ${inscribedDeg.toFixed(1)}°.`,
      },
    ],
  };
}

/**
 * Builds an explanatory Trace for Radian measure.
 */
export function buildRadianTrace(
  arcKey: 'AB' | 'BC' | 'CA',
  snapshot: GeometrySnapshot
): GeometryTrace {
  const fraction = snapshot.arcs[arcKey];
  const R_mm = snapshot.source.R * snapshot.source.scale;
  const s_mm = fraction * 2 * Math.PI * R_mm;
  const radians = s_mm / R_mm;
  const isOneRadian = Math.abs(radians - 1.0) < 0.05;

  return {
    target: `Радианная мера дуги ${arcKey}`,
    finalValue: `${radians.toFixed(2)} рад (${(fraction * 360).toFixed(1)}°)`,
    steps: [
      {
        stepNumber: 1,
        from: `Окружность радиуса R`,
        relation: 'длина радиуса',
        operation: 'измерение',
        to: 'R',
        value: `${R_mm.toFixed(1)} мм`,
        explanation: 'Радиус служит базовым эталоном для измерения дуги.',
      },
      {
        stepNumber: 2,
        from: `Выбранная дуга ${arcKey}`,
        relation: 'доля от 2πR',
        operation: `доля × 2π × ${R_mm.toFixed(1)}`,
        to: 'Длина дуги s',
        value: `${s_mm.toFixed(1)} мм`,
        explanation: `Длина выбранной дуги по окружности составляет ${s_mm.toFixed(1)} мм.`,
      },
      {
        stepNumber: 3,
        from: 'Длина дуги s и радиус R',
        relation: 'определение радиана θ = s / R',
        operation: `${s_mm.toFixed(1)} / ${R_mm.toFixed(1)}`,
        to: 'Радиан',
        value: `${radians.toFixed(2)} рад`,
        explanation: isOneRadian
          ? `Длина дуги s (${s_mm.toFixed(1)} мм) в точности равна радиусу R (${R_mm.toFixed(1)} мм) — это ровно 1 радиан!`
          : `Отношение дуги к радиусу показывает, сколько радиусов укладывается в дуге: ${radians.toFixed(2)} рад.`,
      },
    ],
  };
}
