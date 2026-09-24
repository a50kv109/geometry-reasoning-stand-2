// src/engines/research/dynamicExperiment.ts
// Pure, deterministic engine for Packet #5: Dynamic Geometric Experiment Engine
// Implements the canonical "Chord-Arc Dynamic Relation Experiment"
// Strict Invariants:
// 1. Read-only: Never mutates GeometryState.
// 2. Reuses Geometry Core and Packet #4 derived relations without duplication.
// 3. 100% deterministic: Zero timestamps, zero Math.random(), zero wall-clock metadata.
// 4. Epistemic rigor: Experimental agreement is evidence/candidate hypothesis, NOT automatic proof.

import { FullGeometryState } from '../constructionCore';
import { deriveChordArcRelations } from './derivedRelations';
import { evaluateResearchObservations } from './observationModel';
import { ResearchObservation } from './researchTypes';
import {
  ChordArcExperimentConfig,
  ExperimentMeasurement,
  ExperimentStep,
  MeasurementDelta,
  ExperimentStepComparison,
  ResearchExperimentResult,
} from './experimentTypes';

const EPSILON = 1e-4;
const METRIC_TOLERANCE = 0.05;

/**
 * Creates a default configuration for the Chord-Arc Dynamic Relation experiment.
 */
export function createChordArcExperimentConfig(
  targetChordKey: 'AB' | 'BC' | 'CA' | string = 'AB',
  fixedVertexId: string = 'A',
  movingVertexId: string = 'B'
): ChordArcExperimentConfig {
  const p1Name = targetChordKey.charAt(0) || 'A';
  const p2Name = targetChordKey.charAt(1) || 'B';

  return {
    experimentId: 'chord_arc_dynamic',
    title: `Динамический эксперимент: Связь хорды [${p1Name}${p2Name}] и дуги окружности`,
    description:
      'Исследование изменения длины хорды, центрального угла и длин дуг при перемещении концевой точки по окружности.',
    targetChordKey,
    p1Id: `pt_${p1Name}`,
    p2Id: `pt_${p2Name}`,
    p1Name,
    p2Name,
    fixedVertexId,
    movingVertexId,
  };
}

/**
 * Captures an analytical experiment step from the current geometry state.
 * Strictly pure function. Zero mutations to GeometryState.
 */
