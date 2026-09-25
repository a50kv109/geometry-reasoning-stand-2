// src/engines/project/types.ts
// Single Source of Truth for Geometry Reasoning Stand Project persistence format
// Complies with "One Geometry, Many Clients" and "The Stand must never be wrong" invariants.

import { FullGeometryState } from '../constructionCore';

export const GEOMETRY_PROJECT_FORMAT_ID = 'geometry-reasoning-stand-project' as const;
export const CURRENT_PROJECT_SCHEMA_VERSION = 1 as const;

export type GeometryProjectFormat = typeof GEOMETRY_PROJECT_FORMAT_ID;
export type GeometryProjectVersion = typeof CURRENT_PROJECT_SCHEMA_VERSION;

/**
 * Human and Machine-readable metadata for a Geometry Project.
 */
export interface GeometryProjectMetadata {
  /** Display title / problem name */
  name: string;
  /** Detailed description, theorem problem statement, or agent intent */
  description?: string;
  /** Author name or Agent ID */
  author?: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last modified timestamp */
  modifiedAt: string;
  /** Tags or curriculum classification (e.g. ['thales', 'circle', 'invariants']) */
  tags?: string[];
  /** Optional problem benchmark identifier (e.g. 'AAM-20', 'THALES-01') */
  benchmarkId?: string;
}

/**
 * Persistable environmental geometric parameters (pure geometric model configuration).
 */
export interface GeometryProjectSettings {
  /** Rotation angle of the base circular model in degrees [0, 360) */
  rotationDeg?: number;
  /** Measurement scale (e.g. 1.0 px/mm) */
  scale?: number;
  /** Scale display mode */
  scaleMode?: 'degrees' | 'radians' | 'fractions';
  /** Optional client layout preference (non-mathematical hint) */
  clientModeHint?: 'research' | 'school';
}

/**
 * Version 1 Geometry Project schema.
 * Contains the pure, validated Single Source of Truth (GeometryState + Construction DAG provenance).
 * Derived values (intersections, verified facts, configuration passports) are recomputed deterministically upon load.
 */
export interface GeometryProjectV1 {
  /** Explicit format identifier */
  readonly format: typeof GEOMETRY_PROJECT_FORMAT_ID;
  /** Schema version */
  readonly version: 1;
  /** Metadata */
  readonly metadata: GeometryProjectMetadata;
  /** Pure SSOT Geometry State */
  readonly geometryState: FullGeometryState;
  /** Non-UI environmental settings */
  readonly settings?: GeometryProjectSettings;
}

export type GeometryProject = GeometryProjectV1;

/**
 * Validation error details.
 */
export interface ProjectValidationError {
  readonly code:
    | 'INVALID_JSON'
    | 'INVALID_FORMAT_ID'
    | 'UNSUPPORTED_VERSION'
    | 'MISSING_GEOMETRY_STATE'
    | 'INVALID_GEOMETRY_STATE'
    | 'CORRUPTED_ENTITY'
    | 'DANGLING_REFERENCE'
    | 'DUPLICATE_ID'
    | 'SCHEMA_VIOLATION';
  readonly message: string;
  readonly path?: string;
}

/**
 * Result of project validation.
 */
export interface ProjectValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ProjectValidationError[];
  readonly detectedVersion?: number;
  readonly format?: string;
}

/**
 * Result of project deserialization / restoration.
 */
export type ProjectDeserializationResult =
  | {
      readonly success: true;
      readonly project: GeometryProject;
      /** Fully recomputed, verified geometry state ready for Stand mounting */
      readonly restoredState: FullGeometryState;
      readonly warnings?: readonly string[];
    }
  | {
      readonly success: false;
      readonly errors: readonly ProjectValidationError[];
      readonly rawError?: string;
    };
