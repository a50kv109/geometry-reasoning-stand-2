// src/engines/tests/testIncircleLiveDeformation.ts
// Verification test suite for Semantic Live Incircle and Dynamic Triangle Deformation (PAT-27 Invariant)
// Complies with "One Geometry, Many Clients" and "Construction != Verification" invariants.

import { createDefaultGeometryState, dispatchGeometryCommand } from '../constructionCore';
import { planIncircle, applyIncircle, verifyIncircle } from '../incircle';
import { applyAngleBisector } from '../angleBisector';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✓ PASS: ${msg}`);
}

console.log('======================================================================');
console.log('RUNNING SEMANTIC LIVE INCIRCLE & DEFORMATION TEST MATRIX');
console.log('======================================================================');

// --- TEST 1: Initial Incircle Construction on Equilateral Triangle ---
console.log('\n--- TEST 1: Initial Incircle Construction on Equilateral Triangle ---');
const R = 100;
const state0 = createDefaultGeometryState({ A: 0, B: 1 / 3, C: 2 / 3 }, R);

const { nextState: stateWithIncircle, plan } = applyIncircle(state0, 'A', 'B', 'C');
assert(plan.success === true, 'TEST 1.1: planIncircle succeeded for equilateral triangle');
if (plan.success) {
  assert(Math.abs(plan.radius - 50) < 1e-4, `TEST 1.2: Inradius on equilateral triangle is R/2 = 50 (got ${plan.radius.toFixed(4)})`);
  assert(Math.hypot(plan.incenter.x, plan.incenter.y) < 1e-4, 'TEST 1.3: Incenter on equilateral triangle is at origin (0, 0)');

  const incircleId = plan.createdObjectIds.incircleId;
  assert(Boolean(stateWithIncircle.circles[incircleId]), 'TEST 1.4: Incircle registered in FullGeometryState');
  assert(stateWithIncircle.circles[incircleId].provenance?.macroType === 'incircle', 'TEST 1.5: Incircle has provenance macroType "incircle"');

  // Independent 1st-principles verification (Construction != Verification)
  const ver = verifyIncircle(stateWithIncircle, incircleId);
  assert(ver.isValid === true, 'TEST 1.6: verifyIncircle confirms valid incircle');
  assert(ver.isTangencyValid === true, 'TEST 1.7: Tangency to all 3 sides verified');
  assert(ver.isInsideTriangle === true, 'TEST 1.8: Incenter is strictly inside triangle');
  assert(ver.maxDeviation < 1e-4, `TEST 1.9: Tangency deviation is ${ver.maxDeviation.toFixed(6)} <= 1e-4`);
}

// --- TEST 2: Dynamic Deformation via SYNC_BASE_POINTS (Moving Vertex A) ---
console.log('\n--- TEST 2: Dynamic Deformation via SYNC_BASE_POINTS (Moving Vertex A) ---');
const mutatedStateA = dispatchGeometryCommand(stateWithIncircle, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.08, B: 1 / 3, C: 2 / 3 }, // Move vertex A by +28.8 deg
  R,
});

const incircleId = Object.keys(mutatedStateA.circles).find(
  (id) => mutatedStateA.circles[id].provenance?.macroType === 'incircle'
)!;
assert(Boolean(incircleId), 'TEST 2.1: Incircle exists in mutated state');

const incenterA = mutatedStateA.points[mutatedStateA.circles[incircleId].centerId];
const radiusA = mutatedStateA.circles[incircleId].radius;

assert(incenterA.x !== 0 || incenterA.y !== 0, `TEST 2.2: Incenter moved dynamically to (${incenterA.x.toFixed(2)}, ${incenterA.y.toFixed(2)})`);
assert(Math.abs(radiusA - 50) > 0.1, `TEST 2.3: Inradius updated dynamically from 50 to ${radiusA.toFixed(4)}`);

// Independent verification of new geometry state
const verA = verifyIncircle(mutatedStateA, incircleId);
assert(verA.isValid === true, 'TEST 2.4: Mutated incircle is valid (tangent to all 3 deformed sides)');
assert(verA.maxDeviation < 1e-4, `TEST 2.5: Tangency max deviation after deformation is ${verA.maxDeviation.toFixed(6)} <= 1e-4`);
assert(Math.abs(verA.distanceAB - radiusA) < 1e-4, 'TEST 2.6: Distance to deformed AB equals r');
assert(Math.abs(verA.distanceBC - radiusA) < 1e-4, 'TEST 2.7: Distance to deformed BC equals r');
assert(Math.abs(verA.distanceCA - radiusA) < 1e-4, 'TEST 2.8: Distance to deformed CA equals r');

// --- TEST 3: Dynamic Deformation of Vertices B and C (Right Triangle Configuration) ---
console.log('\n--- TEST 3: Dynamic Deformation of Vertices B and C (Right Triangle Configuration) ---');
// 3-4-5 proportional right triangle on circumcircle: A=0°, B=90°, C=180° (diameter AC = 2R = 200)
// For right triangle with legs b=200*cos(theta), etc.
const mutatedStateRight = dispatchGeometryCommand(mutatedStateA, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.25, B: 0.58, C: 0.85 },
  R,
});

const incenterRight = mutatedStateRight.points[mutatedStateRight.circles[incircleId].centerId];
const radiusRight = mutatedStateRight.circles[incircleId].radius;

const verRight = verifyIncircle(mutatedStateRight, incircleId);
assert(verRight.isValid === true, 'TEST 3.1: Incircle recomputed for scalene configuration');
assert(verRight.isTangencyValid === true, 'TEST 3.2: Scalene incircle maintains exact 3-side tangency');
assert(verRight.maxDeviation < 1e-4, `TEST 3.3: Max deviation is ${verRight.maxDeviation.toFixed(6)} <= 1e-4`);

// --- TEST 4: Coexistence with Manual Angle Bisectors ---
console.log('\n--- TEST 4: Coexistence with Manual Angle Bisectors ---');
// User constructs manual angle bisector at vertex A
const { nextState: stateWithBoth, plan: abPlan } = applyAngleBisector(mutatedStateRight, 'B', 'A', 'C');
assert(abPlan.success === true, 'TEST 4.1: Manual angle bisector planned and constructed successfully');

// Move vertex C
const mutatedBoth = dispatchGeometryCommand(stateWithBoth, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.25, B: 0.58, C: 0.90 },
  R,
});

const verBoth = verifyIncircle(mutatedBoth, incircleId);
assert(verBoth.isValid === true, 'TEST 4.2: Incircle updates independently from manual bisector snapshot');
assert(verBoth.maxDeviation < 1e-4, `TEST 4.3: Incircle verified cleanly after multi-macro deformation (${verBoth.maxDeviation.toFixed(6)})`);

// --- TEST 5: Degenerate Triangle Handling ---
console.log('\n--- TEST 5: Degenerate Triangle Handling ---');
const degenState = dispatchGeometryCommand(mutatedBoth, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.25, B: 0.25, C: 0.85 }, // A and B coincident -> degenerate
  R,
});

const degenCirc = degenState.circles[incircleId];
assert(degenCirc.radius === 0, 'TEST 5.1: Degenerate triangle inradius safely resets to 0 (no NaN)');
assert(!isNaN(degenCirc.radius), 'TEST 5.2: Inradius is not NaN');

// Restore to valid configuration
const restoredState = dispatchGeometryCommand(degenState, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0, B: 1 / 3, C: 2 / 3 },
  R,
});

const verRestored = verifyIncircle(restoredState, incircleId);
assert(verRestored.isValid === true, 'TEST 5.3: Incircle automatically restores when triangle becomes non-degenerate');
assert(Math.abs(verRestored.radius - 50) < 1e-4, 'TEST 5.4: Restored inradius is exactly 50.0');

console.log('======================================================================');
console.log('ALL SEMANTIC LIVE INCIRCLE & DEFORMATION TESTS PASSED PERFECTLY! 🎉');
console.log('======================================================================');
