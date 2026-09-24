// src/engines/parallelLine.ts
// Classical Euclidean construction of a Line Parallel to L passing through Point P (Rhombus Method)
// Complies with "One Geometry, Many Clients" invariant.
// Pure functions, zero coordinate synthesis ("NO MAGIC GEOMETRY"), strict tolerance validation.
// Transactional lifecycle: VALIDATE -> COMPUTE -> PREPARE -> COMMIT

import {
  FullGeometryState,
  GeometryCommand,
  GeometryProvenance,
  dispatchGeometryCommand,
} from './constructionCore';
import {
  Point2D,
  distance2D,
  pointToLineDistance,
  intersectLineCircle,
  intersectCircleCircle,
  computeParallelPreviewIntersections,
  ParallelPreviewGeometryTargetState,
  GEOMETRY_POINT_COINCIDENT_THRESHOLD,
  GEOMETRY_EPSILON,
} from './geometryIntersections';

export type ParallelLineErrorCode =
  | 'OBJECT_NOT_FOUND'
  | 'LINE_NOT_FOUND'
  | 'POINT_NOT_FOUND'
  | 'DEGENERATE_LINE'
  | 'POINT_ON_LINE'
  | 'PRECONDITION_FAILED';

export interface ParallelValidationFailure {
  success: false;
  error: ParallelLineErrorCode;
  errorMessage: string;
}

export interface ParallelValidationSuccess {
  success: true;
  groupId: string;
  commands: GeometryCommand[];
  createdObjectIds: {
    pointPId?: string;
    circle1Id: string;
    pointA1Id: string;
    circlePId: string;
    circleA1Id: string;
    pointQId: string;
    parallelLineId: string;
    intersectionPointIds?: string[];
  };
}

export type ParallelLinePlan =
  | ParallelValidationFailure
  | ParallelValidationSuccess;

/**
 * Plans the classical Euclidean parallel line construction using the Rhombus Method:
 *
 * 1. Let L be defined by anchor points A = L.p1, B = L.p2.
 * 2. Radius R = |PA|. Since P not in L, R >= dist(P, L) > TOLERANCE.
 * 3. C1 = Circle(A, R).
 * 4. Intersect C1 with line L. Filter intersection point A1 satisfying (A1 - A) . (B - A) > 0.
 * 5. CP = Circle(P, R), CA1 = Circle(A1, R).
 * 6. Intersect CP and CA1. Filter out anchor point A to obtain intersection point Q.
 * 7. Quadrilateral AA1QP is a rhombus with 4 equal sides of length R.
 *    Therefore, line PQ is parallel to line AA1 (which is line L).
 * 8. Primary result: Line(P, Q).
 *
 * Pure function: does NOT mutate state.
 */