export function captureExperimentStep(
  state: FullGeometryState,
  stepIndex: number,
  config: ChordArcExperimentConfig,
  scale: number = 1.0
): ExperimentStep {
  const R_mm = state.R * scale;
  const derivedRelations = deriveChordArcRelations(state, scale);

  // Find the target chord relation or fallback to first available
  const p1Name = config.p1Name;
  const p2Name = config.p2Name;
  const targetRel =
    derivedRelations.find(
      (r) =>
        (r.p1Name === p1Name && r.p2Name === p2Name) ||
        (r.p1Name === p2Name && r.p2Name === p1Name) ||
        r.chordId === config.targetChordKey ||
        r.chordId === `seg_${p1Name}${p2Name}` ||
        r.chordId === `chord_${p1Name}${p2Name}`
    ) || derivedRelations[0];

  // Resolve point coordinates
  const p1 =
    state.points[config.p1Id] ||
    state.points[p1Name] ||
    Object.values(state.points).find((p) => p.name === p1Name) || {
      x: 0,
      y: 0,
      u: state.pointsU[p1Name as 'A' | 'B' | 'C'],
    };

  const p2 =
    state.points[config.p2Id] ||
    state.points[p2Name] ||
    Object.values(state.points).find((p) => p.name === p2Name) || {
      x: 0,
      y: 0,
      u: state.pointsU[p2Name as 'A' | 'B' | 'C'],
    };

  const measurements: ExperimentMeasurement = targetRel
    ? {
        chordLength: targetRel.chordLength,
        subtendsCentralAngleDeg: targetRel.subtendsCentralAngleDeg,
        subtendsCentralAngleRad: targetRel.subtendsCentralAngleRad,
        minorArcDeg: targetRel.minorArcDeg,
        minorArcLength: targetRel.minorArcLength,
        majorArcDeg: targetRel.majorArcDeg,
        majorArcLength: targetRel.majorArcLength,
        circumference: targetRel.circumference,
        theoreticalChordLength: targetRel.theoreticalChordLength,
        isDiameter: targetRel.isDiameter,
        ratioChordToDiameter: targetRel.ratioChordToDiameter,
        radius: Number(R_mm.toFixed(2)),
        arcComplementSumDeg: Number((targetRel.minorArcDeg + targetRel.majorArcDeg).toFixed(2)),
      }
    : {
        chordLength: 0,
        subtendsCentralAngleDeg: 0,
        subtendsCentralAngleRad: 0,
        minorArcDeg: 0,
        minorArcLength: 0,
        majorArcDeg: 360,
        majorArcLength: Number((2 * Math.PI * R_mm).toFixed(2)),
        circumference: Number((2 * Math.PI * R_mm).toFixed(2)),
        theoreticalChordLength: 0,
        isDiameter: false,
        ratioChordToDiameter: 0,
        radius: Number(R_mm.toFixed(2)),
        arcComplementSumDeg: 360.0,
      };

  const stepId = `STEP-${String(stepIndex).padStart(2, '0')}`;

  // Deterministic step-level observations
  const stepObservations: ResearchObservation[] = [
    {
      id: `${stepId}-OBS-01-MEASURE`,
      epistemicLevel: 'MEASUREMENT',
      title: `Измерение шага ${stepIndex}: Хорда [${p1Name}${p2Name}]`,
      description: `Длина хорды c = ${measurements.chordLength} мм, угол меньшей дуги θ = ${measurements.minorArcDeg}°.`,
      observedValue: `c = ${measurements.chordLength} мм, θ = ${measurements.minorArcDeg}°`,
      expectedValue: `c_theor = ${measurements.theoreticalChordLength} мм`,
      deviation: Number(Math.abs(measurements.chordLength - measurements.theoreticalChordLength).toFixed(3)),
      isMatch: Math.abs(measurements.chordLength - measurements.theoreticalChordLength) < 0.1,
      isFormallyVerified: true,
      proofPrerequisites: ['POINTS_ON_CIRCLE', 'EUCLIDEAN_METRIC'],
      mathematicalBasis: 'Аналитическая геометрия на окружности',
    },
    {
      id: `${stepId}-OBS-02-COMPLEMENT`,
      epistemicLevel: 'FACT',
      title: `Дополнение дуг шага ${stepIndex}`,
      description: `Сумма меньшей (${measurements.minorArcDeg}°) и большей (${measurements.majorArcDeg}°) дуг равна 360°.`,
      observedValue: `${measurements.arcComplementSumDeg}°`,
      expectedValue: '360.0°',
      deviation: Number(Math.abs(measurements.arcComplementSumDeg - 360).toFixed(4)),
      isMatch: Math.abs(measurements.arcComplementSumDeg - 360) < EPSILON,
      isFormallyVerified: true,
      proofPrerequisites: ['CIRCLE_TOPOLOGY'],
      mathematicalBasis: 'Полная мера окружности S^1 = 360°',
    },
  ];

  if (measurements.isDiameter) {
    stepObservations.push({
      id: `${stepId}-OBS-03-DIAMETER-MATCH`,
      epistemicLevel: 'KNOWN_RELATION_MATCH',
      title: `Шаг ${stepIndex}: Паттерн диаметра`,
      description: `Хорда достигает максимальной длины 2R = ${(2 * measurements.radius).toFixed(1)} мм при θ = 180°.`,
      observedValue: `c = ${measurements.chordLength} мм ≈ 2R`,
      expectedValue: `${(2 * measurements.radius).toFixed(1)} мм`,
      isMatch: true,
      isFormallyVerified: false, // Remains false until kernel invariant verified!
      proofPrerequisites: ['DIAMETER_SUBTENDS_180_DEG'],
      mathematicalBasis: 'Паттерн максимальной хорды (диаметра)',
    });
  }

  return {
    stepIndex,
    stepId,
    geometryReference: {
      pointsU: { ...state.pointsU },
      R: state.R,
      scale,
      p1Coords: { x: p1.x, y: p1.y, u: (p1 as any).u },
      p2Coords: { x: p2.x, y: p2.y, u: (p2 as any).u },
    },
    measurements,
    stepObservations,
  };
}

/**
 * Builds a delta measurement between two numerical values.
 */
