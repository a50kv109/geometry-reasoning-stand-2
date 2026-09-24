// src/engines/perpendicularLine.ts
// Classical Euclidean construction of a Perpendicular to line L through point P
// Complies with "One Geometry, Many Clients" invariant.
// Supports both cases:
// Case A: P is outside line L
// Case B: P is on line L
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
  computePerpendicularPreviewIntersections,
  PreviewGeometryTargetState,
  GEOMETRY_POINT_COINCIDENT_THRESHOLD,
  GEOMETRY_EPSILON,
} from './geometryIntersections';

export type PerpendicularErrorCode =
  | 'OBJECT_NOT_FOUND'
  | 'POINT_NOT_FOUND'
  | 'DEGENERATE_LINE'
  | 'PRECONDITION_FAILED';

export interface PerpendicularValidationFailure {
  success: false;
  error: PerpendicularErrorCode;
  errorMessage: string;
}

export interface PerpendicularValidationSuccess {
  success: true;
  groupId: string;
  isPointOnLine: boolean;
  commands: GeometryCommand[];
  createdObjectIds: {
    pointPId?: string;
    circle0Id: string;
    pointP1Id: string;
    pointP2Id: string;
    circle1Id: string;
    circle2Id: string;
    pointQId: string;
    perpendicularLineId: string;
    intersectionPointIds?: string[];
  };
}

export type PerpendicularLinePlan =
  | PerpendicularValidationFailure
  | PerpendicularValidationSuccess;

/**
 * Plans the classical Euclidean perpendicular from point P to line/segment L.
 *
 * Case A (P outside L):
 * 1. Let d = dist(P, L) > 0.
 * 2. Constructive radius R = d * sqrt(2) (deterministic, scale-invariant, no magic pixels).
 * 3. C0 = Circle(P, R). Intersects L at P1, P2 with chord length 2d.
 * 4. C1 = Circle(P1, R), C2 = Circle(P2, R). They pass through P.
 * 5. Intersect C1 and C2 -> { P, Q }. Choose Q != P.
 * 6. Line(P, Q) is the perpendicular.
 *
 * Case B (P on L):
 * 1. Let L_scale = dist(A, B) > 0. Radius r0 = L_scale / 2.
 * 2. C0 = Circle(P, r0). Intersects L at P1, P2 on opposite sides of P.
 * 3. C1 = Circle(P1, R), C2 = Circle(P2, R) where R = 2 * r0 = L_scale.
 * 4. Intersect C1 and C2 -> { Q1, Q2 } on opposite sides of L.
 * 5. Deterministically pick Q with positive cross-product relative to vector AB (canonical orientation).
 * 6. Line(P, Q) is the perpendicular.
 *
 * Pure function: does NOT mutate state.
 */
