// src/engines/tests/twoPlaneSession.test.ts
// Comprehensive Test Matrix for Plane 1 + Plane 2 Workspace System (Tests 1 to 14)

import { createDefaultGeometryState, dispatchGeometryCommand } from '../constructionCore';
import { applyPerpendicularBisector } from '../perpendicularBisector';
import { validatePgsPassport } from '../pgs/pgsValidator';
import { projectStateToPgsPassport } from '../pgs/pgsProjector';
import {
  TriangleResearchSession,
  clonePlane1ToPlane2,
  importPgsToPlane2,
  exportPlane2ToPgs,
  dispatchSessionCommand,
  setPlane2Lifecycle,
} from '../research';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('======================================================================');
console.log('RUNNING PLANE 1 + PLANE 2 WORKSPACE TEST MATRIX (TESTS 1 to 14)');
console.log('======================================================================\n');

// Initialize base session
const initialPlane1 = createDefaultGeometryState({ A: 0, B: 0.33, C: 0.66 }, 100);
let session: TriangleResearchSession = {
  plane1: initialPlane1,
  plane2: null,
  activePlane: 'PLANE_1',
  plane2Lifecycle: 'BUILDING',
  overlay: { enabled: false, mix: 0.5 },
};

// ----------------------------------------------------------------------------
// TEST 1: Plane 1 -> Plane 2 Deep Clone Isolation
// ----------------------------------------------------------------------------
console.log('--- TEST 1: Plane 1 -> Plane 2 Deep Clone Isolation ---');
session = clonePlane1ToPlane2(session);
assert(session.plane2 !== null, 'TEST 1.1: Plane 2 initialized');
assert(session.activePlane === 'PLANE_2', 'TEST 1.2: Active plane switched to PLANE_2');
assert(session.plane2?.sourceType === 'plane1_clone', 'TEST 1.3: sourceType is plane1_clone');
assert(session.plane2?.geometryState !== session.plane1, 'TEST 1.4: GeometryState references are distinct');
assert(session.plane2?.geometryState.points.A !== session.plane1.points.A, 'TEST 1.5: Point A references are distinct');

// ----------------------------------------------------------------------------
// TEST 2: Plane 1 Mutation Does Not Modify Plane 2
// ----------------------------------------------------------------------------
console.log('\n--- TEST 2: Plane 1 Mutation Does Not Modify Plane 2 ---');
const p2Before1 = session.plane2!.geometryState.points.A.x;
// Switch to PLANE_1 and move A
session.activePlane = 'PLANE_1';
const res2 = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.1, B: 0.33, C: 0.66 },
  R: 100,
});
session = res2.session;
const p2After1 = session.plane2!.geometryState.points.A.x;
assert(Math.abs(p2Before1 - p2After1) < 1e-5, 'TEST 2.1: Plane 2 Point A unchanged when Plane 1 mutates');

// ----------------------------------------------------------------------------
// TEST 3: Plane 2 Mutation Does Not Modify Plane 1
// ----------------------------------------------------------------------------
console.log('\n--- TEST 3: Plane 2 Mutation Does Not Modify Plane 1 ---');
session.activePlane = 'PLANE_2';
const p1Before3 = session.plane1.points.A.x;
const res3 = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.25, B: 0.33, C: 0.66 },
  R: 100,
});
session = res3.session;
const p1After3 = session.plane1.points.A.x;
assert(Math.abs(p1Before3 - p1After3) < 1e-5, 'TEST 3.1: Plane 1 Point A unchanged when Plane 2 mutates');

// ----------------------------------------------------------------------------
// TEST 4: FIXED Plane 2 Rejects Mutation
// ----------------------------------------------------------------------------
console.log('\n--- TEST 4: FIXED Plane 2 Rejects Mutation ---');
session = setPlane2Lifecycle(session, 'FIXED');
const res4 = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.3, B: 0.33, C: 0.66 },
  R: 100,
});
assert(res4.success === false, 'TEST 4.1: Command rejected on FIXED Plane 2');
assert(res4.error?.includes('PLANE_FIXED_READ_ONLY') === true, 'TEST 4.2: Correct error code PLANE_FIXED_READ_ONLY');

