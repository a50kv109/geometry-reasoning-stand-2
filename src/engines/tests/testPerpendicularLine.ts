// src/engines/tests/testPerpendicularLine.ts
// Test suite for Classical Euclidean Perpendicular Through Point (Package 2.4.1)
// Complies with "One Geometry, Many Clients" invariant.

import {
  createDefaultGeometryState,
  FullGeometryState,
  dispatchGeometryCommand,
} from '../constructionCore';
import {
  distance2D,
  pointToLineDistance,
  GEOMETRY_POINT_COINCIDENT_THRESHOLD,
  GEOMETRY_EPSILON,
} from '../geometryIntersections';
import {
  PerpendicularValidationFailure,
  planPerpendicularLine,
  applyPerpendicularLine,
} from '../perpendicularLine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
}

function areOrthogonal(
  p1A: { x: number; y: number },
  p1B: { x: number; y: number },
  p2A: { x: number; y: number },
  p2B: { x: number; y: number },
  tol: number = 1e-4
): boolean {
  const dx1 = p1B.x - p1A.x;
  const dy1 = p1B.y - p1A.y;
  const dx2 = p2B.x - p2A.x;
  const dy2 = p2B.y - p2A.y;
  const dot = dx1 * dx2 + dy1 * dy2;
  const len1 = Math.hypot(dx1, dy1);
  const len2 = Math.hypot(dx2, dy2);
  return Math.abs(dot) / (len1 * len2) < tol;
}

function makeTestState(): FullGeometryState {
  return createDefaultGeometryState({ A: 0.0, B: 0.5, C: 0.25 }, 100);
}

