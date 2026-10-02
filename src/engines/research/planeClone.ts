// src/engines/research/planeClone.ts
// Deep cloning and Plane 1 -> Plane 2 workspace instantiation for Triangle Stand
// Ensures ZERO shared mutable references between Plane 1 and Plane 2

import {
  FullGeometryState,
  GeometryPoint,
  GeometrySegment,
  GeometryLine,
  GeometryCircle,
  GeometryProvenance,
} from '../constructionCore';
import {
  TriangleResearchSession,
  Plane2WorkspaceState,
  PortableIdentityMapping,
} from './types';

/**
  Deeply clones a FullGeometryState without shared mutable references.
 */
export function deepCloneGeometryState(source: FullGeometryState): FullGeometryState {
  const cloneProvenance = (prov?: GeometryProvenance): GeometryProvenance | undefined => {
    if (!prov) return undefined;
    return {
      macroType: prov.macroType,
      sourceIds: [...prov.sourceIds],
      groupId: prov.groupId,
    };
  };

  const clonedPoints: Record<string, GeometryPoint> = {};
  for (const [id, pt] of Object.entries(source.points)) {
    clonedPoints[id] = {
      id: pt.id,
      name: pt.name,
      x: pt.x,
      y: pt.y,
      u: pt.u,
      onCircle: pt.onCircle,
      isBaseVertex: pt.isBaseVertex,
      color: pt.color,
      role: pt.role,
      provenance: cloneProvenance(pt.provenance),
      parentIds: pt.parentIds ? [...pt.parentIds] : undefined,
    };
  }

  const clonedSegments: Record<string, GeometrySegment> = {};
  for (const [id, seg] of Object.entries(source.segments)) {
    clonedSegments[id] = {
      id: seg.id,
      p1Id: seg.p1Id,
      p2Id: seg.p2Id,
      length: seg.length,
      isBaseChord: seg.isBaseChord,
      color: seg.color,
      role: seg.role,
      provenance: cloneProvenance(seg.provenance),
    };
  }

  const clonedLines: Record<string, GeometryLine> = {};
  for (const [id, line] of Object.entries(source.lines)) {
    clonedLines[id] = {
      id: line.id,
      p1Id: line.p1Id,
      p2Id: line.p2Id,
      color: line.color,
      role: line.role,
      provenance: cloneProvenance(line.provenance),
    };
  }

  const clonedCircles: Record<string, GeometryCircle> = {};
  for (const [id, circle] of Object.entries(source.circles)) {
    clonedCircles[id] = {
      id: circle.id,
      centerId: circle.centerId,
      radiusPointId: circle.radiusPointId,
      radius: circle.radius,
      isBaseCircumcircle: circle.isBaseCircumcircle,
      color: circle.color,
      role: circle.role,
      provenance: cloneProvenance(circle.provenance),
    };
  }

  return {
    R: source.R,
    pointsU: { ...source.pointsU },
    points: clonedPoints,
    segments: clonedSegments,
    lines: clonedLines,
    circles: clonedCircles,
    pointCounter: source.pointCounter,
    segmentCounter: source.segmentCounter,
    lineCounter: source.lineCounter,
    circleCounter: source.circleCounter,
  };
}

/**
 * Builds initial identity registry for a cloned state from Plane 1
 */
export function buildIdentityRegistryForState(
  state: FullGeometryState,
  source: 'cloned_from_plane1' | 'imported' | 'agent_created'
): Record<string, PortableIdentityMapping> {
  const registry: Record<string, PortableIdentityMapping> = {};

  // Points
  for (const [id, pt] of Object.entries(state.points)) {
    const portableId = id === 'A' ? 'pt_A' : id === 'B' ? 'pt_B' : id === 'C' ? 'pt_C' : id === 'O' ? 'pt_O' : `pt_${id}`;
    registry[id] = {
      portableId,
      localId: id,
      displayLabel: pt.name || id,
      source,
    };
  }

  // Segments
  for (const [id, seg] of Object.entries(state.segments)) {
    const portableId = id === 'chord_AB' ? 'edge_AB' : id === 'chord_BC' ? 'edge_BC' : id === 'chord_CA' ? 'edge_CA' : `seg_${id}`;
    registry[id] = {
      portableId,
      localId: id,
      displayLabel: id,
      source,
    };
  }

  // Lines
  for (const [id] of Object.entries(state.lines)) {
    registry[id] = {
      portableId: `line_${id}`,
      localId: id,
      displayLabel: id,
      source,
    };
  }

  // Circles
  for (const [id] of Object.entries(state.circles)) {
    const portableId = id === 'base_circle' ? 'circle_circumcircle' : `circle_${id}`;
    registry[id] = {
      portableId,
      localId: id,
      displayLabel: id,
      source,
    };
  }

  return registry;
}

/**
 * Clones Plane 1 into Plane 2 within a Research Session.
 */
export function clonePlane1ToPlane2(session: TriangleResearchSession): TriangleResearchSession {
  const clonedGeometryState = deepCloneGeometryState(session.plane1);
  const identityRegistry = buildIdentityRegistryForState(clonedGeometryState, 'cloned_from_plane1');

  const plane2Workspace: Plane2WorkspaceState = {
    geometryState: clonedGeometryState,
    sourceType: 'plane1_clone',
    identityRegistry,
    isModified: false,
    createdAt: new Date().toISOString(),
  };

  return {
    ...session,
    plane2: plane2Workspace,
    activePlane: 'PLANE_2',
    plane2Lifecycle: 'BUILDING',
    overlay: session.overlay || { enabled: false, mix: 0.5 },
  };
}
