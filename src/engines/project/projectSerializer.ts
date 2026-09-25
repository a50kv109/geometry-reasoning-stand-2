// src/engines/project/projectSerializer.ts
// Pure, deterministic serialization, validation, and deserialization for Geometry Project.
// Implements strict validation and round-trip invariance without state corruption.

import { FullGeometryState } from '../constructionCore';
import { recomputeDependentGeometry } from '../dependencyRecomputer';
import {
  GEOMETRY_PROJECT_FORMAT_ID,
  CURRENT_PROJECT_SCHEMA_VERSION,
  GeometryProject,
  GeometryProjectV1,
  GeometryProjectMetadata,
  GeometryProjectSettings,
  ProjectValidationResult,
  ProjectValidationError,
  ProjectDeserializationResult,
} from './types';

/**
 * Creates a valid GeometryProject container from a live GeometryState.
 */
export function createGeometryProject(
  geometryState: FullGeometryState,
  options?: {
    name?: string;
    description?: string;
    author?: string;
    tags?: string[];
    benchmarkId?: string;
    settings?: GeometryProjectSettings;
    createdAt?: string;
    modifiedAt?: string;
  }
): GeometryProjectV1 {
  const now = new Date().toISOString();
  const metadata: GeometryProjectMetadata = {
    name: options?.name?.trim() || 'Геометрический проект',
    description: options?.description?.trim(),
    author: options?.author?.trim() || 'User / AI Reasoner',
    createdAt: options?.createdAt || now,
    modifiedAt: options?.modifiedAt || now,
    tags: options?.tags,
    benchmarkId: options?.benchmarkId,
  };

  // Deep clone geometryState to guarantee immutability
  const stateCopy: FullGeometryState = JSON.parse(JSON.stringify(geometryState));

  return {
    format: GEOMETRY_PROJECT_FORMAT_ID,
    version: CURRENT_PROJECT_SCHEMA_VERSION,
    metadata,
    geometryState: stateCopy,
    settings: options?.settings ? { ...options.settings } : undefined,
  };
}

/**
 * Validates any unknown input object or JSON string against the Geometry Project schema.
 * Rejection principle: INVALID PROJECT -> NO STATE MUTATION.
 */
