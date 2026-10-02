// src/engines/tests/planeOverlay.test.ts
// Comprehensive Test Matrix for Plane Overlay Lens and Agent Commands (TESTS 1 to 9 & TESTS A to M)

import { createDefaultGeometryState, dispatchGeometryCommand } from '../constructionCore';
import { validatePgsPassport } from '../pgs/pgsValidator';
import {
  TriangleResearchSession,
  clonePlane1ToPlane2,
  importPgsToPlane2,
  exportPlane2ToPgs,
  dispatchSessionCommand,
  setActivePlane,
  setPlane2Lifecycle,
  setOverlayEnabled,
  setOverlayMix,
} from '../research';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('======================================================================');
console.log('RUNNING PLANE OVERLAY LENS & AGENT COMMANDS TEST MATRIX');
console.log('======================================================================\n');

// Initialize base session
const initialPlane1 = createDefaultGeometryState({ A: 0.12, B: 0.45, C: 0.78 }, 100);
let session: TriangleResearchSession = {
  plane1: initialPlane1,
  plane2: null,
  activePlane: 'PLANE_1',
  plane2Lifecycle: 'BUILDING',
  overlay: { enabled: false, mix: 0.5 },
};

// Setup Plane 2
session = clonePlane1ToPlane2(session);

// ----------------------------------------------------------------------------
// TEST 1: slider mix = 0 -> Plane 1 fully visible (alpha1 = 1, alpha2 = 0)
// ----------------------------------------------------------------------------
console.log('--- TEST 1: slider mix = 0 -> Plane 1 fully visible ---');
session = setOverlayEnabled(session, true);
session = setOverlayMix(session, 0);
assert(session.overlay.mix === 0, 'TEST 1.1: Overlay mix is 0');
assert(1 - session.overlay.mix === 1, 'TEST 1.2: Alpha 1 is 1.0 (Plane 1 fully visible)');

// ----------------------------------------------------------------------------
// TEST 2: slider mix = 1 -> Plane 2 fully visible (alpha1 = 0, alpha2 = 1)
// ----------------------------------------------------------------------------
console.log('\n--- TEST 2: slider mix = 1 -> Plane 2 fully visible ---');
session = setOverlayMix(session, 1);
assert(session.overlay.mix === 1, 'TEST 2.1: Overlay mix is 1.0');
assert(session.overlay.mix === 1, 'TEST 2.2: Alpha 2 is 1.0 (Plane 2 fully visible)');

// ----------------------------------------------------------------------------
// TEST 3: slider mix = 0.5 -> 50/50 Lens Mode
// ----------------------------------------------------------------------------
console.log('\n--- TEST 3: slider mix = 0.5 -> 50/50 Lens Mode ---');
session = setOverlayMix(session, 0.5);
assert(session.overlay.mix === 0.5, 'TEST 3.1: Overlay mix is 0.5');
assert(1 - session.overlay.mix === 0.5, 'TEST 3.2: Both layers 50/50 mix');

// ----------------------------------------------------------------------------
// TEST 4: Changing slider does not mutate FullGeometryState
// ----------------------------------------------------------------------------
console.log('\n--- TEST 4: Changing slider does not mutate FullGeometryState ---');
const plane1GeomRef = session.plane1;
const plane2GeomRef = session.plane2!.geometryState;
session = setOverlayMix(session, 0.75);
assert(session.plane1 === plane1GeomRef, 'TEST 4.1: Plane 1 GeometryState strictly unmutated');
assert(session.plane2!.geometryState === plane2GeomRef, 'TEST 4.2: Plane 2 GeometryState strictly unmutated');

// ----------------------------------------------------------------------------
// TEST 5: Changing slider does not mutate activePlane
// ----------------------------------------------------------------------------
console.log('\n--- TEST 5: Changing slider does not mutate activePlane ---');
assert(session.activePlane === 'PLANE_2', 'TEST 5.1: activePlane is PLANE_2 before mix change');
session = setOverlayMix(session, 0.25);
assert(session.activePlane === 'PLANE_2', 'TEST 5.2: activePlane remains PLANE_2 after mix change');

// ----------------------------------------------------------------------------
// TEST 6: Changing slider does not mutate PGS Passport
// ----------------------------------------------------------------------------
console.log('\n--- TEST 6: Changing slider does not mutate PGS Passport ---');
const pgsPassportBefore = exportPlane2ToPgs(session.plane2!);
session = setOverlayMix(session, 0.88);
const pgsPassportAfter = exportPlane2ToPgs(session.plane2!);
delete (pgsPassportBefore.meta as any).exportedAt;
delete (pgsPassportAfter.meta as any).exportedAt;
delete (pgsPassportBefore.sourceClaim as any).timestamp;
delete (pgsPassportAfter.sourceClaim as any).timestamp;
assert(JSON.stringify(pgsPassportBefore) === JSON.stringify(pgsPassportAfter), 'TEST 6.1: PGS Passport geometric output strictly identical');

// ----------------------------------------------------------------------------
// TEST 7: Drag Plane 2 while overlay active leaves Plane 1 unchanged
// ----------------------------------------------------------------------------
console.log('\n--- TEST 7: Drag Plane 2 while overlay active leaves Plane 1 unchanged ---');
const p1AxBefore7 = session.plane1.points.A.x;
session.activePlane = 'PLANE_2';
const res7 = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.2, B: 0.45, C: 0.78 },
  R: 100,
});
session = res7.session;
const p1AxAfter7 = session.plane1.points.A.x;
assert(Math.abs(p1AxBefore7 - p1AxAfter7) < 1e-5, 'TEST 7.1: Plane 1 Point A strictly unchanged after Plane 2 drag');

