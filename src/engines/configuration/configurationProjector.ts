// src/engines/configuration/configurationProjector.ts
// Pure, deterministic semantic projection engine for GCM-01: Geometry Configuration View.
// Principles:
// 1. "The Stand must not lie."
// 2. Read-only, transient projection over existing GeometryState, Construction DAG, and Research Graph.
// 3. ZERO timestamps, ZERO random generators, ZERO mutations.
// 4. Guaranteed byte-for-byte reproducibility.

import { FullGeometryState, GeometryRole } from '../constructionCore';
import { deriveChordArcRelations, deriveCentralInscribedRelations } from '../research/derivedRelations';
import { buildConstructionTrace } from '../research/constructionTrace';
import { evaluateResearchObservations } from '../research/observationModel';
import { buildResearchGraph } from '../research/researchGraph';
import {
  ConfigurationCategory,
  ConfigurationEntityKind,
  ConfigurationEpistemicEntry,
  ConfigurationRecord,
  ConfigurationSummary,
  ConfigurationTopologyEdge,
  ConfigurationTopologyNode,
  ConfigurationViewOptions,
  GeometryConfigurationView,
} from './types';
import { EpistemicStatus } from '../research/researchTypes';
import {
  extractSemanticQuantities,
  findSemanticQuantitiesByEntity,
  SemanticQuantity,
} from './semanticQuantity';
import {
  extractSemanticConstructions,
  extractSemanticRelations,
  findSemanticConstructionByEntity,
  findSemanticRelationsByEntity,
  SemanticConstruction,
  SemanticRelation,
} from './semanticRelation';

/**
 * Pure function: Builds an immutable, unified GeometryConfigurationView DTO from existing geometry state.
 * Never mutates state or creates background storage.
 */