// ----------------------------------------------------------------------------
// TEST 5: FIXED Plane 2 Does Not Block Plane 1 Mutation
// ----------------------------------------------------------------------------
console.log('\n--- TEST 5: FIXED Plane 2 Does Not Block Plane 1 Mutation ---');
session.activePlane = 'PLANE_1';
const res5 = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.05, B: 0.33, C: 0.66 },
  R: 100,
});
assert(res5.success === true, 'TEST 5.1: Plane 1 mutation succeeded while Plane 2 is FIXED');
session = res5.session;

// Reset Plane 2 to BUILDING
session = setPlane2Lifecycle(session, 'BUILDING');

// ----------------------------------------------------------------------------
// TEST 6: Valid PGS -> Plane 2 Import
// ----------------------------------------------------------------------------
console.log('\n--- TEST 6: Valid PGS -> Plane 2 Import ---');
const exportedPgs1 = projectStateToPgsPassport(session.plane1);
const importRes6 = importPgsToPlane2(session, exportedPgs1);
assert(importRes6.success === true, 'TEST 6.1: Valid PGS imported to Plane 2');
session = importRes6.session;
assert(session.plane2?.sourceType === 'pgs_import', 'TEST 6.2: Plane 2 sourceType is pgs_import');
assert(session.plane2?.receiverVerification?.status === 'VERIFIED', 'TEST 6.3: Receiver verification status is VERIFIED');

// ----------------------------------------------------------------------------
// TEST 7: Invalid PGS Does Not Modify Plane 2 or Plane 1
// ----------------------------------------------------------------------------
console.log('\n--- TEST 7: Invalid PGS Does Not Modify Plane 2 or Plane 1 ---');
const prevPlane1State7 = session.plane1;
const prevPlane2State7 = session.plane2;
const importRes7 = importPgsToPlane2(session, '{"invalid_json": true}');
assert(importRes7.success === false, 'TEST 7.1: Invalid PGS rejected');
assert(importRes7.session.plane1 === prevPlane1State7, 'TEST 7.2: Plane 1 state unmutated on failure');
assert(importRes7.session.plane2 === prevPlane2State7, 'TEST 7.3: Plane 2 state unmutated on failure');

// ----------------------------------------------------------------------------
// TEST 8: REFUTED PGS Does Not Modify Plane 2 or Plane 1
// ----------------------------------------------------------------------------
console.log('\n--- TEST 8: REFUTED PGS Does Not Modify Plane 2 or Plane 1 ---');
// CQNS Quadrilateral Passport (Polygon(4))
const cqnsPassport = {
  meta: { format: 'PGS-2D', version: '0.1', generator: 'CQNS-001', exportedAt: '2026-10-02T00:00:00.000Z', transferMode: 'EXACT_STATE' },
  sourceClaim: { verified: true, standId: 'cqns-001', timestamp: '2026-10-02T00:00:00.000Z' },
  objects: [
    { type: 'Point2D', portableId: 'pt_A', localId: 'A', displayLabel: 'A', role: 'vertex', x: 100, y: 0 },
    { type: 'Point2D', portableId: 'pt_B', localId: 'B', displayLabel: 'B', role: 'vertex', x: 0, y: 100 },
    { type: 'Point2D', portableId: 'pt_C', localId: 'C', displayLabel: 'C', role: 'vertex', x: -100, y: 0 },
    { type: 'Point2D', portableId: 'pt_D', localId: 'D', displayLabel: 'D', role: 'vertex', x: 0, y: -100 },
    { type: 'Polygon', portableId: 'poly_ABCD', localId: 'quad_ABCD', vertexCount: 4, vertexIds: ['pt_A', 'pt_B', 'pt_C', 'pt_D'] },
  ],
  topology: [{ type: 'PolygonTopology', polygonId: 'poly_ABCD', vertexIds: ['pt_A', 'pt_B', 'pt_C', 'pt_D'], edgeIds: ['edge_AB', 'edge_BC', 'edge_CD', 'edge_DA'] }],
  relations: [],
  measurements: [],
};

const importRes8 = importPgsToPlane2(session, cqnsPassport as any);
assert(importRes8.success === false, 'TEST 8.1: Polygon(4) refuted by Triangle Stand Receiver Verifier');
assert(importRes8.details?.[0].includes('Polygon(3)') === true, 'TEST 8.2: Refutation reason details polygon requirement');
assert(importRes8.session.plane2 === session.plane2, 'TEST 8.3: Plane 2 unmutated on refutation');

