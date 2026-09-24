// src/engines/tests/testParametricAngleInput.ts
// Comprehensive verification test suite for Target Angle Input & Parametric Solver.
// Tests ANGLE-INPUT-01 through ANGLE-INPUT-10 (and auxiliary invariants).

import {
  solveTriangleConfiguration,
  solveTargetAngle,
  MIN_TARGET_ANGLE_DEG,
  MAX_TARGET_ANGLE_DEG,
} from '../parametricAngleSolver';
import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  planPerpendicularLine,
  planAngleBisector,
  FullGeometryState,
} from '../geometryState';
import { ClassicalEngine } from '../classicalEngine';
import { MatrixEngine } from '../matrixEngine';
import { createInitialHistory, pushHistoryState, popHistoryState } from '../geometryHistory';
import { extractSemanticQuantities } from '../configuration/semanticQuantity';
import { buildConfigurationView } from '../configuration/configurationProjector';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

function approxEqual(a: number, b: number, eps = 1e-4): boolean {
  return Math.abs(a - b) < eps;
}

export function runParametricAngleInputTests() {
  console.log('======================================================================');
  console.log('RUNNING TARGET ANGLE INPUT & PARAMETRIC SOLVER TEST SUITE');
  console.log('======================================================================');

  const initialPointsU = { A: 0.12, B: 0.45, C: 0.78 };
  const R = 100;
  const classicalEngine = new ClassicalEngine();
  const matrixEngine = new MatrixEngine();

  // --- TEST ANGLE-INPUT-01: Given A and B -> C computed automatically ---
  console.log('\n--- TEST ANGLE-INPUT-01: Given A and B -> C computed automatically ---');
  const res01 = solveTriangleConfiguration(initialPointsU, { A: 45, B: 60 });
  assert(res01.success === true, 'ANGLE-INPUT-01.1: Solver succeeds for A=45°, B=60°');
  assert(res01.mode === 'TWO_ANGLES', 'ANGLE-INPUT-01.2: Mode is TWO_ANGLES');
  assert(res01.autoCalculatedVertex === 'C', 'ANGLE-INPUT-01.3: Auto-calculated vertex is C');
  assert(approxEqual(res01.resolvedAngles!.C, 75.0, 0.01), `ANGLE-INPUT-01.4: C = 180 - 45 - 60 = 75° (got ${res01.resolvedAngles!.C}°)`);
  
  const classical01 = classicalEngine.compute(res01.nextPointsU!, R);
  assert(approxEqual(classical01.angles.A, 45.0, 0.01), `ANGLE-INPUT-01.5: Classical ∠A = 45.0° (actual ${classical01.angles.A.toFixed(2)}°)`);
  assert(approxEqual(classical01.angles.B, 60.0, 0.01), `ANGLE-INPUT-01.6: Classical ∠B = 60.0° (actual ${classical01.angles.B.toFixed(2)}°)`);
  assert(approxEqual(classical01.angles.C, 75.0, 0.01), `ANGLE-INPUT-01.7: Classical ∠C = 75.0° (actual ${classical01.angles.C.toFixed(2)}°)`);
  assert(approxEqual(classical01.angles.A + classical01.angles.B + classical01.angles.C, 180.0, 0.01), 'ANGLE-INPUT-01.8: Sum of angles is exactly 180.0°');

  // --- TEST ANGLE-INPUT-02: Given A and C -> B computed automatically ---
  console.log('\n--- TEST ANGLE-INPUT-02: Given A and C -> B computed automatically ---');
  const res02 = solveTriangleConfiguration(initialPointsU, { A: 45, C: 75 });
  assert(res02.success === true, 'ANGLE-INPUT-02.1: Solver succeeds for A=45°, C=75°');
  assert(res02.autoCalculatedVertex === 'B', 'ANGLE-INPUT-02.2: Auto-calculated vertex is B');
  assert(approxEqual(res02.resolvedAngles!.B, 60.0, 0.01), `ANGLE-INPUT-02.3: B = 180 - 45 - 75 = 60° (got ${res02.resolvedAngles!.B}°)`);
  
  const classical02 = classicalEngine.compute(res02.nextPointsU!, R);
  assert(approxEqual(classical02.angles.B, 60.0, 0.01), `ANGLE-INPUT-02.4: Classical ∠B = 60.0° (actual ${classical02.angles.B.toFixed(2)}°)`);

  // --- TEST ANGLE-INPUT-03: Given B and C -> A computed automatically ---
  console.log('\n--- TEST ANGLE-INPUT-03: Given B and C -> A computed automatically ---');
  const res03 = solveTriangleConfiguration(initialPointsU, { B: 50, C: 60 });
  assert(res03.success === true, 'ANGLE-INPUT-03.1: Solver succeeds for B=50°, C=60°');
  assert(res03.autoCalculatedVertex === 'A', 'ANGLE-INPUT-03.2: Auto-calculated vertex is A');
  assert(approxEqual(res03.resolvedAngles!.A, 70.0, 0.01), `ANGLE-INPUT-03.3: A = 180 - 50 - 60 = 70° (got ${res03.resolvedAngles!.A}°)`);
  
  const classical03 = classicalEngine.compute(res03.nextPointsU!, R);
  assert(approxEqual(classical03.angles.A, 70.0, 0.01), `ANGLE-INPUT-03.4: Classical ∠A = 70.0° (actual ${classical03.angles.A.toFixed(2)}°)`);

  // --- TEST ANGLE-INPUT-04: Three angles with sum = 180° accepted ---
  console.log('\n--- TEST ANGLE-INPUT-04: Three angles with sum = 180° accepted ---');
  const res04 = solveTriangleConfiguration(initialPointsU, { A: 50, B: 60, C: 70 });
  assert(res04.success === true, 'ANGLE-INPUT-04.1: Solver succeeds for 50° + 60° + 70° = 180°');
  assert(res04.mode === 'THREE_ANGLES', 'ANGLE-INPUT-04.2: Mode is THREE_ANGLES');
  const classical04 = classicalEngine.compute(res04.nextPointsU!, R);
  assert(approxEqual(classical04.angles.A, 50.0, 0.01), 'ANGLE-INPUT-04.3: Classical ∠A = 50.0°');
  assert(approxEqual(classical04.angles.B, 60.0, 0.01), 'ANGLE-INPUT-04.4: Classical ∠B = 60.0°');
  assert(approxEqual(classical04.angles.C, 70.0, 0.01), 'ANGLE-INPUT-04.5: Classical ∠C = 70.0°');

  // --- TEST ANGLE-INPUT-05: Three angles with sum != 180° rejected ---
  console.log('\n--- TEST ANGLE-INPUT-05: Three angles with sum != 180° rejected ---');
  const res05 = solveTriangleConfiguration(initialPointsU, { A: 50, B: 60, C: 80 }); // Sum = 190°
  assert(res05.success === false, 'ANGLE-INPUT-05.1: Rejects sum != 180° (190°)');
  assert(res05.error?.includes('180') === true, 'ANGLE-INPUT-05.2: Error message explains 180° requirement');

  const res05b = solveTriangleConfiguration(initialPointsU, { A: 50, B: 60, C: 60 }); // Sum = 170°
  assert(res05b.success === false, 'ANGLE-INPUT-05.3: Rejects sum != 180° (170°)');

  // --- TEST ANGLE-INPUT-06: Only one angle entered -> not applied until second angle given ---
  console.log('\n--- TEST ANGLE-INPUT-06: Only one angle entered -> not applied ---');
  const res06 = solveTriangleConfiguration(initialPointsU, { A: 45 });
  assert(res06.success === false, 'ANGLE-INPUT-06.1: One angle is not applied');
  assert(res06.mode === 'ONE_ANGLE_INCOMPLETE', 'ANGLE-INPUT-06.2: Mode is ONE_ANGLE_INCOMPLETE');
  assert(res06.infoMessage?.includes('второй угол') === true, 'ANGLE-INPUT-06.3: Explains that second angle is required');

  // --- TEST ANGLE-INPUT-07: After numeric input, mouse dragging freely modifies vertices ---
  console.log('\n--- TEST ANGLE-INPUT-07: Mouse dragging freely modifies vertices after numeric setting ---');
  let state = createDefaultGeometryState(initialPointsU, R);
  // 1. Apply numeric angle setting (A=45, B=60 -> C=75)
  state = dispatchGeometryCommand(state, {
    type: 'SYNC_BASE_POINTS',
    pointsU: res01.nextPointsU!,
    R,
  });
  assert(approxEqual(state.pointsU.A, res01.nextPointsU!.A), 'ANGLE-INPUT-07.1: State pointsU updated to numeric target');

  // 2. Simulate subsequent free mouse drag on vertex C (e.g. moving u_C by +0.05)
  const draggedPointsU = {
    A: state.pointsU.A,
    B: state.pointsU.B,
    C: (state.pointsU.C + 0.05) % 1.0,
  };
  state = dispatchGeometryCommand(state, {
    type: 'SYNC_BASE_POINTS',
    pointsU: draggedPointsU,
    R,
  });
  assert(approxEqual(state.pointsU.C, draggedPointsU.C), 'ANGLE-INPUT-07.2: Mouse drag freely mutates vertex C on circumcircle');
  const classicalDragged = classicalEngine.compute(state.pointsU, R);
  assert(classicalDragged.angles.C > 0, 'ANGLE-INPUT-07.3: Classical engine continuously computes new angles during mouse drag');

  // --- TEST ANGLE-INPUT-08: Dependent constructions correctly rebuild ---
  console.log('\n--- TEST ANGLE-INPUT-08: Dependent constructions correctly rebuild ---');
  let stateWithDeps = createDefaultGeometryState(initialPointsU, R);
  let perpLineId = '';
  let bisLineId = '';
  // Add perpendicular from C to chord_AB
  const planPerp = planPerpendicularLine(stateWithDeps, 'chord_AB', 'C', 'test_perp_C');
  if (planPerp.success) {
    perpLineId = planPerp.createdObjectIds.perpendicularLineId;
    stateWithDeps = dispatchGeometryCommand(stateWithDeps, { type: 'BATCH_COMMANDS', commands: planPerp.commands });
  }
  // Add angle bisector at A
  const planBis = planAngleBisector(stateWithDeps, 'B', 'A', 'C', 'test_bis_A');
  if (planBis.success) {
    bisLineId = planBis.createdObjectIds.bisectorLineId;
    stateWithDeps = dispatchGeometryCommand(stateWithDeps, { type: 'BATCH_COMMANDS', commands: planBis.commands });
  }

  // Apply new triangle angles
  stateWithDeps = dispatchGeometryCommand(stateWithDeps, {
    type: 'SYNC_BASE_POINTS',
    pointsU: res01.nextPointsU!,
    R,
  });

  assert(stateWithDeps.lines[perpLineId] !== undefined, 'ANGLE-INPUT-08.1: Perpendicular line dynamically recomputed');
  assert(stateWithDeps.lines[bisLineId] !== undefined, 'ANGLE-INPUT-08.2: Angle bisector dynamically recomputed');
  assert(
    !!stateWithDeps.points[stateWithDeps.lines[perpLineId].p1Id] &&
    !!stateWithDeps.points[stateWithDeps.lines[perpLineId].p2Id],
    'ANGLE-INPUT-08.3: Perpendicular line points valid'
  );
  assert(
    !!stateWithDeps.points[stateWithDeps.lines[bisLineId].p1Id] &&
    !!stateWithDeps.points[stateWithDeps.lines[bisLineId].p2Id],
    'ANGLE-INPUT-08.4: Bisector line points valid'
  );

  // --- TEST ANGLE-INPUT-09: Single-step atomic Undo restores previous state ---
  console.log('\n--- TEST ANGLE-INPUT-09: Single-step atomic Undo ---');
  let history = createInitialHistory(createDefaultGeometryState(initialPointsU, R));
  const prevState = history.present;

  const targetSolve = solveTriangleConfiguration(initialPointsU, { A: 45, B: 45 }); // Right triangle (C = 90°)
  const updatedState = dispatchGeometryCommand(prevState, {
    type: 'SYNC_BASE_POINTS',
    pointsU: targetSolve.nextPointsU!,
    R,
  });
  // Push updated state to history
  history = pushHistoryState(history, updatedState);

  assert(updatedState.pointsU.A !== prevState.pointsU.A || updatedState.pointsU.B !== prevState.pointsU.B || updatedState.pointsU.C !== prevState.pointsU.C,
    'ANGLE-INPUT-09.1: Updated state differs from previous state');

  const popped = popHistoryState(history);
  assert(popped !== null, 'ANGLE-INPUT-09.2: History can be popped');
  assert(popped!.restoredState.pointsU.A === initialPointsU.A, 'ANGLE-INPUT-09.3: Restored pointsU.A matches initial');
  assert(popped!.restoredState.pointsU.B === initialPointsU.B, 'ANGLE-INPUT-09.4: Restored pointsU.B matches initial');
  assert(popped!.restoredState.pointsU.C === initialPointsU.C, 'ANGLE-INPUT-09.5: Restored pointsU.C matches initial');

  // --- TEST ANGLE-INPUT-10: Single source of truth in GeometryState ---
  console.log('\n--- TEST ANGLE-INPUT-10: Single Source of Truth in GeometryState ---');
  const finalState = dispatchGeometryCommand(createDefaultGeometryState(initialPointsU, R), {
    type: 'SYNC_BASE_POINTS',
    pointsU: res01.nextPointsU!,
    R,
  });
  const config = buildConfigurationView(finalState, { scale: 1.0 });
  const quantities = extractSemanticQuantities(finalState, 1.0);

  assert(config.summary.pointCount === 4, 'ANGLE-INPUT-10.1: Semantic config points count is 4 (A, B, C, O)');
  assert(quantities.length > 0, 'ANGLE-INPUT-10.2: Semantic quantities extracted from unified GeometryState');
  const angleAQuantity = quantities.find((q) => q.semanticType === 'INSCRIBED_ANGLE' && q.context.vertexId === 'A');
  assert(angleAQuantity !== undefined, 'ANGLE-INPUT-10.3: Semantic quantity for inscribed angle at A found');
  if (angleAQuantity) {
    assert(approxEqual(angleAQuantity.value, 45.0, 0.1), `ANGLE-INPUT-10.4: Semantic quantity matches applied angle 45° (got ${angleAQuantity.value})`);
  }

  // --- TEST ANGLE-INPUT-11: Single-angle Minimal Geometric Disturbance Solver ---
  console.log('\n--- TEST ANGLE-INPUT-11: Single-Angle Minimal Disturbance ---');
  const singleSolve = solveTargetAngle(initialPointsU, 'C', 90);
  assert(singleSolve.success === true, 'ANGLE-INPUT-11.1: Single-angle solver succeeds');
  assert(approxEqual(singleSolve.nextPointsU!.C, initialPointsU.C), 'ANGLE-INPUT-11.2: Fixed vertex C position remains unchanged');
  const singleClassical = classicalEngine.compute(singleSolve.nextPointsU!, R);
  assert(approxEqual(singleClassical.angles.C, 90.0, 0.01), 'ANGLE-INPUT-11.3: Classical ∠C = 90.0°');

  console.log('\n======================================================================');
  console.log('✓ ALL 10+ MANDATORY TARGET ANGLE TESTS (ANGLE-INPUT-01 TO 10) PASSED!');
  console.log('======================================================================');
}

// Execute tests if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runParametricAngleInputTests();
}
