// src/engines/constructionCore.ts
// Single source of geometric truth for constructions and School Mode primitives
// Complies with Deterministic Geometry Reasoning Stand invariants

import { VertexId } from '../types';
import { normalizeU } from './geometryState';
import { recomputeDependentGeometry } from './dependencyRecomputer';

export type GeometryRole = 'primary' | 'auxiliary';

export interface GeometryProvenance {
  macroType: 'perpendicular_bisector' | 'angle_bisector' | 'perpendicular' | 'parallel';
  sourceIds: string[];
  groupId: string;
}

export interface GeometryPoint {
  id: string;
  name: string;
  x: number; // Model coordinate relative to center (0, 0)
  y: number; // Model coordinate relative to center (0, 0)
  u?: number; // Parameter on circle [0, 1) if constrained
  onCircle?: boolean;
  isBaseVertex?: boolean;
  color?: string;
  role?: GeometryRole;
  provenance?: GeometryProvenance;
  parentIds?: string[];
}

export interface GeometrySegment {
  id: string;
  p1Id: string;
  p2Id: string;
  length: number;
  isBaseChord?: boolean;
  color?: string;
  role?: GeometryRole;
  provenance?: GeometryProvenance;
}

export interface GeometryLine {
  id: string;
  p1Id: string;
  p2Id: string;
  color?: string;
  role?: GeometryRole;
  provenance?: GeometryProvenance;
}

export interface GeometryCircle {
  id: string;
  centerId: string;
  radiusPointId?: string;
  radius: number;
  isBaseCircumcircle?: boolean;
  color?: string;
  role?: GeometryRole;
  provenance?: GeometryProvenance;
}

export interface FullGeometryState {
  R: number;
  pointsU: { A: number; B: number; C: number };
  points: Record<string, GeometryPoint>;
  segments: Record<string, GeometrySegment>;
  lines: Record<string, GeometryLine>;
  circles: Record<string, GeometryCircle>;
  pointCounter: number;
  segmentCounter: number;
  lineCounter: number;
  circleCounter: number;
}

export type GeometryCommand =
  | {
      type: 'ADD_POINT';
      point: {
        id?: string;
        name?: string;
        x: number;
        y: number;
        u?: number;
        onCircle?: boolean;
        color?: string;
        role?: GeometryRole;
        provenance?: GeometryProvenance;
        parentIds?: string[];
      };
    }
  | {
      type: 'ADD_SEGMENT';
      segment: {
        id?: string;
        p1Id: string;
        p2Id: string;
        color?: string;
        role?: GeometryRole;
        provenance?: GeometryProvenance;
      };
    }
  | {
      type: 'ADD_LINE';
      line: {
        id?: string;
        p1Id: string;
        p2Id: string;
        color?: string;
        role?: GeometryRole;
        provenance?: GeometryProvenance;
      };
    }
  | {
      type: 'ADD_CIRCLE';
      circle: {
        id?: string;
        centerId: string;
        radiusPointId?: string;
        radius?: number;
        color?: string;
        role?: GeometryRole;
        provenance?: GeometryProvenance;
      };
    }
  | {
      type: 'BATCH_COMMANDS';
      commands: GeometryCommand[];
    }
  | {
      type: 'MOVE_POINT';
      pointId: string;
      x: number;
      y: number;
      u?: number;
    }
  | {
      type: 'ERASE_OBJECT';
      objectType?: 'point' | 'segment' | 'line' | 'circle';
      id?: string;
      target?: { type: 'point' | 'segment' | 'line' | 'circle'; id: string };
    }
  | {
      type: 'SYNC_BASE_POINTS';
      pointsU: { A: number; B: number; C: number };
      R: number;
    }
  | {
      type: 'CLEAR_USER_CONSTRUCTIONS';
    };

/**
 * Calculates Euclidean distance between two 2D points in model space
 */
export function calculateEuclideanDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Convert screen coordinates (pixels) to model coordinates
 */
