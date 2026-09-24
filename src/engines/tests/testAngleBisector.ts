// src/engines/tests/testAngleBisector.ts
// Comprehensive Test Suite for Classical Angle Bisector Construction
// Verifies geometric correctness, angle equality, degenerate rejections, provenance & cascade cleanup.

import {
  createDefaultGeometryState,
  FullGeometryState,
} from '../geometryState';
import {
  planAngleBisector,
  applyAngleBisector,
  AngleBisectorValidationFailure,
  getValidAngleBisectorTargets,
} from '../angleBisector';
import { dispatchGeometryCommand } from '../constructionCore';
import { distance2D } from '../geometryIntersections';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function calculateAngleBetweenVectors(
  v1: { x: number; y: number },
  v2: { x: number; y: number }
): number {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cos);
}

export function runAngleBisectorSuite() {
  console.log('--- RUNNING ANGLE BISECTOR SUITE ---');

  // Test 1: Acute Angle (< 90 deg)
  {
    // V at (0, 0), A at (100, 0) [angle 0], B at (60, 80) [angle ~53.13 deg]
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    // Add custom points for precise geometry
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V1', name: 'V', x: 0, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'A1', name: 'A', x: 100, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'B1', name: 'B', x: 60, y: 80, role: 'primary' },
    });

    const { nextState, plan } = applyAngleBisector(state, 'A1', 'V1', 'B1');
    assert(plan.success, 'Acute angle bisector plan must succeed');
    if (plan.success) {
      const q = nextState.points[plan.createdObjectIds.pointQId];
      assert(!!q, 'Point Q must exist in state');

      // Check distances: Q must be equidistant from P1 and P2 (R = min(100, 100) = 100)
      const p1 = nextState.points[plan.createdObjectIds.pointP1Id];
      const p2 = nextState.points[plan.createdObjectIds.pointP2Id];
      const distQP1 = distance2D(q, p1);
      const distQP2 = distance2D(q, p2);
      assert(Math.abs(distQP1 - 100) < 1e-4, 'dist(Q, P1) must equal constructive radius R');
      assert(Math.abs(distQP2 - 100) < 1e-4, 'dist(Q, P2) must equal constructive radius R');

      // Check angle equality: angle(VA, VQ) === angle(VQ, VB)
      const vecVA = { x: 100, y: 0 };
      const vecVB = { x: 60, y: 80 };
      const vecVQ = { x: q.x, y: q.y };

      const angle1 = calculateAngleBetweenVectors(vecVA, vecVQ);
      const angle2 = calculateAngleBetweenVectors(vecVQ, vecVB);
      assert(Math.abs(angle1 - angle2) < 1e-5, `Angles must be equal: ${angle1} vs ${angle2}`);
      // Full angle is ~53.13 deg (~0.927 rad). Half angle should be ~26.565 deg (~0.4636 rad)
      assert(Math.abs(angle1 + angle2 - calculateAngleBetweenVectors(vecVA, vecVB)) < 1e-5, 'Q must lie inside the angle');
    }
    console.log('✓ Test 1 Passed: Acute angle (<90°) verified with exact bisector equality');
  }

  // Test 2: Right Angle (90 deg)
  {
    // V at (0, 0), A at (50, 0), B at (0, 80)
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V2', name: 'V', x: 0, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'A2', name: 'A', x: 50, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'B2', name: 'B', x: 0, y: 80, role: 'primary' },
    });

    const { nextState, plan } = applyAngleBisector(state, 'A2', 'V2', 'B2');
    assert(plan.success, 'Right angle bisector plan must succeed');
    if (plan.success) {
      const q = nextState.points[plan.createdObjectIds.pointQId];
      // For right angle along +x and +y, bisector must be along y = x (q.x === q.y > 0)
      assert(Math.abs(q.x - q.y) < 1e-4, 'Bisector of axes must have q.x == q.y');
      assert(q.x > 0 && q.y > 0, 'Q must be in the first quadrant (inside the angle)');

      const vecVA = { x: 50, y: 0 };
      const vecVB = { x: 0, y: 80 };
      const vecVQ = { x: q.x, y: q.y };
      const a1 = calculateAngleBetweenVectors(vecVA, vecVQ);
      const a2 = calculateAngleBetweenVectors(vecVQ, vecVB);
      assert(Math.abs(a1 - Math.PI / 4) < 1e-5, 'Half angle must be 45°');
      assert(Math.abs(a2 - Math.PI / 4) < 1e-5, 'Half angle must be 45°');
    }
    console.log('✓ Test 2 Passed: Right angle (90°) verified with exactly 45° half-angles');
  }

  // Test 3: Obtuse Angle (> 90 deg, e.g. 120 deg)
  {
    // V at (0, 0), A at (100, 0), B at (-50, 50 * sqrt(3))
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V3', name: 'V', x: 0, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'A3', name: 'A', x: 100, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'B3', name: 'B', x: -50, y: 50 * Math.sqrt(3), role: 'primary' },
    });

    const { nextState, plan } = applyAngleBisector(state, 'A3', 'V3', 'B3');
    assert(plan.success, 'Obtuse angle bisector plan must succeed');
    if (plan.success) {
      const q = nextState.points[plan.createdObjectIds.pointQId];
      const vecVA = { x: 100, y: 0 };
      const vecVB = { x: -50, y: 50 * Math.sqrt(3) };
      const vecVQ = { x: q.x, y: q.y };

      const a1 = calculateAngleBetweenVectors(vecVA, vecVQ);
      const a2 = calculateAngleBetweenVectors(vecVQ, vecVB);
      assert(Math.abs(a1 - a2) < 1e-5, 'Half angles must be equal for obtuse angle');
      assert(Math.abs(a1 - Math.PI / 3) < 1e-4, 'Half angle of 120° must be 60° (pi/3)');
    }
    console.log('✓ Test 3 Passed: Obtuse angle (120°) verified with exactly 60° half-angles');
  }

  // Test 4: Degenerate Vertices (A = V or B = V)
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V4', name: 'V', x: 0, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'B4', name: 'B', x: 50, y: 50, role: 'primary' },
    });

    // A = V
    const resA = applyAngleBisector(state, 'V4', 'V4', 'B4');
    assert(!resA.plan.success, 'Plan must fail when A == V');
    if (!resA.plan.success) {
      const fail = resA.plan as AngleBisectorValidationFailure;
      assert(fail.error === 'COINCIDENT_VERTEX', 'Error code must be COINCIDENT_VERTEX');
    }
    assert(resA.nextState === state, 'State must remain strictly unchanged on failure');

    // B = V
    const resB = applyAngleBisector(state, 'B4', 'V4', 'V4');
    assert(!resB.plan.success, 'Plan must fail when B == V');
    if (!resB.plan.success) {
      const fail = resB.plan as AngleBisectorValidationFailure;
      assert(fail.error === 'COINCIDENT_VERTEX', 'Error code must be COINCIDENT_VERTEX');
    }
    assert(resB.nextState === state, 'State must remain strictly unchanged on failure');
    console.log('✓ Test 4 Passed: Coincident vertex conditions (A=V, B=V) rejected deterministically');
  }

  // Test 5: Collinear Sides (0° and 180°)
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V5', name: 'V', x: 0, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'A5', name: 'A', x: 50, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'B_0', name: 'B0', x: 100, y: 0, role: 'primary' }, // 0 deg
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'B_180', name: 'B180', x: -100, y: 0, role: 'primary' }, // 180 deg
    });

    // 0 deg
    const res0 = applyAngleBisector(state, 'A5', 'V5', 'B_0');
    assert(!res0.plan.success, 'Plan must fail for 0° collinear sides');
    if (!res0.plan.success) {
      const fail = res0.plan as AngleBisectorValidationFailure;
      assert(fail.error === 'DEGENERATE_ANGLE', '0° must return DEGENERATE_ANGLE');
    }
    assert(res0.nextState === state, 'State must remain strictly unchanged');

    // 180 deg
    const res180 = applyAngleBisector(state, 'A5', 'V5', 'B_180');
    assert(!res180.plan.success, 'Plan must fail for 180° collinear sides');
    if (!res180.plan.success) {
      const fail = res180.plan as AngleBisectorValidationFailure;
      assert(fail.error === 'PRECONDITION_FAILED', '180° must return PRECONDITION_FAILED');
    }
    assert(res180.nextState === state, 'State must remain strictly unchanged');
    console.log('✓ Test 5 Passed: Collinear angles (0° and 180°) rejected without mutating state');
  }

  // Test 6: Role, Provenance, and No Dangling References
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V6', name: 'V', x: 0, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'A6', name: 'A', x: 80, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'B6', name: 'B', x: 0, y: 80, role: 'primary' },
    });

    const { nextState, plan } = applyAngleBisector(state, 'A6', 'V6', 'B6');
    assert(plan.success, 'Bisector plan must succeed');
    if (plan.success) {
      const { circle0Id, pointP1Id, pointP2Id, circle1Id, circle2Id, pointQId, bisectorLineId } =
        plan.createdObjectIds;

      // Check roles
      assert(nextState.circles[circle0Id]?.role === 'auxiliary', 'C0 must be auxiliary');
      assert(nextState.circles[circle1Id]?.role === 'auxiliary', 'C1 must be auxiliary');
      assert(nextState.circles[circle2Id]?.role === 'auxiliary', 'C2 must be auxiliary');
      assert(nextState.points[pointP1Id]?.role === 'auxiliary', 'P1 must be auxiliary');
      assert(nextState.points[pointP2Id]?.role === 'auxiliary', 'P2 must be auxiliary');
      assert(nextState.points[pointQId]?.role === 'auxiliary', 'Q must be auxiliary');
      assert(nextState.lines[bisectorLineId]?.role === 'primary', 'Bisector line must be primary');

      // Check provenance
      const prov = nextState.lines[bisectorLineId].provenance;
      assert(prov?.macroType === 'angle_bisector', 'macroType must be angle_bisector');
      assert(prov?.groupId === plan.groupId, 'groupId must match');
      assert(
        prov?.sourceIds[0] === 'A6' && prov?.sourceIds[1] === 'V6' && prov?.sourceIds[2] === 'B6',
        'sourceIds must be [A, V, B]'
      );

      // Check no dangling references
      const line = nextState.lines[bisectorLineId];
      assert(!!nextState.points[line.p1Id], 'Line p1 must exist in state points');
      assert(!!nextState.points[line.p2Id], 'Line p2 must exist in state points');
      const c1 = nextState.circles[circle1Id];
      assert(!!nextState.points[c1.centerId], 'C1 center must exist');
      const c2 = nextState.circles[circle2Id];
      assert(!!nextState.points[c2.centerId], 'C2 center must exist');
    }
    console.log('✓ Test 6 Passed: Role, provenance, and reference integrity verified');
  }

  // Test 7: Cascade Cleanup of Auxiliary Geometry on Bisector Erasure
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V7', name: 'V', x: 0, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'A7', name: 'A', x: 80, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'B7', name: 'B', x: 0, y: 80, role: 'primary' },
    });

    const { nextState, plan } = applyAngleBisector(state, 'A7', 'V7', 'B7');
    assert(plan.success, 'Bisector plan must succeed');
    if (plan.success) {
      const { circle0Id, pointP1Id, pointP2Id, circle1Id, circle2Id, pointQId, bisectorLineId } =
        plan.createdObjectIds;

      // Erase bisector line
      const cleanedState = dispatchGeometryCommand(nextState, {
        type: 'ERASE_OBJECT',
        objectType: 'line',
        id: bisectorLineId,
      });

      // Assert primary line and all auxiliary artifacts are cleanly deleted
      assert(!cleanedState.lines[bisectorLineId], 'Bisector line must be erased');
      assert(!cleanedState.circles[circle0Id], 'Auxiliary C0 must be cascade-deleted');
      assert(!cleanedState.circles[circle1Id], 'Auxiliary C1 must be cascade-deleted');
      assert(!cleanedState.circles[circle2Id], 'Auxiliary C2 must be cascade-deleted');
      assert(!cleanedState.points[pointP1Id], 'Auxiliary P1 must be cascade-deleted');
      assert(!cleanedState.points[pointP2Id], 'Auxiliary P2 must be cascade-deleted');
      assert(!cleanedState.points[pointQId], 'Auxiliary Q must be cascade-deleted');

      // Original base points must remain intact
      assert(!!cleanedState.points['V7'], 'Original vertex V must remain');
      assert(!!cleanedState.points['A7'], 'Original arm point A must remain');
      assert(!!cleanedState.points['B7'], 'Original arm point B must remain');
    }
    console.log('✓ Test 7 Passed: Cascade cleanup cleanly removes all auxiliary artifacts');
  }

  // =========================================================================
  // SMART TARGET HIGHLIGHTING TEST SUITE (ANGLE-TARGET-01 to ANGLE-TARGET-12)
  // =========================================================================

  // ANGLE-TARGET-01: Initial triangle discovery returns exactly 3 valid targets (A, B, C)
  {
    const state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    const targets = getValidAngleBisectorTargets(state);

    assert(targets.length === 3, `Initial triangle must have exactly 3 angle targets, got ${targets.length}`);
    const vertexIds = targets.map((t) => t.vertexPointId).sort();
    assert(
      vertexIds.includes('A') && vertexIds.includes('B') && vertexIds.includes('C'),
      'Targets must include A, B, C'
    );
    console.log('✓ ANGLE-TARGET-01: Default triangle contains 3 valid angle targets (A, B, C)');
  }

  // ANGLE-TARGET-02: Target descriptor fields are accurately populated
  {
    const state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    const targets = getValidAngleBisectorTargets(state);

    const targetA = targets.find((t) => t.vertexPointId === 'A');
    assert(!!targetA, 'Target A must exist');
    if (targetA) {
      assert(targetA.vertexName === 'A', `Target name must be A, got ${targetA.vertexName}`);
      assert(
        (targetA.arm1PointId === 'B' && targetA.arm2PointId === 'C') ||
          (targetA.arm1PointId === 'C' && targetA.arm2PointId === 'B'),
        'Arms for vertex A must be B and C'
      );
      assert(targetA.angleDeg > 0 && targetA.angleDeg < 180, 'Angle must be between 0 and 180°');
    }
    console.log('✓ ANGLE-TARGET-02: Target descriptor fields verified with correct names and arm IDs');
  }

  // ANGLE-TARGET-03: Custom constructed vertices yield valid angle targets
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_V', name: 'V', x: 0, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_1', name: '1', x: 50, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_2', name: '2', x: 0, y: 50, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_V1', p1Id: 'P_V', p2Id: 'P_1', role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_V2', p1Id: 'P_V', p2Id: 'P_2', role: 'primary' },
    });

    const targets = getValidAngleBisectorTargets(state);
    const targetV = targets.find((t) => t.vertexPointId === 'P_V');
    assert(!!targetV, 'Newly constructed vertex V must be discovered as a valid target');
    if (targetV) {
      assert(Math.abs(targetV.angleDeg - 90) < 1e-4, 'Vertex V angle must be 90°');
    }
    console.log('✓ ANGLE-TARGET-03: Custom constructed angles discovered and validated');
  }

  // ANGLE-TARGET-04: Isolated points with 0 incident segments return 0 targets
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    // Add isolated points with no segments
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'ISO_1', name: 'I1', x: 20, y: 20, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'ISO_2', name: 'I2', x: 40, y: 40, role: 'primary' },
    });

    const targets = getValidAngleBisectorTargets(state);
    const isolatedTargets = targets.filter(
      (t) => t.vertexPointId === 'ISO_1' || t.vertexPointId === 'ISO_2'
    );
    assert(isolatedTargets.length === 0, `Isolated points with no segments must return 0 targets, got ${isolatedTargets.length}`);
    console.log('✓ ANGLE-TARGET-04: Isolated points with 0 segments yield 0 targets');
  }

  // ANGLE-TARGET-05: Endpoints with only 1 incident segment return 0 targets
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'END_1', name: 'E1', x: -60, y: 20, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'END_2', name: 'E2', x: -30, y: 20, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_E1E2', p1Id: 'END_1', p2Id: 'END_2', role: 'primary' },
    });

    const targets = getValidAngleBisectorTargets(state);
    const endTargets = targets.filter(
      (t) => t.vertexPointId === 'END_1' || t.vertexPointId === 'END_2'
    );
    assert(endTargets.length === 0, `1-valent endpoints must return 0 targets, got ${endTargets.length}`);
    console.log('✓ ANGLE-TARGET-05: Endpoints with only 1 incident segment yield 0 targets');
  }

  // ANGLE-TARGET-06: Collinear segments (180 deg straight angle or 0 deg overlapping) return 0 targets
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    // Add collinear segments (-50,0) -> (0,0) -> (50,0)
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_LEFT', name: 'L', x: -50, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_MID', name: 'M', x: 0, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_RIGHT', name: 'R', x: 50, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_LM', p1Id: 'P_LEFT', p2Id: 'P_MID', role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_MR', p1Id: 'P_MID', p2Id: 'P_RIGHT', role: 'primary' },
    });

    const targets = getValidAngleBisectorTargets(state);
    const mTargets = targets.filter((t) => t.vertexPointId === 'P_MID');
    assert(mTargets.length === 0, `Collinear 180° angle at M must be rejected from bisector targets, got ${mTargets.length}`);
    console.log('✓ ANGLE-TARGET-06: Collinear 180° angles rejected from valid targets');
  }

  // ANGLE-TARGET-07: Pure discovery function - zero mutation to GeometryState
  {
    const state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    const jsonBefore = JSON.stringify(state);
    const targets = getValidAngleBisectorTargets(state);
    const jsonAfter = JSON.stringify(state);

    assert(jsonBefore === jsonAfter, 'getValidAngleBisectorTargets must not mutate GeometryState in any way');
    assert(targets.length === 3, 'Discovered 3 targets');
    console.log('✓ ANGLE-TARGET-07: Pure discovery function leaves GeometryState 100% untouched');
  }

  // ANGLE-TARGET-08: Discovered target can be directly executed via applyAngleBisector
  {
    const state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    const targets = getValidAngleBisectorTargets(state);
    const targetA = targets.find((t) => t.vertexPointId === 'A')!;

    const { nextState, plan } = applyAngleBisector(
      state,
      targetA.arm1PointId,
      targetA.vertexPointId,
      targetA.arm2PointId
    );
    assert(plan.success, 'Execution from discovered target descriptor must succeed');
    if (plan.success) {
      assert(!!nextState.lines[plan.createdObjectIds.bisectorLineId], 'Bisector line created in state');
    }
    console.log('✓ ANGLE-TARGET-08: Construction from discovered target executes flawlessly');
  }

  // ANGLE-TARGET-09: Idempotent discovery returns consistent results on multiple invocations
  {
    const state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    const run1 = getValidAngleBisectorTargets(state);
    const run2 = getValidAngleBisectorTargets(state);

    assert(run1.length === run2.length, 'Target count must match across multiple calls');
    assert(JSON.stringify(run1) === JSON.stringify(run2), 'Descriptors must match exactly across calls');
    console.log('✓ ANGLE-TARGET-09: Target discovery is deterministic and repeatable');
  }

  // ANGLE-TARGET-10: Multi-angle vertices (vertex with 3 connected segments) generates candidate target pairs
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    // Add point D inside triangle and connect to A, B, C
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_D', name: 'D', x: 0, y: 0, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_DA', p1Id: 'P_D', p2Id: 'A', role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_DB', p1Id: 'P_D', p2Id: 'B', role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_DC', p1Id: 'P_D', p2Id: 'C', role: 'primary' },
    });

    const targets = getValidAngleBisectorTargets(state);
    const dTargets = targets.filter((t) => t.vertexPointId === 'P_D');
    assert(dTargets.length >= 1, 'Vertex D with 3 incident edges must produce valid angle targets');
    console.log(`✓ ANGLE-TARGET-10: Multi-edge vertices produce valid candidate pairs (${dTargets.length} at D)`);
  }

  // ANGLE-TARGET-11: Erasure of one segment immediately updates target list without dangling references
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'U1', name: 'U1', x: 10, y: 10, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'U2', name: 'U2', x: 40, y: 10, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'U3', name: 'U3', x: 25, y: 40, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_U1U2', p1Id: 'U1', p2Id: 'U2', role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_U2U3', p1Id: 'U2', p2Id: 'U3', role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_U3U1', p1Id: 'U3', p2Id: 'U1', role: 'primary' },
    });

    let targets = getValidAngleBisectorTargets(state);
    const uTargetsBefore = targets.filter((t) => ['U1', 'U2', 'U3'].includes(t.vertexPointId));
    assert(uTargetsBefore.length === 3, 'User triangle U1-U2-U3 has 3 angle targets');

    // Erase one segment of user triangle
    state = dispatchGeometryCommand(state, {
      type: 'ERASE_OBJECT',
      objectType: 'segment',
      id: 'seg_U1U2',
    });

    targets = getValidAngleBisectorTargets(state);
    const uTargetsAfter = targets.filter((t) => ['U1', 'U2', 'U3'].includes(t.vertexPointId));
    // After removing 1 edge of user triangle, only U3 remains 2-valent
    assert(uTargetsAfter.length === 1, `After removing 1 triangle edge, exactly 1 angle target remains, got ${uTargetsAfter.length}`);
    assert(uTargetsAfter[0].vertexPointId === 'U3', 'Remaining target must be vertex U3');
    console.log('✓ ANGLE-TARGET-11: Dynamic updates on segment erasure reflected immediately');
  }

  // ANGLE-TARGET-12: Full lifecycle (Discovery -> Construction -> Cleanup -> Invariant preservation)
  {
    let state = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);
    const targets = getValidAngleBisectorTargets(state);
    assert(targets.length === 3, 'Started with 3 targets');

    // Build bisector for target B
    const targetB = targets.find((t) => t.vertexPointId === 'B')!;
    const { nextState: stateWithBisector, plan } = applyAngleBisector(
      state,
      targetB.arm1PointId,
      targetB.vertexPointId,
      targetB.arm2PointId
    );
    assert(plan.success, 'Bisector construction succeeded');

    // Erase the bisector
    const bisectorLineId = (plan as any).createdObjectIds.bisectorLineId;
    const finalState = dispatchGeometryCommand(stateWithBisector, {
      type: 'ERASE_OBJECT',
      objectType: 'line',
      id: bisectorLineId,
    });

    // Final state targets should be identical to starting state targets
    const finalTargets = getValidAngleBisectorTargets(finalState);
    assert(finalTargets.length === 3, 'After erasing bisector, all 3 original angle targets remain available');
    console.log('✓ ANGLE-TARGET-12: Full lifecycle invariant preservation verified');
  }

  console.log('--- ALL ANGLE BISECTOR TESTS PASSED (19/19) ---');
}
