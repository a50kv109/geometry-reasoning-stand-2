// src/engines/geometryIntersections.ts
// Pure analytical 2D geometry functions (Euclidean geometry)
// Complies with "One Geometry, Many Clients" invariant. Pure functions, no state, no side effects.

// Centralized geometry tolerance policy
export const GEOMETRY_EPSILON = 1e-6;
export const GEOMETRY_POINT_COINCIDENT_THRESHOLD = 1e-4;

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Computes Euclidean distance between two 2D points.
 */
export function distance2D(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Computes mid-point between two 2D points.
 */
export function midpoint2D(p1: Point2D, p2: Point2D): Point2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Computes intersection points of two circles in 2D Euclidean space.
 * Circle 1: center c1, radius r1
 * Circle 2: center c2, radius r2
 *
 * Returns array of 0, 1, or 2 intersection points.
 * Order of 2 points is deterministic:
 * p[0] is in the positive normal direction (left of vector c1->c2),
 * p[1] is in the negative normal direction (right of vector c1->c2).
 */
export function intersectCircleCircle(
  c1: Point2D,
  r1: number,
  c2: Point2D,
  r2: number,
  epsilon: number = 1e-6
): Point2D[] {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);

  // Concentric circles or degenerate center distance
  if (d < epsilon) {
    return [];
  }

  // Circles are too far apart (no intersection)
  if (d > r1 + r2 + epsilon) {
    return [];
  }

  // One circle is completely contained within the other without touching
  if (d < Math.abs(r1 - r2) - epsilon) {
    return [];
  }

  // Distance from c1 to the chord connecting intersection points
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);

  // Half-chord length squared
  const h2 = r1 * r1 - a * a;

  if (h2 < -epsilon) {
    return [];
  }

  const h = h2 <= 0 ? 0 : Math.sqrt(h2);

  // Base point on center-line
  const p0x = c1.x + (a / d) * dx;
  const p0y = c1.y + (a / d) * dy;

  // Single tangent point
  if (h < epsilon) {
    return [{ x: p0x, y: p0y }];
  }

  // Unit normal vector perpendicular to c1->c2 (rotated 90 degrees CCW: (-dy/d, dx/d))
  const rx = -dy / d;
  const ry = dx / d;

  return [
    {
      x: p0x + h * rx,
      y: p0y + h * ry,
    },
    {
      x: p0x - h * rx,
      y: p0y - h * ry,
    },
  ];
}

/**
 * Computes orthogonal distance from point P to infinite line passing through lineA and lineB.
 */
export function pointToLineDistance(p: Point2D, lineA: Point2D, lineB: Point2D): number {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const len = Math.hypot(dx, dy);
  if (len < GEOMETRY_EPSILON) {
    return distance2D(p, lineA);
  }
  return Math.abs(dx * (lineA.y - p.y) - (lineA.x - p.x) * dy) / len;
}

/**
 * Computes orthogonal projection of point P onto infinite line passing through lineA and lineB.
 */
export function projectPointToLine(p: Point2D, lineA: Point2D, lineB: Point2D): Point2D {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < GEOMETRY_EPSILON) {
    return { x: lineA.x, y: lineA.y };
  }
  const t = ((p.x - lineA.x) * dx + (p.y - lineA.y) * dy) / lenSq;
  return {
    x: lineA.x + t * dx,
    y: lineA.y + t * dy,
  };
}

/**
 * Computes intersection of infinite line through lineA and lineB with circle C(center, radius).
 * Returns:
 * - [] if no intersection (distance > radius + epsilon)
 * - [P] if tangent (distance close to radius)
 * - [P1, P2] if secant (distance < radius - epsilon)
 *
 * The order of points [P1, P2] is directed along lineA -> lineB.
 */
export function intersectLineCircle(
  lineA: Point2D,
  lineB: Point2D,
  center: Point2D,
  radius: number,
  epsilon: number = GEOMETRY_EPSILON
): Point2D[] {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const lineLen = Math.hypot(dx, dy);

  if (lineLen < epsilon || radius < epsilon) {
    return [];
  }

  // Orthogonal projection of circle center onto line
  const H = projectPointToLine(center, lineA, lineB);
  const dist = distance2D(center, H);

  // Line does not intersect circle
  if (dist > radius + epsilon) {
    return [];
  }

  // Tangent line
  if (Math.abs(dist - radius) <= epsilon) {
    return [H];
  }

  // Secant line: compute half-chord length
  const halfChord = Math.sqrt(Math.max(0, radius * radius - dist * dist));
  const ux = dx / lineLen;
  const uy = dy / lineLen;

  return [
    {
      x: H.x - ux * halfChord,
      y: H.y - uy * halfChord,
    },
    {
      x: H.x + ux * halfChord,
      y: H.y + uy * halfChord,
    },
  ];
}