export function screenToModel(
  screenPt: { x: number; y: number },
  centerX: number,
  centerY: number,
  renderRadius: number,
  R: number,
  rotationRad: number
): { x: number; y: number } {
  const dx = screenPt.x - centerX;
  const dy = screenPt.y - centerY;
  const cos = Math.cos(-rotationRad);
  const sin = Math.sin(-rotationRad);
  const unrotX = dx * cos - dy * sin;
  const unrotY = dx * sin + dy * cos;
  const scale = renderRadius > 0 ? R / renderRadius : 1;
  return {
    x: unrotX * scale,
    y: unrotY * scale,
  };
}

/**
 * Convert model coordinates to screen coordinates (pixels)
 */
export function modelToScreen(
  modelPt: { x: number; y: number },
  centerX: number,
  centerY: number,
  renderRadius: number,
  R: number,
  rotationRad: number
): { x: number; y: number } {
  const scale = R > 0 ? renderRadius / R : 1;
  const scaledX = modelPt.x * scale;
  const scaledY = modelPt.y * scale;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const rotX = scaledX * cos - scaledY * sin;
  const rotY = scaledX * sin + scaledY * cos;
  return {
    x: centerX + rotX,
    y: centerY + rotY,
  };
}

/**
 * Initializes the default FullGeometryState containing:
 * - Center O(0, 0)
 * - Base vertices A, B, C on circle C(O, R)
 * - Base circumcircle C(O, R)
 * - Base chords AB, BC, CA
 */
export function createDefaultGeometryState(
  pointsU: { A: number; B: number; C: number },
  R: number
): FullGeometryState {
  const normA = normalizeU(pointsU.A);
  const normB = normalizeU(pointsU.B);
  const normC = normalizeU(pointsU.C);

  const ptO: GeometryPoint = {
    id: 'O',
    name: 'O',
    x: 0,
    y: 0,
    isBaseVertex: true,
    color: '#6366F1',
  };

  const ptA: GeometryPoint = {
    id: 'A',
    name: 'A',
    x: R * Math.cos(normA * 2 * Math.PI),
    y: R * Math.sin(normA * 2 * Math.PI),
    u: normA,
    onCircle: true,
    isBaseVertex: true,
    color: '#4F46E5',
  };

  const ptB: GeometryPoint = {
    id: 'B',
    name: 'B',
    x: R * Math.cos(normB * 2 * Math.PI),
    y: R * Math.sin(normB * 2 * Math.PI),
    u: normB,
    onCircle: true,
    isBaseVertex: true,
    color: '#059669',
  };

  const ptC: GeometryPoint = {
    id: 'C',
    name: 'C',
    x: R * Math.cos(normC * 2 * Math.PI),
    y: R * Math.sin(normC * 2 * Math.PI),
    u: normC,
    onCircle: true,
    isBaseVertex: true,
    color: '#D97706',
  };

  const segAB: GeometrySegment = {
    id: 'chord_AB',
    p1Id: 'A',
    p2Id: 'B',
    length: calculateEuclideanDistance(ptA, ptB),
    isBaseChord: true,
    color: '#10B981',
  };

  const segBC: GeometrySegment = {
    id: 'chord_BC',
    p1Id: 'B',
    p2Id: 'C',
    length: calculateEuclideanDistance(ptB, ptC),
    isBaseChord: true,
    color: '#F59E0B',
  };

  const segCA: GeometrySegment = {
    id: 'chord_CA',
    p1Id: 'C',
    p2Id: 'A',
    length: calculateEuclideanDistance(ptC, ptA),
    isBaseChord: true,
    color: '#3B82F6',
  };

  const baseCircle: GeometryCircle = {
    id: 'base_circle',
    centerId: 'O',
    radius: R,
    isBaseCircumcircle: true,
    color: '#6366F1',
  };

  return {
    R,
    pointsU: { ...pointsU },
    points: { O: ptO, A: ptA, B: ptB, C: ptC },
    segments: { chord_AB: segAB, chord_BC: segBC, chord_CA: segCA },
    lines: {},
    circles: { base_circle: baseCircle },
    pointCounter: 0,
    segmentCounter: 0,
    lineCounter: 0,
    circleCounter: 0,
  };
}

/**
 * Snaps a model point to existing points or the circumcircle
 */