export function buildConfigurationView(
  state: FullGeometryState,
  options: ConfigurationViewOptions = {}
): GeometryConfigurationView {
  const scale = options.scale ?? 1.0;
  const includeAuxiliary = options.includeAuxiliary ?? true;

  // 1. Derive dependencies from canonical layers
  const chordArcRelations = deriveChordArcRelations(state, scale);
  const centralInscribedRelations = deriveCentralInscribedRelations(state.pointsU, state.R);
  const constructionTrace = buildConstructionTrace(state);
  const observations = evaluateResearchObservations(state, chordArcRelations, scale);
  const researchGraph = buildResearchGraph([], state, constructionTrace);

  // Map of topological node depths
  const traceDepthMap = new Map<string, number>();
  for (const node of constructionTrace.nodes) {
    traceDepthMap.set(node.id, node.depth);
  }

  // Map of verified theorems by canonical rule or target
  const theoremRuleMap = new Map<string, string>();
  for (const thm of researchGraph.nodes.theorems) {
    theoremRuleMap.set(thm.canonicalRuleId, thm.id);
  }

  // Pre-calculate child linkages
  const childLinksMap = new Map<string, string[]>();
  const registerChild = (parentId: string, childId: string) => {
    const list = childLinksMap.get(parentId) || [];
    if (!list.includes(childId)) {
      list.push(childId);
      childLinksMap.set(parentId, list);
    }
  };

  const records: ConfigurationRecord[] = [];

  // --- A. POINTS ---
  for (const point of Object.values(state.points)) {
    const isBase = Boolean(point.isBaseVertex || point.id === 'O');
    const category: ConfigurationCategory = isBase ? 'base_primitive' : 'topological_construction';
    const parents = point.parentIds ? [...point.parentIds] : (point.provenance?.sourceIds ? [...point.provenance.sourceIds] : []);
    const depth = traceDepthMap.get(point.id) ?? (isBase ? 0 : 1);

    for (const p of parents) {
      registerChild(p, point.id);
    }

    const distToCenter = Math.hypot(point.x, point.y) * scale;
    const role: GeometryRole = point.role ?? (isBase ? 'primary' : 'auxiliary');
    const record: ConfigurationRecord = {
      id: point.id,
      name: point.name || point.id,
      kind: 'point',
      category,
      role,
      depth,
      parentIds: Object.freeze(parents),
      childIds: Object.freeze([]), // will be populated in second pass
      parameters: Object.freeze({
        u: point.u !== undefined ? Number(point.u.toFixed(6)) : 'N/A',
        x: Number((point.x * scale).toFixed(2)),
        y: Number((point.y * scale).toFixed(2)),
        isBaseVertex: Boolean(point.isBaseVertex),
        onCircle: Boolean(point.onCircle || point.isBaseVertex),
      }),
      metrics: Object.freeze({
        x_mm: Number((point.x * scale).toFixed(2)),
        y_mm: Number((point.y * scale).toFixed(2)),
        distToOrigin_mm: Number(distToCenter.toFixed(2)),
      }),
      epistemicStatus: isBase ? 'FACT' : 'FACT',
      provenanceNote: point.provenance ? `Построено через ${point.provenance.macroType} от [${point.provenance.sourceIds.join(', ')}]` : (isBase ? 'Базовая вершина / центр треугольника' : 'Построенная точка'),
      isProven: true,
      tags: Object.freeze([role, point.onCircle ? 'on_circumcircle' : 'interior_point']),
    };

    records.push(record);
  }

  // --- B. SEGMENTS ---
  for (const seg of Object.values(state.segments)) {
    const isBase = Boolean(seg.isBaseChord || seg.id.startsWith('chord_'));
    const category: ConfigurationCategory = isBase ? 'base_primitive' : 'topological_construction';
    const parents = [seg.p1Id, seg.p2Id];
    const depth = traceDepthMap.get(seg.id) ?? (isBase ? 0 : 1);

    for (const p of parents) {
      registerChild(p, seg.id);
    }

    const p1 = state.points[seg.p1Id];
    const p2 = state.points[seg.p2Id];
    const angleRad = p1 && p2 ? Math.atan2(p2.y - p1.y, p2.x - p1.x) : 0;
    const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;
    const segName = `Отрезок [${seg.p1Id}${seg.p2Id}]`;
    const role: GeometryRole = seg.role ?? (isBase ? 'primary' : 'auxiliary');

    const record: ConfigurationRecord = {
      id: seg.id,
      name: segName,
      kind: 'segment',
      category,
      role,
      depth,
      parentIds: Object.freeze(parents),
      childIds: Object.freeze([]),
      parameters: Object.freeze({
        p1Id: seg.p1Id,
        p2Id: seg.p2Id,
        isBaseChord: Boolean(seg.isBaseChord),
      }),
      metrics: Object.freeze({
        length_mm: Number((seg.length * scale).toFixed(2)),
        directionAngle_deg: Number(angleDeg.toFixed(1)),
      }),
      epistemicStatus: 'MEASUREMENT',
      provenanceNote: seg.provenance ? `Макрос ${seg.provenance.macroType} от [${seg.provenance.sourceIds.join(', ')}]` : `Отрезок [${seg.p1Id}${seg.p2Id}]`,
      isProven: true,
      tags: Object.freeze([role, seg.isBaseChord ? 'polygon_edge' : 'auxiliary_segment']),
    };

    records.push(record);
  }

  // --- C. LINES ---
  for (const line of Object.values(state.lines)) {
    const parents = [line.p1Id, line.p2Id];
    const depth = traceDepthMap.get(line.id) ?? 1;

    for (const p of parents) {
      registerChild(p, line.id);
    }

    const p1 = state.points[line.p1Id];
    const p2 = state.points[line.p2Id];
    const isVert = Boolean(p1 && p2 && Math.abs(p2.x - p1.x) < 1e-6);
    const slopeVal = p1 && p2 && !isVert ? (p2.y - p1.y) / (p2.x - p1.x) : 0;
    const lineName = `Прямая (${line.p1Id}${line.p2Id})`;
    const role: GeometryRole = line.role ?? 'auxiliary';

    const record: ConfigurationRecord = {
      id: line.id,
      name: lineName,
      kind: 'line',
      category: 'topological_construction',
      role,
      depth,
      parentIds: Object.freeze(parents),
      childIds: Object.freeze([]),
      parameters: Object.freeze({
        p1Id: line.p1Id,
        p2Id: line.p2Id,
        isVertical: isVert,
      }),
      metrics: Object.freeze({
        slope: isVert ? 'VERTICAL' : Number(slopeVal.toFixed(3)),
      }),
      epistemicStatus: 'FACT',
      provenanceNote: line.provenance ? `Макрос ${line.provenance.macroType} от [${line.provenance.sourceIds.join(', ')}]` : lineName,
      isProven: true,
      tags: Object.freeze([role, 'line']),
    };

    records.push(record);
  }

  // --- D. CIRCLES ---
  for (const circ of Object.values(state.circles)) {
    const isBase = Boolean(circ.isBaseCircumcircle || circ.id === 'base_circle');
    const category: ConfigurationCategory = isBase ? 'base_primitive' : 'topological_construction';
    const parents = [circ.centerId];
    if (circ.radiusPointId) parents.push(circ.radiusPointId);
    const depth = traceDepthMap.get(circ.id) ?? 0;

    for (const p of parents) {
      registerChild(p, circ.id);
    }

    const r_mm = circ.radius * scale;
    const circum = 2 * Math.PI * r_mm;
    const area = Math.PI * r_mm * r_mm;
    const circName = isBase ? 'Описанная окружность' : `Окружность (центр ${circ.centerId}, R=${r_mm.toFixed(1)}мм)`;
    const role: GeometryRole = circ.role ?? (isBase ? 'primary' : 'auxiliary');

    const record: ConfigurationRecord = {
      id: circ.id,
      name: circName,
      kind: 'circle',
      category,
      role,
      depth,
      parentIds: Object.freeze(parents),
      childIds: Object.freeze([]),
      parameters: Object.freeze({
        centerId: circ.centerId,
        radius: Number(r_mm.toFixed(2)),
      }),
      metrics: Object.freeze({
        radius_mm: Number(r_mm.toFixed(2)),
        circumference_mm: Number(circum.toFixed(2)),
        area_mm2: Number(area.toFixed(2)),
      }),
      epistemicStatus: 'FACT',
      provenanceNote: circ.provenance ? `Макрос ${circ.provenance.macroType} от [${circ.provenance.sourceIds.join(', ')}]` : (isBase ? 'Описанная окружность треугольника' : 'Построенная окружность'),
      isProven: true,
      tags: Object.freeze([role, 'circle']),
    };

    records.push(record);
  }

  // --- E. DERIVED CHORD <-> ARC RELATIONS ---
  for (const rel of chordArcRelations) {
    const entityId = `rel_chord_arc_${rel.chordId}`;
    const parents = [rel.chordId, rel.p1Id, rel.p2Id, 'circ_0'];

    for (const p of parents) {
      registerChild(p, entityId);
    }

    const thmId = rel.isDiameter ? theoremRuleMap.get('RULE-THALES-DIAMETER') : theoremRuleMap.get('RULE-CYCLIC-CHORD-METRIC-LAW');
    const isProven = Boolean(thmId);

    const record: ConfigurationRecord = {
      id: entityId,
      name: `Связь [${rel.p1Name}${rel.p2Name}] ↔ Дуга`,
      kind: 'derived_chord_arc',
      category: 'derived_relation',
      role: rel.isDiameter ? 'diameter_chord_arc' : 'cyclic_chord_arc',
      depth: 1,
      parentIds: Object.freeze(parents),
      childIds: Object.freeze([]),
      parameters: Object.freeze({
        chordId: rel.chordId,
        p1Id: rel.p1Id,
        p2Id: rel.p2Id,
        isDiameter: rel.isDiameter,
      }),
      metrics: Object.freeze({
        chordLength_mm: Number(rel.chordLength.toFixed(2)),
        minorArcDeg: Number(rel.minorArcDeg.toFixed(2)),
        minorArcLength_mm: Number(rel.minorArcLength.toFixed(2)),
        majorArcDeg: Number(rel.majorArcDeg.toFixed(2)),
        theoreticalChord_mm: Number(rel.theoreticalChordLength.toFixed(2)),
        ratioToDiameter: Number(rel.ratioChordToDiameter.toFixed(4)),
      }),
      epistemicStatus: isProven ? 'VERIFIED_INVARIANT' : (rel.isDiameter ? 'KNOWN_RELATION_MATCH' : 'CANDIDATE_INVARIANT'),
      provenanceNote: `Хорда c=${rel.chordLength.toFixed(1)} мм стягивает меньшую дугу θ=${rel.minorArcDeg.toFixed(1)}°`,
      theoremId: thmId,
      isProven,
      tags: Object.freeze(['chord_arc_relation', rel.isDiameter ? 'diameter' : 'subtended_arc']),
    };

    records.push(record);
  }

  // --- F. CENTRAL & INSCRIBED ANGLE RELATIONS ---
  for (const rel of centralInscribedRelations) {
    const entityId = `rel_angle_${rel.arcId}`;
    const parents = [rel.arcId, `pt_${rel.inscribedVertexId || 'C'}`];

    for (const p of parents) {
      registerChild(p, entityId);
    }

    const thmId = rel.isRightAngle
      ? theoremRuleMap.get('RULE-THALES-DIAMETER')
      : theoremRuleMap.get('RULE-INSCRIBED-ANGLE');
    const isProven = Boolean(thmId);

    const record: ConfigurationRecord = {
      id: entityId,
      name: `Угол над дугой ${rel.chordLabel}`,
      kind: 'angle',
      category: 'derived_relation',
      role: rel.isRightAngle ? 'thales_right_angle' : 'inscribed_central_angle',
      depth: 1,
      parentIds: Object.freeze(parents),
      childIds: Object.freeze([]),
      parameters: Object.freeze({
        arcId: rel.arcId,
        inscribedVertexId: String(rel.inscribedVertexId || 'C'),
        isRightAngle: rel.isRightAngle,
        relationVerified: rel.relationVerified,
      }),
      metrics: Object.freeze({
        centralAngleDeg: Number(rel.centralAngleDeg.toFixed(2)),
        inscribedAngleDeg: Number((rel.inscribedAngleDeg || 0).toFixed(2)),
        theoreticalInscribedAngleDeg: Number((rel.theoreticalInscribedAngleDeg || 0).toFixed(2)),
      }),
      epistemicStatus: isProven ? 'VERIFIED_INVARIANT' : (rel.relationVerified ? 'KNOWN_RELATION_MATCH' : 'OBSERVATION'),
      provenanceNote: `Вписанный угол α=${(rel.inscribedAngleDeg || 0).toFixed(1)}° = θ/2=${(rel.centralAngleDeg / 2).toFixed(1)}°`,
      theoremId: thmId,
      isProven,
      tags: Object.freeze(['angle_relation', rel.isRightAngle ? 'right_angle' : 'inscribed_angle']),
    };

    records.push(record);
  }

  // 2. Extract rich semantic quantities (Package S-03)
  const allSemanticQuantities = extractSemanticQuantities(state, scale);

  // 3. Extract semantic constructions (S-02) and relations (S-01)
  const allSemanticConstructions = extractSemanticConstructions(state);
  const allSemanticRelations = extractSemanticRelations(state, { scale });

  // Final pass: populate childIds, semanticQuantities, semanticConstruction, and semanticRelations on all records
  const populatedRecords: ConfigurationRecord[] = records.map((rec) => {
    const children = childLinksMap.get(rec.id) || [];
    const entityQuantities = findSemanticQuantitiesByEntity(allSemanticQuantities, rec.id);
    const entityConstruction = findSemanticConstructionByEntity(allSemanticConstructions, rec.id);
    const entityRelations = findSemanticRelationsByEntity(allSemanticRelations, rec.id);

    return Object.freeze({
      ...rec,
      childIds: Object.freeze([...children].sort()),
      semanticQuantities: Object.freeze(entityQuantities),
      semanticConstruction: entityConstruction,
      semanticRelations: Object.freeze(entityRelations),
    });
  });

  // Build Topology Graph
  const topoNodes: ConfigurationTopologyNode[] = populatedRecords.map((r) =>
    Object.freeze({
      id: r.id,
      name: r.name,
      kind: r.kind,
      depth: r.depth,
      parentIds: r.parentIds,
    })
  );

  const topoEdges: ConfigurationTopologyEdge[] = [];
  for (const r of populatedRecords) {
    for (const pid of r.parentIds) {
      topoEdges.push(
        Object.freeze({
          id: `EDGE-${pid}->${r.id}`,
          sourceId: pid,
          targetId: r.id,
          relation: r.kind === 'derived_chord_arc' ? 'SUBTENDS' : 'DEPENDS_ON',
        })
      );
    }
  }

  // Compile Epistemic Registry
  const epistemicRegistry: ConfigurationEpistemicEntry[] = [];

  // From Research Observations
  for (const obs of observations) {
    epistemicRegistry.push(
      Object.freeze({
        entityId: obs.id,
        title: obs.title,
        status: obs.epistemicLevel,
        formula: obs.mathematicalBasis,
        isProven: obs.isFormallyVerified,
        preconditionsSatisfied: obs.isMatch,
        basis: obs.description,
      })
    );
  }

  // From Research Graph Theorems & Hypotheses
  for (const thm of researchGraph.nodes.theorems) {
    epistemicRegistry.push(
      Object.freeze({
        entityId: thm.id,
        title: thm.name,
        status: 'VERIFIED_INVARIANT' as EpistemicStatus,
        formula: thm.formalStatement,
        isProven: true,
        ruleId: thm.canonicalRuleId,
        theoremId: thm.id,
        preconditionsSatisfied: true,
        basis: `Строго доказанная теорема в математическом домене: ${thm.mathematicalDomain}`,
      })
    );
  }

  for (const hyp of researchGraph.nodes.hypotheses) {
    if (!researchGraph.nodes.theorems.some((t) => t.hypothesisId === hyp.id)) {
      epistemicRegistry.push(
        Object.freeze({
          entityId: hyp.id,
          title: hyp.title,
          status: 'CANDIDATE_INVARIANT' as EpistemicStatus,
          formula: hyp.formula,
          isProven: false,
          ruleId: hyp.matchedRuleId,
          preconditionsSatisfied: false,
          basis: hyp.confidenceNote,
        })
      );
    }
  }

  // Compute Summary Statistics
  const pointCount = populatedRecords.filter((r) => r.kind === 'point').length;
  const segmentCount = populatedRecords.filter((r) => r.kind === 'segment').length;
  const lineCount = populatedRecords.filter((r) => r.kind === 'line').length;
  const circleCount = populatedRecords.filter((r) => r.kind === 'circle').length;
  const derivedRelationCount = populatedRecords.filter(
    (r) => r.kind === 'derived_chord_arc' || r.kind === 'angle'
  ).length;
  const verifiedTheoremCount = researchGraph.nodes.theorems.length;
  const candidateHypothesisCount = researchGraph.nodes.hypotheses.length;
  const maxTopologicalDepth = Math.max(0, ...populatedRecords.map((r) => r.depth));

  const summary: ConfigurationSummary = Object.freeze({
    totalRecords: populatedRecords.length,
    pointCount,
    segmentCount,
    lineCount,
    circleCount,
    derivedRelationCount,
    verifiedTheoremCount,
    candidateHypothesisCount,
    maxTopologicalDepth,
    semanticQuantityCount: allSemanticQuantities.length,
    semanticRelationCount: allSemanticRelations.length,
    semanticConstructionCount: allSemanticConstructions.length,
    circumradius: Number((state.R * scale).toFixed(2)),
    scale,
  });

  const configurationId = `CONFIG-A${state.pointsU.A.toFixed(4)}_B${state.pointsU.B.toFixed(4)}_C${state.pointsU.C.toFixed(4)}-R${state.R}-S${scale}`;

  return Object.freeze({
    schemaVersion: '1.0.0',
    configurationId,
    timestampFree: true,
    summary,
    records: Object.freeze(populatedRecords),
    topology: Object.freeze({
      nodes: Object.freeze(topoNodes),
      edges: Object.freeze(topoEdges),
    }),
    epistemicRegistry: Object.freeze(epistemicRegistry),
    semanticQuantities: Object.freeze(allSemanticQuantities),
    semanticRelations: Object.freeze(allSemanticRelations),
    semanticConstructions: Object.freeze(allSemanticConstructions),
  });
}
