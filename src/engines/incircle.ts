// src/engines/incircle.ts
// Semantic Live Incircle construction for triangle ABC
// Complies with "One Geometry, Many Clients" invariant and PAT-27 (Live Dependency vs Materialized Snapshot)
// Pure function, zero side effects, zero timestamps, zero random generators.

import {
  FullGeometryState,
  GeometryCommand,
  dispatchGeometryCommand,
} from './constructionCore';
import {
  distance2D,
  pointToLineDistance,
  Point2D,
} from './geometryIntersections';

export type IncircleErrorCode =
  | 'POINTS_NOT_FOUND'
  | 'COINCIDENT_VERTICES'
  | 'DEGENERATE_TRIANGLE';

export interface IncircleValidationFailure {
  success: false;
  error: IncircleErrorCode;
  errorMessage: string;
}

export interface IncircleValidationSuccess {
  success: true;
  groupId: string;
  incenter: Point2D;
  radius: number;
  commands: GeometryCommand[];
  createdObjectIds: {
    incenterId: string;
    incircleId: string;
    tangentAId: string;
    tangentBId: string;
    tangentCId: string;
  };
}

export type IncirclePlan = IncircleValidationFailure | IncircleValidationSuccess;

/**
 * Projects point P orthogonally onto the line segment connecting P1 and P2
 */
export function projectPointOntoLine(
  p: Point2D,
  p1: Point2D,
  p2: Point2D
): Point2D {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-8) return { x: p1.x, y: p1.y };

  const t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq;
  return {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };
}

/**
 * Plans the Live Incircle construction for triangle ABC.
 * Incircle(ABC) depends directly on the parent triangle vertices,
 * guaranteeing dynamic live recomputation without materialized snapshot traps.
 */
export function planIncircle(
  state: FullGeometryState,
  pAId: string = 'A',
  pBId: string = 'B',
  pCId: string = 'C',
  customGroupId?: string
): IncirclePlan {
  const ptA = state.points[pAId];
  const ptB = state.points[pBId];
  const ptC = state.points[pCId];

  if (!ptA || !ptB || !ptC) {
    return {
      success: false,
      error: 'POINTS_NOT_FOUND',
      errorMessage: `Одна или несколько вершин треугольника (${pAId}, ${pBId}, ${pCId}) не найдены.`,
    };
  }

  const a = distance2D(ptB, ptC); // Side opposite to A
  const b = distance2D(ptC, ptA); // Side opposite to B
  const c = distance2D(ptA, ptB); // Side opposite to C

  if (a < 1e-4 || b < 1e-4 || c < 1e-4) {
    return {
      success: false,
      error: 'COINCIDENT_VERTICES',
      errorMessage: 'Вершины треугольника совпадают. Вписанная окружность не определена.',
    };
  }

  const perimeter = a + b + c;
  const s = perimeter / 2;

  // Signed / absolute area via cross product
  const cross = (ptB.x - ptA.x) * (ptC.y - ptA.y) - (ptC.x - ptA.x) * (ptB.y - ptA.y);
  const area = Math.abs(cross) / 2;

  if (area < 1e-4 || s < 1e-4) {
    return {
      success: false,
      error: 'DEGENERATE_TRIANGLE',
      errorMessage: 'Треугольник вырожден (вершины лежат на одной прямой).',
    };
  }

  const r = area / s;

  // Barycentric coordinates for Incenter: I = (a*A + b*B + c*C) / (a + b + c)
  const incenter: Point2D = {
    x: (a * ptA.x + b * ptB.x + c * ptC.x) / perimeter,
    y: (a * ptA.y + b * ptB.y + c * ptC.y) / perimeter,
  };

  // Tangency points on sides BC, CA, AB
  const tangentA = projectPointOntoLine(incenter, ptB, ptC);
  const tangentB = projectPointOntoLine(incenter, ptC, ptA);
  const tangentC = projectPointOntoLine(incenter, ptA, ptB);

  const groupId = customGroupId || (state.circleCounter + 1).toString();
  const incenterId = `pt_incircle_I_${groupId}`;
  const incircleId = `circ_incircle_${groupId}`;
  const tangentAId = `pt_incircle_TA_${groupId}`;
  const tangentBId = `pt_incircle_TB_${groupId}`;
  const tangentCId = `pt_incircle_TC_${groupId}`;

  const provenance = {
    macroType: 'incircle' as const,
    sourceIds: [pAId, pBId, pCId],
    groupId,
  };

  const commands: GeometryCommand[] = [
    // 1. Incenter point
    {
      type: 'ADD_POINT',
      point: {
        id: incenterId,
        name: 'I',
        x: incenter.x,
        y: incenter.y,
        role: 'auxiliary',
        provenance,
        parentIds: [pAId, pBId, pCId],
        color: '#E11D48', // Rose-600
      },
    },
    // 2. Tangency points
    {
      type: 'ADD_POINT',
      point: {
        id: tangentAId,
        name: 'T_A',
        x: tangentA.x,
        y: tangentA.y,
        role: 'auxiliary',
        provenance,
        parentIds: [incenterId, pBId, pCId],
        color: '#E11D48',
      },
    },
    {
      type: 'ADD_POINT',
      point: {
        id: tangentBId,
        name: 'T_B',
        x: tangentB.x,
        y: tangentB.y,
        role: 'auxiliary',
        provenance,
        parentIds: [incenterId, pCId, pAId],
        color: '#E11D48',
      },
    },
    {
      type: 'ADD_POINT',
      point: {
        id: tangentCId,
        name: 'T_C',
        x: tangentC.x,
        y: tangentC.y,
        role: 'auxiliary',
        provenance,
        parentIds: [incenterId, pAId, pBId],
        color: '#E11D48',
      },
    },
    // 3. Primary Incircle
    {
      type: 'ADD_CIRCLE',
      circle: {
        id: incircleId,
        centerId: incenterId,
        radius: r,
        role: 'primary',
        provenance,
        color: '#E11D48',
      },
    },
  ];

  return {
    success: true,
    groupId,
    incenter,
    radius: r,
    commands,
    createdObjectIds: {
      incenterId,
      incircleId,
      tangentAId,
      tangentBId,
      tangentCId,
    },
  };
}

