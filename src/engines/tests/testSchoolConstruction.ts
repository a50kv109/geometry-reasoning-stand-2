// src/engines/tests/testSchoolConstruction.ts
// Test suite for School Mode Core Drawing Tools & Construction Engine

import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  snapToGeometry,
  calculateEuclideanDistance,
} from '../geometryState';
import { runPerpendicularBisectorTests } from './testPerpendicularBisector';
import { runAngleBisectorSuite } from './testAngleBisector';
import { runPerpendicularLineSuite } from './testPerpendicularLine';
import { runParallelLineSuite } from './testParallelLine';
import { runSchoolReferenceTestSuite } from '../../components/school/reference/tests/schoolReference.test';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${msg}`);
}

console.log('======================================================================');
console.log('RUNNING SCHOOL MODE & CONSTRUCTION ENGINE TEST SUITE (S01 - S14)');
console.log('======================================================================');

// S01: Default State Invariant
let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
assert(Object.keys(state.points).length === 4, 'S01 - Initial state has 4 points (A, B, C, O)');
assert(Object.keys(state.segments).length === 3, 'S01 - Initial state has 3 base chords (AB, BC, CA)');
assert(Object.keys(state.circles).length === 1, 'S01 - Initial state has 1 circumcircle');
assert(state.circles['base_circle'].radius === 100, 'S01 - Circumcircle radius is 100');

// S02: Snap to Circumcircle and Points
const nearPt = { x: 98, y: 5 }; // close to circle of R=100
const snapped = snapToGeometry(nearPt, state, 15);
assert(snapped.snappedToCircle === true, 'S02 - Point within snap threshold is snapped to circle');
assert(Math.abs(Math.hypot(snapped.x, snapped.y) - 100) < 1e-4, 'S02 - Snapped point lies exactly on circle R=100');

const farPt = { x: 50, y: 50 }; // hypot ~70.7, distance to R=100 is ~29.3 > 10
const notSnapped = snapToGeometry(farPt, state, 10);
assert(!notSnapped.snappedToCircle && !notSnapped.snappedPointId, 'S02 - Point outside snap threshold is not snapped');

// S03: Add User Point
state = dispatchGeometryCommand(state, {
  type: 'ADD_POINT',
  point: {
    x: 50,
    y: 50,
    onCircle: false,
  },
});
const userPoints = Object.values(state.points).filter((p) => !p.isBaseVertex);
assert(userPoints.length === 1, 'S03 - User point successfully created');
assert(userPoints[0].name === 'P1', 'S03 - User point named P1');
assert(userPoints[0].x === 50 && userPoints[0].y === 50, 'S03 - User point coordinates match input');

// S04: Add Second Point on Circle
state = dispatchGeometryCommand(state, {
  type: 'ADD_POINT',
  point: {
    x: 0,
    y: 100,
    onCircle: true,
  },
});
const userPoints2 = Object.values(state.points).filter((p) => !p.isBaseVertex);
assert(userPoints2.length === 2, 'S04 - Second user point created (P2)');
assert(userPoints2[1].onCircle === true, 'S04 - P2 marked as onCircle');

// S05: Construct Segment (Euclidean Postulate 1)
const p1Id = userPoints[0].id;
const p2Id = userPoints2[1].id;
state = dispatchGeometryCommand(state, {
  type: 'ADD_SEGMENT',
  segment: {
    p1Id,
    p2Id,
  },
});
const userSegs = Object.values(state.segments).filter((s) => !s.isBaseChord);
assert(userSegs.length === 1, 'S05 - User segment created between P1 and P2');
const expectedDist = Math.hypot(50 - 0, 50 - 100);
assert(Math.abs(userSegs[0].length - expectedDist) < 1e-5, 'S05 - Segment length matches Euclidean metric');

// S06: Segment Idempotence / Duplicate Prevention
const stateDuplicate = dispatchGeometryCommand(state, {
  type: 'ADD_SEGMENT',
  segment: {
    p1Id: p2Id,
    p2Id: p1Id,
  },
});
const userSegsDup = Object.values(stateDuplicate.segments).filter((s) => !s.isBaseChord);
assert(userSegsDup.length === 1, 'S06 - Reverse segment not duplicated');

// S07: Construct Line (Infinite straight line through two points)
state = dispatchGeometryCommand(state, {
  type: 'ADD_LINE',
  line: {
    p1Id: 'A',
    p2Id: p1Id,
  },
});
assert(Object.keys(state.lines).length === 1, 'S07 - Infinite line created through A and P1');

// S08: Construct Circle (Euclidean Postulate 3 / Compass)
state = dispatchGeometryCommand(state, {
  type: 'ADD_CIRCLE',
  circle: {
    centerId: 'O',
    radiusPointId: p1Id,
  },
});
const userCircles = Object.values(state.circles).filter((c) => !c.isBaseCircumcircle);
assert(userCircles.length === 1, 'S08 - Compass circle constructed with center O and radius point P1');
assert(Math.abs(userCircles[0].radius - Math.hypot(50, 50)) < 1e-5, 'S08 - Circle radius computed correctly');

// S09: Move User Point
state = dispatchGeometryCommand(state, {
  type: 'MOVE_POINT',
  pointId: p1Id,
  x: 60,
  y: 60,
});
assert(state.points[p1Id].x === 60 && state.points[p1Id].y === 60, 'S09 - User point moved to (60, 60)');
// Dependent segment length must automatically update
const updatedSeg = state.segments[userSegs[0].id];
const updatedDist = Math.hypot(60 - 0, 60 - 100);
assert(Math.abs(updatedSeg.length - updatedDist) < 1e-5, 'S09 - Dependent segment length dynamically updated');
// Dependent circle radius must automatically update
const updatedCircle = state.circles[userCircles[0].id];
assert(Math.abs(updatedCircle.radius - Math.hypot(60, 60)) < 1e-5, 'S09 - Dependent circle radius dynamically updated');

// S10: Erase Point with Cascade Deletion
state = dispatchGeometryCommand(state, {
  type: 'ERASE_OBJECT',
  objectType: 'point',
  id: p1Id,
});
assert(!state.points[p1Id], 'S10 - Point P1 successfully erased');
assert(Object.values(state.segments).filter((s) => !s.isBaseChord).length === 0, 'S10 - Dependent segment P1-P2 cascade deleted');
assert(Object.keys(state.lines).length === 0, 'S10 - Dependent line A-P1 cascade deleted');
assert(Object.values(state.circles).filter((c) => !c.isBaseCircumcircle).length === 0, 'S10 - Dependent circle cascade deleted');

// S11: Base Triangle Protection (Base vertices cannot be erased)
const stateProtected = dispatchGeometryCommand(state, {
  type: 'ERASE_OBJECT',
  objectType: 'point',
  id: 'A',
});
assert(stateProtected.points['A'] !== undefined, 'S11 - Base vertex A protected from erasure');

// S12: Sync Base Points updates chords & circumcircle invariants
state = dispatchGeometryCommand(state, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.0, B: 0.5, C: 0.25 }, // Thales right triangle configuration
  R: 100,
});
assert(state.points['A'].x === 100 && Math.abs(state.points['A'].y) < 1e-5, 'S12 - Vertex A synced to u=0.0 (100, 0)');
assert(state.points['B'].x === -100 && Math.abs(state.points['B'].y) < 1e-5, 'S12 - Vertex B synced to u=0.5 (-100, 0)');
assert(Math.abs(state.segments['chord_AB'].length - 200) < 1e-5, 'S12 - Base chord AB is exact diameter (200 mm)');

// S13: Find Nearest Snap Point to center or vertex
const snapA = snapToGeometry({ x: 98, y: 2 }, state, 10);
assert(snapA.snappedPointId === 'A', 'S13 - Cursor near A snaps to vertex A');

const snapO = snapToGeometry({ x: 0, y: 0 }, state, 10);
assert(snapO.snappedPointId === 'O', 'S13 - Cursor near (0, 0) snaps to center O');

// S14: Epistemic Isolation - Invalid segment command preserves state
const statePre = state;
const invalidState = dispatchGeometryCommand(state, {
  type: 'ADD_SEGMENT',
  segment: {
    p1Id: 'NON_EXISTENT',
    p2Id: 'ALSO_NON_EXISTENT',
  },
});
assert(invalidState === statePre, 'S14 - Invalid segment command preserves state identity (pure function)');

// S15: Run Perpendicular Bisector Test Suite
runPerpendicularBisectorTests();

// S16: Run Angle Bisector Test Suite
runAngleBisectorSuite();

// S17: Run Perpendicular Line Test Suite (Package 2.4.1)
runPerpendicularLineSuite();

// S18: Run Parallel Line Test Suite (Package 2.5)
runParallelLineSuite();

// S19: Run Contextual School Reference Test Suite (Package 3)
runSchoolReferenceTestSuite();

console.log('======================================================================');
console.log('ALL SCHOOL MODE & CONSTRUCTION ENGINE TESTS PASSED (100% SUCCESS)');
console.log('======================================================================');