export function snapToGeometry(
  modelPt: { x: number; y: number },
  state: FullGeometryState,
  snapThreshold: number = 8
): {
  x: number;
  y: number;
  snappedPointId?: string;
  snappedToCircle?: boolean;
  u?: number;
} {
  // 1. Snap to existing point
  let closestId: string | undefined;
  let minPointDist = Infinity;
  for (const [id, pt] of Object.entries(state.points)) {
    const d = calculateEuclideanDistance(modelPt, pt);
    if (d < snapThreshold && d < minPointDist) {
      minPointDist = d;
      closestId = id;
    }
  }

  if (closestId) {
    const pt = state.points[closestId];
    return {
      x: pt.x,
      y: pt.y,
      snappedPointId: closestId,
      snappedToCircle: pt.onCircle,
      u: pt.u,
    };
  }

  // 2. Snap to base circumcircle C(O, R)
  const distFromCenter = Math.hypot(modelPt.x, modelPt.y);
  if (Math.abs(distFromCenter - state.R) < snapThreshold && distFromCenter > 1e-4) {
    const angle = Math.atan2(modelPt.y, modelPt.x);
    let u = angle / (2 * Math.PI);
    if (u < 0) u += 1;
    return {
      x: state.R * Math.cos(angle),
      y: state.R * Math.sin(angle),
      snappedToCircle: true,
      u: normalizeU(u),
    };
  }

  // 3. No snap, free-form
  return {
    x: modelPt.x,
    y: modelPt.y,
  };
}

/**
 * Pure deterministic reducer/dispatcher for GeometryState
 * Single source of geometric truth for constructions.
 */