/**
 * Computes intersection of infinite line (lineA, lineB) with finite line segment [segA, segB].
 * Returns Point2D if intersection exists on segment within [0, 1] parameter range, otherwise null.
 */
export function intersectLineSegment(
  lineA: Point2D,
  lineB: Point2D,
  segA: Point2D,
  segB: Point2D,
  epsilon: number = GEOMETRY_EPSILON
): Point2D | null {
  const dxLine = lineB.x - lineA.x;
  const dyLine = lineB.y - lineA.y;
  const dxSeg = segB.x - segA.x;
  const dySeg = segB.y - segA.y;

  const denom = dxLine * dySeg - dyLine * dxSeg;
  if (Math.abs(denom) < epsilon) {
    // Line and segment are parallel or collinear
    return null;
  }

  const dxP = segA.x - lineA.x;
  const dyP = segA.y - lineA.y;

  // Parameter t along the segment [0, 1]
  const t = (dxLine * dyP - dyLine * dxP) / -denom;

  if (t < -epsilon || t > 1 + epsilon) {
    return null;
  }

  const tClamped = Math.max(0, Math.min(1, t));
  return {
    x: segA.x + tClamped * dxSeg,
    y: segA.y + tClamped * dySeg,
  };
}

/**
 * Computes intersection point of two infinite 2D lines (line1A->line1B) and (line2A->line2B).
 * Returns Point2D if lines intersect, or null if parallel / collinear.
 */
export function intersectLineLine(
  line1A: Point2D,
  line1B: Point2D,
  line2A: Point2D,
  line2B: Point2D,
  epsilon: number = GEOMETRY_EPSILON
): Point2D | null {
  const dx1 = line1B.x - line1A.x;
  const dy1 = line1B.y - line1A.y;
  const dx2 = line2B.x - line2A.x;
  const dy2 = line2B.y - line2A.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < epsilon) {
    return null;
  }

  const dxP = line2A.x - line1A.x;
  const dyP = line2A.y - line1A.y;

  const t = (dx1 * dyP - dy1 * dxP) / -denom;

  return {
    x: line2A.x + t * dx2,
    y: line2A.y + t * dy2,
  };
}

export interface TransientIntersectionPoint {
  x: number;
  y: number;
  targetType: 'segment' | 'circle' | 'line';
  targetId: string;
  targetName?: string;
  isTangent?: boolean;
}

export interface ParallelPreviewGeometryTargetState {
  R?: number;
  points: Record<string, { x: number; y: number; name?: string; isBaseVertex?: boolean }>;
  segments: Record<string, { p1Id: string; p2Id: string; isBaseChord?: boolean; id: string }>;
  lines: Record<string, { p1Id: string; p2Id: string; id: string }>;
  circles: Record<string, { centerId: string; radius: number; isBaseCircumcircle?: boolean; id: string }>;
}

export type PreviewGeometryTargetState = ParallelPreviewGeometryTargetState;

/**
 * Pure function: computes all transient intersection points for a parallel line preview
 * passing through previewPoint with direction matching referenceLineOrSegment.
 *
 * Invariant: Does NOT mutate GeometryState, zero side effects.
 */