export function validateGeometryProject(input: unknown): ProjectValidationResult {
  const errors: ProjectValidationError[] = [];

  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON format';
      return {
        valid: false,
        errors: [{ code: 'INVALID_JSON', message: `Failed to parse JSON: ${msg}` }],
      };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      errors: [{ code: 'SCHEMA_VIOLATION', message: 'Project root must be a non-null JSON object' }],
    };
  }

  const obj = parsed as Record<string, unknown>;

  // 1. Format check
  if (obj.format !== GEOMETRY_PROJECT_FORMAT_ID) {
    errors.push({
      code: 'INVALID_FORMAT_ID',
      message: `Invalid or missing format identifier. Expected '${GEOMETRY_PROJECT_FORMAT_ID}', got '${String(obj.format)}'`,
      path: 'format',
    });
  }

  // 2. Version check
  const version = obj.version;
  if (typeof version !== 'number') {
    errors.push({
      code: 'UNSUPPORTED_VERSION',
      message: 'Project version must be a numeric integer',
      path: 'version',
    });
  } else if (version !== CURRENT_PROJECT_SCHEMA_VERSION) {
    errors.push({
      code: 'UNSUPPORTED_VERSION',
      message: `Unsupported project version: ${version}. Current supported version is ${CURRENT_PROJECT_SCHEMA_VERSION}`,
      path: 'version',
    });
  }

  // 3. Metadata check
  if (!obj.metadata || typeof obj.metadata !== 'object') {
    errors.push({
      code: 'SCHEMA_VIOLATION',
      message: 'Missing or invalid metadata object',
      path: 'metadata',
    });
  }

  // 4. GeometryState check
  const state = obj.geometryState as FullGeometryState | undefined;
  if (!state || typeof state !== 'object') {
    errors.push({
      code: 'MISSING_GEOMETRY_STATE',
      message: 'Project must contain a valid geometryState object',
      path: 'geometryState',
    });
    return {
      valid: errors.length === 0,
      errors,
      detectedVersion: typeof version === 'number' ? version : undefined,
      format: typeof obj.format === 'string' ? obj.format : undefined,
    };
  }

  // Deep GeometryState verification
  if (typeof state.R !== 'number' || isNaN(state.R) || state.R <= 0) {
    errors.push({
      code: 'INVALID_GEOMETRY_STATE',
      message: 'geometryState.R must be a positive number',
      path: 'geometryState.R',
    });
  }

  if (!state.pointsU || typeof state.pointsU !== 'object') {
    errors.push({
      code: 'INVALID_GEOMETRY_STATE',
      message: 'geometryState.pointsU must be an object { A, B, C }',
      path: 'geometryState.pointsU',
    });
  } else {
    for (const v of ['A', 'B', 'C'] as const) {
      if (typeof state.pointsU[v] !== 'number' || isNaN(state.pointsU[v])) {
        errors.push({
          code: 'INVALID_GEOMETRY_STATE',
          message: `geometryState.pointsU.${v} must be a valid numeric parameter`,
          path: `geometryState.pointsU.${v}`,
        });
      }
    }
  }

  if (!state.points || typeof state.points !== 'object') {
    errors.push({
      code: 'INVALID_GEOMETRY_STATE',
      message: 'geometryState.points must be a dictionary',
      path: 'geometryState.points',
    });
  }

  if (!state.segments || typeof state.segments !== 'object') {
    errors.push({
      code: 'INVALID_GEOMETRY_STATE',
      message: 'geometryState.segments must be a dictionary',
      path: 'geometryState.segments',
    });
  }

  if (!state.lines || typeof state.lines !== 'object') {
    errors.push({
      code: 'INVALID_GEOMETRY_STATE',
      message: 'geometryState.lines must be a dictionary',
      path: 'geometryState.lines',
    });
  }

  if (!state.circles || typeof state.circles !== 'object') {
    errors.push({
      code: 'INVALID_GEOMETRY_STATE',
      message: 'geometryState.circles must be a dictionary',
      path: 'geometryState.circles',
    });
  }

  // Check point entities and ID integrity
  const pointIds = new Set<string>();
  const allEntityIds = new Set<string>();

  if (state.points) {
    for (const [key, pt] of Object.entries(state.points)) {
      if (!pt || typeof pt !== 'object') {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Corrupted point entity at key '${key}'`,
          path: `geometryState.points.${key}`,
        });
        continue;
      }
      if (!pt.id || typeof pt.id !== 'string') {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Point '${key}' missing valid id string`,
          path: `geometryState.points.${key}.id`,
        });
      } else {
        if (pt.id !== key) {
          errors.push({
            code: 'SCHEMA_VIOLATION',
            message: `Point key '${key}' does not match entity id '${pt.id}'`,
            path: `geometryState.points.${key}`,
          });
        }
        if (pointIds.has(pt.id)) {
          errors.push({
            code: 'DUPLICATE_ID',
            message: `Duplicate point ID '${pt.id}'`,
            path: `geometryState.points.${key}`,
          });
        }
        pointIds.add(pt.id);
        allEntityIds.add(pt.id);
      }
      if (typeof pt.x !== 'number' || typeof pt.y !== 'number' || isNaN(pt.x) || isNaN(pt.y)) {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Point '${key}' has invalid coordinates (${pt.x}, ${pt.y})`,
          path: `geometryState.points.${key}`,
        });
      }
    }
  }

  // Check segment references and IDs
  const segmentIds = new Set<string>();
  if (state.segments) {
    for (const [key, seg] of Object.entries(state.segments)) {
      if (!seg || typeof seg !== 'object') {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Corrupted segment entity at key '${key}'`,
          path: `geometryState.segments.${key}`,
        });
        continue;
      }
      if (!seg.id || typeof seg.id !== 'string') {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Segment '${key}' missing valid id string`,
          path: `geometryState.segments.${key}.id`,
        });
      } else {
        if (seg.id !== key) {
          errors.push({
            code: 'SCHEMA_VIOLATION',
            message: `Segment key '${key}' does not match entity id '${seg.id}'`,
            path: `geometryState.segments.${key}`,
          });
        }
        if (segmentIds.has(seg.id)) {
          errors.push({
            code: 'DUPLICATE_ID',
            message: `Duplicate segment ID '${seg.id}'`,
            path: `geometryState.segments.${key}`,
          });
        }
        segmentIds.add(seg.id);
        allEntityIds.add(seg.id);
      }
      if (!seg.p1Id || !pointIds.has(seg.p1Id)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          message: `Segment '${key}' references non-existent point p1Id '${seg.p1Id}'`,
          path: `geometryState.segments.${key}.p1Id`,
        });
      }
      if (!seg.p2Id || !pointIds.has(seg.p2Id)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          message: `Segment '${key}' references non-existent point p2Id '${seg.p2Id}'`,
          path: `geometryState.segments.${key}.p2Id`,
        });
      }
    }
  }

  // Check line references and IDs
  const lineIds = new Set<string>();
  if (state.lines) {
    for (const [key, line] of Object.entries(state.lines)) {
      if (!line || typeof line !== 'object') {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Corrupted line entity at key '${key}'`,
          path: `geometryState.lines.${key}`,
        });
        continue;
      }
      if (!line.id || typeof line.id !== 'string') {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Line '${key}' missing valid id string`,
          path: `geometryState.lines.${key}.id`,
        });
      } else {
        if (line.id !== key) {
          errors.push({
            code: 'SCHEMA_VIOLATION',
            message: `Line key '${key}' does not match entity id '${line.id}'`,
            path: `geometryState.lines.${key}`,
          });
        }
        if (lineIds.has(line.id)) {
          errors.push({
            code: 'DUPLICATE_ID',
            message: `Duplicate line ID '${line.id}'`,
            path: `geometryState.lines.${key}`,
          });
        }
        lineIds.add(line.id);
        allEntityIds.add(line.id);
      }
      if (!line.p1Id || !pointIds.has(line.p1Id)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          message: `Line '${key}' references non-existent point p1Id '${line.p1Id}'`,
          path: `geometryState.lines.${key}.p1Id`,
        });
      }
      if (!line.p2Id || !pointIds.has(line.p2Id)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          message: `Line '${key}' references non-existent point p2Id '${line.p2Id}'`,
          path: `geometryState.lines.${key}.p2Id`,
        });
      }
    }
  }

  // Check circle references and IDs
  const circleIds = new Set<string>();
  if (state.circles) {
    for (const [key, circle] of Object.entries(state.circles)) {
      if (!circle || typeof circle !== 'object') {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Corrupted circle entity at key '${key}'`,
          path: `geometryState.circles.${key}`,
        });
        continue;
      }
      if (!circle.id || typeof circle.id !== 'string') {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Circle '${key}' missing valid id string`,
          path: `geometryState.circles.${key}.id`,
        });
      } else {
        if (circle.id !== key) {
          errors.push({
            code: 'SCHEMA_VIOLATION',
            message: `Circle key '${key}' does not match entity id '${circle.id}'`,
            path: `geometryState.circles.${key}`,
          });
        }
        if (circleIds.has(circle.id)) {
          errors.push({
            code: 'DUPLICATE_ID',
            message: `Duplicate circle ID '${circle.id}'`,
            path: `geometryState.circles.${key}`,
          });
        }
        circleIds.add(circle.id);
        allEntityIds.add(circle.id);
      }
      if (typeof circle.radius !== 'number' || isNaN(circle.radius) || circle.radius <= 0) {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Circle '${key}' must have positive radius, got ${circle.radius}`,
          path: `geometryState.circles.${key}.radius`,
        });
      }
      if (!circle.centerId || !pointIds.has(circle.centerId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          message: `Circle '${key}' references non-existent center point '${circle.centerId}'`,
          path: `geometryState.circles.${key}.centerId`,
        });
      }
      if (circle.radiusPointId && !pointIds.has(circle.radiusPointId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          message: `Circle '${key}' references non-existent radius point '${circle.radiusPointId}'`,
          path: `geometryState.circles.${key}.radiusPointId`,
        });
      }
    }
  }

  // Check Provenance integrity across all entities
  const validMacroTypes = new Set(['perpendicular_bisector', 'angle_bisector', 'perpendicular', 'parallel']);
  const allEntities = [
    ...Object.values(state.points || {}),
    ...Object.values(state.segments || {}),
    ...Object.values(state.lines || {}),
    ...Object.values(state.circles || {}),
  ];

  for (const ent of allEntities) {
    if (ent && ent.provenance) {
      const prov = ent.provenance;
      if (typeof prov !== 'object' || !prov.macroType || !validMacroTypes.has(prov.macroType)) {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Entity '${ent.id}' has invalid provenance macroType '${String(prov?.macroType)}'`,
          path: `provenance.macroType`,
        });
      }
      if (!Array.isArray(prov.sourceIds) || prov.sourceIds.length === 0) {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Entity '${ent.id}' provenance sourceIds must be a non-empty array`,
          path: `provenance.sourceIds`,
        });
      } else {
        for (const srcId of prov.sourceIds) {
          if (!allEntityIds.has(srcId)) {
            errors.push({
              code: 'DANGLING_REFERENCE',
              message: `Entity '${ent.id}' provenance references unknown source entity '${srcId}'`,
              path: `provenance.sourceIds`,
            });
          }
        }
      }
      if (!prov.groupId || typeof prov.groupId !== 'string') {
        errors.push({
          code: 'CORRUPTED_ENTITY',
          message: `Entity '${ent.id}' provenance missing groupId string`,
          path: `provenance.groupId`,
        });
      }
    }
  }

  // Check Counter sanity
  for (const counterKey of ['pointCounter', 'segmentCounter', 'lineCounter', 'circleCounter'] as const) {
    const val = state[counterKey];
    if (val !== undefined && (typeof val !== 'number' || val < 0 || !Number.isInteger(val))) {
      errors.push({
        code: 'INVALID_GEOMETRY_STATE',
        message: `geometryState.${counterKey} must be a non-negative integer`,
        path: `geometryState.${counterKey}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    detectedVersion: typeof version === 'number' ? version : undefined,
    format: typeof obj.format === 'string' ? obj.format : undefined,
  };
}

/**
 * Serializes a GeometryProject into a deterministic, formatted JSON string.
 */
export function serializeGeometryProject(
  project: GeometryProject,
  options?: { pretty?: boolean }
): string {
  const pretty = options?.pretty ?? true;
  return JSON.stringify(project, null, pretty ? 2 : undefined);
}

/**
 * Deserializes and restores a GeometryProject from a JSON string or object.
 * Performs full validation, then runs deterministic dependency recomputation.
 */
export function deserializeGeometryProject(
  input: unknown
): ProjectDeserializationResult {
  const validation = validateGeometryProject(input);

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const rawObj = typeof input === 'string' ? JSON.parse(input) : input;
  const project = rawObj as GeometryProjectV1;

  try {
    // 1. Deep clone state
    const cleanState: FullGeometryState = JSON.parse(JSON.stringify(project.geometryState));

    // 2. Deterministically recompute dependencies, line orientations, and intersections
    const restoredState = recomputeDependentGeometry(cleanState);

    return {
      success: true,
      project,
      restoredState,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      errors: [
        {
          code: 'INVALID_GEOMETRY_STATE',
          message: `Failed to recompute dependencies during project restoration: ${errorMsg}`,
        },
      ],
      rawError: errorMsg,
    };
  }
}