// ----------------------------------------------------------------------------
// TEST 9: portableId Survives PGS -> Plane 2 -> PGS Export Round-Trip
// ----------------------------------------------------------------------------
console.log('\n--- TEST 9: portableId Survives PGS -> Plane 2 -> PGS Export Round-Trip ---');
const exportedPgs9 = exportPlane2ToPgs(session.plane2!);
const ptA9 = exportedPgs9.objects.find((o) => o.localId === 'A');
assert(ptA9?.portableId === 'pt_A', 'TEST 9.1: Original portableId pt_A preserved');
const edgeAB9 = exportedPgs9.objects.find((o) => o.localId === 'chord_AB');
assert(edgeAB9?.portableId === 'edge_AB', 'TEST 9.2: Original portableId edge_AB preserved');

// ----------------------------------------------------------------------------
// TEST 10: Plane 2 Export Validates Against Canonical PGS Validator
// ----------------------------------------------------------------------------
console.log('\n--- TEST 10: Plane 2 Export Validates Against Canonical PGS Validator ---');
const val10 = validatePgsPassport(exportedPgs9);
assert(val10.valid === true, 'TEST 10.1: Exported Plane 2 passport is valid canonical PGS-2D');

// ----------------------------------------------------------------------------
// TEST 11: Dynamic Mutation in Plane 2 Updates Coordinates While Preserving portableId
// ----------------------------------------------------------------------------
console.log('\n--- TEST 11: Dynamic Mutation in Plane 2 Updates Coordinates ---');
session.activePlane = 'PLANE_2';
const res11 = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.18, B: 0.33, C: 0.66 },
  R: 100,
});
session = res11.session;
const exportedPgs11 = exportPlane2ToPgs(session.plane2!);
const ptA11 = exportedPgs11.objects.find((o) => o.localId === 'A') as any;
assert(ptA11.portableId === 'pt_A', 'TEST 11.1: portableId pt_A preserved after dynamic drag');
assert(Math.abs(ptA11.x - (100 * Math.cos(0.18 * 2 * Math.PI))) < 1e-2, 'TEST 11.2: Coordinates updated to match new position');

// ----------------------------------------------------------------------------
// TEST 12: External PGS Source Type Tracking
// ----------------------------------------------------------------------------
console.log('\n--- TEST 12: External PGS Source Type Tracking ---');
assert(session.plane2?.sourceType === 'pgs_import', 'TEST 12.1: Plane 2 sourceType is pgs_import');

// ----------------------------------------------------------------------------
// TEST 13: Plane 1 Clone Source Type Tracking
// ----------------------------------------------------------------------------
console.log('\n--- TEST 13: Plane 1 Clone Source Type Tracking ---');
let clonedSession = clonePlane1ToPlane2(session);
assert(clonedSession.plane2?.sourceType === 'plane1_clone', 'TEST 13.1: Cloned Plane 2 sourceType is plane1_clone');

// ----------------------------------------------------------------------------
// TEST 14: Agent-Created Objects Tracked on Plane 2
// ----------------------------------------------------------------------------
console.log('\n--- TEST 14: Agent-Created Objects Tracked on Plane 2 ---');
clonedSession.activePlane = 'PLANE_2';
const res14 = dispatchSessionCommand(clonedSession, {
  type: 'ADD_POINT',
  point: { id: 'agent_P1', name: 'P', x: 20, y: 30 },
});
clonedSession = res14.session;
const mappedP1 = clonedSession.plane2?.identityRegistry['agent_P1'];
assert(mappedP1 !== undefined, 'TEST 14.1: Agent-created point registered in identityRegistry');
assert(mappedP1?.source === 'agent_created', 'TEST 14.2: Agent-created point source is agent_created');
assert(mappedP1?.portableId === 'pt_agent_P1', 'TEST 14.3: Stable portableId pt_agent_P1 generated');

console.log('\n======================================================================');
console.log('ALL 14 PLANE 1 + PLANE 2 WORKSPACE TESTS PASSED PERFECTLY! 🎉');
console.log('======================================================================');