export function computeParallelPreviewIntersections(
  referenceLineOrSegment: { p1: Point2D; p2: Point2D },
  previewPoint: Point2D,
  geometryState: ParallelPreviewGeometryTargetState,
  epsilon: number = GEOMETRY_EPSILON
): TransientIntersectionPoint[] {
  const dirX = referenceLineOrSegment.p2.x - referenceLineOrSegment.p1.x;
  const dirY = referenceLineOrSegment.p2.y - referenceLineOrSegment.p1.y;
  const len = Math.hypot(dirX, dirY);

  if (len < epsilon) {
    return [];
  }

  const lineP1 = previewPoint;
  const lineP2 = { x: previewPoint.x + dirX, y: previewPoint.y + dirY };

  const results: TransientIntersectionPoint[] = [];

  const isCoincidentWithExisting = (pt: Point2D): boolean => {
    return results.some((existing) => distance2D(existing, pt) < GEOMETRY_POINT_COINCIDENT_THRESHOLD);
  };

  // 1. Intersect with segments (triangle sides and auxiliary segments)
  for (const seg of Object.values(geometryState.segments)) {
    const pt1 = geometryState.points[seg.p1Id];
    const pt2 = geometryState.points[seg.p2Id];
    if (!pt1 || !pt2) continue;

    const intPt = intersectLineSegment(lineP1, lineP2, pt1, pt2, epsilon);
    if (intPt && !isCoincidentWithExisting(intPt)) {
      const segName = seg.isBaseChord
        ? `Сторона ${pt1.name || seg.p1Id}${pt2.name || seg.p2Id}`
        : `Отрезок [${pt1.name || seg.p1Id}${pt2.name || seg.p2Id}]`;
      results.push({
        x: intPt.x,
        y: intPt.y,
        targetType: 'segment',
        targetId: seg.id,
        targetName: segName,
      });
    }
  }

  // 2. Intersect with circles (circumcircle and auxiliary circles)
  for (const circ of Object.values(geometryState.circles)) {
    const center = geometryState.points[circ.centerId];
    if (!center || circ.radius < epsilon) continue;

    const circIntersections = intersectLineCircle(lineP1, lineP2, center, circ.radius, epsilon);
    for (const cPt of circIntersections) {
      if (!isCoincidentWithExisting(cPt)) {
        const circName = circ.isBaseCircumcircle
          ? 'Окружность Γ'
          : `Окружность (R=${circ.radius.toFixed(1)})`;
        results.push({
          x: cPt.x,
          y: cPt.y,
          targetType: 'circle',
          targetId: circ.id,
          targetName: circName,
          isTangent: circIntersections.length === 1,
        });
      }
    }
  }

  // 3. Intersect with lines (other lines in scene, within bounded view range)
  const maxBound = (geometryState.R || 100) * 4;
  for (const line of Object.values(geometryState.lines)) {
    const pt1 = geometryState.points[line.p1Id];
    const pt2 = geometryState.points[line.p2Id];
    if (!pt1 || !pt2) continue;

    const lineInt = intersectLineLine(lineP1, lineP2, pt1, pt2, epsilon);
    if (lineInt && Math.hypot(lineInt.x, lineInt.y) <= maxBound) {
      if (!isCoincidentWithExisting(lineInt)) {
        results.push({
          x: lineInt.x,
          y: lineInt.y,
          targetType: 'line',
          targetId: line.id,
          targetName: `Прямая (${pt1.name || line.p1Id}${pt2.name || line.p2Id})`,
        });
      }
    }
  }

  return results;
}

/**
 * Pure function: computes all transient intersection points for a perpendicular line preview
 * passing through previewPoint with direction perpendicular (90° normal) to referenceLineOrSegment.
 *
 * Invariant: Does NOT mutate GeometryState, zero side effects.
 */
export function computePerpendicularPreviewIntersections(
  referenceLineOrSegment: { p1: Point2D; p2: Point2D },
  previewPoint: Point2D,
  geometryState: PreviewGeometryTargetState,
  epsilon: number = GEOMETRY_EPSILON
): TransientIntersectionPoint[] {
  const refDx = referenceLineOrSegment.p2.x - referenceLineOrSegment.p1.x;
  const refDy = referenceLineOrSegment.p2.y - referenceLineOrSegment.p1.y;
  const len = Math.hypot(refDx, refDy);

  if (len < epsilon) {
    return [];
  }

  // Normal vector: (-refDy, refDx)
  const dirX = -refDy;
  const dirY = refDx;

  const lineP1 = previewPoint;
  const lineP2 = { x: previewPoint.x + dirX, y: previewPoint.y + dirY };

  const results: TransientIntersectionPoint[] = [];

  const isCoincidentWithExisting = (pt: Point2D): boolean => {
    return results.some((existing) => distance2D(existing, pt) < GEOMETRY_POINT_COINCIDENT_THRESHOLD);
  };

  // 1. Intersect with segments (triangle sides and auxiliary segments)
  for (const seg of Object.values(geometryState.segments)) {
    const pt1 = geometryState.points[seg.p1Id];
    const pt2 = geometryState.points[seg.p2Id];
    if (!pt1 || !pt2) continue;

    const intPt = intersectLineSegment(lineP1, lineP2, pt1, pt2, epsilon);
    if (intPt && !isCoincidentWithExisting(intPt)) {
      const segName = seg.isBaseChord
        ? `Сторона ${pt1.name || seg.p1Id}${pt2.name || seg.p2Id}`
        : `Отрезок [${pt1.name || seg.p1Id}${pt2.name || seg.p2Id}]`;
      results.push({
        x: intPt.x,
        y: intPt.y,
        targetType: 'segment',
        targetId: seg.id,
        targetName: segName,
      });
    }
  }

  // 2. Intersect with circles (circumcircle and auxiliary circles)
  for (const circ of Object.values(geometryState.circles)) {
    const center = geometryState.points[circ.centerId];
    if (!center || circ.radius < epsilon) continue;

    const circIntersections = intersectLineCircle(lineP1, lineP2, center, circ.radius, epsilon);
    for (const cPt of circIntersections) {
      if (!isCoincidentWithExisting(cPt)) {
        const circName = circ.isBaseCircumcircle
          ? 'Окружность Γ'
          : `Окружность (R=${circ.radius.toFixed(1)})`;
        results.push({
          x: cPt.x,
          y: cPt.y,
          targetType: 'circle',
          targetId: circ.id,
          targetName: circName,
          isTangent: circIntersections.length === 1,
        });
      }
    }
  }

  // 3. Intersect with lines (other lines in scene, within bounded view range)
  const maxBound = (geometryState.R || 100) * 4;
  for (const line of Object.values(geometryState.lines)) {
    const pt1 = geometryState.points[line.p1Id];
    const pt2 = geometryState.points[line.p2Id];
    if (!pt1 || !pt2) continue;

    const lineInt = intersectLineLine(lineP1, lineP2, pt1, pt2, epsilon);
    if (lineInt && Math.hypot(lineInt.x, lineInt.y) <= maxBound) {
      if (!isCoincidentWithExisting(lineInt)) {
        results.push({
          x: lineInt.x,
          y: lineInt.y,
          targetType: 'line',
          targetId: line.id,
          targetName: `Прямая (${pt1.name || line.p1Id}${pt2.name || line.p2Id})`,
        });
      }
    }
  }

  return results;
}