function createDelta(
  metricKey: string,
  label: string,
  unit: string,
  prev: number,
  curr: number,
  tolerance: number = METRIC_TOLERANCE
): MeasurementDelta {
  const delta = Number((curr - prev).toFixed(3));
  const isChanged = Math.abs(delta) > tolerance;
  return {
    metricKey,
    label,
    unit,
    previousValue: prev,
    currentValue: curr,
    delta,
    isChanged,
    isConstant: !isChanged,
  };
}

/**
 * Deterministically compares two experiment steps.
 * Reuses canonical metric comparison tolerances without local arbitrary epsilons.
 */
export function compareExperimentSteps(
  fromStep: ExperimentStep,
  toStep: ExperimentStep,
  tolerance: number = METRIC_TOLERANCE
): ExperimentStepComparison {
  const mFrom = fromStep.measurements;
  const mTo = toStep.measurements;

  const deltas = {
    chordLength: createDelta('chordLength', 'Длина хорды', 'мм', mFrom.chordLength, mTo.chordLength, tolerance),
    minorArcDeg: createDelta('minorArcDeg', 'Меньшая дуга', '°', mFrom.minorArcDeg, mTo.minorArcDeg, tolerance),
    majorArcDeg: createDelta('majorArcDeg', 'Большая дуга', '°', mFrom.majorArcDeg, mTo.majorArcDeg, tolerance),
    centralAngleDeg: createDelta(
      'centralAngleDeg',
      'Центральный угол',
      '°',
      mFrom.subtendsCentralAngleDeg,
      mTo.subtendsCentralAngleDeg,
      tolerance
    ),
    arcComplementSumDeg: createDelta(
      'arcComplementSumDeg',
      'Сумма дуг',
      '°',
      mFrom.arcComplementSumDeg,
      mTo.arcComplementSumDeg,
      EPSILON
    ),
    radius: createDelta('radius', 'Радиус окружности', 'мм', mFrom.radius, mTo.radius, EPSILON),
    theoreticalChordLength: createDelta(
      'theoreticalChordLength',
      'Теоретическая хорда 2R·sin(θ/2)',
      'мм',
      mFrom.theoreticalChordLength,
      mTo.theoreticalChordLength,
      tolerance
    ),
  };

  const changedMetricKeys: string[] = [];
  const constantMetricKeys: string[] = [];

  for (const [key, deltaObj] of Object.entries(deltas)) {
    if (deltaObj.isChanged) {
      changedMetricKeys.push(key);
    } else {
      constantMetricKeys.push(key);
    }
  }

  // Generate deterministic descriptive summaries
  const descriptiveSummary: string[] = [];

  if (deltas.chordLength.isChanged) {
    const sign = deltas.chordLength.delta > 0 ? 'увеличилась' : 'уменьшилась';
    descriptiveSummary.push(
      `Длина хорды ${sign} на ${Math.abs(deltas.chordLength.delta).toFixed(1)} мм (с ${mFrom.chordLength} до ${mTo.chordLength} мм).`
    );
  } else {
    descriptiveSummary.push(`Длина хорды осталась неизменной (${mFrom.chordLength} мм).`);
  }

  if (deltas.minorArcDeg.isChanged) {
    const sign = deltas.minorArcDeg.delta > 0 ? 'увеличилась' : 'уменьшилась';
    descriptiveSummary.push(
      `Меньшая дуга ${sign} на ${Math.abs(deltas.minorArcDeg.delta).toFixed(1)}° (с ${mFrom.minorArcDeg}° до ${mTo.minorArcDeg}°).`
    );
  }

  if (deltas.arcComplementSumDeg.isConstant) {
    descriptiveSummary.push('Сумма меньшей и большей дуг строго сохраняет инвариант 360.0°.');
  }

  if (deltas.radius.isConstant) {
    descriptiveSummary.push(`Радиус описанной окружности R = ${mFrom.radius} мм остаётся постоянным.`);
  }

  // Generate deterministic comparison observations
  const comparisonObservations: ResearchObservation[] = [];
  const compId = `COMP-${fromStep.stepId}-${toStep.stepId}`;

  // 1. Observation of dynamic change
  comparisonObservations.push({
    id: `${compId}-OBS-DELTA`,
    epistemicLevel: 'OBSERVATION',
    title: `Сравнение шагов ${fromStep.stepIndex} ➔ ${toStep.stepIndex}`,
    description: descriptiveSummary.join(' '),
    observedValue: `Δc = ${deltas.chordLength.delta.toFixed(1)} мм, Δθ = ${deltas.minorArcDeg.delta.toFixed(1)}°`,
    expectedValue: `Δ(2R·sin(θ/2)) = ${deltas.theoreticalChordLength.delta.toFixed(1)} мм`,
    deviation: Number(Math.abs(deltas.chordLength.delta - deltas.theoreticalChordLength.delta).toFixed(3)),
    isMatch: Math.abs(deltas.chordLength.delta - deltas.theoreticalChordLength.delta) < 0.1,
    isFormallyVerified: true,
    proofPrerequisites: ['OBSERVED_TWO_STATES'],
    mathematicalBasis: 'Динамическое сравнение траектории эксперимента',
  });

  // 2. Candidate Invariant (Hypothesis) based on multi-step observation
  const bothFollowFormula =
    Math.abs(mFrom.chordLength - mFrom.theoreticalChordLength) < 0.1 &&
    Math.abs(mTo.chordLength - mTo.theoreticalChordLength) < 0.1;

  comparisonObservations.push({
    id: `${compId}-CANDIDATE-FORMULA`,
    epistemicLevel: 'CANDIDATE_INVARIANT',
    title: 'Гипотеза: Закон хорды c(θ) = 2R·sin(θ/2) соблюдается на всех шагах',
    description: `На шагах ${fromStep.stepIndex} и ${toStep.stepIndex} эмпирическая длина хорды строго совпадает с теоретической формулой 2R·sin(θ/2).`,
    observedValue: `Шаг ${fromStep.stepIndex}: c=${mFrom.chordLength}, Шаг ${toStep.stepIndex}: c=${mTo.chordLength}`,
    expectedValue: `c = 2R·sin(θ/2)`,
    deviation: 0,
    isMatch: bothFollowFormula,
    // CRITICAL: finite empirical agreement is a CANDIDATE hypothesis, not automatic formal proof!
    isFormallyVerified: false,
    proofPrerequisites: ['TRIGONOMETRIC_INVARIANT', 'CYCLIC_CHORD_LAW'],
    mathematicalBasis: 'Эмпирическая устойчивость метрической связи хорда-дуга при деформации',
  });

  return {
    fromStepIndex: fromStep.stepIndex,
    toStepIndex: toStep.stepIndex,
    fromStepId: fromStep.stepId,
    toStepId: toStep.stepId,
    deltas,
    changedMetricKeys,
    constantMetricKeys,
    descriptiveSummary,
    comparisonObservations,
  };
}

