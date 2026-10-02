// src/engines/pgs/pgsValidator.ts
// Canonical Schema & Structure Validator for PGS-2D Passports

import { PGS2DPassport } from './types';

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface PGSValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export function validatePgsPassport(passport: unknown): PGSValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!passport || typeof passport !== 'object') {
    return {
      valid: false,
      errors: [{ code: 'INVALID_JSON', message: 'Passport must be a valid JSON object' }],
      warnings: [],
    };
  }

  const p = passport as Partial<PGS2DPassport>;

  // Meta validation
  if (!p.meta || typeof p.meta !== 'object') {
    errors.push({ code: 'MISSING_META', message: 'Missing required "meta" header object', path: 'meta' });
  } else {
    if (p.meta.format !== 'PGS-2D') {
      errors.push({ code: 'INVALID_FORMAT', message: `Invalid format: expected "PGS-2D", got "${p.meta.format}"`, path: 'meta.format' });
    }
    if (p.meta.version !== '0.1') {
      errors.push({ code: 'UNSUPPORTED_VERSION', message: `Unsupported version: "${p.meta.version}"`, path: 'meta.version' });
    }
    if (p.meta.transferMode !== 'EXACT_STATE' && p.meta.transferMode !== 'CONSTRUCTIVE_STATE') {
      errors.push({ code: 'INVALID_TRANSFER_MODE', message: `Invalid transferMode: "${p.meta.transferMode}"`, path: 'meta.transferMode' });
    }
  }

  // Source Claim validation
  if (!p.sourceClaim || typeof p.sourceClaim !== 'object') {
    errors.push({ code: 'MISSING_SOURCE_CLAIM', message: 'Missing required "sourceClaim" object', path: 'sourceClaim' });
  } else {
    if (typeof p.sourceClaim.verified !== 'boolean') {
      errors.push({ code: 'INVALID_SOURCE_CLAIM', message: 'sourceClaim.verified must be boolean', path: 'sourceClaim.verified' });
    }
  }

  // Objects validation
  if (!Array.isArray(p.objects)) {
    errors.push({ code: 'INVALID_OBJECTS', message: 'Field "objects" must be an array', path: 'objects' });
  } else {
    const portableIds = new Set<string>();
    p.objects.forEach((obj, idx) => {
      if (!obj || typeof obj !== 'object' || !obj.portableId || !obj.type) {
        errors.push({ code: 'INVALID_OBJECT', message: `Object at index ${idx} is missing portableId or type`, path: `objects[${idx}]` });
      } else {
        if (portableIds.has(obj.portableId)) {
          errors.push({ code: 'DUPLICATE_PORTABLE_ID', message: `Duplicate portableId "${obj.portableId}"`, path: `objects[${idx}].portableId` });
        }
        portableIds.add(obj.portableId);
      }
    });

    // Verify topology references point to existing portableIds
    if (Array.isArray(p.topology)) {
      p.topology.forEach((top, idx) => {
        if (top.type === 'PolygonTopology') {
          top.vertexIds.forEach((vId) => {
            if (!portableIds.has(vId)) {
              errors.push({ code: 'DANGLING_REFERENCE', message: `PolygonTopology references non-existent vertex "${vId}"`, path: `topology[${idx}].vertexIds` });
            }
          });
          top.edgeIds.forEach((eId) => {
            if (!portableIds.has(eId)) {
              errors.push({ code: 'DANGLING_REFERENCE', message: `PolygonTopology references non-existent edge "${eId}"`, path: `topology[${idx}].edgeIds` });
            }
          });
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
