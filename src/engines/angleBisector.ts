// src/engines/angleBisector.ts
// Classical Euclidean construction of an Internal Angle Bisector for angle AVB (V is the vertex)
// Complies with "One Geometry, Many Clients" invariant.
// Transactional lifecycle: VALIDATE -> COMPUTE -> PREPARE -> COMMIT

import {
  FullGeometryState,
  GeometryCommand,
  GeometryProvenance,
  dispatchGeometryCommand,
} from './constructionCore';
import {
  intersectCircleCircle,
  distance2D,
  computeAngleBisectorPreviewIntersections,
  PreviewGeometryTargetState,
  GEOMETRY_EPSILON,
  GEOMETRY_POINT_COINCIDENT_THRESHOLD,
  Point2D,
} from './geometryIntersections';

export type AngleBisectorErrorCode =
  | 'POINT_NOT_FOUND'
  | 'COINCIDENT_VERTEX'
  | 'DEGENERATE_ANGLE'
  | 'PRECONDITION_FAILED';

export interface AngleBisectorValidationFailure {
  success: false;
  error: AngleBisectorErrorCode;
  errorMessage: string;
}

export interface AngleBisectorValidationSuccess {
  success: true;
  groupId: string;
  commands: GeometryCommand[];
  createdObjectIds: {
    circle0Id: string;
    pointP1Id: string;
    pointP2Id: string;
    circle1Id: string;
    circle2Id: string;
    pointQId: string;
    bisectorLineId: string;
    intersectionPointIds?: string[];
  };
}

export type AngleBisectorPlan =
  | AngleBisectorValidationFailure
  | AngleBisectorValidationSuccess;

/**
 * Plans the classical Euclidean angle bisector construction for angle AVB (vertex V):
 * 1. VALIDATE: Points exist, A != V, B != V, angle != 0 deg and != 180 deg (non-collinear).
 * 2. COMPUTE:
 *    R = min(|VA|, |VB|)
 *    C0 = Circle(V, R)
 *    P1 on ray VA at dist R
 *    P2 on ray VB at dist R
 *    C1 = Circle(P1, R), C2 = Circle(P2, R)
 *    Intersection of C1 and C2 gives V and Q. Q is chosen as the point != V.
 * 3. PREPARE: Atomic commands with auxiliary and primary roles, provenance, parentIds.
 *
 * Pure function: does NOT mutate state.
 */
