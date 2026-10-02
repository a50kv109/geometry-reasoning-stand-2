// src/engines/pgs/pgsJsonCodec.ts
// JSON Codec for PGS-2D Passports

import { PGS2DPassport } from './types';
import { validatePgsPassport, PGSValidationResult } from './pgsValidator';

export function encodePgsPassportToJson(passport: PGS2DPassport, indent: number = 2): string {
  return JSON.stringify(passport, null, indent);
}

export function decodePgsPassportFromJson(jsonString: string): {
  passport?: PGS2DPassport;
  validationResult: PGSValidationResult;
  parseError?: string;
} {
  try {
    const raw = JSON.parse(jsonString);
    const validationResult = validatePgsPassport(raw);
    if (!validationResult.valid) {
      return { validationResult };
    }
    return {
      passport: raw as PGS2DPassport,
      validationResult,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      validationResult: {
        valid: false,
        errors: [{ code: 'INVALID_JSON_SYNTAX', message: `JSON syntax error: ${message}` }],
        warnings: [],
      },
      parseError: message,
    };
  }
}