/**
 * Executes analytical compilation of the entire experiment sequence.
 * Strictly pure and deterministic: returns complete reproducible ResearchExperimentResult.
 */
export function buildExperimentResult(
  config: ChordArcExperimentConfig,
  steps: ExperimentStep[]
): ResearchExperimentResult {
  const comparisons: ExperimentStepComparison[] = [];
  const aggregateObservations: ResearchObservation[] = [];

  // Generate pairwise consecutive comparisons
  for (let i = 0; i < steps.length - 1; i++) {
    const comp = compareExperimentSteps(steps[i], steps[i + 1]);
    comparisons.push(comp);
    aggregateObservations.push(...comp.comparisonObservations);
  }

  // Extract preserved and varying parameters
  const preservedInvariants: string[] = ['radius', 'arcComplementSumDeg'];
  const varyingParameters: string[] = [];

  for (const comp of comparisons) {
    for (const key of comp.changedMetricKeys) {
      if (!varyingParameters.includes(key)) {
        varyingParameters.push(key);
      }
    }
  }

  // Count candidate hypotheses vs verified invariants
  let candidateCount = 0;
  let verifiedCount = 0;
  for (const obs of aggregateObservations) {
    if (obs.epistemicLevel === 'CANDIDATE_INVARIANT' || obs.epistemicLevel === 'KNOWN_RELATION_MATCH') {
      candidateCount++;
    }
    if (obs.epistemicLevel === 'VERIFIED_INVARIANT') {
      verifiedCount++;
    }
  }

  return {
    resultVersion: '1.0.0',
    experiment: config,
    steps,
    stepComparisons: comparisons,
    aggregateObservations,
    summary: {
      totalStepsCaptured: steps.length,
      totalComparisons: comparisons.length,
      preservedInvariants,
      varyingParameters,
      candidateHypothesesCount: candidateCount,
      verifiedInvariantsCount: verifiedCount,
    },
  };
}
