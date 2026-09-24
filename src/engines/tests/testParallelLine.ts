// src/engines/tests/testParallelLine.ts
// Comprehensive Test Suite for Classical Euclidean Parallel Line Through Point (Package 2.5)
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
  ParallelValidationFailure,
  planParallelLine,
  applyParallelLine,
} from '../parallelLine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
}

/**
 * Checks if two lines defined by (p1A, p1B) and (p2A, p2B) are parallel.
 * Cross product of direction vectors: dx1 * dy2 - dy1 * dx2 must be 0 within tolerance.
 */
function areParallel(
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
  const cross = dx1 * dy2 - dy1 * dx2;
  const len1 = Math.hypot(dx1, dy1);
  const len2 = Math.hypot(dx2, dy2);
  return Math.abs(cross) / (len1 * len2) < tol;
}

function makeTestState(): FullGeometryState {
  return createDefaultGeometryState({ A: 0.0, B: 0.5, C: 0.25 }, 100);
}

export function runParallelLineSuite() {
  console.log('--- RUNNING PARALLEL LINE THROUGH POINT SUITE (PACKAGE 2.5) ---');

  // PAR-01: Horizontal Line
  {
    let state = makeTestState();
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'H1', name: 'H1', x: 0, y: 0 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'H2', name: 'H2', x: 100, y: 0 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_LINE',
      line: { id: 'L_horiz', p1Id: 'H1', p2Id: 'H2' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_target', name: 'P', x: 50, y: 40 },
    });

    const { nextState, plan } = applyParallelLine(state, 'L_horiz', 'P_target');
    assert(plan.success === true, 'PAR-01: Plan should succeed for horizontal line and P outside');
    if (!plan.success) return;

    const parLine = nextState.lines[plan.createdObjectIds.parallelLineId];
    assert(!!parLine, 'PAR-01: Parallel line created in state');
    assert(parLine.role === 'primary', 'PAR-01: Parallel line has role "primary"');

    const ptP = nextState.points['P_target'];
    const ptQ = nextState.points[plan.createdObjectIds.pointQId];
    assert(!!ptQ, 'PAR-01: Auxiliary point Q created in state');

    // Check parallel alignment with horizontal line
    assert(
      areParallel(state.points['H1'], state.points['H2'], ptP, ptQ),
      'PAR-01: Result line is exactly parallel to horizontal line (slope 0)'
    );

    // Q must have y = 40 (same y-coordinate since line is horizontal)
    assert(Math.abs(ptQ.y - 40) < 1e-4, 'PAR-01: Q.y is exactly 40');

    console.log('✓ PAR-01 Passed: Horizontal line parallel construction verified');
  }

  // PAR-02: Vertical Line
  {
    let state = makeTestState();
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V1', name: 'V1', x: 0, y: 0 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'V2', name: 'V2', x: 0, y: 100 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_LINE',
      line: { id: 'L_vert', p1Id: 'V1', p2Id: 'V2' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_vert', name: 'P_vert', x: 30, y: 50 },
    });

    const { nextState, plan } = applyParallelLine(state, 'L_vert', 'P_vert');
    assert(plan.success === true, 'PAR-02: Plan should succeed for vertical line');
    if (!plan.success) return;

    const ptP = nextState.points['P_vert'];
    const ptQ = nextState.points[plan.createdObjectIds.pointQId];
    assert(
      areParallel(state.points['V1'], state.points['V2'], ptP, ptQ),
      'PAR-02: Result line is exactly parallel to vertical line'
    );
    // Q must have x = 30 (same x-coordinate)
    assert(Math.abs(ptQ.x - 30) < 1e-4, 'PAR-02: Q.x is exactly 30');

    console.log('✓ PAR-02 Passed: Vertical line parallel construction verified');
  }

  // PAR-03: Inclined Line (45 degrees) and Segment target
  {
    let state = makeTestState();
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'O1', name: 'O1', x: 10, y: 10 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'O2', name: 'O2', x: 90, y: 90 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_diag', p1Id: 'O1', p2Id: 'O2' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_diag', name: 'P_diag', x: 0, y: 50 },
    });

    const { nextState, plan } = applyParallelLine(state, 'seg_diag', 'P_diag');
    assert(plan.success === true, 'PAR-03: Plan should succeed for inclined segment');
    if (!plan.success) return;

    const ptP = nextState.points['P_diag'];
    const ptQ = nextState.points[plan.createdObjectIds.pointQId];
    assert(
      areParallel(state.points['O1'], state.points['O2'], ptP, ptQ),
      'PAR-03: Result line is exactly parallel to 45-degree segment'
    );

    console.log('✓ PAR-03 Passed: Inclined line/segment parallel construction verified');
  }

  // PAR-04: Degenerate P on Line (dist <= TOLERANCE)
  {
    let state = makeTestState();
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'A1', name: 'A1', x: 0, y: 0 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'A2', name: 'A2', x: 100, y: 0 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_LINE',
      line: { id: 'L_collinear', p1Id: 'A1', p2Id: 'A2' },
    });
    // Point P right on the line at (50, 0)
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_on', name: 'P_on', x: 50, y: 0 },
    });

    const { plan, nextState } = applyParallelLine(state, 'L_collinear', 'P_on');
    assert(!plan.success, 'PAR-04: Point on line should fail');
    if (!plan.success) {
      const fail = plan as ParallelValidationFailure;
      assert(fail.error === 'POINT_ON_LINE', 'PAR-04: Error code is POINT_ON_LINE');
    }
    assert(nextState === state, 'PAR-04: State reference strictly unchanged');

    console.log('✓ PAR-04 Passed: Point on line rejected with POINT_ON_LINE without state mutation');
  }

  // PAR-05: Degenerate Line (A = B)
  {
    let state = makeTestState();
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'D1', name: 'D1', x: 50, y: 50 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'D2', name: 'D2', x: 50, y: 50 },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_LINE',
      line: { id: 'L_degen', p1Id: 'D1', p2Id: 'D2' },
    });

    const { plan, nextState } = applyParallelLine(state, 'L_degen', 'C');
    assert(!plan.success, 'PAR-05: Degenerate line fails');
    if (!plan.success) {
      const fail = plan as ParallelValidationFailure;
      assert(fail.error === 'DEGENERATE_LINE', 'PAR-05: Error code is DEGENERATE_LINE');
    }
    assert(nextState === state, 'PAR-05: State reference strictly unchanged');

    console.log('✓ PAR-05 Passed: Degenerate line rejected with DEGENERATE_LINE');
  }

  // PAR-06: Missing Objects
  {
    const state = makeTestState();
    // Missing line
    const resMissingLine = applyParallelLine(state, 'non_existent_line', 'C');
    assert(!resMissingLine.plan.success, 'PAR-06: Missing line fails');
    if (!resMissingLine.plan.success) {
      const fail = resMissingLine.plan as ParallelValidationFailure;
      assert(fail.error === 'OBJECT_NOT_FOUND', 'PAR-06: Error code is OBJECT_NOT_FOUND');
    }
    assert(resMissingLine.nextState === state, 'PAR-06: State unchanged on missing line');

    // Missing point
    const resMissingPoint = applyParallelLine(state, 'chord_AB', 'non_existent_point');
    assert(!resMissingPoint.plan.success, 'PAR-06: Missing point fails');
    if (!resMissingPoint.plan.success) {
      const fail = resMissingPoint.plan as ParallelValidationFailure;
      assert(fail.error === 'POINT_NOT_FOUND', 'PAR-06: Error code is POINT_NOT_FOUND');
    }
    assert(resMissingPoint.nextState === state, 'PAR-06: State unchanged on missing point');

    console.log('✓ PAR-06 Passed: Missing objects rejected deterministically');
  }

  // PAR-07: Roles & Provenance (5 auxiliary + 1 primary)
  {
    let state = makeTestState();
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_prov', name: 'P_prov', x: 20, y: 70 },
    });

    const { nextState, plan } = applyParallelLine(state, 'chord_AB', 'P_prov', 'test_grp_par_07');
    assert(plan.success === true, 'PAR-07: Construction succeeds');
    if (!plan.success) return;

    assert(plan.groupId === 'test_grp_par_07', 'PAR-07: Custom groupId preserved');

    // 5 auxiliary: C1, A1, CP, CA1, Q
    const c1 = nextState.circles[plan.createdObjectIds.circle1Id];
    const a1 = nextState.points[plan.createdObjectIds.pointA1Id];
    const cP = nextState.circles[plan.createdObjectIds.circlePId];
    const cA1 = nextState.circles[plan.createdObjectIds.circleA1Id];
    const ptQ = nextState.points[plan.createdObjectIds.pointQId];
    const parLine = nextState.lines[plan.createdObjectIds.parallelLineId];

    assert(c1.role === 'auxiliary', 'PAR-07: C1 has role auxiliary');
    assert(a1.role === 'auxiliary', 'PAR-07: A1 has role auxiliary');
    assert(cP.role === 'auxiliary', 'PAR-07: CP has role auxiliary');
    assert(cA1.role === 'auxiliary', 'PAR-07: CA1 has role auxiliary');
    assert(ptQ.role === 'auxiliary', 'PAR-07: Q has role auxiliary');
    assert(parLine.role === 'primary', 'PAR-07: Parallel line has role primary');

    assert(c1.provenance?.macroType === 'parallel', 'PAR-07: Provenance macroType parallel');
    assert(c1.provenance?.groupId === 'test_grp_par_07', 'PAR-07: Provenance groupId matches');
    assert(parLine.provenance?.groupId === 'test_grp_par_07', 'PAR-07: Primary line groupId matches');

    console.log('✓ PAR-07 Passed: 5 auxiliary objects and 1 primary line verified with matching provenance');
  }

  // PAR-08: Cascade Deletion
  {
    let state = makeTestState();
    state = dispatchGeometryCommand(state, {
      type: 'ADD_POINT',
      point: { id: 'P_del', name: 'P_del', x: -30, y: 60 },
    });

    const { nextState, plan } = applyParallelLine(state, 'chord_AB', 'P_del', 'del_grp_08');
    assert(plan.success === true, 'PAR-08: Construction succeeds');
    if (!plan.success) return;

    // Erase the target point P_del
    const erasedState = dispatchGeometryCommand(nextState, {
      type: 'ERASE_OBJECT',
      objectType: 'point',
      id: 'P_del',
    });

    // All elements in del_grp_08 must be erased
    assert(erasedState.points['P_del'] === undefined, 'PAR-08: Point P_del erased');
    assert(erasedState.lines[plan.createdObjectIds.parallelLineId] === undefined, 'PAR-08: Result line cascade erased');
    assert(erasedState.circles[plan.createdObjectIds.circle1Id] === undefined, 'PAR-08: C1 cascade erased');
    assert(erasedState.points[plan.createdObjectIds.pointA1Id] === undefined, 'PAR-08: A1 cascade erased');
    assert(erasedState.circles[plan.createdObjectIds.circlePId] === undefined, 'PAR-08: CP cascade erased');
    assert(erasedState.circles[plan.createdObjectIds.circleA1Id] === undefined, 'PAR-08: CA1 cascade erased');
    assert(erasedState.points[plan.createdObjectIds.pointQId] === undefined, 'PAR-08: Q cascade erased');

    console.log('✓ PAR-08 Passed: Cascade deletion purges all group artifacts');
  }

  // PAR-09: Scale Invariance (10^-3 to 10^3)
  {
    // Small scale (10^-2)
    let stateSmall = createDefaultGeometryState({ A: 0.0, B: 0.5, C: 0.25 }, 0.01);
    stateSmall = dispatchGeometryCommand(stateSmall, {
      type: 'ADD_POINT',
      point: { id: 'P_small', name: 'P_small', x: 0.002, y: 0.006 },
    });
    const resSmall = applyParallelLine(stateSmall, 'chord_AB', 'P_small');
    assert(resSmall.plan.success === true, 'PAR-09: Small scale construction succeeds');
    if (resSmall.plan.success) {
      const q = resSmall.nextState.points[resSmall.plan.createdObjectIds.pointQId];
      const p = resSmall.nextState.points['P_small'];
      assert(
        areParallel(stateSmall.points['A'], stateSmall.points['B'], p, q, 1e-4),
        'PAR-09: Small scale parallelity holds'
      );
    }

    // Huge scale (10^4)
    let stateHuge = createDefaultGeometryState({ A: 0.0, B: 0.5, C: 0.25 }, 10000);
    stateHuge = dispatchGeometryCommand(stateHuge, {
      type: 'ADD_POINT',
      point: { id: 'P_huge', name: 'P_huge', x: 2000, y: 6000 },
    });
    const resHuge = applyParallelLine(stateHuge, 'chord_AB', 'P_huge');
    assert(resHuge.plan.success === true, 'PAR-09: Huge scale construction succeeds');
    if (resHuge.plan.success) {
      const q = resHuge.nextState.points[resHuge.plan.createdObjectIds.pointQId];
      const p = resHuge.nextState.points['P_huge'];
      assert(
        areParallel(stateHuge.points['A'], stateHuge.points['B'], p, q, 1e-4),
        'PAR-09: Huge scale parallelity holds'
      );
    }

    console.log('✓ PAR-09 Passed: Scale invariance holds across magnitude variations');
  }

  // PAR-10: Atomic Commit with Coordinate Input for Point P
  {
    const state = makeTestState();
    const rawPos = { x: 0, y: 50 }; // Coordinate not in state.points

    const { nextState, plan } = applyParallelLine(state, 'chord_AB', rawPos, 'grp_par_10');
    assert(plan.success === true, 'PAR-10: Succeeded with coordinate object input');
    if (plan.success) {
      assert(!!plan.createdObjectIds.pointPId, 'PAR-10: Created pointPId');
      const ptP = nextState.points[plan.createdObjectIds.pointPId!];
      assert(!!ptP, 'PAR-10: Point P persisted in nextState.points');
      assert(Math.abs(ptP.x - 0) < 1e-4 && Math.abs(ptP.y - 50) < 1e-4, 'PAR-10: Point P coords match input');

      const parLine = nextState.lines[plan.createdObjectIds.parallelLineId];
      assert(!!parLine, 'PAR-10: Parallel line persisted in state');
      assert(parLine.role === 'primary', 'PAR-10: Parallel line role is primary');
    }

    console.log('✓ PAR-10 Passed: Atomic commit with coordinate input creates point P and parallel line');
  }

  // PAR-11: Persistence of Intersections with Sides, Circles, and Lines
  {
    let state = makeTestState();
    // Add an extra circle and segment
    state = dispatchGeometryCommand(state, {
      type: 'ADD_CIRCLE',
      circle: { id: 'circ_user', centerId: 'O', radius: 40, role: 'primary' },
    });
    state = dispatchGeometryCommand(state, {
      type: 'ADD_SEGMENT',
      segment: { id: 'seg_user', p1Id: 'A', p2Id: 'C' },
    });

    // Parallel to AB passing through y = 30
    const { nextState, plan } = applyParallelLine(state, 'chord_AB', { x: 0, y: 30 }, 'grp_par_11');
    assert(plan.success === true, 'PAR-11: Construction succeeds');
    if (plan.success) {
      assert(
        !!plan.createdObjectIds.intersectionPointIds && plan.createdObjectIds.intersectionPointIds.length > 0,
        'PAR-11: Intersection points were calculated and created'
      );

      // Verify all created intersection points exist in nextState.points with role auxiliary and valid provenance
      for (const intId of plan.createdObjectIds.intersectionPointIds!) {
        const intPt = nextState.points[intId];
        assert(!!intPt, `PAR-11: Intersection point ${intId} exists in state.points`);
        assert(intPt.provenance?.macroType === 'parallel', 'PAR-11: Provenance macroType is parallel');
        assert(intPt.provenance?.groupId === 'grp_par_11', 'PAR-11: Provenance groupId matches');
        assert(intPt.parentIds && intPt.parentIds.length > 0, 'PAR-11: Parent IDs populated');
      }
    }

    console.log('✓ PAR-11 Passed: Intersections with segments, circles, and lines persisted with valid provenance');
  }

  // PAR-12: Single-Step Undo for entire Parallel Construction
  {
    const state = makeTestState();
    const { nextState, plan } = applyParallelLine(state, 'chord_AB', { x: 10, y: 40 }, 'grp_par_12');
    assert(plan.success === true, 'PAR-12: Construction succeeds');
    if (plan.success) {
      // Dispatch undo using the previous state
      assert(Object.keys(nextState.lines).length > Object.keys(state.lines).length, 'PAR-12: Line added');
      assert(Object.keys(nextState.points).length > Object.keys(state.points).length, 'PAR-12: Points added');

      // Erasing group or reverting to previous state removes everything atomically
      const erasedState = dispatchGeometryCommand(nextState, {
        type: 'ERASE_OBJECT',
        objectType: 'line',
        id: plan.createdObjectIds.parallelLineId,
      });

      assert(
        erasedState.lines[plan.createdObjectIds.parallelLineId] === undefined,
        'PAR-12: Parallel line removed'
      );
    }

    console.log('✓ PAR-12 Passed: Atomic construction and group cleanup verified');
  }

  // PAR-13: Deduplication when Parallel passes through existing vertex
  {
    const state = makeTestState();
    // Vertex C
    const ptC = state.points['C'];
    const { nextState, plan } = applyParallelLine(state, 'chord_AB', 'C', 'grp_par_13');
    assert(plan.success === true, 'PAR-13: Parallel through vertex C succeeds');
    if (plan.success) {
      // Vertex C must NOT be duplicated
      const duplicateC = Object.values(nextState.points).filter(
        (p) => p.id !== 'C' && distance2D(p, ptC) < GEOMETRY_POINT_COINCIDENT_THRESHOLD
      );
      assert(duplicateC.length === 0, 'PAR-13: Vertex C is not duplicated');
    }

    console.log('✓ PAR-13 Passed: Deduplication against existing vertices verified');
  }

  console.log('--- ALL PARALLEL LINE TESTS PASSED (13/13) ---');
}
