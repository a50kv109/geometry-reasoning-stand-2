// src/engines/parametricAngleSolver.ts
// Pure deterministic target-angle constraint solver for triangle vertices on normalized circumcircle.
// Implements the "Minimal Geometric Disturbance" law:
// 1. Target vertex remains strictly fixed (u'_T = u_T).
// 2. Opposite arc receives exactly (targetAngleDeg / 180.0) fraction of circle.
// 3. Remaining circle fraction is distributed proportionally between adjacent arcs.
// 4. Returns next pointsU and calculated angles, or structured error if input is invalid/degenerate.

import { VertexId } from '../types';
export type { VertexId };
import { normalizeU } from './geometryState';

export interface TargetAngleSolveResult {
  readonly success: boolean;
  readonly nextPointsU?: { readonly A: number; readonly B: number; readonly C: number };
  readonly targetVertex: VertexId;
  readonly targetAngleDeg: number;
  readonly calculatedAngles?: { readonly A: number; readonly B: number; readonly C: number };
  readonly error?: string;
}

export interface TriangleAngleInputSpec {
  readonly A?: number | null;
  readonly B?: number | null;
  readonly C?: number | null;
}

export interface TriangleAngleConfigurationResult {
  readonly success: boolean;
  readonly mode: 'TWO_ANGLES' | 'THREE_ANGLES' | 'ONE_ANGLE_INCOMPLETE' | 'NO_ANGLES' | 'INVALID';
  readonly resolvedAngles?: { readonly A: number; readonly B: number; readonly C: number };
  readonly autoCalculatedVertex?: VertexId;
  readonly nextPointsU?: { readonly A: number; readonly B: number; readonly C: number };
  readonly error?: string;
  readonly infoMessage?: string;
}

export const MIN_TARGET_ANGLE_DEG = 0.5;
export const MAX_TARGET_ANGLE_DEG = 179.0;
export const MIN_VERTEX_SEPARATION = 0.001; // Minimum cyclic distance between vertices

/**
 * Solves and builds an unambiguous triangle configuration from two or three target angles.
 * Core educational contract:
 * - 2 angles provided -> 3rd angle is automatically computed: 180° - A - B.
 * - 3 angles provided -> validated for sum = 180° (± 0.05°).
 * - 1 angle provided -> not applied, returns informative prompt requesting second angle.
 * - Zero angles provided -> returns prompt.
 *
 * Pure, deterministic mathematical function: 100% timestamp-free, zero DOM/React.
 */
