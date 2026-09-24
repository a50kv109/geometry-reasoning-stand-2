// src/components/school/reference/schoolKnowledgeTypes.ts
// Contract types for Packet #3: Contextual School Reference
// Complies with strict three-layer data separation and 'One Geometry, Many Clients' invariant

import { GeometryRole, GeometryProvenance } from '../../../engines/constructionCore';

/**
 * LAYER 1 — VERIFIED GEOMETRY FACTS
 * Machine-verifiable assertions about the current geometry state.
 * Read-only reflection of mathematical truth from the Geometry Core.
 */
export interface VerifiedGeometryFacts {
  entityId: string;
  entityType: 'point' | 'segment' | 'line' | 'circle';

  // Point-specific verified facts
  isPointOnCircle?: boolean;
  isCenter?: boolean;
  isBaseVertex?: boolean;
  pointRole?: GeometryRole;
  coordinates?: { x: number; y: number };

  // Segment/Chord-specific verified facts
  isBaseChord?: boolean;
  isDiameter?: boolean;
  passesThroughCenter?: boolean;
  segmentLength?: number;
  segmentEndpoints?: { p1Id: string; p2Id: string };
  endpointsOnCircle?: boolean;

  // Line-specific verified facts
  lineEndpoints?: { p1Id: string; p2Id: string };
  circleIntersectionCount?: number; // 0, 1 (tangent), 2 (secant)
  distanceToCenter?: number;

  // Circle-specific verified facts
  isBaseCircumcircle?: boolean;
  circleRadius?: number;
  circleCenterId?: string;
  circleRole?: GeometryRole;

  // Angle / Special configuration facts
  subtendedArcDeg?: number;
  subtendsDiameter?: boolean;
  isRightAngle?: boolean;
  angleDeg?: number;

  // Provenance & Architectural Role
  provenance?: GeometryProvenance;
  role?: GeometryRole;
}

/**
 * LAYER 2 — DERIVED ENTITY CLASSIFICATION
 * Deterministic interpretation of verified facts.
 * Never assigned directly from raw entity.type alone.
 */
export type DerivedEntityClassification =
  | 'BASE_CIRCUMCIRCLE'
  | 'AUXILIARY_CIRCLE'
  | 'BASE_VERTEX'
  | 'CIRCUMCENTER'
  | 'POINT_ON_CIRCLE'
  | 'FREE_POINT'
  | 'AUXILIARY_CONSTRUCTION_POINT'
  | 'DIAMETER'
  | 'BASE_CHORD'
  | 'FREE_SEGMENT'
  | 'SECANT_LINE'
  | 'PARALLEL_LINE'
  | 'PERPENDICULAR_LINE'
  | 'PERPENDICULAR_BISECTOR'
  | 'ANGLE_BISECTOR'
  | 'INSCRIBED_RIGHT_ANGLE'
  | 'INSCRIBED_ANGLE'
  | 'CENTRAL_ANGLE'
  | 'GENERAL_LINE';

/**
 * LAYER 3 & 4 — CONTEXTUAL EXPLANATION PAYLOAD
 * Stable data contract delivered to the passive UI layer.
 */
export interface ContextualExplanationPayload {
  entityId: string;
  entityName: string;
  classification: DerivedEntityClassification;
  badge: {
    label: string;
    variant: 'primary' | 'auxiliary' | 'theorem' | 'base';
  };
  level1_identification: {
    title: string;
    definition: string;
  };
  level2_properties: {
    items: string[];
  };
  level3_provenance: {
    hasProvenance: boolean;
    description?: string;
    macroType?: string;
    role: GeometryRole | 'base';
  };
  level4_theorem?: {
    name: string;
    statement: string;
    formula?: string;
  };
}