export function dispatchGeometryCommand(
  state: FullGeometryState,
  command: GeometryCommand
): FullGeometryState {
  switch (command.type) {
    case 'ADD_POINT': {
      const nextCount = state.pointCounter + 1;
      const id = command.point.id || `P${nextCount}`;
      const name = command.point.name || `P${nextCount}`;
      const x = command.point.x;
      const y = command.point.y;

      let onCircle = command.point.onCircle ?? false;
      let u = command.point.u;

      const distFromCenter = Math.hypot(x, y);
      if (Math.abs(distFromCenter - state.R) < 1.0) {
        onCircle = true;
        if (u === undefined) {
          const angle = Math.atan2(y, x);
          let normAngle = angle / (2 * Math.PI);
          if (normAngle < 0) normAngle += 1;
          u = normalizeU(normAngle);
        }
      }

      const newPoint: GeometryPoint = {
        id,
        name,
        x,
        y,
        u,
        onCircle,
        isBaseVertex: false,
        color: command.point.color || (command.point.role === 'auxiliary' ? '#8B5CF6' : '#475569'),
        role: command.point.role || 'primary',
        provenance: command.point.provenance,
        parentIds: command.point.parentIds,
      };

      return {
        ...state,
        points: {
          ...state.points,
          [id]: newPoint,
        },
        pointCounter: nextCount,
      };
    }

    case 'ADD_SEGMENT': {
      const { p1Id, p2Id } = command.segment;
      if (p1Id === p2Id) return state; // Degenerate segment rejected
      const p1 = state.points[p1Id];
      const p2 = state.points[p2Id];
      if (!p1 || !p2) return state;

      // Duplicate check (undirected segment between p1 and p2)
      const existing = Object.values(state.segments).find(
        (s) =>
          (s.p1Id === p1Id && s.p2Id === p2Id) ||
          (s.p1Id === p2Id && s.p2Id === p1Id)
      );
      if (existing) return state;

      const nextCount = state.segmentCounter + 1;
      const id = command.segment.id || `seg_${nextCount}`;
      const length = calculateEuclideanDistance(p1, p2);

      const newSegment: GeometrySegment = {
        id,
        p1Id,
        p2Id,
        length,
        isBaseChord: false,
        color: command.segment.color || (command.segment.role === 'auxiliary' ? '#A78BFA' : '#0284C7'),
        role: command.segment.role || 'primary',
        provenance: command.segment.provenance,
      };

      return {
        ...state,
        segments: {
          ...state.segments,
          [id]: newSegment,
        },
        segmentCounter: nextCount,
      };
    }

    case 'ADD_LINE': {
      const { p1Id, p2Id } = command.line;
      if (p1Id === p2Id) return state; // Degenerate line rejected
      const p1 = state.points[p1Id];
      const p2 = state.points[p2Id];
      if (!p1 || !p2) return state;

      // Duplicate check (undirected line through two points)
      const existing = Object.values(state.lines).find(
        (l) =>
          (l.p1Id === p1Id && l.p2Id === p2Id) ||
          (l.p1Id === p2Id && l.p2Id === p1Id)
      );
      if (existing) return state;

      const nextCount = state.lineCounter + 1;
      const id = command.line.id || `line_${nextCount}`;

      const newLine: GeometryLine = {
        id,
        p1Id,
        p2Id,
        color: command.line.color || (command.line.role === 'auxiliary' ? '#94A3B8' : '#0D9488'),
        role: command.line.role || 'primary',
        provenance: command.line.provenance,
      };

      return {
        ...state,
        lines: {
          ...state.lines,
          [id]: newLine,
        },
        lineCounter: nextCount,
      };
    }

    case 'ADD_CIRCLE': {
      const { centerId, radiusPointId, radius } = command.circle;
      const center = state.points[centerId];
      if (!center) return state;

      let r = radius;
      if (radiusPointId) {
        const radPt = state.points[radiusPointId];
        if (radPt) {
          r = calculateEuclideanDistance(center, radPt);
        }
      }

      if (r === undefined || r <= 1e-4) return state; // Degenerate radius rejected

      // Duplicate check
      if (radiusPointId) {
        const existing = Object.values(state.circles).find(
          (c) => c.centerId === centerId && c.radiusPointId === radiusPointId
        );
        if (existing) return state;
      }

      const nextCount = state.circleCounter + 1;
      const id = command.circle.id || `circle_${nextCount}`;

      const newCircle: GeometryCircle = {
        id,
        centerId,
        radiusPointId,
        radius: r,
        isBaseCircumcircle: false,
        color: command.circle.color || (command.circle.role === 'auxiliary' ? 'rgba(124, 58, 237, 0.45)' : '#7C3AED'),
        role: command.circle.role || 'primary',
        provenance: command.circle.provenance,
      };

      return {
        ...state,
        circles: {
          ...state.circles,
          [id]: newCircle,
        },
        circleCounter: nextCount,
      };
    }

    case 'BATCH_COMMANDS': {
      return command.commands.reduce(
        (accState, cmd) => dispatchGeometryCommand(accState, cmd),
        state
      );
    }

    case 'MOVE_POINT': {
      const { pointId, x, y, u } = command;
      const pt = state.points[pointId];
      if (!pt) return state;

      // Updating base vertices (A, B, C)
      if (pt.isBaseVertex && (pointId === 'A' || pointId === 'B' || pointId === 'C')) {
        const vId = pointId as VertexId;
        const normU = u !== undefined ? normalizeU(u) : normalizeU(Math.atan2(y, x) / (2 * Math.PI));
        const updatedPointsU = {
          ...state.pointsU,
          [vId]: normU,
        };
        return dispatchGeometryCommand(state, {
          type: 'SYNC_BASE_POINTS',
          pointsU: updatedPointsU,
          R: state.R,
        });
      }

      if (pointId === 'O') {
        // Circumcenter O is fixed in model coordinates
        return state;
      }

      // User constructed point
      const updatedPoint: GeometryPoint = {
        ...pt,
        x,
        y,
        u,
      };

      const updatedPoints = {
        ...state.points,
        [pointId]: updatedPoint,
      };

      // Recalculate lengths of attached segments
      const updatedSegments = { ...state.segments };
      for (const [sId, seg] of Object.entries(updatedSegments)) {
        if (seg.p1Id === pointId || seg.p2Id === pointId) {
          const p1 = updatedPoints[seg.p1Id];
          const p2 = updatedPoints[seg.p2Id];
          if (p1 && p2) {
            updatedSegments[sId] = {
              ...seg,
              length: calculateEuclideanDistance(p1, p2),
            };
          }
        }
      }

      // Recalculate radii of attached circles
      const updatedCircles = { ...state.circles };
      for (const [cId, circ] of Object.entries(updatedCircles)) {
        if (circ.centerId === pointId || circ.radiusPointId === pointId) {
          const center = updatedPoints[circ.centerId];
          const radPt = circ.radiusPointId ? updatedPoints[circ.radiusPointId] : null;
          if (center && radPt) {
            updatedCircles[cId] = {
              ...circ,
              radius: calculateEuclideanDistance(center, radPt),
            };
          }
        }
      }

      const updatedState: FullGeometryState = {
        ...state,
        points: updatedPoints,
        segments: updatedSegments,
        circles: updatedCircles,
      };

      return recomputeDependentGeometry(updatedState);
    }

    case 'ERASE_OBJECT': {
      const objectType = command.target ? command.target.type : command.objectType;
      const id = command.target ? command.target.id : command.id;
      if (!id || !objectType) return state;

      // Base elements cannot be deleted
      if (id === 'O' || id === 'A' || id === 'B' || id === 'C') return state;
      if (id === 'chord_AB' || id === 'chord_BC' || id === 'chord_CA') return state;
      if (id === 'base_circle') return state;
      if (state.points[id]?.isBaseVertex) return state;
      if (state.segments[id]?.isBaseChord) return state;
      if (state.circles[id]?.isBaseCircumcircle) return state;

      if (objectType === 'point') {
        const targetPt = state.points[id];
        if (!targetPt) return state;

        // Find any macro groups where this point is a source or owner
        const impactedGroupIds = new Set<string>();
        if (targetPt.provenance?.groupId) {
          impactedGroupIds.add(targetPt.provenance.groupId);
        }
        // Also check if this point was a source for any other objects
        for (const obj of [
          ...Object.values(state.points),
          ...Object.values(state.segments),
          ...Object.values(state.lines),
          ...Object.values(state.circles),
        ]) {
          if (obj.provenance?.sourceIds?.includes(id)) {
            impactedGroupIds.add(obj.provenance.groupId);
          }
        }

        const nextPoints = { ...state.points };
        delete nextPoints[id];

        // Delete auxiliary points belonging to impacted groups
        for (const [pId, p] of Object.entries(nextPoints)) {
          if (!p.isBaseVertex && p.provenance?.groupId && impactedGroupIds.has(p.provenance.groupId)) {
            delete nextPoints[pId];
          }
        }

        // Cascade delete dependent segments
        const nextSegments = { ...state.segments };
        for (const [sId, s] of Object.entries(nextSegments)) {
          if (!s.isBaseChord) {
            if (
              s.p1Id === id ||
              s.p2Id === id ||
              !nextPoints[s.p1Id] ||
              !nextPoints[s.p2Id] ||
              (s.provenance?.groupId && impactedGroupIds.has(s.provenance.groupId))
            ) {
              delete nextSegments[sId];
            }
          }
        }

        // Cascade delete dependent lines
        const nextLines = { ...state.lines };
        for (const [lId, l] of Object.entries(nextLines)) {
          if (
            l.p1Id === id ||
            l.p2Id === id ||
            !nextPoints[l.p1Id] ||
            !nextPoints[l.p2Id] ||
            (l.provenance?.groupId && impactedGroupIds.has(l.provenance.groupId))
          ) {
            delete nextLines[lId];
          }
        }

        // Cascade delete dependent circles
        const nextCircles = { ...state.circles };
        for (const [cId, c] of Object.entries(nextCircles)) {
          if (!c.isBaseCircumcircle) {
            if (
              c.centerId === id ||
              c.radiusPointId === id ||
              !nextPoints[c.centerId] ||
              (c.radiusPointId && !nextPoints[c.radiusPointId]) ||
              (c.provenance?.groupId && impactedGroupIds.has(c.provenance.groupId))
            ) {
              delete nextCircles[cId];
            }
          }
        }

        return {
          ...state,
          points: nextPoints,
          segments: nextSegments,
          lines: nextLines,
          circles: nextCircles,
        };
      }

      if (objectType === 'segment') {
        const seg = state.segments[id];
        if (!seg || seg.isBaseChord) return state;
        const nextSegments = { ...state.segments };
        delete nextSegments[id];
        return { ...state, segments: nextSegments };
      }

      if (objectType === 'line') {
        const line = state.lines[id];
        if (!line) return state;
        const groupId = line.provenance?.groupId;

        const nextLines = { ...state.lines };
        delete nextLines[id];

        // If this line was the primary result of a macro, cascade-delete its auxiliary helpers
        if (groupId && line.role === 'primary') {
          const nextPoints = { ...state.points };
          for (const [pId, p] of Object.entries(nextPoints)) {
            if (!p.isBaseVertex && p.role === 'auxiliary' && p.provenance?.groupId === groupId) {
              delete nextPoints[pId];
            }
          }

          const nextCircles = { ...state.circles };
          for (const [cId, c] of Object.entries(nextCircles)) {
            if (!c.isBaseCircumcircle && c.role === 'auxiliary' && c.provenance?.groupId === groupId) {
              delete nextCircles[cId];
            }
          }

          return {
            ...state,
            points: nextPoints,
            lines: nextLines,
            circles: nextCircles,
          };
        }

        return { ...state, lines: nextLines };
      }

      if (objectType === 'circle') {
        const circ = state.circles[id];
        if (!circ || circ.isBaseCircumcircle) return state;
        const groupId = circ.provenance?.groupId;

        const nextCircles = { ...state.circles };
        delete nextCircles[id];

        // If an auxiliary or primary macro circle is erased, clean up the whole macro group
        if (groupId) {
          const nextPoints = { ...state.points };
          for (const [pId, p] of Object.entries(nextPoints)) {
            if (!p.isBaseVertex && p.provenance?.groupId === groupId) {
              delete nextPoints[pId];
            }
          }

          const nextLines = { ...state.lines };
          for (const [lId, l] of Object.entries(nextLines)) {
            if (l.provenance?.groupId === groupId) {
              delete nextLines[lId];
            }
          }

          for (const [cId, c] of Object.entries(nextCircles)) {
            if (!c.isBaseCircumcircle && c.provenance?.groupId === groupId) {
              delete nextCircles[cId];
            }
          }

          return {
            ...state,
            points: nextPoints,
            lines: nextLines,
            circles: nextCircles,
          };
        }

        return { ...state, circles: nextCircles };
      }

      return state;
    }

    case 'SYNC_BASE_POINTS': {
      const { pointsU, R } = command;
      const normA = normalizeU(pointsU.A);
      const normB = normalizeU(pointsU.B);
      const normC = normalizeU(pointsU.C);

      const ptA: GeometryPoint = {
        ...state.points.A,
        id: 'A',
        name: 'A',
        x: R * Math.cos(normA * 2 * Math.PI),
        y: R * Math.sin(normA * 2 * Math.PI),
        u: normA,
        onCircle: true,
        isBaseVertex: true,
      };

      const ptB: GeometryPoint = {
        ...state.points.B,
        id: 'B',
        name: 'B',
        x: R * Math.cos(normB * 2 * Math.PI),
        y: R * Math.sin(normB * 2 * Math.PI),
        u: normB,
        onCircle: true,
        isBaseVertex: true,
      };

      const ptC: GeometryPoint = {
        ...state.points.C,
        id: 'C',
        name: 'C',
        x: R * Math.cos(normC * 2 * Math.PI),
        y: R * Math.sin(normC * 2 * Math.PI),
        u: normC,
        onCircle: true,
        isBaseVertex: true,
      };

      const nextPoints = {
        ...state.points,
        A: ptA,
        B: ptB,
        C: ptC,
      };

      const nextSegments = {
        ...state.segments,
        chord_AB: {
          ...state.segments.chord_AB,
          length: calculateEuclideanDistance(ptA, ptB),
        },
        chord_BC: {
          ...state.segments.chord_BC,
          length: calculateEuclideanDistance(ptB, ptC),
        },
        chord_CA: {
          ...state.segments.chord_CA,
          length: calculateEuclideanDistance(ptC, ptA),
        },
      };

      // Also update base circle if radius changed
      const nextCircles = {
        ...state.circles,
        base_circle: {
          ...state.circles.base_circle,
          radius: R,
        },
      };

      const syncedState: FullGeometryState = {
        ...state,
        R,
        pointsU: { ...pointsU },
        points: nextPoints,
        segments: nextSegments,
        circles: nextCircles,
      };

      return recomputeDependentGeometry(syncedState);
    }

    case 'CLEAR_USER_CONSTRUCTIONS': {
      // Reverts to pure base circumcircle and triangle
      return createDefaultGeometryState(state.pointsU, state.R);
    }

    default:
      return state;
  }
}
