// src/components/school/reference/schoolFactExtractor.ts
// Pure Read-Only Fact Extractor for Contextual School Reference
// Invariant: Never mutates GeometryState, never creates a second geometry engine.

import { FullGeometryState } from '../../../engines/geometryState';
import { computeGeometryBase } from '../../../engines/geometryState';
import {
  pointToLineDistance,
  intersectLineCircle,
  distance2D,
} from '../../../engines/geometryIntersections';
import { VerifiedGeometryFacts } from './schoolKnowledgeTypes';

/**
 * Extracts verified geometric facts for a selected entity from FullGeometryState.
 * Read-only, deterministic, side-effect free.
 */
export function extractVerifiedFacts(
  entityId: string,
  state: FullGeometryState
): VerifiedGeometryFacts | null {
  if (!entityId || !state) return null;

  // 1. Check Points
  if (state.points[entityId]) {
    const pt = state.points[entityId];
    const isCenter = pt.id === 'O' || (Math.hypot(pt.x, pt.y) < 1e-4);
    const distFromOrigin = Math.hypot(pt.x, pt.y);
    const isPointOnCircle =
      Boolean(pt.onCircle) || Math.abs(distFromOrigin - state.R) < 1e-3;

    // Check if this point is vertex C and subtends diameter AB
    const geoBase = computeGeometryBase(state.pointsU, state.R);
    let isRightAngle = false;
    let subtendsDiameter = false;
    let angleDeg: number | undefined = undefined;

    if (pt.id === 'C' && geoBase.arcs.AB.isDiameter) {
      subtendsDiameter = true;
      isRightAngle = true;
      angleDeg = 90;
    } else if (pt.id === 'A' && geoBase.arcs.BC.isDiameter) {
      subtendsDiameter = true;
      isRightAngle = true;
      angleDeg = 90;
    } else if (pt.id === 'B' && geoBase.arcs.CA.isDiameter) {
      subtendsDiameter = true;
      isRightAngle = true;
      angleDeg = 90;
    }

    return {
      entityId: pt.id,
      entityType: 'point',
      isPointOnCircle,
      isCenter,
      isBaseVertex: Boolean(pt.isBaseVertex),
      pointRole: pt.role,
      coordinates: { x: pt.x, y: pt.y },
      subtendsDiameter,
      isRightAngle,
      angleDeg,
      provenance: pt.provenance,
      role: pt.role,
    };
  }

  // 2. Check Segments
  if (state.segments[entityId]) {
    const seg = state.segments[entityId];
    const p1 = state.points[seg.p1Id];
    const p2 = state.points[seg.p2Id];

    if (!p1 || !p2) return null;

    const endpointsOnCircle =
      (Boolean(p1.onCircle) || Boolean(p1.isBaseVertex) || Math.abs(Math.hypot(p1.x, p1.y) - state.R) < 1e-3) &&
      (Boolean(p2.onCircle) || Boolean(p2.isBaseVertex) || Math.abs(Math.hypot(p2.x, p2.y) - state.R) < 1e-3);

    const distToCenter = pointToLineDistance({ x: 0, y: 0 }, p1, p2);
    const passesThroughCenter = distToCenter < 1e-3;

    let isDiameter = false;
    let subtendedArcDeg: number | undefined = undefined;

    if (seg.isBaseChord) {
      const geoBase = computeGeometryBase(state.pointsU, state.R);
      const pair = [p1.id, p2.id].sort().join('') as 'AB' | 'BC' | 'AC';
      const key = pair === 'AC' ? 'CA' : (pair as 'AB' | 'BC' | 'CA');
      if (geoBase.arcs[key]) {
        isDiameter = geoBase.arcs[key].isDiameter;
        subtendedArcDeg = geoBase.arcs[key].deg;
      }
    } else if (endpointsOnCircle && passesThroughCenter && Math.abs(seg.length - 2 * state.R) < 1e-2) {
      isDiameter = true;
      subtendedArcDeg = 180;
    }

    return {
      entityId: seg.id,
      entityType: 'segment',
      isBaseChord: Boolean(seg.isBaseChord),
      isDiameter,
      passesThroughCenter,
      segmentLength: seg.length,
      segmentEndpoints: { p1Id: seg.p1Id, p2Id: seg.p2Id },
      endpointsOnCircle,
      subtendedArcDeg,
      provenance: seg.provenance,
      role: seg.role,
    };
  }

  // 3. Check Lines
  if (state.lines[entityId]) {
    const line = state.lines[entityId];
    const p1 = state.points[line.p1Id];
    const p2 = state.points[line.p2Id];

    if (!p1 || !p2) return null;

    const distToCenter = pointToLineDistance({ x: 0, y: 0 }, p1, p2);
    // Reuse canonical line-circle intersection predicate
    const intersections = intersectLineCircle(p1, p2, { x: 0, y: 0 }, state.R);
    const circleIntersectionCount = intersections.length;

    return {
      entityId: line.id,
      entityType: 'line',
      lineEndpoints: { p1Id: line.p1Id, p2Id: line.p2Id },
      circleIntersectionCount,
      distanceToCenter: distToCenter,
      provenance: line.provenance,
      role: line.role,
    };
  }

  // 4. Check Circles
  if (state.circles[entityId]) {
    const circ = state.circles[entityId];
    return {
      entityId: circ.id,
      entityType: 'circle',
      isBaseCircumcircle: Boolean(circ.isBaseCircumcircle),
      circleRadius: circ.radius,
      circleCenterId: circ.centerId,
      circleRole: circ.role,
      provenance: circ.provenance,
      role: circ.role,
    };
  }

  return null;
}
