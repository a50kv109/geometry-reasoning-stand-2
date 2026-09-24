// src/engines/research/researchTypes.ts
// Data contracts and type definitions for Packet #4 Research Layer

import { VertexId } from '../../types';
import { GeometryProvenance, GeometryRole } from '../constructionCore';

/**
 * Derived Chord <-> Minor/Major Arc Relation
 * Computed dynamically on demand; Arc is NOT a persistent primitive in GeometryState.
 */
export interface DerivedChordArcRelation {
  chordId: string;
  p1Id: string;
  p2Id: string;
  p1Name: string;
  p2Name: string;
  chordLength: number; // Euclidean length c (in mm)
  subtendsCentralAngleDeg: number; // Central angle theta in degrees [0, 360)
  subtendsCentralAngleRad: number; // Central angle in radians
  minorArcDeg: number; // theta_min in [0, 180]
  minorArcLength: number; // s_min = R * theta_min_rad
  majorArcDeg: number; // theta_maj = 360 - theta_min in [180, 360]
  majorArcLength: number; // s_maj = R * theta_maj_rad
  circumference: number; // 2 * PI * R
  theoreticalChordLength: number; // 2 * R * sin(theta_min / 2)
  isDiameter: boolean; // theta_min approx 180 deg
  ratioChordToDiameter: number; // c / (2R) <= 1.0
}

/**
 * Central Angle <-> Inscribed Angle Relation
 * Relates central angle theta to inscribed angle alpha subtending the same arc.
 */
export interface CentralInscribedAngleRelation {
  arcId: string;
  chordLabel: string;
  centralAngleDeg: number; // theta
  inscribedVertexId?: VertexId | string;
  inscribedAngleDeg?: number; // alpha
  theoreticalInscribedAngleDeg?: number; // theta / 2
  relationVerified: boolean; // |alpha - theta/2| < 1e-4
  isRightAngle: boolean; // theta approx 180 => alpha approx 90
}

/**
 * Node in the deterministic topological construction trace.
 */
export interface StructuralTraceNode {
  id: string;
  kind: 'point' | 'segment' | 'line' | 'circle';
  name: string;
  role: GeometryRole;
  depth: number; // Topological depth (0 for base elements, 1+ for derived)
  groupId?: string;
  provenance?: GeometryProvenance;
  parentIds: string[];
}

/**
 * Group aggregation in the construction trace.
 */
export interface ConstructionGroupSummary {
  groupId: string;
  macroType: string;
  primaryId: string;
  auxiliaryCount: number;
  allEntityIds: string[];
}

/**
 * Deterministic structural/topological construction trace.
 * NOTE: This is a structural reconstruction, NOT an exact historical event log.
 */
export interface ConstructionTrace {
  readonly isHistoricalLog: false;
  readonly structuralNote: string;
  nodes: StructuralTraceNode[];
  groups: ConstructionGroupSummary[];
  totalEntities: number;
  maxTopologicalDepth: number;
}

/**
 * Epistemic status in the scientific reasoning pipeline:
 * Measurement -> Fact -> Observation -> Candidate Invariant -> Known Relation Match -> Verified Invariant
 */
export type EpistemicStatus =
  | 'MEASUREMENT'
  | 'FACT'
  | 'OBSERVATION'
  | 'CANDIDATE_INVARIANT'
  | 'KNOWN_RELATION_MATCH'
  | 'VERIFIED_INVARIANT';

/**
 * Observation item in the epistemic pipeline.
 */
export interface ResearchObservation {
  id: string;
  epistemicLevel: EpistemicStatus;
  title: string;
  description: string;
  observedValue: string | number;
  expectedValue?: string | number;
  deviation?: number;
  isMatch: boolean;
  isFormallyVerified: boolean; // Explicitly distinguished from isMatch!
  proofPrerequisites: string[];
  mathematicalBasis: string;
}

/**
 * Deterministic Research Snapshot
 * Contains ZERO timestamps, ZERO random identifiers, ensuring byte-for-byte reproducibility.
 */
export interface ResearchSnapshot {
  readonly snapshotVersion: '1.0.0';
  source: {
    pointsU: { A: number; B: number; C: number };
    R: number;
    scale: number;
  };
  vertices: Array<{
    id: string;
    name: string;
    u?: number;
    x: number;
    y: number;
    onCircle: boolean;
  }>;
  chordArcRelations: DerivedChordArcRelation[];
  centralInscribedRelations: CentralInscribedAngleRelation[];
  constructionTrace: ConstructionTrace;
  observations: ResearchObservation[];
  summary: {
    totalEntities: number;
    candidateCount: number;
    matchedRelationCount: number;
    verifiedInvariantCount: number;
  };
}
