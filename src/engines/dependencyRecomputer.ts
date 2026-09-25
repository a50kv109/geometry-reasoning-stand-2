// src/engines/dependencyRecomputer.ts
// Single deterministic engine for dynamic dependency propagation and parametric recomputations
// Complies with "One Geometry, Many Clients" invariant.
// Pure function, zero side effects, zero timestamps, zero random generators.

import {
  FullGeometryState,
  GeometryPoint,
  GeometrySegment,
  GeometryLine,
  GeometryCircle,
  calculateEuclideanDistance,
} from './constructionCore';
import {
  Point2D,
  distance2D,
  pointToLineDistance,
  intersectLineCircle,
  intersectCircleCircle,
  computePerpendicularPreviewIntersections,
  computeParallelPreviewIntersections,
  computeAngleBisectorPreviewIntersections,
  PreviewGeometryTargetState,
  GEOMETRY_POINT_COINCIDENT_THRESHOLD,
  GEOMETRY_EPSILON,
} from './geometryIntersections';

export interface MacroGroupInfo {
  groupId: string;
  macroType: 'perpendicular' | 'parallel' | 'perpendicular_bisector' | 'angle_bisector';
  sourceIds: string[];
  primaryLineId: string;
}

/**
 * Discovers all macro groups in GeometryState in topological/creation order.
 */
export function discoverMacroGroups(state: FullGeometryState): MacroGroupInfo[] {
  const groupsMap = new Map<string, MacroGroupInfo>();

  for (const [lineId, line] of Object.entries(state.lines)) {
    if (line.role === 'primary' && line.provenance) {
      const { groupId, macroType, sourceIds } = line.provenance;
      if (groupId && macroType && sourceIds) {
        groupsMap.set(groupId, {
          groupId,
          macroType,
          sourceIds: [...sourceIds],
          primaryLineId: lineId,
        });
      }
    }
  }

  return Array.from(groupsMap.values());
}

/**
 * Dynamically recomputes all parametric macro constructions and derived intersections in-place.
 * Guarantees:
 * 1. Zero duplicate entities created during dragging or parameter changes.
 * 2. Geometric invariants (90° orthogonality, parallel slope, equidistant bisectors) are maintained at every frame.
 * 3. Intersections with triangle chords, circumcircle, and other lines are continuously recalculated.
 * 4. Undo and History stacks are preserved cleanly without spurious states.
 */