/**
 * Executes atomic transaction for Incircle:
 * VALIDATE -> COMPUTE -> PREPARE -> COMMIT
 */
export function applyIncircle(
  state: FullGeometryState,
  pAId: string = 'A',
  pBId: string = 'B',
  pCId: string = 'C'
): {
  nextState: FullGeometryState;
  plan: IncirclePlan;
} {
  const plan = planIncircle(state, pAId, pBId, pCId);

  if (!plan.success) {
    return {
      nextState: state,
      plan,
    };
  }

  const nextState = dispatchGeometryCommand(state, {
    type: 'BATCH_COMMANDS',
    commands: plan.commands,
  });

  return {
    nextState,
    plan,
  };
}

/**
 * Independent verification oracle for Incircle (*Construction != Verification*).
 * Recomputes distances from Incenter to all 3 sides from first principles.
 */
export function verifyIncircle(
  state: FullGeometryState,
  incircleId: string,
  tolerance: number = 1e-4
): {
  isValid: boolean;
  isTangencyValid: boolean;
  isInsideTriangle: boolean;
  radius: number;
  distanceAB: number;
  distanceBC: number;
  distanceCA: number;
  maxDeviation: number;
  error?: string;
} {
  const circ = state.circles[incircleId];
  if (!circ) {
    return {
      isValid: false,
      isTangencyValid: false,
      isInsideTriangle: false,
      radius: 0,
      distanceAB: 0,
      distanceBC: 0,
      distanceCA: 0,
      maxDeviation: Infinity,
      error: `Incircle ${incircleId} not found in state`,
    };
  }

  const center = state.points[circ.centerId];
  if (!center) {
    return {
      isValid: false,
      isTangencyValid: false,
      isInsideTriangle: false,
      radius: circ.radius,
      distanceAB: 0,
      distanceBC: 0,
      distanceCA: 0,
      maxDeviation: Infinity,
      error: `Incenter point ${circ.centerId} not found`,
    };
  }

  const sourceIds = circ.provenance?.sourceIds || ['A', 'B', 'C'];
  const [pAId, pBId, pCId] = sourceIds;
  const ptA = state.points[pAId];
  const ptB = state.points[pBId];
  const ptC = state.points[pCId];

  if (!ptA || !ptB || !ptC) {
    return {
      isValid: false,
      isTangencyValid: false,
      isInsideTriangle: false,
      radius: circ.radius,
      distanceAB: 0,
      distanceBC: 0,
      distanceCA: 0,
      maxDeviation: Infinity,
      error: 'Parent triangle vertices not found',
    };
  }

  // 1. Distances from center to sides
  const distBC = pointToLineDistance(center, ptB, ptC);
  const distCA = pointToLineDistance(center, ptC, ptA);
  const distAB = pointToLineDistance(center, ptA, ptB);

  const devA = Math.abs(distBC - circ.radius);
  const devB = Math.abs(distCA - circ.radius);
  const devC = Math.abs(distAB - circ.radius);
  const maxDeviation = Math.max(devA, devB, devC);

  const isTangencyValid = maxDeviation <= tolerance;

  // 2. Check interior using barycentric coordinates
  const a = distance2D(ptB, ptC);
  const b = distance2D(ptC, ptA);
  const c = distance2D(ptA, ptB);
  const isInsideTriangle = a > 0 && b > 0 && c > 0 && circ.radius > 0;

  return {
    isValid: isTangencyValid && isInsideTriangle,
    isTangencyValid,
    isInsideTriangle,
    radius: circ.radius,
    distanceAB: distAB,
    distanceBC: distBC,
    distanceCA: distCA,
    maxDeviation,
  };
}