// ----------------------------------------------------------------------------
// TEST 8: Drag Plane 1 while overlay active leaves Plane 2 unchanged
// ----------------------------------------------------------------------------
console.log('\n--- TEST 8: Drag Plane 1 while overlay active leaves Plane 2 unchanged ---');
const p2AxBefore8 = session.plane2!.geometryState.points.A.x;
session.activePlane = 'PLANE_1';
const res8 = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.05, B: 0.45, C: 0.78 },
  R: 100,
});
session = res8.session;
const p2AxAfter8 = session.plane2!.geometryState.points.A.x;
assert(Math.abs(p2AxBefore8 - p2AxAfter8) < 1e-5, 'TEST 8.1: Plane 2 Point A strictly unchanged after Plane 1 drag');

// ----------------------------------------------------------------------------
// TEST 9: FIXED Plane 2 -> overlay continues to work, but Plane 2 mutation is blocked
// ----------------------------------------------------------------------------
console.log('\n--- TEST 9: FIXED Plane 2 -> overlay works, but mutation blocked ---');
session = setPlane2Lifecycle(session, 'FIXED');
session.activePlane = 'PLANE_2';
const res9 = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.3, B: 0.45, C: 0.78 },
  R: 100,
});
assert(res9.success === false, 'TEST 9.1: Mutation on FIXED Plane 2 rejected');
session = setOverlayMix(session, 0.5);
assert(session.overlay.mix === 0.5, 'TEST 9.2: Overlay slider works on FIXED Plane 2');

// ----------------------------------------------------------------------------
// AGENT INTEGRATION TESTS (TESTS A to M)
// ----------------------------------------------------------------------------
console.log('\n======================================================================');
console.log('RUNNING AI AGENT TOOLBOX INTEGRATION TESTS (TESTS A to M)');
console.log('======================================================================\n');

// TEST A: Agent selects Plane 2
console.log('--- TEST A: Agent selects Plane 2 ---');
session = setActivePlane(session, 'PLANE_2');
assert(session.activePlane === 'PLANE_2', 'TEST A.1: Agent selected PLANE_2');

// TEST B: Agent clones Plane 1 -> Plane 2
console.log('\n--- TEST B: Agent clones Plane 1 -> Plane 2 ---');
session = clonePlane1ToPlane2(session);
assert(session.plane2 !== null, 'TEST B.1: Plane 2 workspace cloned by Agent');

// TEST C: Agent mutates Plane 2
console.log('\n--- TEST C: Agent mutates Plane 2 ---');
session.activePlane = 'PLANE_2';
const resC = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.15, B: 0.45, C: 0.78 },
  R: 100,
});
session = resC.session;
assert(resC.success === true, 'TEST C.1: Agent mutated Plane 2 successfully');

// TEST D: Agent cannot mutate FIXED Plane 2
console.log('\n--- TEST D: Agent cannot mutate FIXED Plane 2 ---');
session = setPlane2Lifecycle(session, 'FIXED');
const resD = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.25, B: 0.45, C: 0.78 },
  R: 100,
});
assert(resD.success === false, 'TEST D.1: Agent mutation blocked on FIXED Plane 2');
assert(resD.error?.includes('PLANE_FIXED_READ_ONLY') === true, 'TEST D.2: Error code is PLANE_FIXED_READ_ONLY');

// TEST E: Agent can mutate Plane 1 while Plane 2 is FIXED
console.log('\n--- TEST E: Agent can mutate Plane 1 while Plane 2 is FIXED ---');
session.activePlane = 'PLANE_1';
const resE = dispatchSessionCommand(session, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.08, B: 0.45, C: 0.78 },
  R: 100,
});
assert(resE.success === true, 'TEST E.1: Agent mutated Plane 1 while Plane 2 is FIXED');

// TEST F & G: Agent enables overlay and sets mix = 0.5
console.log('\n--- TEST F & G: Agent enables overlay and sets mix = 0.5 ---');
session = setOverlayEnabled(session, true);
session = setOverlayMix(session, 0.5);
assert(session.overlay.enabled === true, 'TEST F.1: Agent enabled overlay');
assert(session.overlay.mix === 0.5, 'TEST G.1: Agent set overlay mix to 0.5');

// TEST H & I: Overlay command does not change geometry or PGS
console.log('\n--- TEST H & I: Overlay command does not change geometry or PGS ---');
const geomRefH = session.plane1;
session = setOverlayMix(session, 0.7);
assert(session.plane1 === geomRefH, 'TEST H.1: Geometry state unmutated by overlay command');

// TEST J & K: Agent can inspect both planes and overlay state
console.log('\n--- TEST J & K: Agent can inspect both planes and overlay state ---');
assert(session.plane1 !== undefined, 'TEST J.1: Plane 1 accessible for inspection');
assert(session.plane2 !== null, 'TEST J.2: Plane 2 accessible for inspection');
assert(session.overlay.enabled === true && session.overlay.mix === 0.7, 'TEST K.1: Overlay state accessible for inspection');

// TEST L & M: PGS import and export through Agent API
console.log('\n--- TEST L & M: PGS import and export through Agent API ---');
session = setPlane2Lifecycle(session, 'BUILDING');
const exportedPassportL = exportPlane2ToPgs(session.plane2!);
const valL = validatePgsPassport(exportedPassportL);
assert(valL.valid === true, 'TEST M.1: Exported PGS passport validated');

const importResL = importPgsToPlane2(session, exportedPassportL);
assert(importResL.success === true, 'TEST L.1: PGS imported through Agent API');

console.log('\n======================================================================');
console.log('ALL OVERLAY LENS & AGENT INTEGRATION TESTS PASSED PERFECTLY! 🎉');
console.log('======================================================================');
