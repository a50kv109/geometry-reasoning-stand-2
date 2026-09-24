// src/engines/perpendicularBisector.ts
// Classical Euclidean construction of a Perpendicular Bisector
// Complies with "One Geometry, Many Clients" invariant.
// Transactional lifecycle: VALIDATE -> COMPUTE -> PREPARE -> COMMIT

import {
  FullGeometryState,
  GeometryCommand,
  GeometryProvenance,
  dispatchGeometryCommand,
} from './constructionCore';
import { intersectCircleCircle } from './geometryIntersections';

export type PerpendicularBisectorErrorCode =
  | 'POINTS_COINCIDENT'
  | 'POINT_NOT_FOUND'
  | 'INVALID_PRECONDITION';

export interface PerpendicularBisectorValidationFailure {
  success: false;
  error: PerpendicularBisectorErrorCode;
  errorMessage: string;
}

export interface PerpendicularBisectorValidationSuccess {
  success: true;
  groupId: string;
  commands: GeometryCommand[];
  createdObjectIds: {
    circleAId: string;
    circleBId: string;
    intersection1Id: string;
    intersection2Id: string;
    bisectorLineId: string;
  };
}

export type PerpendicularBisectorPlan =
  | PerpendicularBisectorValidationFailure
  | PerpendicularBisectorValidationSuccess;

/**
 * Plans the classical Euclidean perpendicular bisector construction:
 * 1. VALIDATE: Ensure points A and B exist and are non-coincident.
 * 2. COMPUTE: Calculate two intersection points of circles C(A, |AB|) and C(B, |BA|).
 * 3. PREPARE: Generate atomic commands with role, provenance, and dependencies.
 *
 * Does NOT mutate GeometryState. Returns pure plan.
 */
export function planPerpendicularBisector(
  state: FullGeometryState,
  pAId: string,
  pBId: string,
  customGroupId?: string
): PerpendicularBisectorPlan {
  // 1. VALIDATE
  const ptA = state.points[pAId];
  const ptB = state.points[pBId];

  if (!ptA || !ptB) {
    return {
      success: false,
      error: 'POINT_NOT_FOUND',
      errorMessage: `Одна или обе точки (${pAId}, ${pBId}) не найдены в состоянии геометрии.`,
    };
  }

  const dx = ptB.x - ptA.x;
  const dy = ptB.y - ptA.y;
  const distAB = Math.hypot(dx, dy);

  if (pAId === pBId || distAB < 1e-4) {
    return {
      success: false,
      error: 'POINTS_COINCIDENT',
      errorMessage: 'Точки A и B совпадают. Серединный перпендикуляр не определен.',
    };
  }

  // 2. COMPUTE
  // Intersect Circle(A, distAB) and Circle(B, distAB)
  const intersections = intersectCircleCircle(
    { x: ptA.x, y: ptA.y },
    distAB,
    { x: ptB.x, y: ptB.y },
    distAB
  );

  if (intersections.length < 2) {
    return {
      success: false,
      error: 'INVALID_PRECONDITION',
      errorMessage: 'Не удалось определить две точки пересечения вспомогательных окружностей.',
    };
  }

  const [int1, int2] = intersections;

  // 3. PREPARE
  const groupId =
    customGroupId || `pb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const provenance: GeometryProvenance = {
    macroType: 'perpendicular_bisector',
    sourceIds: [pAId, pBId],
    groupId,
  };

  const circleAId = `circ_pb_${groupId}_A`;
  const circleBId = `circ_pb_${groupId}_B`;
  const intersection1Id = `pt_pb_${groupId}_1`;
  const intersection2Id = `pt_pb_${groupId}_2`;
  const bisectorLineId = `line_pb_${groupId}`;

  const commands: GeometryCommand[] = [
    // Step 3a: Auxiliary Circle centered at A with radius AB
    {
      type: 'ADD_CIRCLE',
      circle: {
        id: circleAId,
        centerId: pAId,
        radiusPointId: pBId,
        radius: distAB,
        role: 'auxiliary',
        provenance,
        color: 'rgba(124, 58, 237, 0.40)', // Muted purple auxiliary arc
      },
    },
    // Step 3b: Auxiliary Circle centered at B with radius BA
    {
      type: 'ADD_CIRCLE',
      circle: {
        id: circleBId,
        centerId: pBId,
        radiusPointId: pAId,
        radius: distAB,
        role: 'auxiliary',
        provenance,
        color: 'rgba(124, 58, 237, 0.40)', // Muted purple auxiliary arc
      },
    },
    // Step 4a: First intersection point
    {
      type: 'ADD_POINT',
      point: {
        id: intersection1Id,
        name: `I₁`,
        x: int1.x,
        y: int1.y,
        role: 'auxiliary',
        provenance,
        parentIds: [circleAId, circleBId],
        color: '#8B5CF6',
      },
    },
    // Step 4b: Second intersection point
    {
      type: 'ADD_POINT',
      point: {
        id: intersection2Id,
        name: `I₂`,
        x: int2.x,
        y: int2.y,
        role: 'auxiliary',
        provenance,
        parentIds: [circleAId, circleBId],
        color: '#8B5CF6',
      },
    },
    // Step 5: Primary infinite line through intersection points (The Perpendicular Bisector)
    {
      type: 'ADD_LINE',
      line: {
        id: bisectorLineId,
        p1Id: intersection1Id,
        p2Id: intersection2Id,
        role: 'primary',
        provenance,
        color: '#0D9488', // Teal-600 prominent result line
      },
    },
  ];

  return {
    success: true,
    groupId,
    commands,
    createdObjectIds: {
      circleAId,
      circleBId,
      intersection1Id,
      intersection2Id,
      bisectorLineId,
    },
  };
}

/**
 * Executes atomic transaction:
 * VALIDATE -> COMPUTE -> PREPARE -> COMMIT
 *
 * If validation fails, GeometryState remains strictly unchanged.
 */
export function applyPerpendicularBisector(
  state: FullGeometryState,
  pAId: string,
  pBId: string
): {
  nextState: FullGeometryState;
  plan: PerpendicularBisectorPlan;
} {
  const plan = planPerpendicularBisector(state, pAId, pBId);

  if (!plan.success) {
    return {
      nextState: state, // Strictly unchanged reference
      plan,
    };
  }

  // 4. COMMIT via batch reduction
  const nextState = dispatchGeometryCommand(state, {
    type: 'BATCH_COMMANDS',
    commands: plan.commands,
  });

  return {
    nextState,
    plan,
  };
}
