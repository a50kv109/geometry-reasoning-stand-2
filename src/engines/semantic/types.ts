// src/engines/semantic/types.ts
// Universal Semantic Command Interface for 2D School Geometry Stand
// Implements "One Geometry, Many Clients" and "Agent may be wrong. The Stand must not."
// Pure deterministic schema definitions for Human UI and AI Agent commands.

import { FullGeometryState, GeometryPoint, GeometrySegment, GeometryLine, GeometryCircle } from '../constructionCore';
import { ConfigurationSummary, GeometryConfigurationView, ConfigurationEpistemicEntry } from '../configuration/types';
import { SemanticRelation } from '../configuration/semanticRelation';
import { SemanticQuantity } from '../configuration/semanticQuantity';

export type SemanticCommandType =
  // A. Configuration
  | 'SET_TRIANGLE_ANGLES'
  | 'SET_VERTEX_POSITION'
  | 'MOVE_VERTEX'
  | 'RESET_GEOMETRY'
  | 'CLEAR_USER_CONSTRUCTIONS'
  // B. Base Primitives
  | 'DRAW_POINT'
  | 'DRAW_SEGMENT'
  | 'DRAW_LINE'
  | 'DRAW_CIRCLE'
  // C. School Mode Constructions
  | 'CONSTRUCT_ANGLE_BISECTOR'
  | 'CONSTRUCT_PERPENDICULAR'
  | 'CONSTRUCT_PARALLEL'
  | 'CONSTRUCT_PERPENDICULAR_BISECTOR'
  | 'ERASE_OBJECT'
  // D. Observation / Read-only
  | 'GET_GEOMETRY_STATE'
  | 'GET_CONFIGURATION'
  | 'GET_RELATIONS'
  | 'GET_MEASUREMENTS'
  | 'GET_VERIFIED_FACTS'
  // E. Epistemic Verification
  | 'VERIFY_RELATION'
  // F. Project Persistence
  | 'SAVE_PROJECT'
  | 'LOAD_PROJECT'
  // G. Batch
  | 'BATCH_SEMANTIC_COMMANDS';

export type SemanticCommandErrorCode =
  | 'INVALID_COMMAND'
  | 'INVALID_PAYLOAD'
  | 'ENTITY_NOT_FOUND'
  | 'DEGENERATE_LINE'
  | 'DEGENERATE_ANGLE'
  | 'POINTS_COINCIDENT'
  | 'POINT_ON_LINE_NOT_ALLOWED'
  | 'TRIANGLE_ANGLE_SUM_INVALID'
  | 'INSUFFICIENT_ANGLES'
  | 'PRECONDITION_FAILED'
  | 'BASE_OBJECT_IMMUTABLE'
  | 'INVALID_PROJECT_FORMAT'
  | 'UNSUPPORTED_PROJECT_VERSION'
  | 'CORRUPTED_PROJECT'
  | 'UNKNOWN_ERROR';

// --- Individual Command Payloads ---

export interface SetTriangleAnglesPayload {
  command: 'SET_TRIANGLE_ANGLES';
  angles: {
    A?: number | null;
    B?: number | null;
    C?: number | null;
  };
}

export interface SetVertexPositionPayload {
  command: 'SET_VERTEX_POSITION' | 'MOVE_VERTEX';
  vertexId: string;
  u?: number;
  x?: number;
  y?: number;
}

export interface ResetGeometryPayload {
  command: 'RESET_GEOMETRY';
  pointsU?: { A: number; B: number; C: number };
  R?: number;
}

export interface ClearUserConstructionsPayload {
  command: 'CLEAR_USER_CONSTRUCTIONS';
}

export interface DrawPointPayload {
  command: 'DRAW_POINT';
  x: number;
  y: number;
  name?: string;
  color?: string;
  onCircle?: boolean;
}

export interface DrawSegmentPayload {
  command: 'DRAW_SEGMENT';
  p1Id: string;
  p2Id: string;
  color?: string;
}

export interface DrawLinePayload {
  command: 'DRAW_LINE';
  p1Id: string;
  p2Id: string;
  color?: string;
}

export interface DrawCirclePayload {
  command: 'DRAW_CIRCLE';
  centerId: string;
  radiusPointId?: string;
  radius?: number;
  color?: string;
}

export interface ConstructAngleBisectorPayload {
  command: 'CONSTRUCT_ANGLE_BISECTOR';
  vertex: string;
  pAId?: string;
  pBId?: string;
  color?: string;
}

export interface ConstructPerpendicularPayload {
  command: 'CONSTRUCT_PERPENDICULAR';
  reference: string; // e.g. "AB", "chord_AB", "line_1"
  through: string | { x: number; y: number }; // Point ID or coordinates
  color?: string;
}

