// src/engines/research/constructionTrace.ts
// Deterministic structural/topological ConstructionTrace reconstruction.
// CRITICAL: This is a structural dependency graph reconstruction, NOT an exact historical event log.

import { FullGeometryState } from '../constructionCore';
import { ConstructionTrace, StructuralTraceNode, ConstructionGroupSummary } from './researchTypes';

/**
 * Reconstructs a deterministic structural and topological trace of all geometric entities.
 * Evaluates entity roles, provenance, parent-child dependencies, and group structures.
 */
export function buildConstructionTrace(state: FullGeometryState): ConstructionTrace {
  const nodes: StructuralTraceNode[] = [];
  const depthMap = new Map<string, number>();

  // 1. Determine base elements (depth = 0)
  // Base vertices A, B, C, center O, base circumcircle, base chords
  for (const pt of Object.values(state.points)) {
    if (pt.isBaseVertex || pt.id === 'pt_O' || (!pt.provenance && (!pt.parentIds || pt.parentIds.length === 0))) {
      depthMap.set(pt.id, 0);
    }
  }

  for (const circle of Object.values(state.circles)) {
    if (circle.isBaseCircumcircle || (!circle.provenance && !circle.radiusPointId)) {
      depthMap.set(circle.id, 0);
    }
  }

  for (const seg of Object.values(state.segments)) {
    if (seg.isBaseChord || (!seg.provenance && seg.p1Id && seg.p2Id && (depthMap.get(seg.p1Id) === 0) && (depthMap.get(seg.p2Id) === 0))) {
      depthMap.set(seg.id, 0);
    }
  }

  // 2. Iteratively compute depth for derived and auxiliary objects
  let changed = true;
  let maxIterations = 10;
  while (changed && maxIterations-- > 0) {
    changed = false;

    // Points
    for (const pt of Object.values(state.points)) {
      if (depthMap.has(pt.id)) continue;
      const parents = pt.parentIds || (pt.provenance ? pt.provenance.sourceIds : []);
      if (parents.length > 0 && parents.every((pId) => depthMap.has(pId))) {
        const maxPDepth = Math.max(...parents.map((pId) => depthMap.get(pId) || 0));
        depthMap.set(pt.id, maxPDepth + 1);
        changed = true;
      }
    }

    // Circles
    for (const circle of Object.values(state.circles)) {
      if (depthMap.has(circle.id)) continue;
      const parents = [circle.centerId, circle.radiusPointId].filter((id): id is string => Boolean(id));
      if (circle.provenance) {
        const sIds = circle.provenance.sourceIds || (circle.provenance as any).sourceEntityIds || [];
        parents.push(...sIds);
      }
      if (parents.length > 0 && parents.every((pId) => depthMap.has(pId))) {
        const maxPDepth = Math.max(...parents.map((pId) => depthMap.get(pId) || 0));
        depthMap.set(circle.id, maxPDepth + 1);
        changed = true;
      }
    }

    // Lines
    for (const line of Object.values(state.lines)) {
      if (depthMap.has(line.id)) continue;
      const parents = [line.p1Id, line.p2Id].filter(Boolean);
      if (line.provenance) {
        const sIds = line.provenance.sourceIds || (line.provenance as any).sourceEntityIds || [];
        parents.push(...sIds);
      }
      if (parents.length > 0 && parents.every((pId) => depthMap.has(pId))) {
        const maxPDepth = Math.max(...parents.map((pId) => depthMap.get(pId) || 0));
        depthMap.set(line.id, maxPDepth + 1);
        changed = true;
      }
    }

    // Segments
    for (const seg of Object.values(state.segments)) {
      if (depthMap.has(seg.id)) continue;
      const parents = [seg.p1Id, seg.p2Id].filter(Boolean);
      if (seg.provenance) {
        const sIds = seg.provenance.sourceIds || (seg.provenance as any).sourceEntityIds || [];
        parents.push(...sIds);
      }
      if (parents.length > 0 && parents.every((pId) => depthMap.has(pId))) {
        const maxPDepth = Math.max(...parents.map((pId) => depthMap.get(pId) || 0));
        depthMap.set(seg.id, maxPDepth + 1);
        changed = true;
      }
    }
  }

  // Assign fallback depth 1 for remaining unclassified elements
  const allIds = [
    ...Object.keys(state.points),
    ...Object.keys(state.circles),
    ...Object.keys(state.lines),
    ...Object.keys(state.segments),
  ];
  for (const id of allIds) {
    if (!depthMap.has(id)) {
      depthMap.set(id, 1);
    }
  }

  // 3. Assemble structural trace nodes
  for (const pt of Object.values(state.points)) {
    const parents = pt.parentIds || (pt.provenance ? pt.provenance.sourceIds : []);
    nodes.push({
      id: pt.id,
      kind: 'point',
      name: pt.name,
      role: pt.role || (pt.isBaseVertex || pt.id === 'pt_O' ? 'primary' : 'primary'),
      depth: depthMap.get(pt.id) || 0,
      groupId: pt.provenance?.groupId,
      provenance: pt.provenance,
      parentIds: parents,
    });
  }

  for (const circle of Object.values(state.circles)) {
    const parents = [circle.centerId, circle.radiusPointId].filter((id): id is string => Boolean(id));
    if (circle.provenance) {
      const sIds = circle.provenance.sourceIds || (circle.provenance as any).sourceEntityIds || [];
      parents.push(...sIds);
    }
    nodes.push({
      id: circle.id,
      kind: 'circle',
      name: circle.isBaseCircumcircle ? 'Окружность (R)' : `Окружность (${circle.id})`,
      role: circle.role || (circle.isBaseCircumcircle ? 'primary' : 'auxiliary'),
      depth: depthMap.get(circle.id) || 0,
      groupId: circle.provenance?.groupId,
      provenance: circle.provenance,
      parentIds: parents,
    });
  }

  for (const line of Object.values(state.lines)) {
    const parents = [line.p1Id, line.p2Id].filter(Boolean);
    if (line.provenance) {
      const sIds = line.provenance.sourceIds || (line.provenance as any).sourceEntityIds || [];
      parents.push(...sIds);
    }
    nodes.push({
      id: line.id,
      kind: 'line',
      name: `Прямая (${state.points[line.p1Id]?.name || line.p1Id}-${state.points[line.p2Id]?.name || line.p2Id})`,
      role: line.role || 'primary',
      depth: depthMap.get(line.id) || 0,
      groupId: line.provenance?.groupId,
      provenance: line.provenance,
      parentIds: parents,
    });
  }

  for (const seg of Object.values(state.segments)) {
    const parents = [seg.p1Id, seg.p2Id].filter(Boolean);
    if (seg.provenance) {
      const sIds = seg.provenance.sourceIds || (seg.provenance as any).sourceEntityIds || [];
      parents.push(...sIds);
    }
    nodes.push({
      id: seg.id,
      kind: 'segment',
      name: `Отрезок [${state.points[seg.p1Id]?.name || seg.p1Id}${state.points[seg.p2Id]?.name || seg.p2Id}]`,
      role: seg.role || 'primary',
      depth: depthMap.get(seg.id) || 0,
      groupId: seg.provenance?.groupId,
      provenance: seg.provenance,
      parentIds: parents,
    });
  }

  // Deterministic sorting: depth ASC, kind priority ('point' -> 'circle' -> 'line' -> 'segment'), then id ASC
  const kindPriority: Record<string, number> = { point: 1, circle: 2, line: 3, segment: 4 };
  nodes.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    const kpA = kindPriority[a.kind] || 99;
    const kpB = kindPriority[b.kind] || 99;
    if (kpA !== kpB) return kpA - kpB;
    return a.id.localeCompare(b.id);
  });

  // 4. Summarize groups
  const groupMap = new Map<string, ConstructionGroupSummary>();
  for (const n of nodes) {
    if (!n.groupId || !n.provenance) continue;
    const g = groupMap.get(n.groupId) || {
      groupId: n.groupId,
      macroType: n.provenance.macroType,
      primaryId: '',
      auxiliaryCount: 0,
      allEntityIds: [],
    };
    g.allEntityIds.push(n.id);
    if (n.role === 'primary') {
      g.primaryId = n.id;
    } else if (n.role === 'auxiliary') {
      g.auxiliaryCount++;
    }
    groupMap.set(n.groupId, g);
  }

  const groups = Array.from(groupMap.values()).sort((a, b) => a.groupId.localeCompare(b.groupId));
  const maxTopologicalDepth = nodes.length > 0 ? Math.max(...nodes.map((n) => n.depth)) : 0;

  return {
    isHistoricalLog: false,
    structuralNote:
      'Deterministic structural/topological reconstruction from entity provenance, groupId, parentIds, and role. Not an exact historical event sequence.',
    nodes,
    groups,
    totalEntities: nodes.length,
    maxTopologicalDepth,
  };
}