export function runPerpendicularLineSuite() {
  console.log('--- RUNNING PERPENDICULAR LINE THROUGH POINT SUITE (PACKAGE 2.4.1) ---');

  // Test 1: P outside horizontal L
  {
    let state = makeTestState();
    // Create horizontal line through (0, 0) and (100, 0)
    // In initial state, points A and B are on circle, let's create custom points
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'H1', name: 'H1', x: -50, y: 0 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'H2', name: 'H2', x: 50, y: 0 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_LINE',
      line: { id: 'L_horiz', p1Id: 'H1', p2Id: 'H2' },
    });
    // Point P outside L at (10, 40)
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_out', name: 'P_out', x: 10, y: 40 },
    });

    const { nextState, plan } = applyPerpendicularLine(state, 'L_horiz', 'P_out');
    assert(plan.success === true, 'Test 1: Plan should succeed for P outside L');
    if (!plan.success) return;

    assert(!plan.isPointOnLine, 'Test 1: isPointOnLine should be false');
    const perpLine = nextState.lines[plan.createdObjectIds.perpendicularLineId];
    assert(!!perpLine, 'Test 1: Perpendicular line created in state');
    assert(perpLine.role === 'primary', 'Test 1: Result line has role "primary"');

    const ptP = nextState.points['P_out'];
    const ptQ = nextState.points[plan.createdObjectIds.pointQId];
    assert(!!ptQ, 'Test 1: Auxiliary point Q created in state');
    assert(ptQ.role === 'auxiliary', 'Test 1: Point Q has role "auxiliary"');

    // Check passing through P
    assert(perpLine.p1Id === 'P_out', 'Test 1: Line passes through P');
    // Check orthogonality: horizontal line (dx=100, dy=0) vs perp line (dx=0, dy!=0)
    assert(
      areOrthogonal(state.points['H1'], state.points['H2'], ptP, ptQ),
      'Test 1: Line is exactly perpendicular to horizontal line'
    );
    // Point Q must have x = 10, y = -40 (symmetric across y=0)
    assert(Math.abs(ptQ.x - 10) < 1e-4, 'Test 1: Q.x is exactly 10');
    assert(Math.abs(ptQ.y - (-40)) < 1e-4, 'Test 1: Q.y is reflected across line (-40)');

    console.log('✓ Test 1 Passed: P outside horizontal line verified');
  }

  // Test 2: P on horizontal L
  {
    let state = makeTestState();
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'H1', name: 'H1', x: -50, y: 0 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'H2', name: 'H2', x: 50, y: 0 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_LINE',
      line: { id: 'L_horiz', p1Id: 'H1', p2Id: 'H2' },
    });
    // P on L at (20, 0)
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_on', name: 'P_on', x: 20, y: 0 },
    });

    const { nextState, plan } = applyPerpendicularLine(state, 'L_horiz', 'P_on');
    assert(plan.success === true, 'Test 2: Plan should succeed for P on L');
    if (!plan.success) return;

    assert(plan.isPointOnLine, 'Test 2: isPointOnLine should be true');
    const perpLine = nextState.lines[plan.createdObjectIds.perpendicularLineId];
    assert(!!perpLine, 'Test 2: Perpendicular line created');

    const ptP = nextState.points['P_on'];
    const ptQ = nextState.points[plan.createdObjectIds.pointQId];
    assert(perpLine.p1Id === 'P_on', 'Test 2: Line passes through P');
    assert(
      areOrthogonal(state.points['H1'], state.points['H2'], ptP, ptQ),
      'Test 2: Result line is perpendicular to L'
    );
    // Canonical orientation: vector H1->H2 is (+100, 0), positive CCW halfplane has y > 0
    assert(ptQ.y > 0, 'Test 2: Q chosen in positive canonical normal half-plane');
    assert(Math.abs(ptQ.x - 20) < 1e-4, 'Test 2: Q.x aligns with P.x');

    console.log('✓ Test 2 Passed: P on horizontal line verified');
  }

  // Test 3: Vertical line L (x = 30), test both P outside and P on L
  {
    let state = makeTestState();
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V1', name: 'V1', x: 30, y: -60 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V2', name: 'V2', x: 30, y: 80 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_LINE',
      line: { id: 'L_vert', p1Id: 'V1', p2Id: 'V2' },
    });

    // Subcase 3a: P outside at (-10, 15)
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_vout', name: 'P_vout', x: -10, y: 15 },
    });
    const resA = applyPerpendicularLine(state, 'L_vert', 'P_vout');
    assert(resA.plan.success === true, 'Test 3a: P outside vertical line succeeds');
    if (resA.plan.success) {
      const ptQ = resA.nextState.points[resA.plan.createdObjectIds.pointQId];
      assert(
        areOrthogonal(
          state.points['V1'],
          state.points['V2'],
          state.points['P_vout'],
          ptQ
        ),
        'Test 3a: Perpendicular to vertical line is horizontal'
      );
      assert(Math.abs(ptQ.y - 15) < 1e-4, 'Test 3a: Horizontal line preserves y=15');
    }

    // Subcase 3b: P on vertical line at (30, 10)
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_von', name: 'P_von', x: 30, y: 10 },
    });
    const resB = applyPerpendicularLine(state, 'L_vert', 'P_von');
    assert(resB.plan.success === true, 'Test 3b: P on vertical line succeeds');
    if (resB.plan.success) {
      const ptQ = resB.nextState.points[resB.plan.createdObjectIds.pointQId];
      assert(
        areOrthogonal(
          state.points['V1'],
          state.points['V2'],
          state.points['P_von'],
          ptQ
        ),
        'Test 3b: Perpendicular from point on vertical line is horizontal'
      );
      assert(Math.abs(ptQ.y - 10) < 1e-4, 'Test 3b: Horizontal line preserves y=10');
    }

    console.log('✓ Test 3 Passed: Vertical line (both outside and on line) verified');
  }

  // Test 4: Oblique line with arbitrary rotation (angle = 37.5°, P outside and P on line)
  {
    let state = makeTestState();
    const theta = 0.6545; // ~37.5 degrees
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const A = { x: -40 * cosT, y: -40 * sinT };
    const B = { x: 80 * cosT, y: 80 * sinT };

    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'O1', name: 'O1', x: A.x, y: A.y },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'O2', name: 'O2', x: B.x, y: B.y },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_LINE',
      line: { id: 'L_oblique', p1Id: 'O1', p2Id: 'O2' },
    });

    // Case 4a: Oblique line, P outside at (15, 60)
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_obl_out', name: 'P_obl_out', x: 15, y: 60 },
    });
    const resA = applyPerpendicularLine(state, 'L_oblique', 'P_obl_out');
    assert(resA.plan.success === true, 'Test 4a: Oblique line P outside succeeds');
    if (resA.plan.success) {
      const ptQ = resA.nextState.points[resA.plan.createdObjectIds.pointQId];
      assert(
        areOrthogonal(state.points['O1'], state.points['O2'], state.points['P_obl_out'], ptQ),
        'Test 4a: Result is strictly orthogonal to oblique line'
      );
    }

    // Case 4b: Oblique line, P on line at A + 0.3 * (B - A)
    const Pon = { x: A.x + 0.3 * (B.x - A.x), y: A.y + 0.3 * (B.y - A.y) };
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_obl_on', name: 'P_obl_on', x: Pon.x, y: Pon.y },
    });
    const resB = applyPerpendicularLine(state, 'L_oblique', 'P_obl_on');
    assert(resB.plan.success === true, 'Test 4b: Oblique line P on line succeeds');
    if (resB.plan.success) {
      const ptQ = resB.nextState.points[resB.plan.createdObjectIds.pointQId];
      assert(
        areOrthogonal(state.points['O1'], state.points['O2'], state.points['P_obl_on'], ptQ),
        'Test 4b: Result is strictly orthogonal to oblique line'
      );
    }

    console.log('✓ Test 4 Passed: Oblique rotated line (arbitrary angle) verified');
  }

  // Test 5: Scale Invariance across tiny (R=10) and huge (R=5000) geometries
  {
    // Tiny scale: points at x = -5, +5, P at (1, 3)
    let stateTiny = makeTestState();
    stateTiny = dispatchGeometryCommand(stateTiny, {
      type: 'ADD_POINT',
      point: { id: 'T1', name: 'T1', x: -5, y: 0 },
    });
    stateTiny = dispatchGeometryCommand(stateTiny, {
      type: 'ADD_POINT',
      point: { id: 'T2', name: 'T2', x: 5, y: 0 },
    });
    stateTiny = dispatchGeometryCommand(stateTiny, {
      type: 'ADD_LINE',
      line: { id: 'L_tiny', p1Id: 'T1', p2Id: 'T2' },
    });
    stateTiny = dispatchGeometryCommand(stateTiny, {
      type: 'ADD_POINT',
      point: { id: 'P_tiny', name: 'P_tiny', x: 1, y: 3 },
    });
    const resTiny = applyPerpendicularLine(stateTiny, 'L_tiny', 'P_tiny');
    assert(resTiny.plan.success === true, 'Test 5: Tiny scale succeeds');
    if (resTiny.plan.success) {
      const ptQ = resTiny.nextState.points[resTiny.plan.createdObjectIds.pointQId];
      assert(
        areOrthogonal(stateTiny.points['T1'], stateTiny.points['T2'], stateTiny.points['P_tiny'], ptQ),
        'Test 5: Tiny scale is strictly orthogonal'
      );
    }

    // Huge scale: points at x = -3000, +4000, P at (500, 2500)
    let stateHuge = makeTestState();
    stateHuge = dispatchGeometryCommand(stateHuge, {
      type: 'ADD_POINT',
      point: { id: 'H1', name: 'H1', x: -3000, y: 0 },
    });
    stateHuge = dispatchGeometryCommand(stateHuge, {
      type: 'ADD_POINT',
      point: { id: 'H2', name: 'H2', x: 4000, y: 0 },
    });
    stateHuge = dispatchGeometryCommand(stateHuge, {
      type: 'ADD_LINE',
      line: { id: 'L_huge', p1Id: 'H1', p2Id: 'H2' },
    });
    stateHuge = dispatchGeometryCommand(stateHuge, {
      type: 'ADD_POINT',
      point: { id: 'P_huge', name: 'P_huge', x: 500, y: 2500 },
    });
    const resHuge = applyPerpendicularLine(stateHuge, 'L_huge', 'P_huge');
    assert(resHuge.plan.success === true, 'Test 5: Huge scale succeeds');
    if (resHuge.plan.success) {
      const ptQ = resHuge.nextState.points[resHuge.plan.createdObjectIds.pointQId];
      assert(
        areOrthogonal(stateHuge.points['H1'], stateHuge.points['H2'], stateHuge.points['P_huge'], ptQ),
        'Test 5: Huge scale is strictly orthogonal'
      );
    }

    console.log('✓ Test 5 Passed: Scale invariance (tiny to huge) verified');
  }

  // Test 6: Degenerate line (A = B) and missing objects handled without mutating state
  {
    let state = makeTestState();
    // Degenerate line with points A1 and A2 whose distance < 1e-4
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'D1', name: 'D1', x: 20, y: 20 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'D2', name: 'D2', x: 20.000001, y: 20.000001 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_LINE',
      line: { id: 'L_degen', p1Id: 'D1', p2Id: 'D2' },
    });
    const { plan: planDegen, nextState: stateDegen } = applyPerpendicularLine(state, 'L_degen', 'C');
    assert(!planDegen.success, 'Test 6: Degenerate line fails');
    if (!planDegen.success) {
      const fail = planDegen as PerpendicularValidationFailure;
      assert(fail.error === 'DEGENERATE_LINE', 'Test 6: Error code DEGENERATE_LINE');
    }
    assert(stateDegen === state, 'Test 6: State reference unchanged on degenerate failure');

    // Missing line
    const { plan: planMissingLine, nextState: stateMissingLine } = applyPerpendicularLine(state, 'non_existent_line', 'C');
    assert(!planMissingLine.success, 'Test 6: Missing line fails');
    if (!planMissingLine.success) {
      const fail = planMissingLine as PerpendicularValidationFailure;
      assert(fail.error === 'OBJECT_NOT_FOUND', 'Test 6: Error code OBJECT_NOT_FOUND');
    }
    assert(stateMissingLine === state, 'Test 6: State unchanged on missing line');

    // Missing point
    const { plan: planMissingPoint, nextState: stateMissingPoint } = applyPerpendicularLine(state, 'chord_AB', 'non_existent_point');
    assert(!planMissingPoint.success, 'Test 6: Missing point fails');
    if (!planMissingPoint.success) {
      const fail = planMissingPoint as PerpendicularValidationFailure;
      assert(fail.error === 'POINT_NOT_FOUND', 'Test 6: Error code POINT_NOT_FOUND');
    }
    assert(stateMissingPoint === state, 'Test 6: State unchanged on missing point');

    console.log('✓ Test 6 Passed: Degeneracies and missing entities reject deterministically');
  }

  // Test 7: Role, provenance, parentIds and cascade deletion
  {
    let state = makeTestState();
    // Use existing chord AB and vertex C
    const { nextState, plan } = applyPerpendicularLine(state, 'chord_AB', 'C');
    assert(plan.success === true, 'Test 7: Base triangle AB and C perpendicular succeeds');
    if (!plan.success) return;

    const ids = plan.createdObjectIds;
    // Check roles
    assert(nextState.circles[ids.circle0Id].role === 'auxiliary', 'Test 7: C0 is auxiliary');
    assert(nextState.points[ids.pointP1Id].role === 'auxiliary', 'Test 7: P1 is auxiliary');
    assert(nextState.points[ids.pointP2Id].role === 'auxiliary', 'Test 7: P2 is auxiliary');
    assert(nextState.circles[ids.circle1Id].role === 'auxiliary', 'Test 7: C1 is auxiliary');
    assert(nextState.circles[ids.circle2Id].role === 'auxiliary', 'Test 7: C2 is auxiliary');
    assert(nextState.points[ids.pointQId].role === 'auxiliary', 'Test 7: Q is auxiliary');
    assert(nextState.lines[ids.perpendicularLineId].role === 'primary', 'Test 7: Perp line is primary');

    // Check provenance
    assert(
      nextState.lines[ids.perpendicularLineId].provenance?.macroType === 'perpendicular',
      'Test 7: Provenance macroType is "perpendicular"'
    );
    assert(
      nextState.lines[ids.perpendicularLineId].provenance?.groupId === plan.groupId,
      'Test 7: GroupId matches across all macro artifacts'
    );

    // Test Cascade Cleanup: Erasing primary line must erase all auxiliary circles and points
    const cleanedState = dispatchGeometryCommand(nextState, {
      type: 'ERASE_OBJECT',
      objectType: 'line',
      id: ids.perpendicularLineId,
    });

    assert(!cleanedState.lines[ids.perpendicularLineId], 'Test 7: Perp line erased');
    assert(!cleanedState.circles[ids.circle0Id], 'Test 7: Cascade erased C0');
    assert(!cleanedState.points[ids.pointP1Id], 'Test 7: Cascade erased P1');
    assert(!cleanedState.points[ids.pointP2Id], 'Test 7: Cascade erased P2');
    assert(!cleanedState.circles[ids.circle1Id], 'Test 7: Cascade erased C1');
    assert(!cleanedState.circles[ids.circle2Id], 'Test 7: Cascade erased C2');
    assert(!cleanedState.points[ids.pointQId], 'Test 7: Cascade erased Q');

    // Base geometry A, B, C, O, AB must be intact
    assert(!!cleanedState.points['A'], 'Test 7: Point A preserved');
    assert(!!cleanedState.points['B'], 'Test 7: Point B preserved');
    assert(!!cleanedState.points['C'], 'Test 7: Point C preserved');
    assert(!!cleanedState.segments['chord_AB'], 'Test 7: Segment chord_AB preserved');

    console.log('✓ Test 7 Passed: Role, provenance, and cascade deletion verified');
  }

  // Test 8: Point2D coordinate input, persistent intersection points, and deduplication
  {
    const state = makeTestState();
    // Drop a perpendicular from P(50, 50) to chord_AB (horizontal y=0):
    // Perpendicular line is x=50.
    // It intersects chord_AB at (50, 0), and circumcircle Γ at (50, ±sqrt(7500))
    const pArbitrary = { x: 50, y: 50 };
    const { nextState, plan } = applyPerpendicularLine(state, 'chord_AB', pArbitrary);
    assert(plan.success === true, 'Test 8: Perpendicular from (50, 50) to AB succeeds');
    if (plan.success) {
      const pId = plan.createdObjectIds.pointPId;
      assert(!!pId, 'Test 8: Point P created with ID');
      assert(!!nextState.points[pId!], 'Test 8: Point P persisted in nextState');

      const intIds = plan.createdObjectIds.intersectionPointIds || [];
      assert(intIds.length > 0, 'Test 8: Intersections detected and persisted');
      for (const intId of intIds) {
        const pt = nextState.points[intId];
        assert(!!pt, `Test 8: Intersection point ${intId} exists in state`);
        assert(pt.role === 'auxiliary', `Test 8: Intersection point ${intId} is auxiliary`);
        assert(
          pt.provenance?.macroType === 'perpendicular',
          `Test 8: Intersection point ${intId} has perpendicular provenance`
        );
      }
    }

    // Deduplication test: Perpendicular from C(0, 100) to chord_AB passes through O(0, 0)
    // and antipodal point (0, -100) which matches Q. All intersections are deduplicated cleanly.
    const resC = applyPerpendicularLine(state, 'chord_AB', 'C');
    assert(resC.plan.success === true, 'Test 8: Perpendicular from vertex C succeeds');
    if (resC.plan.success) {
      // Must not create duplicate point for O(0,0) or Q
      const cInts = resC.plan.createdObjectIds.intersectionPointIds || [];
      for (const intId of cInts) {
        const pt = resC.nextState.points[intId];
        assert(
          distance2D(pt, state.points['O']) > GEOMETRY_POINT_COINCIDENT_THRESHOLD,
          'Test 8: Deduplicated against center O'
        );
      }
    }

    console.log('✓ Test 8 Passed: Point2D coordinate input and intersection persistence verified');
  }

  // Test 9: Cascade erase removes newly persisted intersection points
  {
    const state = makeTestState();
    const { nextState, plan } = applyPerpendicularLine(state, 'chord_AB', { x: 50, y: 50 });
    assert(plan.success === true, 'Test 9: Plan succeeds');
    if (plan.success) {
      const lineId = plan.createdObjectIds.perpendicularLineId;
      const intIds = plan.createdObjectIds.intersectionPointIds || [];
      assert(intIds.length > 0, 'Test 9: Intersections exist before erase');

      const erasedState = dispatchGeometryCommand(nextState, {
        type: 'ERASE_OBJECT',
        objectType: 'line',
        id: lineId,
      });

      assert(!erasedState.lines[lineId], 'Test 9: Line erased');
      for (const intId of intIds) {
        assert(!erasedState.points[intId], `Test 9: Intersection point ${intId} cascade erased`);
      }
    }

    console.log('✓ Test 9 Passed: Cascade deletion of perpendicular intersections verified');
  }

  console.log('--- ALL PERPENDICULAR LINE TESTS PASSED (9/9) ---');
}