export interface ConstructParallelPayload {
  command: 'CONSTRUCT_PARALLEL';
  reference: string; // e.g. "AB", "chord_AB", "line_1"
  through: string | { x: number; y: number }; // Point ID or coordinates
  color?: string;
}

export interface ConstructPerpendicularBisectorPayload {
  command: 'CONSTRUCT_PERPENDICULAR_BISECTOR';
  point1?: string;
  point2?: string;
  reference?: string; // e.g. "AB", "chord_AB"
  color?: string;
}

export interface EraseObjectPayload {
  command: 'ERASE_OBJECT';
  objectType?: 'point' | 'segment' | 'line' | 'circle';
  id: string;
}

export interface GetGeometryStatePayload {
  command: 'GET_GEOMETRY_STATE';
}

export interface GetConfigurationPayload {
  command: 'GET_CONFIGURATION';
}

export interface GetRelationsPayload {
  command: 'GET_RELATIONS';
  filter?: {
    entityId?: string;
    type?: string;
    status?: 'CONSTRUCTED' | 'DERIVED' | 'VERIFIED';
  };
}

export interface GetMeasurementsPayload {
  command: 'GET_MEASUREMENTS';
  filter?: {
    target?: string;
    semanticType?: string;
  };
}

export interface GetVerifiedFactsPayload {
  command: 'GET_VERIFIED_FACTS';
}

export interface VerifyRelationPayload {
  command: 'VERIFY_RELATION';
  relation:
    | 'PERPENDICULAR'
    | 'PARALLEL'
    | 'ANGLE_BISECTOR'
    | 'PERPENDICULAR_BISECTOR'
    | 'DIAMETER'
    | 'CHORD'
    | 'POINT_ON_CIRCLE'
    | 'THALES_INSCRIBED_RIGHT_ANGLE'
    | 'TANGENT'
    | string;
  subject?: string;
  reference?: string;
  target?: string;
  points?: string[];
}

export interface SaveProjectPayload {
  command: 'SAVE_PROJECT';
  name?: string;
  description?: string;
  author?: string;
  tags?: string[];
  benchmarkId?: string;
  pretty?: boolean;
}

export interface LoadProjectPayload {
  command: 'LOAD_PROJECT';
  project: unknown; // JSON string or object
}

export interface BatchSemanticCommandsPayload {
  command: 'BATCH_SEMANTIC_COMMANDS';
  commands: SemanticCommand[];
}

export type SemanticCommand =
  | SetTriangleAnglesPayload
  | SetVertexPositionPayload
  | ResetGeometryPayload
  | ClearUserConstructionsPayload
  | DrawPointPayload
  | DrawSegmentPayload
  | DrawLinePayload
  | DrawCirclePayload
  | ConstructAngleBisectorPayload
  | ConstructPerpendicularPayload
  | ConstructParallelPayload
  | ConstructPerpendicularBisectorPayload
  | EraseObjectPayload
  | GetGeometryStatePayload
  | GetConfigurationPayload
  | GetRelationsPayload
  | GetMeasurementsPayload
  | GetVerifiedFactsPayload
  | VerifyRelationPayload
  | SaveProjectPayload
  | LoadProjectPayload
  | BatchSemanticCommandsPayload;

// --- Command Execution Structured Result Protocol ---

export interface SemanticEntitySummary {
  readonly id: string;
  readonly kind: 'point' | 'segment' | 'line' | 'circle';
  readonly name?: string;
  readonly role?: 'primary' | 'auxiliary';
}

export interface SemanticVerificationReport {
  readonly relation: string;
  readonly status: 'VERIFIED' | 'REFUTED' | 'UNVERIFIED';
  readonly isProven: boolean;
  readonly explanation: string;
  readonly subjectId?: string;
  readonly referenceId?: string;
  readonly matchedRelation?: SemanticRelation;
  readonly matchedFact?: ConfigurationEpistemicEntry;
  readonly mathematicalCheck?: Record<string, unknown>;
}

export interface SemanticCommandResult {
  readonly success: boolean;
  readonly command: SemanticCommandType;
  readonly stateChanged: boolean;
  readonly nextState: FullGeometryState;
  readonly previousState: FullGeometryState;
  readonly errorCode?: SemanticCommandErrorCode;
  readonly errorMessage?: string;
  readonly createdEntities?: readonly SemanticEntitySummary[];
  readonly affectedEntities?: readonly string[];
  readonly derivedRelations?: readonly SemanticRelation[];
  readonly measurements?: readonly SemanticQuantity[];
  readonly verifiedFacts?: readonly ConfigurationEpistemicEntry[];
  readonly configurationSummary?: ConfigurationSummary;
  readonly configurationView?: GeometryConfigurationView;
  readonly appliedParameters?: Record<string, unknown>;
  readonly infoMessage?: string;
  readonly verification?: SemanticVerificationReport;
  readonly savedProject?: unknown;
  readonly serializedProject?: string;
}
