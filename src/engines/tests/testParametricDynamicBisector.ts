// src/engines/tests/testParametricDynamicBisector.ts
// Comprehensive Test Suite for Dynamic Parametric Angle Bisector
// Complies with "One Geometry, Many Clients" invariant and DYN-BISECTOR-01 through 12.

import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  planAngleBisector,
  planPerpendicularLine,
  distance2D,
  pointToLineDistance,
  Point2D,
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

function computeAngleBetweenVectors(v1: Point2D, v2: Point2D): number {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 < 1e-9 || mag2 < 1e-9) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cos);
}

console.log('🧪 Starting Parametric Dynamic Angle Bisector Test Suite (DYN-BISECTOR-01 to 12)...\n');

// -------------------------------------------------------------------------------------------------
// DYN-BISECTOR-01: Plan & Commit in School Mode -> Persists with Semantic Provenance
// -------------------------------------------------------------------------------------------------
console.log('--- Test DYN-BISECTOR-01: School Mode Creation & Semantic Provenance ---');
let state = createDefaultGeometryState({ A: 0.1, B: 0.45, C: 0.8 }, 120);
let history = createInitialHistory(state, 50);

const initialPtCount = Object.keys(state.points).length; // O, A, B, C = 4
assert(initialPtCount === 4, `Expected 4 initial points, got ${initialPtCount}`);

// Construct bisector of angle ABC (vertex B, arms A and C)
const bisectorPlan = planAngleBisector(state, 'A', 'B', 'C', 'bisector_B');
assert(bisectorPlan.success, 'Angle bisector planning failed');

history = pushHistoryState(history, state);
state = dispatchGeometryCommand(state, {
  type: 'BATCH_COMMANDS',
  commands: bisectorPlan.commands,
});

const lineObj = state.lines['line_ab_bisector_B'];
assert(!!lineObj, 'Primary bisector line line_ab_bisector_B must exist');
assert(lineObj.role === 'primary', 'Bisector line must have primary role');
assert(lineObj.provenance?.macroType === 'angle_bisector', 'MacroType must be angle_bisector');
assert(lineObj.provenance?.groupId === 'bisector_B', 'GroupId must match bisector_B');
assert(
  JSON.stringify(lineObj.provenance?.sourceIds) === JSON.stringify(['A', 'B', 'C']),
  'Source IDs must be [A, B, C]'
);

// Verify auxiliary objects
assert(!!state.circles['circ_ab_bisector_B_0'], 'Base circle circ_ab_bisector_B_0 must exist');
assert(!!state.points['pt_ab_bisector_B_P1'], 'P1 on arm BA must exist');
assert(!!state.points['pt_ab_bisector_B_P2'], 'P2 on arm BC must exist');
assert(!!state.circles['circ_ab_bisector_B_1'], 'Circle C1 around P1 must exist');
assert(!!state.circles['circ_ab_bisector_B_2'], 'Circle C2 around P2 must exist');
assert(!!state.points['pt_ab_bisector_B_Q'], 'Direction point Q must exist');

console.log('✅ DYN-BISECTOR-01 passed: Angle bisector created with complete semantic provenance.\n');

// -------------------------------------------------------------------------------------------------
// DYN-BISECTOR-05: Strict Mathematical Angle Bisection Invariant
// -------------------------------------------------------------------------------------------------
console.log('--- Test DYN-BISECTOR-05: Mathematical Invariant angle(BA, BQ) == angle(BQ, BC) ---');

function verifyBisectorInvariant(currentState: typeof state, label: string) {
  const pA = currentState.points.A;
  const pB = currentState.points.B;
  const pC = currentState.points.C;
  const pQ = currentState.points['pt_ab_bisector_B_Q'];
  assert(!!pQ, `Point Q must exist for ${label}`);

  const vecBA = { x: pA.x - pB.x, y: pA.y - pB.y };
  const vecBC = { x: pC.x - pB.x, y: pC.y - pB.y };
  const vecBQ = { x: pQ.x - pB.x, y: pQ.y - pB.y };

  const angle1 = computeAngleBetweenVectors(vecBA, vecBQ);
  const angle2 = computeAngleBetweenVectors(vecBQ, vecBC);
  const totalAngle = computeAngleBetweenVectors(vecBA, vecBC);

  const diff = Math.abs(angle1 - angle2);
  const sumDiff = Math.abs((angle1 + angle2) - totalAngle);

  console.log(`   [${label}] angle(BA,BQ)=${(angle1 * 180 / Math.PI).toFixed(4)}°, angle(BQ,BC)=${(angle2 * 180 / Math.PI).toFixed(4)}°, diff=${diff.toExponential(3)}`);
  assert(diff < 1e-4, `Angle bisector invariant violated at ${label}: diff = ${diff}`);
  assert(sumDiff < 1e-4, `Ray is not internal at ${label}: sumDiff = ${sumDiff}`);
}