export function planPerpendicularLine(
  state: FullGeometryState,
  targetLineOrSegmentId: string,
  pointPInput: string | Point2D | { x: number; y: number; id?: string; name?: string },
  customGroupId?: string
): PerpendicularLinePlan {
  // 1. VALIDATE: Line existence
  const lineObj =
    state.lines[targetLineOrSegmentId] || state.segments[targetLineOrSegmentId];

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
        errorMessage: `Точка P с id "${pointPInput}" не найдена в состоянии геометрии.`,
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

  // 4. VALIDATE: Non-degeneracy
  const distAB = distance2D(ptA, ptB);
  if (distAB < GEOMETRY_POINT_COINCIDENT_THRESHOLD) {
    return {
      success: false,
      error: 'DEGENERATE_LINE',
      errorMessage: 'Опорные точки прямой совпадают (вырожденная прямая). Построение невозможно.',
    };
  }

  // Orthogonal distance from P to infinite line AB
  const distToLine = pointToLineDistance(pointP, ptA, ptB);
  const isPointOnLine = distToLine < GEOMETRY_POINT_COINCIDENT_THRESHOLD;

  let ptP1Coords: { x: number; y: number };
  let ptP2Coords: { x: number; y: number };
  let ptQCoords: { x: number; y: number };
  let radiusC0: number;
  let radiusC1C2: number;

  if (!isPointOnLine) {
    // ----------------------------------------------------
    // CASE A: P is outside line L
    // ----------------------------------------------------
    // Constructive radius R = distToLine * sqrt(2)
    // Scale-invariant, deterministic, ensures secant intersection with chord length 2 * distToLine
    radiusC0 = distToLine * Math.SQRT2;
    radiusC1C2 = radiusC0;

    // Intersect C0(P, R) with line L
    const lineIntersections = intersectLineCircle(ptA, ptB, pointP, radiusC0, GEOMETRY_EPSILON);
    if (lineIntersections.length < 2) {
      return {
        success: false,
        error: 'PRECONDITION_FAILED',
        errorMessage: 'Вспомогательная окружность не пересекла прямую в двух точках.',
      };
    }

    ptP1Coords = lineIntersections[0];
    ptP2Coords = lineIntersections[1];

    // Intersect C1(P1, R) and C2(P2, R)
    const circleIntersections = intersectCircleCircle(
      ptP1Coords,
      radiusC1C2,
      ptP2Coords,
      radiusC1C2,
      GEOMETRY_EPSILON
    );

    if (circleIntersections.length < 2) {
      return {
        success: false,
        error: 'PRECONDITION_FAILED',
        errorMessage: 'Вспомогательные окружности не дали двух точек пересечения.',
      };
    }

    // Select Q distinct from P
    const d0 = distance2D(circleIntersections[0], pointP);
    const d1 = distance2D(circleIntersections[1], pointP);

    if (d0 >= GEOMETRY_POINT_COINCIDENT_THRESHOLD) {
      ptQCoords = circleIntersections[0];
    } else if (d1 >= GEOMETRY_POINT_COINCIDENT_THRESHOLD) {
      ptQCoords = circleIntersections[1];
    } else {
      return {
        success: false,
        error: 'PRECONDITION_FAILED',
        errorMessage: 'Не удалось найти точку Q, отличную от точки P.',
      };
    }
  } else {
    // ----------------------------------------------------
    // CASE B: P is on line L
    // ----------------------------------------------------
    // Scale derived directly from the baseline support segment AB: r0 = distAB / 2
    radiusC0 = distAB / 2;
    radiusC1C2 = distAB; // R = 2 * r0 = distAB for clear 60° equilateral intersections

    // Intersect C0(P, r0) with line L to get P1, P2 on opposite sides of P
    const lineIntersections = intersectLineCircle(ptA, ptB, pointP, radiusC0, GEOMETRY_EPSILON);
    if (lineIntersections.length < 2) {
      return {
        success: false,
        error: 'PRECONDITION_FAILED',
        errorMessage: 'Окружность с центром на прямой не пересекла прямую в двух точках.',
      };
    }

    ptP1Coords = lineIntersections[0];
    ptP2Coords = lineIntersections[1];

    // Intersect C1(P1, R) and C2(P2, R)
    const circleIntersections = intersectCircleCircle(
      ptP1Coords,
      radiusC1C2,
      ptP2Coords,
      radiusC1C2,
      GEOMETRY_EPSILON
    );

    if (circleIntersections.length < 2) {
      return {
        success: false,
        error: 'PRECONDITION_FAILED',
        errorMessage: 'Вспомогательные окружности засечек не дали двух точек пересечения.',
      };
    }

    // Deterministically select Q via canonical orientation relative to vector AB
    // Cross product: (B - A) x (Q - P) > 0 selects the point in the positive half-plane (CCW normal)
    const dxAB = ptB.x - ptA.x;
    const dyAB = ptB.y - ptA.y;

    const cross0 = dxAB * (circleIntersections[0].y - pointP.y) - dyAB * (circleIntersections[0].x - pointP.x);
    if (cross0 > 0) {
      ptQCoords = circleIntersections[0];
    } else {
      ptQCoords = circleIntersections[1];
    }
  }

  // 3. PREPARE
  const groupId =
    customGroupId || `perp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const provenance: GeometryProvenance = {
    macroType: 'perpendicular',
    sourceIds: [targetLineOrSegmentId, pointPId],
    groupId,
  };

  const circle0Id = `circ_perp_${groupId}_0`;
  const pointP1Id = `pt_perp_${groupId}_P1`;
  const pointP2Id = `pt_perp_${groupId}_P2`;
  const circle1Id = `circ_perp_${groupId}_1`;
  const circle2Id = `circ_perp_${groupId}_2`;
  const pointQId = `pt_perp_${groupId}_Q`;
  const perpendicularLineId = `line_perp_${groupId}`;

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

  // Auxiliary base circle C0 centered at P
  commands.push({
    type: 'ADD_CIRCLE',
    circle: {
      id: circle0Id,
      centerId: pointPId,
      radius: radiusC0,
      role: 'auxiliary',
      provenance,
      color: 'rgba(124, 58, 237, 0.35)',
    },
  });

  // Auxiliary point P1
  commands.push({
    type: 'ADD_POINT',
    point: {
      id: pointP1Id,
      name: 'P₁',
      x: ptP1Coords.x,
      y: ptP1Coords.y,
      role: 'auxiliary',
      provenance,
      parentIds: [circle0Id, targetLineOrSegmentId],
      color: '#8B5CF6',
    },
  });

  // Auxiliary point P2
  commands.push({
    type: 'ADD_POINT',
    point: {
      id: pointP2Id,
      name: 'P₂',
      x: ptP2Coords.x,
      y: ptP2Coords.y,
      role: 'auxiliary',
      provenance,
      parentIds: [circle0Id, targetLineOrSegmentId],
      color: '#8B5CF6',
    },
  });

  // Auxiliary circle C1 centered at P1
  commands.push({
    type: 'ADD_CIRCLE',
    circle: {
      id: circle1Id,
      centerId: pointP1Id,
      radius: radiusC1C2,
      role: 'auxiliary',
      provenance,
      color: 'rgba(124, 58, 237, 0.35)',
    },
  });

  // Auxiliary circle C2 centered at P2
  commands.push({
    type: 'ADD_CIRCLE',
    circle: {
      id: circle2Id,
      centerId: pointP2Id,
      radius: radiusC1C2,
      role: 'auxiliary',
      provenance,
      color: 'rgba(124, 58, 237, 0.35)',
    },
  });

  // Auxiliary point Q: intersection of C1 and C2
  commands.push({
    type: 'ADD_POINT',
    point: {
      id: pointQId,
      name: 'Q',
      x: ptQCoords.x,
      y: ptQCoords.y,
      role: 'auxiliary',
      provenance,
      parentIds: [circle1Id, circle2Id],
      color: '#8B5CF6',
    },
  });

  // Primary perpendicular line through P and Q
  commands.push({
    type: 'ADD_LINE',
    line: {
      id: perpendicularLineId,
      p1Id: pointPId,
      p2Id: pointQId,
      role: 'primary',
      provenance,
      color: '#0D9488', // Crisp emerald/teal line
    },
  });

  // 4. Intersections with existing segments, circles, and lines
  const previewTargetState: PreviewGeometryTargetState = {
    R: state.R,
    points: { ...state.points, [pointPId]: pointP },
    segments: state.segments,
    lines: state.lines,
    circles: state.circles,
  };

  const intersections = computePerpendicularPreviewIntersections(
    { p1: ptA, p2: ptB },
    pointP,
    previewTargetState,
    GEOMETRY_EPSILON
  );

  const intersectionPointIds: string[] = [];
  const addedCoords: Point2D[] = [pointP, ptQCoords, ptP1Coords, ptP2Coords];
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
      const intPointId = `pt_perp_${groupId}_int_${intIdx}`;
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
            macroType: 'perpendicular',
            sourceIds: [targetLineOrSegmentId, pointPId, int.targetId],
            groupId,
          },
          parentIds: [perpendicularLineId, int.targetId],
          color: '#0D9488',
        },
      });
      intIdx++;
    }
  }

  return {
    success: true,
    groupId,
    isPointOnLine,
    commands,
    createdObjectIds: {
      pointPId,
      circle0Id,
      pointP1Id,
      pointP2Id,
      circle1Id,
      circle2Id,
      pointQId,
      perpendicularLineId,
      intersectionPointIds,
    },
  };
}

/**
 * Executes atomic transaction for Perpendicular Through Point:
 * VALIDATE -> COMPUTE -> PREPARE -> COMMIT
 *
 * If validation fails, GeometryState remains strictly untouched.
 */
export function applyPerpendicularLine(
  state: FullGeometryState,
  targetLineOrSegmentId: string,
  pointPInput: string | Point2D | { x: number; y: number; id?: string; name?: string },
  customGroupId?: string
): {
  nextState: FullGeometryState;
  plan: PerpendicularLinePlan;
} {
  const plan = planPerpendicularLine(state, targetLineOrSegmentId, pointPInput, customGroupId);

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
