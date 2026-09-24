// src/engines/tests/testPerpendicularBisector.ts
// Rigorous verification of Perpendicular Bisector construction macro
// Validates pure mathematical geometry, transaction lifecycle, and state invariance.

import { createDefaultGeometryState } from '../geometryState';
import {
  planPerpendicularBisector,
  applyPerpendicularBisector,
  PerpendicularBisectorValidationFailure,
} from '../perpendicularBisector';
import { dispatchGeometryCommand } from '../constructionCore';
import { distance2D } from '../geometryIntersections';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

export function runPerpendicularBisectorTests() {
  console.log('--- RUNNING PERPENDICULAR BISECTOR SUITE ---');

  // Test 1: Basic Construction on chord AB
  {
    const state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    const { nextState, plan } = applyPerpendicularBisector(state, 'A', 'B');

    assert(plan.success, 'Plan must succeed for valid base points A and B');
    if (!plan.success) return;

    assert(
      Object.keys(nextState.lines).length === 1,
      'Exactly 1 primary line should be created'
    );
    assert(
      Object.keys(nextState.circles).length === 3, // base_circle + 2 auxiliary circles
      'Two auxiliary circles must be created'
    );

    const { circleAId, circleBId, intersection1Id, intersection2Id, bisectorLineId } =
      plan.createdObjectIds;

    const circA = nextState.circles[circleAId];
    const circB = nextState.circles[circleBId];
    const ptI1 = nextState.points[intersection1Id];
    const ptI2 = nextState.points[intersection2Id];
    const line = nextState.lines[bisectorLineId];

    assert(circA !== undefined && circA.role === 'auxiliary', 'Circle A must be auxiliary');
    assert(circB !== undefined && circB.role === 'auxiliary', 'Circle B must be auxiliary');
    assert(ptI1 !== undefined && ptI1.role === 'auxiliary', 'Intersection 1 must be auxiliary');
    assert(ptI2 !== undefined && ptI2.role === 'auxiliary', 'Intersection 2 must be auxiliary');
    assert(line !== undefined && line.role === 'primary', 'Bisector line must be primary');

    // Check provenance
    assert(
      line.provenance?.macroType === 'perpendicular_bisector',
      'Macro type must be perpendicular_bisector'
    );
    assert(
      line.provenance?.groupId === plan.groupId,
      'Provenance groupId must match plan groupId'
    );
    assert(
      ptI1.provenance?.groupId === plan.groupId,
      'Point I1 must belong to same groupId'
    );

    // Test geometric orthogonality: (B - A) . (I2 - I1) == 0
    const ptA = state.points.A;
    const ptB = state.points.B;
    const vAB = { x: ptB.x - ptA.x, y: ptB.y - ptA.y };
    const vI = { x: ptI2.x - ptI1.x, y: ptI2.y - ptI1.y };
    const dot = vAB.x * vI.x + vAB.y * vI.y;
    assert(Math.abs(dot) < 1e-6, `Vectors must be strictly orthogonal. Dot product: ${dot}`);

    // Test midpoint passage: midpoint of AB must lie on line I1-I2
    const mid = { x: (ptA.x + ptB.x) / 2, y: (ptA.y + ptB.y) / 2 };
    // Cross product (mid - I1) x (I2 - I1) == 0
    const vMidI1 = { x: mid.x - ptI1.x, y: mid.y - ptI1.y };
    const cross = vMidI1.x * vI.y - vMidI1.y * vI.x;
    assert(Math.abs(cross) < 1e-6, `Midpoint must lie on bisector line. Cross product: ${cross}`);

    // Test equidistance: dist(A, I1) == dist(B, I1)
    const dAI1 = distance2D(ptA, ptI1);
    const dBI1 = distance2D(ptB, ptI1);
    assert(Math.abs(dAI1 - dBI1) < 1e-7, 'I1 must be equidistant from A and B');
    console.log('✓ Test 1 Passed: Classical Euclidean construction verified');
  }

  // Test 2: Degenerate Coincident Points (A == B)
  {
    const state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    const result = applyPerpendicularBisector(state, 'A', 'A');

    if (!result.plan.success) {
      const failure = result.plan as PerpendicularBisectorValidationFailure;
      assert(failure.error === 'POINTS_COINCIDENT', 'Error code must be POINTS_COINCIDENT');
    } else {
      throw new Error('Plan must fail when points coincide');
    }
    assert(result.nextState === state, 'GeometryState must remain strictly untouched on error');
    console.log('✓ Test 2 Passed: Degeneracy A=B handled cleanly without mutating state');
  }

  // Test 3: Non-existent Point ID
  {
    const state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    const result = applyPerpendicularBisector(state, 'A', 'NON_EXISTENT');

    if (!result.plan.success) {
      const failure = result.plan as PerpendicularBisectorValidationFailure;
      assert(failure.error === 'POINT_NOT_FOUND', 'Error code must be POINT_NOT_FOUND');
    } else {
      throw new Error('Plan must fail for non-existent point');
    }
    assert(result.nextState === state, 'State must remain identical');
    console.log('✓ Test 3 Passed: Non-existent point rejected');
  }

  // Test 4: Cascade deletion when deleting primary bisector line
  {
    const state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    const { nextState, plan } = applyPerpendicularBisector(state, 'B', 'C');
    assert(plan.success, 'Construction BC must succeed');
    if (!plan.success) return;

    const lineId = plan.createdObjectIds.bisectorLineId;
    const erasedState = dispatchGeometryCommand(nextState, {
      type: 'ERASE_OBJECT',
      objectType: 'line',
      id: lineId,
    });

    assert(
      erasedState.lines[lineId] === undefined,
      'Primary line must be deleted'
    );
    assert(
      erasedState.circles[plan.createdObjectIds.circleAId] === undefined,
      'Auxiliary circle 1 must be cascade-deleted'
    );
    assert(
      erasedState.circles[plan.createdObjectIds.circleBId] === undefined,
      'Auxiliary circle 2 must be cascade-deleted'
    );
    assert(
      erasedState.points[plan.createdObjectIds.intersection1Id] === undefined,
      'Auxiliary intersection point 1 must be cascade-deleted'
    );
    assert(
      erasedState.points[plan.createdObjectIds.intersection2Id] === undefined,
      'Auxiliary intersection point 2 must be cascade-deleted'
    );
    console.log('✓ Test 4 Passed: Cascade cleanup of auxiliary geometry verified');
  }

  // Test 5: Oblique custom points
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P1', name: 'P1', x: -30, y: 40 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P2', name: 'P2', x: 50, y: -20 },
    });

    const { nextState, plan } = applyPerpendicularBisector(state, 'P1', 'P2');
    assert(plan.success, 'Construction between oblique user points must succeed');
    if (!plan.success) return;

    const pt1 = nextState.points.P1;
    const pt2 = nextState.points.P2;
    const i1 = nextState.points[plan.createdObjectIds.intersection1Id];
    const i2 = nextState.points[plan.createdObjectIds.intersection2Id];

    const vP = { x: pt2.x - pt1.x, y: pt2.y - pt1.y };
    const vI = { x: i2.x - i1.x, y: i2.y - i1.y };
    const dot = vP.x * vI.x + vP.y * vI.y;
    assert(Math.abs(dot) < 1e-6, 'Perpendicularity holds for general oblique coordinates');
    console.log('✓ Test 5 Passed: General oblique coordinates verified');
  }

  console.log('--- ALL PERPENDICULAR BISECTOR TESTS PASSED (5/5) ---');
}