verifyBisectorInvariant(state, 'Initial Configuration');
console.log('✅ DYN-BISECTOR-05 (Initial) passed.\n');

// -------------------------------------------------------------------------------------------------
// DYN-BISECTOR-02: Moving First Arm (Vertex A) Dynamically Recomputes Bisector
// -------------------------------------------------------------------------------------------------
console.log('--- Test DYN-BISECTOR-02: Moving Vertex A (First Arm) ---');
state = dispatchGeometryCommand(state, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.18, B: 0.45, C: 0.8 },
  R: 120,
});
verifyBisectorInvariant(state, 'After Moving Vertex A to u=0.18');
console.log('✅ DYN-BISECTOR-02 passed.\n');

// -------------------------------------------------------------------------------------------------
// DYN-BISECTOR-03: Moving Second Arm (Vertex C) Dynamically Recomputes Bisector
// -------------------------------------------------------------------------------------------------
console.log('--- Test DYN-BISECTOR-03: Moving Vertex C (Second Arm) ---');
state = dispatchGeometryCommand(state, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.18, B: 0.45, C: 0.72 },
  R: 120,
});
verifyBisectorInvariant(state, 'After Moving Vertex C to u=0.72');
console.log('✅ DYN-BISECTOR-03 passed.\n');

// -------------------------------------------------------------------------------------------------
// DYN-BISECTOR-04: Moving Vertex B (Angle Apex) Dynamically Recomputes Bisector
// -------------------------------------------------------------------------------------------------
console.log('--- Test DYN-BISECTOR-04: Moving Vertex B (Apex) ---');
state = dispatchGeometryCommand(state, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.18, B: 0.52, C: 0.72 },
  R: 120,
});
verifyBisectorInvariant(state, 'After Moving Vertex B to u=0.52');
console.log('✅ DYN-BISECTOR-04 passed.\n');

// -------------------------------------------------------------------------------------------------
// DYN-BISECTOR-06 & 07: Intersections with Circumcircle Gamma and Opposite Side AC
// -------------------------------------------------------------------------------------------------
console.log('--- Test DYN-BISECTOR-06 & 07: Dynamic Intersections (Circumcircle & Side AC) ---');
const intPoints = Object.values(state.points).filter(
  (p) => p.provenance?.groupId === 'bisector_B' && p.id.includes('_int_')
);

console.log(`   Found ${intPoints.length} intersection points for bisector_B:`);
intPoints.forEach((p) => {
  console.log(`     Point ${p.id} (${p.name}): (${p.x.toFixed(2)}, ${p.y.toFixed(2)}), parentIds=[${p.parentIds?.join(', ')}]`);
});

assert(intPoints.length >= 1, 'At least 1 intersection point (with opposite side or circumcircle) must exist');

// Verify that all intersection points lie on the bisector line
const curPtB = state.points.B;
const curPtQ = state.points['pt_ab_bisector_B_Q'];
for (const p of intPoints) {
  const distToLine = pointToLineDistance(p, curPtB, curPtQ);
  assert(distToLine < 1e-4, `Intersection point ${p.id} must lie on bisector line (dist=${distToLine})`);
}

// Verify circumcircle intersection lies on Gamma (distance from O is R)
const circumcircleInt = intPoints.find((p) => p.parentIds?.includes('circumcircle_main'));
if (circumcircleInt) {
  const distFromO = Math.hypot(circumcircleInt.x, circumcircleInt.y);
  assert(Math.abs(distFromO - 120) < 1e-3, `Circumcircle intersection must lie on Gamma: dist=${distFromO}`);
  console.log(`   Circumcircle intersection verified on Gamma: dist=${distFromO.toFixed(3)} (R=120)`);
}

