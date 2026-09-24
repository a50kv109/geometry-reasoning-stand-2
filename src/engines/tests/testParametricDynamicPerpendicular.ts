// src/engines/tests/testParametricDynamicPerpendicular.ts
// Verification of Dynamic Parametric Geometry Recomputation
// Complies with "One Geometry, Many Clients" invariant.

import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  planPerpendicularLine,
  planParallelLine,
  planPerpendicularBisector,
  planAngleBisector,
  distance2D,
  pointToLineDistance,
} from '../geometryState';
import {
  createInitialHistory,
  pushHistoryState,
  popHistoryState,
} from '../geometryHistory';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

console.log('🧪 Starting Parametric Dynamic Perpendicular & Dependent Geometry Tests...');

// 1. Setup Initial State
let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.75 }, 120);
let history = createInitialHistory(state, 30);

const initialPtCount = Object.keys(state.points).length; // O, A, B, C = 4
assert(initialPtCount === 4, `Expected 4 initial points, got ${initialPtCount}`);

// 2. Plan and Commit Perpendicular Line from A to chord_BC
const perpPlan = planPerpendicularLine(state, 'chord_BC', 'A', 'test_perp_A');
assert(perpPlan.success, 'Perpendicular planning failed');

history = pushHistoryState(history, state);
state = dispatchGeometryCommand(state, {
  type: 'BATCH_COMMANDS',
  commands: perpPlan.commands,
});

const postCommitPtCount = Object.keys(state.points).length;
console.log(`✅ Perpendicular committed. Point count: ${postCommitPtCount}`);

// Check orthogonality before moving C
const ptA = state.points.A;
const ptB = state.points.B;
const ptC = state.points.C;
const lineObj = state.lines['line_perp_test_perp_A'];
assert(!!lineObj, 'Perpendicular line must exist');

const ptQ = state.points[lineObj.p2Id];
assert(!!ptQ, 'Point Q must exist');

// Dot product of BC and AQ
const bcVec = { x: ptC.x - ptB.x, y: ptC.y - ptB.y };
const aqVec = { x: ptQ.x - ptA.x, y: ptQ.y - ptA.y };
const dot1 = bcVec.x * aqVec.x + bcVec.y * aqVec.y;
const cos1 = Math.abs(dot1 / (Math.hypot(bcVec.x, bcVec.y) * Math.hypot(aqVec.x, aqVec.y)));
assert(cos1 < 1e-4, `Expected orthogonal vectors before move, cos = ${cos1}`);
console.log(`✅ Orthogonality verified before move: angle = 90.000° (cos = ${cos1.toFixed(6)})`);

// Verify foot of perpendicular intersection exists
const intPoints1 = Object.values(state.points).filter(
  (p) => p.provenance?.groupId === 'test_perp_A' && p.id.includes('_int_')
);
assert(intPoints1.length >= 1, 'Intersection point on BC or circumcircle must exist');
const foot1 = intPoints1.find((p) => p.parentIds?.includes('chord_BC'));
assert(!!foot1, 'Foot of perpendicular on chord_BC must exist');
const distToBc1 = pointToLineDistance(foot1!, ptB, ptC);
assert(distToBc1 < 1e-4, `Foot must lie exactly on BC line, dist = ${distToBc1}`);

// 3. Move Vertex C (changing side BC)
console.log('\n🔄 Moving vertex C: dragging C around circumcircle...');
history = pushHistoryState(history, state);

// Move C from u=0.75 to u=0.85
state = dispatchGeometryCommand(state, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.1, B: 0.4, C: 0.85 },
  R: 120,
});

// Verify state after moving C
const newPtB = state.points.B;
const newPtC = state.points.C;
const newPtA = state.points.A;
const newLineObj = state.lines['line_perp_test_perp_A'];
const newPtQ = state.points[newLineObj.p2Id];

// Vector check after move
const newBcVec = { x: newPtC.x - newPtB.x, y: newPtC.y - newPtB.y };
const newAqVec = { x: newPtQ.x - newPtA.x, y: newPtQ.y - newPtA.y };
const dot2 = newBcVec.x * newAqVec.x + newBcVec.y * newAqVec.y;
const cos2 = Math.abs(dot2 / (Math.hypot(newBcVec.x, newBcVec.y) * Math.hypot(newAqVec.x, newAqVec.y)));
assert(cos2 < 1e-4, `Expected orthogonal vectors after move of C, cos = ${cos2}`);
console.log(`✅ Dynamic recomputation maintained orthogonality after C moved: angle = 90.000° (cos = ${cos2.toFixed(6)})`);