/**
 * Pure function: computes all transient intersection points for an angle bisector line
 * passing through vertexPoint and directionPoint (e.g. auxiliary point Q).
 *
 * Invariant: Does NOT mutate GeometryState, zero side effects.
 */
export function computeAngleBisectorPreviewIntersections(
  vertexPoint: Point2D,
  directionPoint: Point2D,
  geometryState: PreviewGeometryTargetState,
  epsilon: number = GEOMETRY_EPSILON
): TransientIntersectionPoint[] {
  const dx = directionPoint.x - vertexPoint.x;
  const dy = directionPoint.y - vertexPoint.y;
  const len = Math.hypot(dx, dy);

  if (len < epsilon) {
    return [];
  }

  const lineP1 = vertexPoint;
  const lineP2 = directionPoint;

  const results: TransientIntersectionPoint[] = [];

  const isCoincidentWithExisting = (pt: Point2D): boolean => {
    return results.some((existing) => distance2D(existing, pt) < GEOMETRY_POINT_COINCIDENT_THRESHOLD);
  };

  // 1. Intersect with segments (triangle sides and auxiliary segments)
  for (const seg of Object.values(geometryState.segments)) {
    const pt1 = geometryState.points[seg.p1Id];
    const pt2 = geometryState.points[seg.p2Id];
    if (!pt1 || !pt2) continue;

    const intPt = intersectLineSegment(lineP1, lineP2, pt1, pt2, epsilon);
    if (intPt && !isCoincidentWithExisting(intPt)) {
      const segName = seg.isBaseChord
        ? `Сторона ${pt1.name || seg.p1Id}${pt2.name || seg.p2Id}`
        : `Отрезок [${pt1.name || seg.p1Id}${pt2.name || seg.p2Id}]`;
      results.push({
        x: intPt.x,
        y: intPt.y,
        targetType: 'segment',
        targetId: seg.id,
        targetName: segName,
      });
    }
  }

  // 2. Intersect with circles (circumcircle and auxiliary circles)
  for (const circ of Object.values(geometryState.circles)) {
    const center = geometryState.points[circ.centerId];
    if (!center || circ.radius < epsilon) continue;

    const circIntersections = intersectLineCircle(lineP1, lineP2, center, circ.radius, epsilon);
    for (const cPt of circIntersections) {
      if (!isCoincidentWithExisting(cPt)) {
        const circName = circ.isBaseCircumcircle
          ? 'Окружность Γ'
          : `Окружность (R=${circ.radius.toFixed(1)})`;
        results.push({
          x: cPt.x,
          y: cPt.y,
          targetType: 'circle',
          targetId: circ.id,
          targetName: circName,
          isTangent: circIntersections.length === 1,
        });
      }
    }
  }

  // 3. Intersect with lines (other lines in scene, within bounded view range)
  const maxBound = (geometryState.R || 100) * 4;
  for (const line of Object.values(geometryState.lines)) {
    const pt1 = geometryState.points[line.p1Id];
    const pt2 = geometryState.points[line.p2Id];
    if (!pt1 || !pt2) continue;

    const lineInt = intersectLineLine(lineP1, lineP2, pt1, pt2, epsilon);
    if (lineInt && Math.hypot(lineInt.x, lineInt.y) <= maxBound) {
      if (!isCoincidentWithExisting(lineInt)) {
        results.push({
          x: lineInt.x,
          y: lineInt.y,
          targetType: 'line',
          targetId: line.id,
          targetName: `Прямая (${pt1.name || line.p1Id}${pt2.name || line.p2Id})`,
        });
      }
    }
  }

  return results;
}