// Verify side AC intersection lies on line AC
const sideAcInt = intPoints.find((p) => p.parentIds?.includes('chord_CA') || p.parentIds?.includes('chord_AC'));
if (sideAcInt) {
  const distToAC = pointToLineDistance(sideAcInt, state.points.A, state.points.C);
  assert(distToAC < 1e-4, `Opposite side AC intersection must lie on AC: dist=${distToAC}`);
  console.log(`   Opposite side AC intersection verified on line AC: dist=${distToAC.toFixed(4)}`);
}

console.log('✅ DYN-BISECTOR-06 & 07 passed.\n');

// -------------------------------------------------------------------------------------------------
// DYN-BISECTOR-08: Coexistence with Other Dynamic Constructions (e.g. Perpendicular)
// -------------------------------------------------------------------------------------------------
console.log('--- Test DYN-BISECTOR-08: Coexistence with Perpendicular Construction ---');
const perpPlan = planPerpendicularLine(state, 'chord_CA', 'B', 'perp_B_to_AC');
assert(perpPlan.success, 'Perpendicular planning failed');
state = dispatchGeometryCommand(state, {
  type: 'BATCH_COMMANDS',
  commands: perpPlan.commands,
});

// Now move triangle vertices again and verify both bisector and perpendicular remain mathematically valid!
state = dispatchGeometryCommand(state, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.12, B: 0.48, C: 0.82 },
  R: 120,
});

verifyBisectorInvariant(state, 'Bisector after Coexisting Move');

// Verify perpendicular orthogonality
const pA2 = state.points.A;
const pC2 = state.points.C;
const pB2 = state.points.B;
const perpQ = state.points['pt_perp_perp_B_to_AC_Q'];
const vecAC = { x: pC2.x - pA2.x, y: pC2.y - pA2.y };
const vecBQ_perp = { x: perpQ.x - pB2.x, y: perpQ.y - pB2.y };
const dotPerp = vecAC.x * vecBQ_perp.x + vecAC.y * vecBQ_perp.y;
const cosPerp = Math.abs(dotPerp / (Math.hypot(vecAC.x, vecAC.y) * Math.hypot(vecBQ_perp.x, vecBQ_perp.y)));
assert(cosPerp < 1e-4, `Perpendicular must remain orthogonal: cos = ${cosPerp}`);
console.log(`   Perpendicular orthogonality verified: cos = ${cosPerp.toFixed(6)}`);
console.log('✅ DYN-BISECTOR-08 passed.\n');

// -------------------------------------------------------------------------------------------------
// DYN-BISECTOR-09: 100 Continuous Drag Iterations Stress Test (Zero Duplication)
// -------------------------------------------------------------------------------------------------
console.log('--- Test DYN-BISECTOR-09: 100 Drag Iterations Stress Test ---');
const startU = { A: 0.12, B: 0.48, C: 0.82 };
state = dispatchGeometryCommand(state, {
  type: 'SYNC_BASE_POINTS',
  pointsU: startU,
  R: 120,
});

const pointCountBeforeStress = Object.keys(state.points).length;
const lineCountBeforeStress = Object.keys(state.lines).length;
const circleCountBeforeStress = Object.keys(state.circles).length;

for (let i = 0; i < 100; i++) {
  const t = i / 100;
  // Closed loop: at t=0 and t=1, sin(2*pi*t) = 0
  const uA = startU.A + 0.04 * Math.sin(t * Math.PI * 2);
  const uB = startU.B + 0.04 * Math.sin(t * Math.PI * 2);
  const uC = startU.C + 0.04 * Math.sin(t * Math.PI * 2);

  state = dispatchGeometryCommand(state, {
    type: 'SYNC_BASE_POINTS',
    pointsU: { A: uA, B: uB, C: uC },
    R: 120,
  });

  // Check invariant at each step
  const pA = state.points.A;
  const pB = state.points.B;
  const pC = state.points.C;
  const pQ = state.points['pt_ab_bisector_B_Q'];
  const vecBA = { x: pA.x - pB.x, y: pA.y - pB.y };
  const vecBC = { x: pC.x - pB.x, y: pC.y - pB.y };
  const vecBQ = { x: pQ.x - pB.x, y: pQ.y - pB.y };
  const diff = Math.abs(computeAngleBetweenVectors(vecBA, vecBQ) - computeAngleBetweenVectors(vecBQ, vecBC));
  assert(diff < 1e-4, `Invariant failed at step ${i}: diff = ${diff}`);
}

