// src/engines/research/pgsPlane2Adapter.ts
// Lossless PGS Import & Export Adapter for Plane 2 Workspace State
// Complies with Portable Identity preservation and Transactional Import rules

import { FullGeometryState, createDefaultGeometryState } from '../constructionCore';
import { normalizeU } from '../geometryState';
import {
  PGS2DPassport,
  PGSPoint2D,
  PGSSegment2D,
  PGSLine2D,
  PGSCircle2D,
  PGSReceiverVerification,
} from '../pgs/types';
import { decodePgsPassportFromJson } from '../pgs/pgsJsonCodec';
import { verifyPgsPassportAsReceiver } from '../pgs/pgsReceiverVerifier';
import { projectStateToPgsPassport, PGSProjectorOptions } from '../pgs/pgsProjector';
import {
  TriangleResearchSession,
  Plane2WorkspaceState,
  PortableIdentityMapping,
} from './types';

export interface Plane2PGSImportResult {
  success: boolean;
  session: TriangleResearchSession;
  error?: string;
  details?: string[];
}

/**
 * Transactionally imports a PGS-2D Passport into Plane 2 Workspace.
 * If passport is invalid or refuted, neither Plane 2 nor Plane 1 is altered!
 */
export function importPgsToPlane2(
  session: TriangleResearchSession,
  passportInput: PGS2DPassport | string
): Plane2PGSImportResult {
  let passport: PGS2DPassport;

  // 1. Decode & Validate JSON
  if (typeof passportInput === 'string') {
    const decodeResult = decodePgsPassportFromJson(passportInput);
    if (!decodeResult.passport || !decodeResult.validationResult.valid) {
      const errMsgs = decodeResult.validationResult.errors.map((e) => e.message).join('; ');
      return {
        success: false,
        session, // Strictly unchanged
        error: `Invalid PGS Passport JSON: ${errMsgs || decodeResult.parseError}`,
        details: decodeResult.validationResult.errors.map((e) => `${e.code}: ${e.message}`),
      };
    }
    passport = decodeResult.passport;
  } else {
    passport = passportInput;
  }

  // 2. Perform Receiver Verification FIRST
  const receiverVerification = verifyPgsPassportAsReceiver(passport);

  if (!receiverVerification.verified || receiverVerification.status !== 'VERIFIED') {
    const failedCheckMsgs = receiverVerification.checks
      .filter((c) => c.status === 'FAILED')
      .map((c) => `${c.name}: ${c.message || 'Failed'}`);

    return {
      success: false,
      session, // Strictly unchanged reference!
      error: `Receiver Verification Failed [${receiverVerification.status}]`,
      details: failedCheckMsgs,
    };
  }

  // 3. Construct candidate FullGeometryState AND identityRegistry preserving portableIds
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

    const candidateState: FullGeometryState = createDefaultGeometryState({ A: uA, B: uB, C: uC }, R);
    const identityRegistry: Record<string, PortableIdentityMapping> = {};

    // Register primary vertices
    identityRegistry['A'] = { portableId: pA.portableId || 'pt_A', localId: 'A', displayLabel: pA.displayLabel || 'A', source: 'imported' };
    identityRegistry['B'] = { portableId: pB.portableId || 'pt_B', localId: 'B', displayLabel: pB.displayLabel || 'B', source: 'imported' };
    identityRegistry['C'] = { portableId: pC.portableId || 'pt_C', localId: 'C', displayLabel: pC.displayLabel || 'C', source: 'imported' };
    identityRegistry['O'] = { portableId: 'pt_O', localId: 'O', displayLabel: 'O', source: 'imported' };

    // Register boundary chords
    identityRegistry['chord_AB'] = { portableId: 'edge_AB', localId: 'chord_AB', displayLabel: 'AB', source: 'imported' };
    identityRegistry['chord_BC'] = { portableId: 'edge_BC', localId: 'chord_BC', displayLabel: 'BC', source: 'imported' };
    identityRegistry['chord_CA'] = { portableId: 'edge_CA', localId: 'chord_CA', displayLabel: 'CA', source: 'imported' };
    identityRegistry['base_circle'] = { portableId: 'circle_circumcircle', localId: 'base_circle', displayLabel: 'ω', source: 'imported' };

    // Restore auxiliary points
    passport.objects.forEach((obj) => {
      if (obj.type === 'Point2D' && obj.role === 'auxiliary_point') {
        const localId = obj.localId || `p2_${obj.portableId}`;
        candidateState.points[localId] = {
          id: localId,
          name: obj.displayLabel || localId,
          x: obj.x,
          y: obj.y,
          role: 'auxiliary',
        };
        identityRegistry[localId] = {
          portableId: obj.portableId,
          localId,
          displayLabel: obj.displayLabel,
          source: 'imported',
        };
      }
    });

    // Restore auxiliary lines
    passport.objects.forEach((obj) => {
      if (obj.type === 'Line2D' && obj.role === 'construction_line') {
        const localId = obj.localId || `p2_${obj.portableId}`;
        const p1LocalId = obj.p1Id.replace(/^pt_/, '');
        const p2LocalId = obj.p2Id.replace(/^pt_/, '');
        candidateState.lines[localId] = {
          id: localId,
          p1Id: p1LocalId,
          p2Id: p2LocalId,
          role: 'auxiliary',
        };
        identityRegistry[localId] = {
          portableId: obj.portableId,
          localId,
          displayLabel: obj.displayLabel,
          source: 'imported',
        };
      }
    });

    // 4. Transactional Commit to Plane 2
    const workspaceState: Plane2WorkspaceState = {
      geometryState: candidateState,
      sourceType: 'pgs_import',
      importedPassport: passport,
      receiverVerification,
      identityRegistry,
      isModified: false,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      session: {
        ...session,
        plane2: workspaceState,
        activePlane: 'PLANE_2',
        plane2Lifecycle: 'BUILDING',
      },
    };
  } catch (err: any) {
    return {
      success: false,
      session, // Unchanged
      error: `Failed to construct Plane 2 state from PGS passport: ${err.message || String(err)}`,
    };
  }
}

/**
 * Losslessly exports Plane 2 Workspace State back to a Canonical PGS-2D Passport,
 * preserving original portableIds from identityRegistry.
 */
export function exportPlane2ToPgs(
  workspace: Plane2WorkspaceState,
  options: PGSProjectorOptions = {}
): PGS2DPassport {
  const passport = projectStateToPgsPassport(workspace.geometryState, options);

  // Preserve original portableIds from identityRegistry where available
  const updatedObjects = passport.objects.map((obj) => {
    const mapping = Object.values(workspace.identityRegistry).find(
      (m) => m.localId === obj.localId || m.portableId === obj.portableId
    );
    if (mapping) {
      return {
        ...obj,
        portableId: mapping.portableId,
        displayLabel: mapping.displayLabel || obj.displayLabel,
      };
    }
    return obj;
  });

  return {
    ...passport,
    objects: updatedObjects,
  };
}