export function planAngleBisector(
  state: FullGeometryState,
  pAId: string,
  pVId: string,
  pBId: string,
  customGroupId?: string
): AngleBisectorPlan {
  // 1. VALIDATE
  const ptA = state.points[pAId];
  const ptV = state.points[pVId];
  const ptB = state.points[pBId];

  if (!ptA || !ptV || !ptB) {
    return {
      success: false,
      error: 'POINT_NOT_FOUND',
      errorMessage: `Одна или несколько точек (${pAId}, ${pVId}, ${pBId}) не найдены в состоянии геометрии.`,
    };
  }

  const distVA = distance2D(ptV, ptA);
  const distVB = distance2D(ptV, ptB);

  if (pAId === pVId || distVA < 1e-4) {
    return {
      success: false,
      error: 'COINCIDENT_VERTEX',
      errorMessage: 'Точка A совпадает с вершиной V. Угол не определен.',
    };
  }

  if (pBId === pVId || distVB < 1e-4) {
    return {
      success: false,
      error: 'COINCIDENT_VERTEX',
      errorMessage: 'Точка B совпадает с вершиной V. Угол не определен.',
    };
  }

  // Direction vectors
  const uVA = { x: (ptA.x - ptV.x) / distVA, y: (ptA.y - ptV.y) / distVA };
  const uVB = { x: (ptB.x - ptV.x) / distVB, y: (ptB.y - ptV.y) / distVB };

  const dot = uVA.x * uVB.x + uVA.y * uVB.y;
  const cross = uVA.x * uVB.y - uVA.y * uVB.x;

  // Check collinearity (0 deg or 180 deg)
  // dot close to +1 => 0 deg (same direction)
  // dot close to -1 => 180 deg (opposite directions)
  if (Math.abs(cross) < 1e-4) {
    if (dot > 0.9999) {
      return {
        success: false,
        error: 'DEGENERATE_ANGLE',
        errorMessage: 'Стороны угла совпадают (угол 0°). Внутренняя биссектриса не определена.',
      };
    } else if (dot < -0.9999) {
      return {
        success: false,
        error: 'PRECONDITION_FAILED',
        errorMessage: 'Стороны угла противоположны (развёрнутый угол 180°). Классическая внутренняя биссектриса не определена.',
      };
    }
  }

  // 2. COMPUTE
  const R = Math.min(distVA, distVB);

  // P1 on ray VA at distance R from V
  const ptP1Coords = {
    x: ptV.x + uVA.x * R,
    y: ptV.y + uVA.y * R,
  };

  // P2 on ray VB at distance R from V
  const ptP2Coords = {
    x: ptV.x + uVB.x * R,
    y: ptV.y + uVB.y * R,
  };

  // Intersect C1(P1, R) and C2(P2, R)
  const intersections = intersectCircleCircle(ptP1Coords, R, ptP2Coords, R);

  if (intersections.length < 2) {
    return {
      success: false,
      error: 'PRECONDITION_FAILED',
      errorMessage: 'Не удалось найти две точки пересечения вспомогательных окружностей.',
    };
  }

  // Find Q != V
  const dist0 = distance2D(intersections[0], ptV);
  const dist1 = distance2D(intersections[1], ptV);

  let ptQCoords = intersections[0];
  if (dist0 < 1e-4) {
    ptQCoords = intersections[1];
  } else if (dist1 < 1e-4) {
    ptQCoords = intersections[0];
  } else {
    // If neither is exactly V, pick the one furthest from V
    ptQCoords = dist0 > dist1 ? intersections[0] : intersections[1];
  }

  const distVQ = distance2D(ptV, ptQCoords);
  if (distVQ < 1e-4) {
    return {
      success: false,
      error: 'PRECONDITION_FAILED',
      errorMessage: 'Точка Q выродилась в вершину V.',
    };
  }

  // 3. PREPARE
  const groupId =
    customGroupId || `ab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const provenance: GeometryProvenance = {
    macroType: 'angle_bisector',
    sourceIds: [pAId, pVId, pBId],
    groupId,
  };

  const circle0Id = `circ_ab_${groupId}_0`;
  const pointP1Id = `pt_ab_${groupId}_P1`;
  const pointP2Id = `pt_ab_${groupId}_P2`;
  const circle1Id = `circ_ab_${groupId}_1`;
  const circle2Id = `circ_ab_${groupId}_2`;
  const pointQId = `pt_ab_${groupId}_Q`;
  const bisectorLineId = `line_ab_${groupId}`;

  const commands: GeometryCommand[] = [
    // Auxiliary base arc C0 centered at V with radius R
    {
      type: 'ADD_CIRCLE',
      circle: {
        id: circle0Id,
        centerId: pVId,
        radius: R,
        role: 'auxiliary',
        provenance,
        color: 'rgba(124, 58, 237, 0.35)',
      },
    },
    // Auxiliary point P1 on ray VA
    {
      type: 'ADD_POINT',
      point: {
        id: pointP1Id,
        name: `P₁`,
        x: ptP1Coords.x,
        y: ptP1Coords.y,
        role: 'auxiliary',
        provenance,
        parentIds: [circle0Id],
        color: '#8B5CF6',
      },
    },
    // Auxiliary point P2 on ray VB
    {
      type: 'ADD_POINT',
      point: {
        id: pointP2Id,
        name: `P₂`,
        x: ptP2Coords.x,
        y: ptP2Coords.y,
        role: 'auxiliary',
        provenance,
        parentIds: [circle0Id],
        color: '#8B5CF6',
      },
    },
    // Auxiliary circle C1 centered at P1 with radius R
    {
      type: 'ADD_CIRCLE',
      circle: {
        id: circle1Id,
        centerId: pointP1Id,
        radius: R,
        role: 'auxiliary',
        provenance,
        color: 'rgba(124, 58, 237, 0.35)',
      },
    },
    // Auxiliary circle C2 centered at P2 with radius R
    {
      type: 'ADD_CIRCLE',
      circle: {
        id: circle2Id,
        centerId: pointP2Id,
        radius: R,
        role: 'auxiliary',
        provenance,
        color: 'rgba(124, 58, 237, 0.35)',
      },
    },
    // Auxiliary point Q: intersection of C1 and C2 != V
    {
      type: 'ADD_POINT',
      point: {
        id: pointQId,
        name: `Q`,
        x: ptQCoords.x,
        y: ptQCoords.y,
        role: 'auxiliary',
        provenance,
        parentIds: [circle1Id, circle2Id],
        color: '#8B5CF6',
      },
    },
    // Primary bisector ray/line through V and Q
    {
      type: 'ADD_LINE',
      line: {
        id: bisectorLineId,
        p1Id: pVId,
        p2Id: pointQId,
        role: 'primary',
        provenance,
        color: '#0D9488', // Crisp teal-600 line
      },
    },
  ];

  // 4. Intersections with existing segments, circles, and lines
  const previewTargetState: PreviewGeometryTargetState = {
    R: state.R,
    points: {
      ...state.points,
      [pointP1Id]: { x: ptP1Coords.x, y: ptP1Coords.y },
      [pointP2Id]: { x: ptP2Coords.x, y: ptP2Coords.y },
      [pointQId]: { x: ptQCoords.x, y: ptQCoords.y },
    },
    segments: state.segments,
    lines: state.lines,
    circles: state.circles,
  };

  const rawIntersections = computeAngleBisectorPreviewIntersections(
    ptV,
    ptQCoords,
    previewTargetState,
    GEOMETRY_EPSILON
  );

  const intersectionPointIds: string[] = [];
  const addedCoords: Point2D[] = [ptV, ptQCoords, ptP1Coords, ptP2Coords];
  // Also consider existing points in state so we never create duplicates of existing points
  for (const ep of Object.values(state.points)) {
    addedCoords.push(ep);
  }

  let intIdx = 1;
  for (const int of rawIntersections) {
    const isDuplicate = addedCoords.some(
      (c) => distance2D(int, c) <= GEOMETRY_POINT_COINCIDENT_THRESHOLD
    );

    if (!isDuplicate) {
      addedCoords.push(int);
      const intPointId = `pt_ab_${groupId}_int_${intIdx}`;
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
            macroType: 'angle_bisector',
            sourceIds: [pAId, pVId, pBId, int.targetId],
            groupId,
          },
          parentIds: [bisectorLineId, int.targetId],
          color: '#0D9488',
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
      circle0Id,
      pointP1Id,
      pointP2Id,
      circle1Id,
      circle2Id,
      pointQId,
      bisectorLineId,
      intersectionPointIds,
    },
  };
}

/**
 * Executes atomic transaction for Angle Bisector:
 * VALIDATE -> COMPUTE -> PREPARE -> COMMIT
 *
 * If validation fails, GeometryState remains strictly untouched.
 */
export function applyAngleBisector(
  state: FullGeometryState,
  pAId: string,
  pVId: string,
  pBId: string
): {
  nextState: FullGeometryState;
  plan: AngleBisectorPlan;
} {
  const plan = planAngleBisector(state, pAId, pVId, pBId);

  if (!plan.success) {
    return {
      nextState: state, // Strictly unchanged reference
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

export interface AngleBisectorTargetDescriptor {
  targetId: string; // The vertex point ID (e.g. 'A', 'B', 'C', 'P1')
  vertexPointId: string;
  arm1PointId: string;
  arm2PointId: string;
  vertexName: string;
  arm1Name: string;
  arm2Name: string;
  angleDeg: number;
  label: string;
}

/**
 * Discovers all valid angle vertices in the current GeometryState for which
 * the classical Euclidean Angle Bisector construction satisfies all preconditions.
 *
 * "One Geometry, Many Clients":
 * - Pure transient function.
 * - Directly evaluates existing planAngleBisector preconditions.
 * - Does NOT mutate GeometryState.
 */
export function getValidAngleBisectorTargets(
  state: FullGeometryState
): AngleBisectorTargetDescriptor[] {
  const targets: AngleBisectorTargetDescriptor[] = [];
  const processedVertices = new Set<string>();

  // Iterate over all points (prioritize base vertices A, B, C for stable display order)
  const pointIds = Object.keys(state.points).sort((a, b) => {
    const order: Record<string, number> = { A: 1, B: 2, C: 3 };
    const rankA = order[a] ?? 10;
    const rankB = order[b] ?? 10;
    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b);
  });

  for (const pId of pointIds) {
    if (pId === 'O') continue;
    const pt = state.points[pId];
    if (!pt) continue;

    // Collect connected neighbor endpoints from segments
    const neighbors: string[] = [];
    for (const seg of Object.values(state.segments)) {
      if (seg.p1Id === pId && seg.p2Id !== pId && state.points[seg.p2Id]) {
        if (!neighbors.includes(seg.p2Id)) neighbors.push(seg.p2Id);
      } else if (seg.p2Id === pId && seg.p1Id !== pId && state.points[seg.p1Id]) {
        if (!neighbors.includes(seg.p1Id)) neighbors.push(seg.p1Id);
      }
    }

    if (neighbors.length >= 2) {
      // Test neighbor pairs
      let foundValid = false;
      for (let i = 0; i < neighbors.length && !foundValid; i++) {
        for (let j = i + 1; j < neighbors.length && !foundValid; j++) {
          const arm1 = neighbors[i];
          const arm2 = neighbors[j];
          const plan = planAngleBisector(state, arm1, pId, arm2);
          if (plan.success) {
            const ptA = state.points[arm1];
            const ptB = state.points[arm2];
            const vA = { x: ptA.x - pt.x, y: ptA.y - pt.y };
            const vB = { x: ptB.x - pt.x, y: ptB.y - pt.y };
            const dot = vA.x * vB.x + vA.y * vB.y;
            const magA = Math.hypot(vA.x, vA.y);
            const magB = Math.hypot(vB.x, vB.y);
            const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)));
            const angleDeg = (Math.acos(cosAngle) * 180) / Math.PI;

            targets.push({
              targetId: pId,
              vertexPointId: pId,
              arm1PointId: arm1,
              arm2PointId: arm2,
              vertexName: pt.name || pId,
              arm1Name: ptA.name || arm1,
              arm2Name: ptB.name || arm2,
              angleDeg: Math.round(angleDeg * 10) / 10,
              label: `Угол ${pt.name || pId} (${ptA.name || arm1}${pt.name || pId}${ptB.name || arm2})`,
            });
            foundValid = true;
          }
        }
      }
    }
  }

  return targets;
}