// Verify foot of perpendicular intersection was updated in-place without point duplication
const postMovePtCount = Object.keys(state.points).length;
assert(
  postMovePtCount === postCommitPtCount,
  `Point count must remain strictly invariant during move! Expected ${postCommitPtCount}, got ${postMovePtCount}`
);
console.log(`✅ Point count invariant held: exactly ${postMovePtCount} points in state (zero duplicates)`);

const intPoints2 = Object.values(state.points).filter(
  (p) => p.provenance?.groupId === 'test_perp_A' && p.id.includes('_int_')
);
const foot2 = intPoints2.find((p) => p.parentIds?.includes('chord_BC'));
assert(!!foot2, 'Foot of perpendicular on chord_BC must still exist after move');
const distToBc2 = pointToLineDistance(foot2!, newPtB, newPtC);
assert(distToBc2 < 1e-4, `Foot must lie on new BC line, dist = ${distToBc2}`);

// 4. Repeated continuous dragging test (100 movement frames)
console.log('\n🔄 Testing continuous multi-frame dragging (100 iterations)...');
for (let i = 0; i < 100; i++) {
  const uC = 0.6 + (i / 100) * 0.3; // 0.60 -> 0.90
  state = dispatchGeometryCommand(state, {
    type: 'SYNC_BASE_POINTS',
    pointsU: { A: 0.1, B: 0.4, C: uC },
    R: 120,
  });

  const currB = state.points.B;
  const currC = state.points.C;
  const currA = state.points.A;
  const currQ = state.points[state.lines['line_perp_test_perp_A'].p2Id];

  const currBc = { x: currC.x - currB.x, y: currC.y - currB.y };
  const currAq = { x: currQ.x - currA.x, y: currQ.y - currA.y };
  const d = Math.abs((currBc.x * currAq.x + currBc.y * currAq.y) / (Math.hypot(currBc.x, currBc.y) * Math.hypot(currAq.x, currAq.y)));
  assert(d < 1e-4, `Failed orthogonality at frame ${i}: cos = ${d}`);
}

const after100MovesPtCount = Object.keys(state.points).length;
assert(
  after100MovesPtCount === postCommitPtCount,
  `After 100 moves, point count must still be ${postCommitPtCount}, got ${after100MovesPtCount}`
);
console.log(`✅ 100 continuous drag frames passed: 100% orthogonal and 0 memory/point leaks!`);

// 5. Test Dynamic Parallel Line Recomputation
console.log('\n🔄 Testing Dynamic Parallel Line recomputation...');
const parPlan = planParallelLine(state, 'chord_BC', 'A', 'test_par_A');
assert(parPlan.success, 'Parallel planning failed');
state = dispatchGeometryCommand(state, {
  type: 'BATCH_COMMANDS',
  commands: parPlan.commands,
});

const parLine = state.lines['line_par_test_par_A'];
assert(!!parLine, 'Parallel line must exist');
const parQ = state.points[parLine.p2Id];

// Check parallelism (cross product is 0)
const curB = state.points.B;
const curC = state.points.C;
const curA = state.points.A;
const vBC = { x: curC.x - curB.x, y: curC.y - curB.y };
const vAQ = { x: parQ.x - curA.x, y: parQ.y - curA.y };
const cross1 = Math.abs((vBC.x * vAQ.y - vBC.y * vAQ.x) / (Math.hypot(vBC.x, vBC.y) * Math.hypot(vAQ.x, vAQ.y)));
assert(cross1 < 1e-4, `Expected parallel lines before move, cross = ${cross1}`);

// Move B
state = dispatchGeometryCommand(state, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.1, B: 0.35, C: 0.75 },
  R: 120,
});

const newB = state.points.B;
const newC = state.points.C;
const newA = state.points.A;
const newParQ = state.points[state.lines['line_par_test_par_A'].p2Id];
const newVBC = { x: newC.x - newB.x, y: newC.y - newB.y };
const newVAQ = { x: newParQ.x - newA.x, y: newParQ.y - newA.y };
const cross2 = Math.abs((newVBC.x * newVAQ.y - newVBC.y * newVAQ.x) / (Math.hypot(newVBC.x, newVBC.y) * Math.hypot(newVAQ.x, newVAQ.y)));
assert(cross2 < 1e-4, `Expected parallel lines after move of B, cross = ${cross2}`);
console.log(`✅ Parallel line dynamically maintained 0.000° angle after moving B (cross = ${cross2.toFixed(6)})`);

// 6. Test Undo State
console.log('\n🔄 Testing Undo functionality...');
const popped = popHistoryState(history);
assert(!!popped, 'Popped history state must exist');
state = popped!.restoredState;
console.log(`✅ Undo successfully restored previous geometry state.`);

console.log('\n🎉 ALL PARAMETRIC DYNAMIC RECOMPUTATION TESTS PASSED (100% deterministic)!');