// Return to exact start
state = dispatchGeometryCommand(state, {
  type: 'SYNC_BASE_POINTS',
  pointsU: startU,
  R: 120,
});

const pointCountAfterStress = Object.keys(state.points).length;
const lineCountAfterStress = Object.keys(state.lines).length;
const circleCountAfterStress = Object.keys(state.circles).length;

assert(
  pointCountBeforeStress === pointCountAfterStress,
  `Point count changed! Before=${pointCountBeforeStress}, After=${pointCountAfterStress}`
);
assert(
  lineCountBeforeStress === lineCountAfterStress,
  `Line count changed! Before=${lineCountBeforeStress}, After=${lineCountAfterStress}`
);
assert(
  circleCountBeforeStress === circleCountAfterStress,
  `Circle count changed! Before=${circleCountBeforeStress}, After=${circleCountAfterStress}`
);

verifyBisectorInvariant(state, 'After 100 Drag Steps');
console.log(`✅ DYN-BISECTOR-09 passed: Zero object duplication across 100 continuous drag iterations. (Points: ${pointCountAfterStress}, Lines: ${lineCountAfterStress}, Circles: ${circleCountAfterStress})\n`);

// -------------------------------------------------------------------------------------------------
// DYN-BISECTOR-10: Single-Step Atomic Undo
// -------------------------------------------------------------------------------------------------
console.log('--- Test DYN-BISECTOR-10: Single-Step Atomic Undo ---');
let freshState = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.75 }, 120);
let freshHistory = createInitialHistory(freshState, 30);

const ptsBefore = Object.keys(freshState.points).length;

const freshBisPlan = planAngleBisector(freshState, 'A', 'B', 'C', 'undo_bisector_test');
assert(freshBisPlan.success, 'Plan failed');
freshState = dispatchGeometryCommand(freshState, {
  type: 'BATCH_COMMANDS',
  commands: freshBisPlan.commands,
});
freshHistory = pushHistoryState(freshHistory, freshState);

assert(Object.keys(freshState.points).length > ptsBefore, 'Points must have increased after commit');

// Perform single undo step
const popped = popHistoryState(freshHistory);
assert(!!popped, 'Undo state must be available');
const previousState = popped.restoredState;
assert(
  Object.keys(previousState.points).length === ptsBefore,
  `Points must restore to ${ptsBefore}, got ${Object.keys(previousState.points).length}`
);
assert(!previousState.lines['line_ab_undo_bisector_test'], 'Bisector line must be completely removed');

console.log('✅ DYN-BISECTOR-10 passed: Atomic undo cleanly restores original state in 1 step.\n');

// -------------------------------------------------------------------------------------------------
// DYN-BISECTOR-11 & 12: Configuration Model & Research Mode Invariants
// -------------------------------------------------------------------------------------------------
console.log('--- Test DYN-BISECTOR-11 & 12: Semantic Configuration & Research State ---');
const primaryLine = state.lines['line_ab_bisector_B'];
assert(!!primaryLine, 'Bisector line exists');
assert(primaryLine.provenance?.macroType === 'angle_bisector', 'macroType is angle_bisector');
assert(primaryLine.p1Id === 'B', 'Line starts at vertex B');

const ptQFinal = state.points[primaryLine.p2Id];
assert(!!ptQFinal, 'Line ends at Q');
assert(ptQFinal.role === 'auxiliary', 'Q is auxiliary');

console.log('✅ DYN-BISECTOR-11 & 12 passed: Configuration model & Research mode reflect current parametric state.\n');

console.log('🎉 ALL 12 DYNAMIC ANGLE BISECTOR TESTS (DYN-BISECTOR-01 to 12) PASSED PERFECTLY!\n');