export function solveTriangleConfiguration(
  currentPointsU: { readonly A: number; readonly B: number; readonly C: number },
  spec: TriangleAngleInputSpec
): TriangleAngleConfigurationResult {
  const hasA = spec.A !== undefined && spec.A !== null && !isNaN(spec.A) && isFinite(spec.A) && spec.A > 0;
  const hasB = spec.B !== undefined && spec.B !== null && !isNaN(spec.B) && isFinite(spec.B) && spec.B > 0;
  const hasC = spec.C !== undefined && spec.C !== null && !isNaN(spec.C) && isFinite(spec.C) && spec.C > 0;

  const validCount = (hasA ? 1 : 0) + (hasB ? 1 : 0) + (hasC ? 1 : 0);

  if (validCount === 0) {
    return {
      success: false,
      mode: 'NO_ANGLES',
      error: 'Введите хотя бы два угла для однозначного задания треугольника.',
    };
  }

  if (validCount === 1) {
    return {
      success: false,
      mode: 'ONE_ANGLE_INCOMPLETE',
      infoMessage: 'Для однозначного задания треугольника введите второй угол.',
      error: 'Для однозначного задания треугольника введите второй угол.',
    };
  }

  let angA: number;
  let angB: number;
  let angC: number;
  let autoVertex: VertexId | undefined;
  let mode: 'TWO_ANGLES' | 'THREE_ANGLES' = 'TWO_ANGLES';

  if (validCount === 2) {
    mode = 'TWO_ANGLES';
    if (hasA && hasB) {
      angA = spec.A!;
      angB = spec.B!;
      autoVertex = 'C';
      angC = Number((180.0 - angA - angB).toFixed(2));
    } else if (hasA && hasC) {
      angA = spec.A!;
      angC = spec.C!;
      autoVertex = 'B';
      angB = Number((180.0 - angA - angC).toFixed(2));
    } else {
      // hasB && hasC
      angB = spec.B!;
      angC = spec.C!;
      autoVertex = 'A';
      angA = Number((180.0 - angB - angC).toFixed(2));
    }
  } else {
    // 3 angles provided
    mode = 'THREE_ANGLES';
    angA = spec.A!;
    angB = spec.B!;
    angC = spec.C!;

    const sum = angA + angB + angC;
    if (Math.abs(sum - 180.0) > 0.05) {
      return {
        success: false,
        mode: 'INVALID',
        error: 'Сумма углов треугольника должна быть 180°.',
      };
    }
  }

  // Validate each individual resolved angle
  const angles = [
    { id: 'A' as VertexId, val: angA },
    { id: 'B' as VertexId, val: angB },
    { id: 'C' as VertexId, val: angC },
  ];

  for (const { id, val } of angles) {
    if (val < MIN_TARGET_ANGLE_DEG || val > MAX_TARGET_ANGLE_DEG) {
      return {
        success: false,
        mode: 'INVALID',
        error: `Угол ∠${id} (${val}°) должен быть в диапазоне от ${MIN_TARGET_ANGLE_DEG}° до ${MAX_TARGET_ANGLE_DEG}°.`,
      };
    }
  }

  // Translate angles to circle arc fractions:
  // Inscribed angle at C subtends arc AB: arc_AB = angC / 180.0
  // Inscribed angle at A subtends arc BC: arc_BC = angA / 180.0
  // Inscribed angle at B subtends arc CA: arc_CA = angB / 180.0
  const arcAB = angC / 180.0;
  const arcBC = angA / 180.0;
  const arcCA = angB / 180.0;

  const uA = normalizeU(currentPointsU.A);
  const uB = normalizeU(uA + arcAB);
  const uC = normalizeU(uB + arcBC);

  // Separation verification
  const dAB = cyclicCcwDist(uA, uB);
  const dBC = cyclicCcwDist(uB, uC);
  const dCA = cyclicCcwDist(uC, uA);

  if (
    dAB < MIN_VERTEX_SEPARATION ||
    dBC < MIN_VERTEX_SEPARATION ||
    dCA < MIN_VERTEX_SEPARATION
  ) {
    return {
      success: false,
      mode: 'INVALID',
      error: 'Заданная конфигурация углов приводит к слиянию вершин.',
    };
  }

  return {
    success: true,
    mode,
    autoCalculatedVertex: autoVertex,
    resolvedAngles: {
      A: angA,
      B: angB,
      C: angC,
    },
    nextPointsU: {
      A: uA,
      B: uB,
      C: uC,
    },
  };
}

/**
 * Computes counter-clockwise distance from u1 to u2 on normalized circle [0, 1).
 */
export function cyclicCcwDist(u1: number, u2: number): number {
  return normalizeU(u2 - u1);
}

/**
 * Solves for new vertex positions on circumcircle when a target interior angle is specified.
 * Pure mathematical function: zero UI, zero React, zero DOM, zero side-effects.
 */