export function planParallelLine(
  state: FullGeometryState,
  targetLineOrSegmentId: string,
  pointPInput: string | Point2D | { x: number; y: number; id?: string; name?: string },
  customGroupId?: string
): ParallelLinePlan {
  // 1. VALIDATE: Line existence
  const lineObj =
    state.lines[targetLineOrSegmentId] ||
    state.segments[targetLineOrSegmentId];

  if (!lineObj) {
    return {
      success: false,
      error: 'OBJECT_NOT_FOUND',
      errorMessage: `Линия или отрезок с id "${targetLineOrSegmentId}" не найдены в состоянии геометрии.`,
    };
  }

  // 2. VALIDATE / RESOLVE: Point P
  let pointP: { id: string; name?: string; x: number; y: number };
  let pointPId: string;
  let isNewPoint = false;

  if (typeof pointPInput === 'string') {
    const existing = state.points[pointPInput];
    if (!existing) {
      return {
        success: false,
        error: 'POINT_NOT_FOUND',
        errorMessage: `Целевая точка P с id "${pointPInput}" не найдена в состоянии геометрии.`,
      };
    }
    pointP = existing;
    pointPId = existing.id;
  } else {
    // Check if close to an existing point
    const existing = Object.values(state.points).find(
      (pt) => distance2D(pt, pointPInput) <= GEOMETRY_POINT_COINCIDENT_THRESHOLD
    );
    if (existing) {
      pointP = existing;
      pointPId = existing.id;
    } else {
      const nextCount = state.pointCounter + 1;
      const customId = 'id' in pointPInput ? pointPInput.id : undefined;
      const customName = 'name' in pointPInput ? pointPInput.name : undefined;
      pointPId = customId || `P${nextCount}`;
      pointP = {
        id: pointPId,
        name: customName || pointPId,
        x: pointPInput.x,
        y: pointPInput.y,
      };
      isNewPoint = true;
    }
  }

  // 3. VALIDATE: Anchor points of line L
  const ptA = state.points[lineObj.p1Id];
  const ptB = state.points[lineObj.p2Id];
  if (!ptA || !ptB) {
    return {
      success: false,
      error: 'POINT_NOT_FOUND',
      errorMessage: `Опорные точки прямой (${lineObj.p1Id}, ${lineObj.p2Id}) не найдены.`,
    };
  }

  // 4. VALIDATE: Non-degeneracy of line L
  const distAB = distance2D(ptA, ptB);
  if (distAB < GEOMETRY_POINT_COINCIDENT_THRESHOLD) {
    return {
      success: false,
      error: 'DEGENERATE_LINE',
      errorMessage: 'Опорные точки прямой совпадают (вырожденная прямая). Построение невозможно.',
    };
  }

  // 5. VALIDATE: Point P must not lie on line L (dist(P, L) > TOLERANCE)
  const distToLine = pointToLineDistance(pointP, ptA, ptB);
  if (distToLine <= GEOMETRY_POINT_COINCIDENT_THRESHOLD) {
    return {
      success: false,
      error: 'POINT_ON_LINE',
      errorMessage: 'Точка P лежит на прямой L. Параллельная прямая совпадает с исходной.',
    };
  }

  // 6. COMPUTE: Classical Rhombus Method
  // Radius R = |PA|
  const R = distance2D(pointP, ptA);
  if (R < GEOMETRY_POINT_COINCIDENT_THRESHOLD) {
    return {
      success: false,
      error: 'POINT_ON_LINE',
      errorMessage: 'Точка P совпадает с опорной точкой A прямой L.',
    };
  }

  // Step 1: Intersect C1(A, R) with line L(A, B)
  const lineIntersections = intersectLineCircle(ptA, ptB, ptA, R, GEOMETRY_EPSILON);
  if (lineIntersections.length < 2) {
    return {
      success: false,
      error: 'PRECONDITION_FAILED',
      errorMessage: 'Окружность C1 не пересекла прямую L в двух точках.',
    };
  }

  // Selection criterion for A1: (pt_k - A) . (B - A) > 0
  const dxAB = ptB.x - ptA.x;
  const dyAB = ptB.y - ptA.y;

  let ptA1Coords: Point2D | null = null;
  for (const cand of lineIntersections) {
    const dot = (cand.x - ptA.x) * dxAB + (cand.y - ptA.y) * dyAB;
    if (dot > GEOMETRY_EPSILON) {
      ptA1Coords = cand;
      break;
    }
  }

  if (!ptA1Coords) {
    // Fallback: pick the first intersection point if both were near zero dot product (edge case)
    ptA1Coords = lineIntersections[1] || lineIntersections[0];
  }

  // Step 2: Intersect CP(P, R) and CA1(A1, R)
  const circleIntersections = intersectCircleCircle(
    pointP,
    R,
    ptA1Coords,
    R,
    GEOMETRY_EPSILON
  );

  if (circleIntersections.length < 2) {
    return {
      success: false,
      error: 'PRECONDITION_FAILED',
      errorMessage: 'Окружности CP и CA1 не дали двух точек пересечения.',
    };
  }

  // Selection criterion for Q: dist(pt_k, A) > TOLERANCE (filter out anchor point A)
  let ptQCoords: Point2D | null = null;
  for (const cand of circleIntersections) {
    const distToA = distance2D(cand, ptA);
    if (distToA > GEOMETRY_POINT_COINCIDENT_THRESHOLD) {
      ptQCoords = cand;
      break;
    }
  }

  if (!ptQCoords) {
    return {
      success: false,
      error: 'PRECONDITION_FAILED',
      errorMessage: 'Не удалось найти четвёртую вершину ромба Q, отличную от точки A.',
    };
  }

  // 7. PREPARE: Atomic Commands
  const groupId =
    customGroupId || `par_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const provenance: GeometryProvenance = {
    macroType: 'parallel',
    sourceIds: [targetLineOrSegmentId, pointPId],
    groupId,
  };

  const circle1Id = `circ_par_${groupId}_1`;
  const pointA1Id = `pt_par_${groupId}_A1`;
  const circlePId = `circ_par_${groupId}_P`;
  const circleA1Id = `circ_par_${groupId}_A1`;
  const pointQId = `pt_par_${groupId}_Q`;
  const parallelLineId = `line_par_${groupId}`;

  const commands: GeometryCommand[] = [];

  // If point P is newly introduced in this construction, add it to the atomic batch
  if (isNewPoint) {
    commands.push({
      type: 'ADD_POINT',
      point: {
        id: pointPId,
        name: pointP.name || pointPId,
        x: pointP.x,
        y: pointP.y,
        role: 'primary',
        color: '#475569',
      },
    });
  }

  // 1. Auxiliary circle C1 centered at A with radius R
  commands.push({
    type: 'ADD_CIRCLE',
    circle: {
      id: circle1Id,
      centerId: lineObj.p1Id,
      radius: R,
      role: 'auxiliary',
      provenance,
      color: 'rgba(59, 130, 246, 0.35)', // Subtle blue trace
    },
  });

  // 2. Auxiliary intersection point A1 on line L
  commands.push({
    type: 'ADD_POINT',
    point: {
      id: pointA1Id,
      name: 'A₁',
      x: ptA1Coords.x,
      y: ptA1Coords.y,
      role: 'auxiliary',
      provenance,
      parentIds: [circle1Id, targetLineOrSegmentId],
      color: '#3B82F6',
    },
  });

  // 3. Auxiliary circle CP centered at P with radius R
  commands.push({
    type: 'ADD_CIRCLE',
    circle: {
      id: circlePId,
      centerId: pointPId,
      radius: R,
      role: 'auxiliary',
      provenance,
      color: 'rgba(59, 130, 246, 0.35)',
    },
  });

  // 4. Auxiliary circle CA1 centered at A1 with radius R
  commands.push({
    type: 'ADD_CIRCLE',
    circle: {
      id: circleA1Id,
      centerId: pointA1Id,
      radius: R,
      role: 'auxiliary',
      provenance,
      color: 'rgba(59, 130, 246, 0.35)',
    },
  });

  // 5. Auxiliary intersection point Q (opposite vertex in rhombus AA1QP)
  commands.push({
    type: 'ADD_POINT',
    point: {
      id: pointQId,
      name: 'Q',
      x: ptQCoords.x,
      y: ptQCoords.y,
      role: 'auxiliary',
      provenance,
      parentIds: [circlePId, circleA1Id],
      color: '#3B82F6',
    },
  });

  // 6. Primary parallel line passing through P and Q
  commands.push({
    type: 'ADD_LINE',
    line: {
      id: parallelLineId,
      p1Id: pointPId,
      p2Id: pointQId,
      role: 'primary',
      provenance,
      color: '#0284C7', // Crisp sky/cyan blue
    },
  });

  // 7. Real intersection points with existing segments, circles, and lines
  const previewTargetState: ParallelPreviewGeometryTargetState = {
    R: state.R,
    points: { ...state.points, [pointPId]: pointP },
    segments: state.segments,
    lines: state.lines,
    circles: state.circles,
  };

  const intersections = computeParallelPreviewIntersections(
    { p1: ptA, p2: ptB },
    pointP,
    previewTargetState,
    GEOMETRY_EPSILON
  );

  const intersectionPointIds: string[] = [];
  const addedCoords: Point2D[] = [pointP, ptQCoords, ptA1Coords];
  // Also consider existing points in state so we never create duplicates of existing points
  for (const ep of Object.values(state.points)) {
    addedCoords.push(ep);
  }

  let intIdx = 1;
  for (const int of intersections) {
    const isDuplicate = addedCoords.some(
      (c) => distance2D(int, c) <= GEOMETRY_POINT_COINCIDENT_THRESHOLD
    );

    if (!isDuplicate) {
      addedCoords.push(int);
      const intPointId = `pt_par_${groupId}_int_${intIdx}`;
      intersectionPointIds.push(intPointId);
      commands.push({
        type: 'ADD_POINT',
        point: {
          id: intPointId,
          name: `X${intIdx}`,
          x: int.x,
          y: int.y,
          role: 'auxiliary',
          provenance: {
            macroType: 'parallel',
            sourceIds: [targetLineOrSegmentId, pointPId, int.targetId],
            groupId,
          },
          parentIds: [parallelLineId, int.targetId],
          color: '#0284C7',
        },
      });
      intIdx++;
    }
  }

  return {
    success: true,
    groupId,
    commands,
    createdObjectIds: {
      pointPId,
      circle1Id,
      pointA1Id,
      circlePId,
      circleA1Id,
      pointQId,
      parallelLineId,
      intersectionPointIds,
    },
  };
}

/**
 * Executes atomic transaction for Parallel Line Through Point:
 * VALIDATE -> COMPUTE -> PREPARE -> COMMIT
 *
 * If validation fails (including degenerate line, missing entity, or point on line),
 * GeometryState remains strictly untouched.
 */
export function applyParallelLine(
  state: FullGeometryState,
  targetLineOrSegmentId: string,
  pointPInput: string | Point2D | { x: number; y: number; id?: string; name?: string },
  customGroupId?: string
): {
  nextState: FullGeometryState;
  plan: ParallelLinePlan;
} {
  const plan = planParallelLine(state, targetLineOrSegmentId, pointPInput, customGroupId);

  if (!plan.success) {
    return {
      nextState: state, // Strictly untouched reference
      plan,
    };
  }

  // COMMIT via batch reduction
  const nextState = dispatchGeometryCommand(state, {
    type: 'BATCH_COMMANDS',
    commands: plan.commands,
  });

  return {
    nextState,
    plan,
  };
}
