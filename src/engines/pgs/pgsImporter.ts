// src/engines/pgs/pgsImporter.ts
// Importer and Geometry State Reconstructor for PGS-2D Passports
// Complies with Transactional Import and Receiver Verification rules

import { FullGeometryState, createDefaultGeometryState } from '../constructionCore';
import { normalizeU } from '../geometryState';
import { recomputeDependentGeometry } from '../dependencyRecomputer';
import { PGS2DPassport, PGSPoint2D, PGSCircle2D, PGSReceiverVerification } from './types';
import { decodePgsPassportFromJson } from './pgsJsonCodec';
import { verifyPgsPassportAsReceiver } from './pgsReceiverVerifier';

export interface PGSImportResult {
  success: boolean;
  geometryState?: FullGeometryState;
  passport?: PGS2DPassport;
  receiverVerification?: PGSReceiverVerification;
  error?: string;
  details?: string[];
}

export function importPgsPassport(
  passportInput: PGS2DPassport | string
): PGSImportResult {
  let passport: PGS2DPassport;

  // 1. Parse & Validate JSON if string
  if (typeof passportInput === 'string') {
    const decodeResult = decodePgsPassportFromJson(passportInput);
    if (!decodeResult.passport || !decodeResult.validationResult.valid) {
      const errMsgs = decodeResult.validationResult.errors.map((e) => e.message).join('; ');
      return {
        success: false,
        error: `Invalid PGS Passport JSON: ${errMsgs || decodeResult.parseError}`,
        details: decodeResult.validationResult.errors.map((e) => `${e.code}: ${e.message}`),
      };
    }
    passport = decodeResult.passport;
  } else {
    passport = passportInput;
  }

  // 2. Perform Independent Receiver Verification FIRST
  const receiverVerification = verifyPgsPassportAsReceiver(passport);

  if (!receiverVerification.verified || receiverVerification.status !== 'VERIFIED') {
    const failedCheckMsgs = receiverVerification.checks
      .filter((c) => c.status === 'FAILED')
      .map((c) => `${c.name}: ${c.message || 'Failed'}`);

    return {
      success: false,
      passport,
      receiverVerification,
      error: `Receiver Verification Failed [${receiverVerification.status}]`,
      details: failedCheckMsgs,
    };
  }

  // 3. Reconstruct FullGeometryState (SSOT)
  try {
    const objectsByPortableId = new Map(passport.objects.map((o) => [o.portableId, o]));

    const pA = objectsByPortableId.get('pt_A') as PGSPoint2D;
    const pB = objectsByPortableId.get('pt_B') as PGSPoint2D;
    const pC = objectsByPortableId.get('pt_C') as PGSPoint2D;
    const circumcircle = passport.objects.find((o) => o.type === 'Circle2D' && o.role === 'circumcircle') as PGSCircle2D;

    const R = circumcircle ? circumcircle.radius : Math.hypot(pA.x, pA.y);

    const uA = normalizeU(Math.atan2(pA.y, pA.x) / (2 * Math.PI));
    const uB = normalizeU(Math.atan2(pB.y, pB.x) / (2 * Math.PI));
    const uC = normalizeU(Math.atan2(pC.y, pC.x) / (2 * Math.PI));

    let state = createDefaultGeometryState({ A: uA, B: uB, C: uC }, R);

    // Restore auxiliary points
    passport.objects.forEach((obj) => {
      if (obj.type === 'Point2D' && obj.role === 'auxiliary_point') {
        const localId = obj.localId || obj.portableId.replace(/^pt_/, '');
        state.points[localId] = {
          id: localId,
          name: obj.displayLabel || localId,
          x: obj.x,
          y: obj.y,
          role: 'auxiliary',
        };
      }
    });

    // Restore auxiliary lines
    passport.objects.forEach((obj) => {
      if (obj.type === 'Line2D' && obj.role === 'construction_line') {
        const localId = obj.localId || obj.portableId.replace(/^line_/, '');
        const p1LocalId = obj.p1Id.replace(/^pt_/, '');
        const p2LocalId = obj.p2Id.replace(/^pt_/, '');
        state.lines[localId] = {
          id: localId,
          p1Id: p1LocalId,
          p2Id: p2LocalId,
          role: 'auxiliary',
        };
      }
    });

    // Recompute dependent intersections
    state = recomputeDependentGeometry(state);

    return {
      success: true,
      geometryState: state,
      passport,
      receiverVerification,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      passport,
      receiverVerification,
      error: `Failed to reconstruct Geometry Core state: ${message}`,
    };
  }
}