export function recomputeDependentGeometry(state: FullGeometryState): FullGeometryState {
  const nextPoints: Record<string, GeometryPoint> = { ...state.points };
  const nextSegments: Record<string, GeometrySegment> = { ...state.segments };
  const nextLines: Record<string, GeometryLine> = { ...state.lines };
  const nextCircles: Record<string, GeometryCircle> = { ...state.circles };

  let nextState: FullGeometryState = {
    ...state,
    points: nextPoints,
    segments: nextSegments,
    lines: nextLines,
    circles: nextCircles,
  };

  const macroGroups = discoverMacroGroups(nextState);

  for (const macro of macroGroups) {
    const { groupId, macroType, sourceIds, primaryLineId } = macro;

    if (macroType === 'perpendicular') {
      const [targetLineOrSegmentId, pointPId] = sourceIds;
      const targetObj = nextState.lines[targetLineOrSegmentId] || nextState.segments[targetLineOrSegmentId];
      const ptP = nextState.points[pointPId];

      if (!targetObj || !ptP) continue;

      const ptA = nextState.points[targetObj.p1Id];
      const ptB = nextState.points[targetObj.p2Id];
      if (!ptA || !ptB) continue;

      const distAB = distance2D(ptA, ptB);
      if (distAB < GEOMETRY_POINT_COINCIDENT_THRESHOLD) continue;

      const distToLine = pointToLineDistance(ptP, ptA, ptB);
      const isPointOnLine = distToLine < GEOMETRY_POINT_COINCIDENT_THRESHOLD;

      let ptP1Coords: Point2D;
      let ptP2Coords: Point2D;
      let ptQCoords: Point2D;
      let radiusC0: number;
      let radiusC1C2: number;

      if (!isPointOnLine) {
        radiusC0 = distToLine * Math.SQRT2;
        radiusC1C2 = radiusC0;

        const lineInts = intersectLineCircle(ptA, ptB, ptP, radiusC0, GEOMETRY_EPSILON);
        if (lineInts.length < 2) continue;

        ptP1Coords = lineInts[0];
        ptP2Coords = lineInts[1];

        const circInts = intersectCircleCircle(ptP1Coords, radiusC1C2, ptP2Coords, radiusC1C2, GEOMETRY_EPSILON);
        if (circInts.length < 2) continue;

        const d0 = distance2D(circInts[0], ptP);
        const d1 = distance2D(circInts[1], ptP);
        if (d0 >= GEOMETRY_POINT_COINCIDENT_THRESHOLD) {
          ptQCoords = circInts[0];
        } else if (d1 >= GEOMETRY_POINT_COINCIDENT_THRESHOLD) {
          ptQCoords = circInts[1];
        } else {
          continue;
        }
      } else {
        radiusC0 = distAB / 2;
        radiusC1C2 = distAB;

        const lineInts = intersectLineCircle(ptA, ptB, ptP, radiusC0, GEOMETRY_EPSILON);
        if (lineInts.length < 2) continue;

        ptP1Coords = lineInts[0];
        ptP2Coords = lineInts[1];

        const circInts = intersectCircleCircle(ptP1Coords, radiusC1C2, ptP2Coords, radiusC1C2, GEOMETRY_EPSILON);
        if (circInts.length < 2) continue;

        const abVec = { x: ptB.x - ptA.x, y: ptB.y - ptA.y };
        const q0Vec = { x: circInts[0].x - ptP.x, y: circInts[0].y - ptP.y };
        const cross0 = abVec.x * q0Vec.y - abVec.y * q0Vec.x;

        if (cross0 > 0) {
          ptQCoords = circInts[0];
        } else {
          ptQCoords = circInts[1];
        }
      }

      // Update auxiliary circle C0
      const c0Id = `circle_perp_${groupId}_0`;
      if (nextCircles[c0Id]) {
        nextCircles[c0Id] = {
          ...nextCircles[c0Id],
          centerId: pointPId,
          radius: radiusC0,
        };
      }

      // Update auxiliary points P1, P2
      const p1Id = `pt_perp_${groupId}_P1`;
      if (nextPoints[p1Id]) {
        nextPoints[p1Id] = {
          ...nextPoints[p1Id],
          x: ptP1Coords.x,
          y: ptP1Coords.y,
        };
      }

      const p2Id = `pt_perp_${groupId}_P2`;
      if (nextPoints[p2Id]) {
        nextPoints[p2Id] = {
          ...nextPoints[p2Id],
          x: ptP2Coords.x,
          y: ptP2Coords.y,
        };
      }

      // Update auxiliary circles C1, C2
      const c1Id = `circle_perp_${groupId}_1`;
      if (nextCircles[c1Id]) {
        nextCircles[c1Id] = {
          ...nextCircles[c1Id],
          centerId: p1Id,
          radius: radiusC1C2,
        };
      }

      const c2Id = `circle_perp_${groupId}_2`;
      if (nextCircles[c2Id]) {
        nextCircles[c2Id] = {
          ...nextCircles[c2Id],
          centerId: p2Id,
          radius: radiusC1C2,
        };
      }

      // Update auxiliary point Q
      const qId = `pt_perp_${groupId}_Q`;
      if (nextPoints[qId]) {
        nextPoints[qId] = {
          ...nextPoints[qId],
          x: ptQCoords.x,
          y: ptQCoords.y,
        };
      }

      // Update primary perpendicular line
      if (nextLines[primaryLineId]) {
        nextLines[primaryLineId] = {
          ...nextLines[primaryLineId],
          p1Id: pointPId,
          p2Id: qId,
        };
      }

      // Recompute derived intersection points
      // Build clean preview target state excluding this group's auxiliary elements
      const previewTargetLines: Record<string, GeometryLine> = {};
      for (const [lId, l] of Object.entries(nextLines)) {
        if (l.provenance?.groupId !== groupId) {
          previewTargetLines[lId] = l;
        }
      }

      const previewTargetCircles: Record<string, GeometryCircle> = {};
      for (const [cId, c] of Object.entries(nextCircles)) {
        if (c.provenance?.groupId !== groupId) {
          previewTargetCircles[cId] = c;
        }
      }

      const previewTargetState: PreviewGeometryTargetState = {
        R: nextState.R,
        points: nextPoints,
        segments: nextSegments,
        lines: previewTargetLines,
        circles: previewTargetCircles,
      };

      const rawIntersections = computePerpendicularPreviewIntersections(
        { p1: ptA, p2: ptB },
        ptP,
        previewTargetState,
        GEOMETRY_EPSILON
      );

      // Filter out points coincident with existing key vertices
      const excludedCoords: Point2D[] = [ptP, ptQCoords, ptP1Coords, ptP2Coords];
      if (nextPoints.O) excludedCoords.push(nextPoints.O);
      if (nextPoints.A) excludedCoords.push(nextPoints.A);
      if (nextPoints.B) excludedCoords.push(nextPoints.B);
      if (nextPoints.C) excludedCoords.push(nextPoints.C);

      const validIntersections = rawIntersections.filter(
        (int) => !excludedCoords.some((c) => distance2D(int, c) <= GEOMETRY_POINT_COINCIDENT_THRESHOLD)
      );

      // Reconcile intersection point IDs
      const existingIntIds = Object.keys(nextPoints)
        .filter((id) => id.startsWith(`pt_perp_${groupId}_int_`))
        .sort((a, b) => {
          const numA = parseInt(a.replace(`pt_perp_${groupId}_int_`, ''), 10) || 0;
          const numB = parseInt(b.replace(`pt_perp_${groupId}_int_`, ''), 10) || 0;
          return numA - numB;
        });

      // Update existing or add new
      for (let i = 0; i < validIntersections.length; i++) {
        const int = validIntersections[i];
        const intId = i < existingIntIds.length ? existingIntIds[i] : `pt_perp_${groupId}_int_${i + 1}`;
        nextPoints[intId] = {
          id: intId,
          name: `X${i + 1}`,
          x: int.x,
          y: int.y,
          onCircle: int.targetType === 'circle',
          role: 'auxiliary',
          parentIds: [primaryLineId, int.targetId],
          provenance: {
            macroType: 'perpendicular',
            sourceIds: [targetLineOrSegmentId, pointPId, int.targetId],
            groupId,
          },
          color: '#8B5CF6',
        };
      }

      // Remove excess intersection points if count decreased
      if (validIntersections.length < existingIntIds.length) {
        for (let i = validIntersections.length; i < existingIntIds.length; i++) {
          delete nextPoints[existingIntIds[i]];
        }
      }
    } else if (macroType === 'parallel') {
      const [targetLineOrSegmentId, pointPId] = sourceIds;
      const targetObj = nextState.lines[targetLineOrSegmentId] || nextState.segments[targetLineOrSegmentId];
      const ptP = nextState.points[pointPId];

      if (!targetObj || !ptP) continue;

      const ptA = nextState.points[targetObj.p1Id];
      const ptB = nextState.points[targetObj.p2Id];
      if (!ptA || !ptB) continue;

      const distAB = distance2D(ptA, ptB);
      if (distAB < GEOMETRY_POINT_COINCIDENT_THRESHOLD) continue;

      const distToLine = pointToLineDistance(ptP, ptA, ptB);
      if (distToLine <= GEOMETRY_POINT_COINCIDENT_THRESHOLD) continue;

      const R = distance2D(ptP, ptA);
      if (R < GEOMETRY_POINT_COINCIDENT_THRESHOLD) continue;

      const c1Ints = intersectLineCircle(ptA, ptB, ptA, R, GEOMETRY_EPSILON);
      if (c1Ints.length === 0) continue;

      const abDir = { x: ptB.x - ptA.x, y: ptB.y - ptA.y };
      let ptA1Coords: Point2D | null = null;
      for (const p of c1Ints) {
        const dot = (p.x - ptA.x) * abDir.x + (p.y - ptA.y) * abDir.y;
        if (dot > 0) {
          ptA1Coords = p;
          break;
        }
      }
      if (!ptA1Coords) ptA1Coords = c1Ints[0];

      const qInts = intersectCircleCircle(ptP, R, ptA1Coords, R, GEOMETRY_EPSILON);
      if (qInts.length === 0) continue;

      let ptQCoords: Point2D | null = null;
      for (const q of qInts) {
        if (distance2D(q, ptA) > GEOMETRY_POINT_COINCIDENT_THRESHOLD) {
          ptQCoords = q;
          break;
        }
      }
      if (!ptQCoords) ptQCoords = qInts[0];

      // Update auxiliary circles and points
      const c1Id = `circ_par_${groupId}_1`;
      if (nextCircles[c1Id]) {
        nextCircles[c1Id] = { ...nextCircles[c1Id], centerId: targetObj.p1Id, radius: R };
      }

      const a1Id = `pt_par_${groupId}_A1`;
      if (nextPoints[a1Id]) {
        nextPoints[a1Id] = { ...nextPoints[a1Id], x: ptA1Coords.x, y: ptA1Coords.y };
      }

      const cpId = `circ_par_${groupId}_P`;
      if (nextCircles[cpId]) {
        nextCircles[cpId] = { ...nextCircles[cpId], centerId: pointPId, radius: R };
      }

      const ca1Id = `circ_par_${groupId}_A1`;
      if (nextCircles[ca1Id]) {
        nextCircles[ca1Id] = { ...nextCircles[ca1Id], centerId: a1Id, radius: R };
      }

      const qId = `pt_par_${groupId}_Q`;
      if (nextPoints[qId]) {
        nextPoints[qId] = { ...nextPoints[qId], x: ptQCoords.x, y: ptQCoords.y };
      }

      if (nextLines[primaryLineId]) {
        nextLines[primaryLineId] = {
          ...nextLines[primaryLineId],
          p1Id: pointPId,
          p2Id: qId,
        };
      }

      // Recompute parallel intersections
      const previewTargetLines: Record<string, GeometryLine> = {};
      for (const [lId, l] of Object.entries(nextLines)) {
        if (l.provenance?.groupId !== groupId) previewTargetLines[lId] = l;
      }
      const previewTargetCircles: Record<string, GeometryCircle> = {};
      for (const [cId, c] of Object.entries(nextCircles)) {
        if (c.provenance?.groupId !== groupId) previewTargetCircles[cId] = c;
      }

      const rawIntersections = computeParallelPreviewIntersections(
        { p1: ptA, p2: ptB },
        ptP,
        {
          R: nextState.R,
          points: nextPoints,
          segments: nextSegments,
          lines: previewTargetLines,
          circles: previewTargetCircles,
        },
        GEOMETRY_EPSILON
      );

      const excludedCoords: Point2D[] = [ptP, ptQCoords, ptA1Coords];
      if (nextPoints.O) excludedCoords.push(nextPoints.O);
      if (nextPoints.A) excludedCoords.push(nextPoints.A);
      if (nextPoints.B) excludedCoords.push(nextPoints.B);
      if (nextPoints.C) excludedCoords.push(nextPoints.C);

      const validIntersections = rawIntersections.filter(
        (int) => !excludedCoords.some((c) => distance2D(int, c) <= GEOMETRY_POINT_COINCIDENT_THRESHOLD)
      );

      const existingIntIds = Object.keys(nextPoints)
        .filter((id) => id.startsWith(`pt_par_${groupId}_int_`))
        .sort((a, b) => {
          const numA = parseInt(a.replace(`pt_par_${groupId}_int_`, ''), 10) || 0;
          const numB = parseInt(b.replace(`pt_par_${groupId}_int_`, ''), 10) || 0;
          return numA - numB;
        });

      for (let i = 0; i < validIntersections.length; i++) {
        const int = validIntersections[i];
        const intId = i < existingIntIds.length ? existingIntIds[i] : `pt_par_${groupId}_int_${i + 1}`;
        nextPoints[intId] = {
          id: intId,
          name: `X${i + 1}`,
          x: int.x,
          y: int.y,
          onCircle: int.targetType === 'circle',
          role: 'auxiliary',
          parentIds: [primaryLineId, int.targetId],
          provenance: {
            macroType: 'parallel',
            sourceIds: [targetLineOrSegmentId, pointPId, int.targetId],
            groupId,
          },
          color: '#3B82F6',
        };
      }

      if (validIntersections.length < existingIntIds.length) {
        for (let i = validIntersections.length; i < existingIntIds.length; i++) {
          delete nextPoints[existingIntIds[i]];
        }
      }
    } else if (macroType === 'perpendicular_bisector') {
      const [pAId, pBId] = sourceIds;
      const ptA = nextPoints[pAId];
      const ptB = nextPoints[pBId];
      if (!ptA || !ptB) continue;

      const distAB = distance2D(ptA, ptB);
      if (distAB < GEOMETRY_POINT_COINCIDENT_THRESHOLD) continue;

      const circInts = intersectCircleCircle(ptA, distAB, ptB, distAB, GEOMETRY_EPSILON);
      if (circInts.length < 2) continue;

      const cAId = nextCircles[`circ_pb_${groupId}_A`] ? `circ_pb_${groupId}_A` : `circle_pbis_${groupId}_A`;
      if (nextCircles[cAId]) {
        nextCircles[cAId] = { ...nextCircles[cAId], centerId: pAId, radius: distAB };
      }

      const cBId = nextCircles[`circ_pb_${groupId}_B`] ? `circ_pb_${groupId}_B` : `circle_pbis_${groupId}_B`;
      if (nextCircles[cBId]) {
        nextCircles[cBId] = { ...nextCircles[cBId], centerId: pBId, radius: distAB };
      }

      const p1Id = nextPoints[`pt_pb_${groupId}_1`] ? `pt_pb_${groupId}_1` : `pt_pbis_${groupId}_1`;
      if (nextPoints[p1Id]) {
        nextPoints[p1Id] = { ...nextPoints[p1Id], x: circInts[0].x, y: circInts[0].y };
      }

      const p2Id = nextPoints[`pt_pb_${groupId}_2`] ? `pt_pb_${groupId}_2` : `pt_pbis_${groupId}_2`;
      if (nextPoints[p2Id]) {
        nextPoints[p2Id] = { ...nextPoints[p2Id], x: circInts[1].x, y: circInts[1].y };
      }

      if (nextLines[primaryLineId]) {
        nextLines[primaryLineId] = {
          ...nextLines[primaryLineId],
          p1Id: p1Id,
          p2Id: p2Id,
        };
      }
    } else if (macroType === 'angle_bisector') {
      const [arm1Id, vertexId, arm2Id] = sourceIds;
      const ptA = nextPoints[arm1Id];
      const ptV = nextPoints[vertexId];
      const ptB = nextPoints[arm2Id];
      if (!ptA || !ptV || !ptB) continue;

      const distVA = distance2D(ptV, ptA);
      const distVB = distance2D(ptV, ptB);
      if (distVA < GEOMETRY_POINT_COINCIDENT_THRESHOLD || distVB < GEOMETRY_POINT_COINCIDENT_THRESHOLD) continue;

      const uVA = { x: (ptA.x - ptV.x) / distVA, y: (ptA.y - ptV.y) / distVA };
      const uVB = { x: (ptB.x - ptV.x) / distVB, y: (ptB.y - ptV.y) / distVB };

      const R = Math.min(distVA, distVB);
      const p1Coords = { x: ptV.x + uVA.x * R, y: ptV.y + uVA.y * R };
      const p2Coords = { x: ptV.x + uVB.x * R, y: ptV.y + uVB.y * R };

      const qInts = intersectCircleCircle(p1Coords, R, p2Coords, R, GEOMETRY_EPSILON);
      if (qInts.length === 0) continue;

      let qCoords: Point2D | null = null;
      const dist0 = distance2D(qInts[0], ptV);
      const dist1 = qInts.length > 1 ? distance2D(qInts[1], ptV) : 0;
      if (dist0 < 1e-4 && qInts.length > 1) {
        qCoords = qInts[1];
      } else if (dist1 < 1e-4) {
        qCoords = qInts[0];
      } else if (qInts.length > 1) {
        qCoords = dist0 > dist1 ? qInts[0] : qInts[1];
      } else {
        qCoords = qInts[0];
      }
      if (!qCoords) continue;

      // Auxiliary base circle C0
      const c0Id = `circ_ab_${groupId}_0`;
      if (nextCircles[c0Id]) {
        nextCircles[c0Id] = { ...nextCircles[c0Id], centerId: vertexId, radius: R };
      }

      // Auxiliary points P1, P2
      const p1Id = `pt_ab_${groupId}_P1`;
      if (nextPoints[p1Id]) {
        nextPoints[p1Id] = { ...nextPoints[p1Id], x: p1Coords.x, y: p1Coords.y };
      }

      const p2Id = `pt_ab_${groupId}_P2`;
      if (nextPoints[p2Id]) {
        nextPoints[p2Id] = { ...nextPoints[p2Id], x: p2Coords.x, y: p2Coords.y };
      }

      // Auxiliary circles C1, C2
      const c1Id = `circ_ab_${groupId}_1`;
      if (nextCircles[c1Id]) {
        nextCircles[c1Id] = { ...nextCircles[c1Id], centerId: p1Id, radius: R };
      }

      const c2Id = `circ_ab_${groupId}_2`;
      if (nextCircles[c2Id]) {
        nextCircles[c2Id] = { ...nextCircles[c2Id], centerId: p2Id, radius: R };
      }

      // Auxiliary point Q
      const qId = `pt_ab_${groupId}_Q`;
      if (nextPoints[qId]) {
        nextPoints[qId] = { ...nextPoints[qId], x: qCoords.x, y: qCoords.y };
      }

      // Update primary line
      if (nextLines[primaryLineId]) {
        nextLines[primaryLineId] = {
          ...nextLines[primaryLineId],
          p1Id: vertexId,
          p2Id: qId,
        };
      }

      // Recompute angle bisector intersections
      const previewTargetLines: Record<string, GeometryLine> = {};
      for (const [lId, l] of Object.entries(nextLines)) {
        if (l.provenance?.groupId !== groupId) previewTargetLines[lId] = l;
      }
      const previewTargetCircles: Record<string, GeometryCircle> = {};
      for (const [cId, c] of Object.entries(nextCircles)) {
        if (c.provenance?.groupId !== groupId) previewTargetCircles[cId] = c;
      }

      const rawIntersections = computeAngleBisectorPreviewIntersections(
        ptV,
        qCoords,
        {
          R: nextState.R,
          points: nextPoints,
          segments: nextSegments,
          lines: previewTargetLines,
          circles: previewTargetCircles,
        },
        GEOMETRY_EPSILON
      );

      const excludedCoords: Point2D[] = [ptV, qCoords, p1Coords, p2Coords];
      if (nextPoints.O) excludedCoords.push(nextPoints.O);
      if (nextPoints.A) excludedCoords.push(nextPoints.A);
      if (nextPoints.B) excludedCoords.push(nextPoints.B);
      if (nextPoints.C) excludedCoords.push(nextPoints.C);

      const validIntersections = rawIntersections.filter(
        (int) => !excludedCoords.some((c) => distance2D(int, c) <= GEOMETRY_POINT_COINCIDENT_THRESHOLD)
      );

      const existingIntIds = Object.keys(nextPoints)
        .filter((id) => id.startsWith(`pt_ab_${groupId}_int_`))
        .sort((a, b) => {
          const numA = parseInt(a.replace(`pt_ab_${groupId}_int_`, ''), 10) || 0;
          const numB = parseInt(b.replace(`pt_ab_${groupId}_int_`, ''), 10) || 0;
          return numA - numB;
        });

      for (let i = 0; i < validIntersections.length; i++) {
        const int = validIntersections[i];
        const intId = i < existingIntIds.length ? existingIntIds[i] : `pt_ab_${groupId}_int_${i + 1}`;
        nextPoints[intId] = {
          id: intId,
          name: `X${i + 1}`,
          x: int.x,
          y: int.y,
          onCircle: int.targetType === 'circle',
          role: 'auxiliary',
          parentIds: [primaryLineId, int.targetId],
          provenance: {
            macroType: 'angle_bisector',
            sourceIds: [arm1Id, vertexId, arm2Id, int.targetId],
            groupId,
          },
          color: '#0D9488',
        };
      }

      if (validIntersections.length < existingIntIds.length) {
        for (let i = validIntersections.length; i < existingIntIds.length; i++) {
          delete nextPoints[existingIntIds[i]];
        }
      }
    }
  }

  // Update lengths of non-macro user segments
  for (const [sId, seg] of Object.entries(nextSegments)) {
    if (!seg.isBaseChord) {
      const p1 = nextPoints[seg.p1Id];
      const p2 = nextPoints[seg.p2Id];
      if (p1 && p2) {
        nextSegments[sId] = {
          ...seg,
          length: calculateEuclideanDistance(p1, p2),
        };
      }
    }
  }

  // Update radii of non-macro user circles
  for (const [cId, circ] of Object.entries(nextCircles)) {
    if (!circ.isBaseCircumcircle && circ.radiusPointId) {
      const center = nextPoints[circ.centerId];
      const radPt = nextPoints[circ.radiusPointId];
      if (center && radPt) {
        nextCircles[cId] = {
          ...circ,
          radius: calculateEuclideanDistance(center, radPt),
        };
      }
    }
  }

  return nextState;
}