export function solveTargetAngle(
  currentPointsU: { readonly A: number; readonly B: number; readonly C: number },
  targetVertex: VertexId,
  targetAngleDeg: number
): TargetAngleSolveResult {
  // 1. Validate numeric angle input
  if (
    typeof targetAngleDeg !== 'number' ||
    isNaN(targetAngleDeg) ||
    !isFinite(targetAngleDeg)
  ) {
    return {
      success: false,
      targetVertex,
      targetAngleDeg,
      error: 'Угол должен быть корректным числом.',
    };
  }

  if (targetAngleDeg < MIN_TARGET_ANGLE_DEG || targetAngleDeg > MAX_TARGET_ANGLE_DEG) {
    return {
      success: false,
      targetVertex,
      targetAngleDeg,
      error: `Угол должен быть в диапазоне от ${MIN_TARGET_ANGLE_DEG}° до ${MAX_TARGET_ANGLE_DEG}°.`,
    };
  }

  const uA = normalizeU(currentPointsU.A);
  const uB = normalizeU(currentPointsU.B);
  const uC = normalizeU(currentPointsU.C);

  // 2. Check current degeneracy
  const dAB = cyclicCcwDist(uA, uB);
  const dBC = cyclicCcwDist(uB, uC);
  const dCA = cyclicCcwDist(uC, uA);

  if (dAB < 1e-6 || dBC < 1e-6 || dCA < 1e-6) {
    return {
      success: false,
      targetVertex,
      targetAngleDeg,
      error: 'Текущая конфигурация вершин вырождена.',
    };
  }

  // 3. Determine cyclic orientation from target vertex T -> V1 -> V2 -> T
  // Identify the other two vertices
  const allVertices: VertexId[] = ['A', 'B', 'C'];
  const otherVertices = allVertices.filter((v) => v !== targetVertex);
  const cand1 = otherVertices[0];
  const cand2 = otherVertices[1];

  const posMap: Record<VertexId, number> = { A: uA, B: uB, C: uC };
  const uT = posMap[targetVertex];
  const dist1 = cyclicCcwDist(uT, posMap[cand1]);
  const dist2 = cyclicCcwDist(uT, posMap[cand2]);

  let v1: VertexId;
  let v2: VertexId;

  if (dist1 < dist2) {
    // CCW sequence is T -> cand1 -> cand2 -> T
    v1 = cand1;
    v2 = cand2;
  } else {
    // CCW sequence is T -> cand2 -> cand1 -> T
    v1 = cand2;
    v2 = cand1;
  }

  // Arcs in CCW order around the circle:
  // - Arc T -> V1 (opposite to V2)
  const currentOppV2 = cyclicCcwDist(uT, posMap[v1]);
  // - Arc V1 -> V2 (opposite to T)
  const currentOppT = cyclicCcwDist(posMap[v1], posMap[v2]);
  // - Arc V2 -> T (opposite to V1)
  const currentOppV1 = cyclicCcwDist(posMap[v2], uT);

  // 4. Target angle calculations
  const targetOppFraction = targetAngleDeg / 180.0;
  const remFraction = 1.0 - targetOppFraction;

  const currentOtherSum = currentOppV1 + currentOppV2;
  let newOppV1: number;
  let newOppV2: number;

  if (currentOtherSum > 1e-9) {
    const ratioV1 = currentOppV1 / currentOtherSum;
    const ratioV2 = currentOppV2 / currentOtherSum;
    newOppV1 = ratioV1 * remFraction;
    newOppV2 = ratioV2 * remFraction;
  } else {
    newOppV1 = 0.5 * remFraction;
    newOppV2 = 0.5 * remFraction;
  }

  // 5. Compute new coordinates:
  // Target vertex remains strictly fixed
  const nextPosMap: Record<VertexId, number> = {
    A: uA,
    B: uB,
    C: uC,
  };

  nextPosMap[targetVertex] = uT;
  // V1 is placed CCW from T by distance newOppV2 (the arc T -> V1)
  nextPosMap[v1] = normalizeU(uT + newOppV2);
  // V2 is placed CW from T by distance newOppV1 (the arc V2 -> T)
  nextPosMap[v2] = normalizeU(uT - newOppV1);

  // 6. Check minimal vertex separation
  const newDistTV1 = cyclicCcwDist(nextPosMap[targetVertex], nextPosMap[v1]);
  const newDistV1V2 = cyclicCcwDist(nextPosMap[v1], nextPosMap[v2]);
  const newDistV2T = cyclicCcwDist(nextPosMap[v2], nextPosMap[targetVertex]);

  if (
    newDistTV1 < MIN_VERTEX_SEPARATION ||
    newDistV1V2 < MIN_VERTEX_SEPARATION ||
    newDistV2T < MIN_VERTEX_SEPARATION
  ) {
    return {
      success: false,
      targetVertex,
      targetAngleDeg,
      error: 'Заданный угол приводит к вырождению треугольника (слиянию вершин).',
    };
  }

  // 7. Calculate resulting angles
  const calculatedAngles: Record<VertexId, number> = {
    A: 0,
    B: 0,
    C: 0,
  };

  calculatedAngles[targetVertex] = targetAngleDeg;
  calculatedAngles[v1] = newOppV1 * 180.0;
  calculatedAngles[v2] = newOppV2 * 180.0;

  const nextPointsU = {
    A: nextPosMap.A,
    B: nextPosMap.B,
    C: nextPosMap.C,
  };

  return {
    success: true,
    nextPointsU,
    targetVertex,
    targetAngleDeg,
    calculatedAngles: {
      A: calculatedAngles.A,
      B: calculatedAngles.B,
      C: calculatedAngles.C,
    },
  };
}
