// src/engines/research/experimentTypes.ts
// Data contracts and pure types for Packet #5: Dynamic Geometric Experiment Engine

import { FullGeometryState } from '../constructionCore';
import { ResearchObservation } from './researchTypes';

/**
 * Identifier for research experiments in the stand.
 */
export type ExperimentId = 'chord_arc_dynamic';

/**
 * Configuration for the Canonical Chord-Arc Dynamic Relation Experiment.
 */
export interface ChordArcExperimentConfig {
  readonly experimentId: ExperimentId;
  readonly title: string;
  readonly description: string;
  readonly targetChordKey: string; // 'AB' | 'BC' | 'CA' or segment ID
  readonly p1Id: string;
  readonly p2Id: string;
  readonly p1Name: string;
  readonly p2Name: string;
  readonly fixedVertexId?: string;
  readonly movingVertexId?: string;
}

/**
 * Exact analytical measurements recorded at a single experiment step.
 * Reuses canonical values from the geometry core.
 */
export interface ExperimentMeasurement {
  chordLength: number; // Euclidean metric c (mm)
  subtendsCentralAngleDeg: number; // theta [0, 360)
  subtendsCentralAngleRad: number; // theta in radians
  minorArcDeg: number; // theta_min in [0, 180]
  minorArcLength: number; // s_min = R * theta_min_rad
  majorArcDeg: number; // theta_maj = 360 - theta_min in [180, 360]
  majorArcLength: number; // s_maj = R * theta_maj_rad
  circumference: number; // 2 * PI * R
  theoreticalChordLength: number; // 2 * R * sin(theta_min / 2)
  isDiameter: boolean; // theta_min approx 180 deg
  ratioChordToDiameter: number; // c / (2R) <= 1.0
  radius: number; // R (mm)
  arcComplementSumDeg: number; // minorArcDeg + majorArcDeg = 360.0
}

/**
 * A single captured experiment step.
 * Strictly pure and deterministic: ZERO timestamps, ZERO wall-clock metadata, ZERO randomness.
 */
export interface ExperimentStep {
  stepIndex: number;
  stepId: string; // Deterministic semantic ID, e.g. "STEP-00", "STEP-01"
  geometryReference: {
    pointsU: { A: number; B: number; C: number };
    R: number;
    scale: number;
    p1Coords: { x: number; y: number; u?: number };
    p2Coords: { x: number; y: number; u?: number };
  };
  measurements: ExperimentMeasurement;
  stepObservations: ResearchObservation[];
}

/**
 * Delta representation for an individual numerical metric between two steps.
 */
export interface MeasurementDelta {
  metricKey: string;
  label: string;
  unit: string;
  previousValue: number;
  currentValue: number;
  delta: number; // currentValue - previousValue
  isChanged: boolean; // |delta| > tolerance
  isConstant: boolean; // |delta| <= tolerance
}

/**
 * Deterministic comparison between two consecutive experiment steps.
 */
export interface ExperimentStepComparison {
  fromStepIndex: number;
  toStepIndex: number;
  fromStepId: string;
  toStepId: string;
  deltas: {
    chordLength: MeasurementDelta;
    minorArcDeg: MeasurementDelta;
    majorArcDeg: MeasurementDelta;
    centralAngleDeg: MeasurementDelta;
    arcComplementSumDeg: MeasurementDelta;
    radius: MeasurementDelta;
    theoreticalChordLength: MeasurementDelta;
  };
  changedMetricKeys: string[];
  constantMetricKeys: string[];
  descriptiveSummary: string[];
  comparisonObservations: ResearchObservation[];
}

/**
 * Complete reproducible result of an experiment sequence.
 * 100% serializable and deterministic across multiple runs.
 */
export interface ResearchExperimentResult {
  readonly resultVersion: '1.0.0';
  readonly experiment: ChordArcExperimentConfig;
  readonly steps: ExperimentStep[];
  readonly stepComparisons: ExperimentStepComparison[];
  readonly aggregateObservations: ResearchObservation[];
  readonly summary: {
    totalStepsCaptured: number;
    totalComparisons: number;
    preservedInvariants: string[];
    varyingParameters: string[];
    candidateHypothesesCount: number;
    verifiedInvariantsCount: number;
  };
}
