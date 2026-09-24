// src/engines/configuration/semanticRelation.ts
// Pure, deterministic semantic relation and construction extractor for S-01 & S-02.
// Principles:
// 1. "The Stand must not lie."
// 2. Read-only, transient lens over existing GeometryState, Construction DAG, and Research Graph.
// 3. ZERO timestamps, ZERO random generators, ZERO mutations.
// 4. Strict Epistemic Separation: CONSTRUCTED vs DERIVED vs VERIFIED.

import { FullGeometryState } from '../constructionCore';

/**
 * Geometric construction operation types for Semantic Construction Contract (S-02).
 */
export type SemanticConstructionOperation =
  | 'PARALLEL'
  | 'PERPENDICULAR'
  | 'ANGLE_BISECTOR'
  | 'PERPENDICULAR_BISECTOR'
  | 'POINT_ON_CIRCLE'
  | 'CHORD'
  | 'DIAMETER'
  | 'INTERSECTION';

/**
 * Standardized semantic construction representation (S-02).
 * Describes the exact mathematical operation, references, target, and outcome.
 */
export interface SemanticConstruction {
  readonly operation: SemanticConstructionOperation;
  readonly referenceIds: readonly string[];
  readonly targetId?: string;
  readonly resultEntityId: string;
  readonly groupId?: string;
  readonly macroType?: string;
  readonly description: string;
}

/**
 * Relational typology for Semantic Relation Model (S-01).
 */
export type SemanticRelationType =
  | 'PERPENDICULAR_TO'
  | 'PARALLEL_TO'
  | 'POINT_ON'
  | 'INTERSECTION_OF'
  | 'MIDPOINT_OF'
  | 'ANGLE_BISECTOR_OF'
  | 'PERPENDICULAR_BISECTOR_OF'
  | 'DIAMETER_OF'
  | 'CHORD_OF'
  | 'PASSES_THROUGH'
  | 'SUBTENDS_ARC'
  | 'INSCRIBED_IN'
  | 'INSCRIBED_ANGLE_OF'
  | 'TANGENT_TO';

/**
 * Epistemic status of a semantic relation.
 */
export type SemanticRelationStatus = 'CONSTRUCTED' | 'DERIVED' | 'VERIFIED';

/**
 * Standardized semantic relation representation (S-01).
 */
export interface SemanticRelation {
  readonly id: string;
  readonly sourceEntityId: string;
  readonly relationType: SemanticRelationType;
  readonly targetEntityIds: readonly string[];
  readonly status: SemanticRelationStatus;
  readonly description: string;
  readonly formalNotation: string;
  readonly theoremOrRuleId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Pure function: Extracts all standardized semantic constructions (S-02) from the GeometryState and DAG.
 */
export function extractSemanticConstructions(
  state: FullGeometryState
): readonly SemanticConstruction[] {
  const constructions: SemanticConstruction[] = [];

  // 1. Lines with macro provenance
  for (const line of Object.values(state.lines)) {
    if (line.provenance) {
      const { macroType, sourceIds, groupId } = line.provenance;
      if (macroType === 'perpendicular' && sourceIds.length >= 2) {
        const refLine = sourceIds[0];
        const targetPt = sourceIds[1];
        const p1Name = state.points[line.p1Id]?.name || line.p1Id;
        const p2Name = state.points[line.p2Id]?.name || line.p2Id;
        const ptName = state.points[targetPt]?.name || targetPt;
        const refName = state.lines[refLine]?.id || state.segments[refLine]?.id || refLine;

        constituency: constructions.push(
          Object.freeze({
            operation: 'PERPENDICULAR',
            referenceIds: Object.freeze([refLine]),
            targetId: targetPt,
            resultEntityId: line.id,
            groupId,
            macroType,
            description: `Прямая (${p1Name}${p2Name}) перпендикулярна ${refName} через точку ${ptName}`,
          })
        );
      } else if (macroType === 'parallel' && sourceIds.length >= 2) {
        const refLine = sourceIds[0];
        const targetPt = sourceIds[1];
        const p1Name = state.points[line.p1Id]?.name || line.p1Id;
        const p2Name = state.points[line.p2Id]?.name || line.p2Id;
        const ptName = state.points[targetPt]?.name || targetPt;
        const refName = state.lines[refLine]?.id || state.segments[refLine]?.id || refLine;

        constituency: constructions.push(
          Object.freeze({
            operation: 'PARALLEL',
            referenceIds: Object.freeze([refLine]),
            targetId: targetPt,
            resultEntityId: line.id,
            groupId,
            macroType,
            description: `Прямая (${p1Name}${p2Name}) параллельна ${refName} через точку ${ptName}`,
          })
        );
      } else if (macroType === 'angle_bisector' && sourceIds.length >= 3) {
        const arm1 = sourceIds[0];
        const vertex = sourceIds[1];
        const arm2 = sourceIds[2];
        const aName = state.points[arm1]?.name || arm1;
        const vName = state.points[vertex]?.name || vertex;
        const bName = state.points[arm2]?.name || arm2;
        const p1Name = state.points[line.p1Id]?.name || line.p1Id;
        const p2Name = state.points[line.p2Id]?.name || line.p2Id;

        constituency: constructions.push(
          Object.freeze({
            operation: 'ANGLE_BISECTOR',
            referenceIds: Object.freeze([arm1, arm2]),
            targetId: vertex,
            resultEntityId: line.id,
            groupId,
            macroType,
            description: `Биссектриса угла ∠${aName}${vName}${bName} (${p1Name}${p2Name})`,
          })
        );
      } else if (macroType === 'perpendicular_bisector' && sourceIds.length >= 2) {
        const pA = sourceIds[0];
        const pB = sourceIds[1];
        const aName = state.points[pA]?.name || pA;
        const bName = state.points[pB]?.name || pB;
        const p1Name = state.points[line.p1Id]?.name || line.p1Id;
        const p2Name = state.points[line.p2Id]?.name || line.p2Id;

        constituency: constructions.push(
          Object.freeze({
            operation: 'PERPENDICULAR_BISECTOR',
            referenceIds: Object.freeze([pA, pB]),
            resultEntityId: line.id,
            groupId,
            macroType,
            description: `Серединный перпендикуляр к отрезку [${aName}${bName}] (${p1Name}${p2Name})`,
          })
        );
      }
    }
  }

  // 2. Base & Derived Points on circle
  for (const pt of Object.values(state.points)) {
    if (pt.onCircle || pt.isBaseVertex) {
      constituency: constructions.push(
        Object.freeze({
          operation: 'POINT_ON_CIRCLE',
          referenceIds: Object.freeze(['base_circle']),
          targetId: pt.id,
          resultEntityId: pt.id,
          description: `Точка ${pt.name || pt.id} инцидентна описанной окружности`,
        })
      );
    } else if (pt.parentIds && pt.parentIds.length >= 2) {
      constituency: constructions.push(
        Object.freeze({
          operation: 'INTERSECTION',
          referenceIds: Object.freeze([...pt.parentIds]),
          targetId: pt.id,
          resultEntityId: pt.id,
          groupId: pt.provenance?.groupId,
          macroType: pt.provenance?.macroType,
          description: `Точка пересечения ${pt.name || pt.id} = ${pt.parentIds.join(' ∩ ')}`,
        })
      );
    }
  }

  // 3. Segments (Chords / Diameters)
  for (const seg of Object.values(state.segments)) {
    const p1 = state.points[seg.p1Id];
    const p2 = state.points[seg.p2Id];
    if (!p1 || !p2 || seg.p1Id === seg.p2Id) continue;

    const d1 = Math.hypot(p1.x, p1.y);
    const d2 = Math.hypot(p2.x, p2.y);
    const p1On = Math.abs(d1 - state.R) < 1.0;
    const p2On = Math.abs(d2 - state.R) < 1.0;

    // Both endpoints must strictly lie on the circumcircle to be a chord
    if (!p1On || !p2On) continue;

    // Check diameter: length ~ 2R and midpoint passes through center (0, 0)
    const isDiam = Boolean(
      state.R &&
      Math.abs(seg.length - 2 * state.R) < 1.5 &&
      Math.abs(p1.x + p2.x) < 1.5 &&
      Math.abs(p1.y + p2.y) < 1.5
    );

    constituency: constructions.push(
      Object.freeze({
        operation: isDiam ? 'DIAMETER' : 'CHORD',
        referenceIds: Object.freeze(['base_circle', seg.p1Id, seg.p2Id]),
        resultEntityId: seg.id,
        description: isDiam
          ? `Диаметр окружности [${p1.name || seg.p1Id}${p2.name || seg.p2Id}] (длина ${seg.length.toFixed(1)})`
          : `Хорда окружности [${p1.name || seg.p1Id}${p2.name || seg.p2Id}] (длина ${seg.length.toFixed(1)})`,
      })
    );
  }

  // Deterministic sorting by resultEntityId
  constituency: constructions.sort((a, b) => a.resultEntityId.localeCompare(b.resultEntityId));

  return Object.freeze(constructions);
}

/**
 * Pure function: Extracts all formal semantic relations (S-01) from GeometryState, DAG, and Theorems.
 */
export function extractSemanticRelations(
  state: FullGeometryState,
  options?: { scale?: number }
): readonly SemanticRelation[] {
  const scale = options?.scale ?? 1.0;
  const relations: SemanticRelation[] = [];

  // 1. CONSTRUCTED RELATIONS FROM MACRO LINES
  for (const line of Object.values(state.lines)) {
    if (line.provenance) {
      const { macroType, sourceIds, groupId } = line.provenance;

      if (macroType === 'perpendicular' && sourceIds.length >= 2) {
        const refLine = sourceIds[0];
        const targetPt = sourceIds[1];
        const p1Name = state.points[line.p1Id]?.name || line.p1Id;
        const p2Name = state.points[line.p2Id]?.name || line.p2Id;
        const ptName = state.points[targetPt]?.name || targetPt;
        const refName = state.lines[refLine]?.id || state.segments[refLine]?.id || refLine;

        // Relation 1: PERPENDICULAR_TO
        relations.push(
          Object.freeze({
            id: `REL_PERP_${line.id}_TO_${refLine}`,
            sourceEntityId: line.id,
            relationType: 'PERPENDICULAR_TO',
            targetEntityIds: Object.freeze([refLine]),
            status: 'CONSTRUCTED',
            description: `Прямая (${p1Name}${p2Name}) перпендикулярна ${refName}`,
            formalNotation: `${line.id} ⟂ ${refLine}`,
            metadata: Object.freeze({ groupId, angleDeg: 90.0 }),
          })
        );

        // Relation 2: PASSES_THROUGH
        relations.push(
          Object.freeze({
            id: `REL_INCIDENT_${line.id}_THROUGH_${targetPt}`,
            sourceEntityId: line.id,
            relationType: 'PASSES_THROUGH',
            targetEntityIds: Object.freeze([targetPt]),
            status: 'CONSTRUCTED',
            description: `Прямая (${p1Name}${p2Name}) проходит через точку ${ptName}`,
            formalNotation: `${targetPt} ∈ ${line.id}`,
            metadata: Object.freeze({ groupId }),
          })
        );
      } else if (macroType === 'parallel' && sourceIds.length >= 2) {
        const refLine = sourceIds[0];
        const targetPt = sourceIds[1];
        const p1Name = state.points[line.p1Id]?.name || line.p1Id;
        const p2Name = state.points[line.p2Id]?.name || line.p2Id;
        const ptName = state.points[targetPt]?.name || targetPt;
        const refName = state.lines[refLine]?.id || state.segments[refLine]?.id || refLine;

        // Relation 1: PARALLEL_TO
        relations.push(
          Object.freeze({
            id: `REL_PAR_${line.id}_TO_${refLine}`,
            sourceEntityId: line.id,
            relationType: 'PARALLEL_TO',
            targetEntityIds: Object.freeze([refLine]),
            status: 'CONSTRUCTED',
            description: `Прямая (${p1Name}${p2Name}) параллельна ${refName}`,
            formalNotation: `${line.id} ∥ ${refLine}`,
            metadata: Object.freeze({ groupId, angleDeg: 0.0 }),
          })
        );

        // Relation 2: PASSES_THROUGH
        relations.push(
          Object.freeze({
            id: `REL_INCIDENT_${line.id}_THROUGH_${targetPt}`,
            sourceEntityId: line.id,
            relationType: 'PASSES_THROUGH',
            targetEntityIds: Object.freeze([targetPt]),
            status: 'CONSTRUCTED',
            description: `Прямая (${p1Name}${p2Name}) проходит через точку ${ptName}`,
            formalNotation: `${targetPt} ∈ ${line.id}`,
            metadata: Object.freeze({ groupId }),
          })
        );
      } else if (macroType === 'angle_bisector' && sourceIds.length >= 3) {
        const arm1 = sourceIds[0];
        const vertex = sourceIds[1];
        const arm2 = sourceIds[2];
        const aName = state.points[arm1]?.name || arm1;
        const vName = state.points[vertex]?.name || vertex;
        const bName = state.points[arm2]?.name || arm2;
        const p1Name = state.points[line.p1Id]?.name || line.p1Id;
        const p2Name = state.points[line.p2Id]?.name || line.p2Id;

        // Relation 1: ANGLE_BISECTOR_OF
        relations.push(
          Object.freeze({
            id: `REL_BISECTOR_${line.id}_OF_${arm1}_${vertex}_${arm2}`,
            sourceEntityId: line.id,
            relationType: 'ANGLE_BISECTOR_OF',
            targetEntityIds: Object.freeze([arm1, vertex, arm2]),
            status: 'CONSTRUCTED',
            description: `Прямая (${p1Name}${p2Name}) является биссектрисой угла ∠${aName}${vName}${bName}`,
            formalNotation: `${line.id} = bisector(∠${aName}${vName}${bName})`,
            metadata: Object.freeze({ groupId }),
          })
        );

        // Relation 2: PASSES_THROUGH
        relations.push(
          Object.freeze({
            id: `REL_INCIDENT_${line.id}_THROUGH_${vertex}`,
            sourceEntityId: line.id,
            relationType: 'PASSES_THROUGH',
            targetEntityIds: Object.freeze([vertex]),
            status: 'CONSTRUCTED',
            description: `Биссектриса проходит через вершину ${vName}`,
            formalNotation: `${vertex} ∈ ${line.id}`,
            metadata: Object.freeze({ groupId }),
          })
        );
      } else if (macroType === 'perpendicular_bisector' && sourceIds.length >= 2) {
        const pA = sourceIds[0];
        const pB = sourceIds[1];
        const aName = state.points[pA]?.name || pA;
        const bName = state.points[pB]?.name || pB;
        const p1Name = state.points[line.p1Id]?.name || line.p1Id;
        const p2Name = state.points[line.p2Id]?.name || line.p2Id;

        // Relation 1: PERPENDICULAR_BISECTOR_OF
        relations.push(
          Object.freeze({
            id: `REL_PERP_BISECTOR_${line.id}_OF_${pA}_${pB}`,
            sourceEntityId: line.id,
            relationType: 'PERPENDICULAR_BISECTOR_OF',
            targetEntityIds: Object.freeze([pA, pB]),
            status: 'CONSTRUCTED',
            description: `Прямая (${p1Name}${p2Name}) является серединным перпендикуляром к отрезку [${aName}${bName}]`,
            formalNotation: `${line.id} ⊥ bisector [${aName}${bName}]`,
            metadata: Object.freeze({ groupId }),
          })
        );
      }
    }
  }

  // 2. CONSTRUCTED & DERIVED RELATIONS FOR POINTS
  for (const pt of Object.values(state.points)) {
    if (pt.onCircle || pt.isBaseVertex) {
      relations.push(
        Object.freeze({
          id: `REL_POINT_ON_BASE_CIRC_${pt.id}`,
          sourceEntityId: pt.id,
          relationType: 'POINT_ON',
          targetEntityIds: Object.freeze(['base_circle']),
          status: 'CONSTRUCTED',
          description: `Точка ${pt.name || pt.id} лежит на описанной окружности`,
          formalNotation: `${pt.id} ∈ C_0`,
          metadata: Object.freeze({ u: pt.u }),
        })
      );
    }

    if (pt.parentIds && pt.parentIds.length >= 2) {
      relations.push(
        Object.freeze({
          id: `REL_INT_${pt.id}_OF_${pt.parentIds.join('_')}`,
          sourceEntityId: pt.id,
          relationType: 'INTERSECTION_OF',
          targetEntityIds: Object.freeze([...pt.parentIds]),
          status: 'CONSTRUCTED',
          description: `Точка ${pt.name || pt.id} является пересечением ${pt.parentIds.join(' и ')}`,
          formalNotation: `${pt.id} = ${pt.parentIds.join(' ∩ ')}`,
          metadata: Object.freeze({ groupId: pt.provenance?.groupId }),
        })
      );

      for (const parentId of pt.parentIds) {
        relations.push(
          Object.freeze({
            id: `REL_INCIDENT_${pt.id}_ON_${parentId}`,
            sourceEntityId: pt.id,
            relationType: 'POINT_ON',
            targetEntityIds: Object.freeze([parentId]),
            status: 'CONSTRUCTED',
            description: `Точка ${pt.name || pt.id} инцидентна объекту ${parentId}`,
            formalNotation: `${pt.id} ∈ ${parentId}`,
          })
        );
      }
    }
  }

  // 3. DERIVED INSCRIBED TRIANGLE RELATION (INSCRIBED_IN)
  const pA = state.points['A'] || state.points['pt_A'];
  const pB = state.points['B'] || state.points['pt_B'];
  const pC = state.points['C'] || state.points['pt_C'];

  if (pA && pB && pC) {
    const dA = Math.hypot(pA.x, pA.y);
    const dB = Math.hypot(pB.x, pB.y);
    const dC = Math.hypot(pC.x, pC.y);

    const aOnCircle = Math.abs(dA - state.R) < 1.0;
    const bOnCircle = Math.abs(dB - state.R) < 1.0;
    const cOnCircle = Math.abs(dC - state.R) < 1.0;

    const dAB = Math.hypot(pA.x - pB.x, pA.y - pB.y);
    const dBC = Math.hypot(pB.x - pC.x, pB.y - pC.y);
    const dCA = Math.hypot(pC.x - pA.x, pC.y - pA.y);
    const distinct = dAB > 1e-3 && dBC > 1e-3 && dCA > 1e-3;

    if (aOnCircle && bOnCircle && cOnCircle && distinct) {
      relations.push(
        Object.freeze({
          id: 'REL_INSCRIBED_TRIANGLE_ABC_IN_BASE_CIRC',
          sourceEntityId: 'triangle_ABC',
          relationType: 'INSCRIBED_IN',
          targetEntityIds: Object.freeze(['base_circle']),
          status: 'DERIVED',
          description: 'Треугольник ABC вписан в описанную окружность',
          formalNotation: '△ABC inscribed in C_0',
          theoremOrRuleId: 'RULE-INSCRIBED-TRIANGLE',
          metadata: Object.freeze({
            vertices: Object.freeze(['A', 'B', 'C']),
            circumradius: state.R * scale,
          }),
        })
      );
    }
  }

  // 4. DERIVED & VERIFIED RELATIONS FOR SEGMENTS / CHORDS / DIAMETERS / ARCS
  const verifiedChords: Array<{
    seg: (typeof state.segments)[string];
    p1: (typeof state.points)[string];
    p2: (typeof state.points)[string];
    isDiameter: boolean;
  }> = [];

  for (const seg of Object.values(state.segments)) {
    const p1 = state.points[seg.p1Id];
    const p2 = state.points[seg.p2Id];
    if (!p1 || !p2 || seg.p1Id === seg.p2Id) continue;

    const dist1 = Math.hypot(p1.x, p1.y);
    const dist2 = Math.hypot(p2.x, p2.y);
    const p1OnCircle = Math.abs(dist1 - state.R) < 1.0;
    const p2OnCircle = Math.abs(dist2 - state.R) < 1.0;

    // Both endpoints must strictly lie on the circumcircle to be a chord
    if (!p1OnCircle || !p2OnCircle) continue;

    const isDiam = Boolean(
      state.R &&
      Math.abs(seg.length - 2 * state.R) < 1.5 &&
      Math.abs(p1.x + p2.x) < 1.5 &&
      Math.abs(p1.y + p2.y) < 1.5
    );

    verifiedChords.push({ seg, p1, p2, isDiameter: isDiam });

    // CHORD_OF
    relations.push(
      Object.freeze({
        id: `REL_CHORD_${seg.id}_OF_CIRC`,
        sourceEntityId: seg.id,
        relationType: 'CHORD_OF',
        targetEntityIds: Object.freeze(['base_circle']),
        status: 'DERIVED',
        description: `Отрезок [${p1.name || p1.id}${p2.name || p2.id}] является хордой описанной окружности`,
        formalNotation: `${seg.id} chord C_0`,
        metadata: Object.freeze({
          endpoints: Object.freeze([p1.id, p2.id]),
          length: seg.length * scale,
        }),
      })
    );

    // DIAMETER_OF if diameter
    if (isDiam) {
      relations.push(
        Object.freeze({
          id: `REL_DIAM_${seg.id}_OF_CIRC`,
          sourceEntityId: seg.id,
          relationType: 'DIAMETER_OF',
          targetEntityIds: Object.freeze(['base_circle']),
          status: 'VERIFIED',
          description: `Отрезок [${p1.name || p1.id}${p2.name || p2.id}] является диаметром описанной окружности (c = 2R, проходит через центр O)`,
          formalNotation: `${seg.id} = 2R (Diameter)`,
          theoremOrRuleId: 'RULE-THALES-DIAMETER',
          metadata: Object.freeze({
            endpoints: Object.freeze([p1.id, p2.id]),
            length: seg.length * scale,
            diameter: 2 * state.R * scale,
          }),
        })
      );
    }

    // SUBTENDS_ARC
    const angle1 = Math.atan2(p1.y, p1.x);
    const angle2 = Math.atan2(p2.y, p2.x);
    let angleDiffRad = Math.abs(angle1 - angle2);
    if (angleDiffRad > Math.PI) {
      angleDiffRad = 2 * Math.PI - angleDiffRad;
    }
    const thetaDeg = (angleDiffRad * 180) / Math.PI;

    relations.push(
      Object.freeze({
        id: `REL_SUBTENDS_ARC_${seg.id}`,
        sourceEntityId: seg.id,
        relationType: 'SUBTENDS_ARC',
        targetEntityIds: Object.freeze([p1.id, p2.id, 'base_circle']),
        status: 'DERIVED',
        description: `Хорда ${seg.id} стягивает дугу ◡[${p1.name || p1.id}${p2.name || p2.id}] (центральный угол ${thetaDeg.toFixed(1)}°)`,
        formalNotation: `${seg.id} ↔ ◡${p1.id}${p2.id}`,
        metadata: Object.freeze({
          endpoints: Object.freeze([p1.id, p2.id]),
          centralAngleDeg: Number(thetaDeg.toFixed(2)),
          isDiameter: isDiam,
        }),
      })
    );
  }

  // 5. INSCRIBED ANGLES
  const pointsOnCircle = Object.values(state.points).filter(
    (pt) => Math.abs(Math.hypot(pt.x, pt.y) - state.R) < 1.0
  );

  for (const v of pointsOnCircle) {
    for (const chord of verifiedChords) {
      const { p1, p2, seg } = chord;
      if (v.id === p1.id || v.id === p2.id) continue;

      const dx1 = p1.x - v.x;
      const dy1 = p1.y - v.y;
      const dx2 = p2.x - v.x;
      const dy2 = p2.y - v.y;

      const len1 = Math.hypot(dx1, dy1);
      const len2 = Math.hypot(dx2, dy2);
      if (len1 < 1e-3 || len2 < 1e-3) continue;

      const cosVal = Math.max(-1, Math.min(1, (dx1 * dx2 + dy1 * dy2) / (len1 * len2)));
      const angleRad = Math.acos(cosVal);
      const angleDeg = (angleRad * 180) / Math.PI;

      relations.push(
        Object.freeze({
          id: `REL_INSCRIBED_ANGLE_${p1.id}_${v.id}_${p2.id}`,
          sourceEntityId: v.id,
          relationType: 'INSCRIBED_ANGLE_OF',
          targetEntityIds: Object.freeze([seg.id, 'base_circle']),
          status: 'DERIVED',
          description: `Вписанный угол ∠${p1.name || p1.id}${v.name || v.id}${p2.name || p2.id} (${angleDeg.toFixed(1)}°) опирается на дугу ◡[${p1.name || p1.id}${p2.name || p2.id}]`,
          formalNotation: `∠${p1.id}${v.id}${p2.id} inscribed in C_0 subtending ◡${p1.id}${p2.id}`,
          metadata: Object.freeze({
            vertex: v.id,
            endpoints: Object.freeze([p1.id, p2.id]),
            chordId: seg.id,
            angleDeg: Number(angleDeg.toFixed(2)),
          }),
        })
      );
    }
  }

  // 6. VERIFIED THEORETIC RELATIONS (Thales Right Angle)
  for (const chord of verifiedChords) {
    if (!chord.isDiameter) continue;
    const { p1, p2, seg } = chord;

    for (const v of pointsOnCircle) {
      if (v.id === p1.id || v.id === p2.id) continue;

      // Find chords connecting vertex v to endpoints p1 and p2 if present in state
      const chord1 = Object.values(state.segments).find(
        (s) => (s.p1Id === v.id && s.p2Id === p1.id) || (s.p1Id === p1.id && s.p2Id === v.id)
      );
      const chord2 = Object.values(state.segments).find(
        (s) => (s.p1Id === v.id && s.p2Id === p2.id) || (s.p1Id === p2.id && s.p2Id === v.id)
      );

      if (chord1 && chord2) {
        relations.push(
          Object.freeze({
            id: `REL_THALES_PERP_${chord1.id}_${chord2.id}`,
            sourceEntityId: chord1.id,
            relationType: 'PERPENDICULAR_TO',
            targetEntityIds: Object.freeze([chord2.id]),
            status: 'VERIFIED',
            description: `Катеты ${chord1.id} и ${chord2.id} перпендикулярны по теореме Фалеса (угол опирается на диаметр ${seg.id})`,
            formalNotation: `${chord1.id} ⟂ ${chord2.id} (Thales)`,
            theoremOrRuleId: 'RULE-THALES-DIAMETER',
            metadata: Object.freeze({
              vertex: v.id,
              diameterId: seg.id,
              angleDeg: 90.0,
            }),
          })
        );
      }

      relations.push(
        Object.freeze({
          id: `REL_THALES_RIGHT_ANGLE_${v.id}_ON_${seg.id}`,
          sourceEntityId: v.id,
          relationType: 'PERPENDICULAR_TO',
          targetEntityIds: Object.freeze([p1.id, p2.id, seg.id]),
          status: 'VERIFIED',
          description: `Вписанный угол при вершине ${v.name || v.id} равен 90° по теореме Фалеса (опирается на диаметр [${p1.name || p1.id}${p2.name || p2.id}])`,
          formalNotation: `∠${p1.id}${v.id}${p2.id} = 90° (Thales)`,
          theoremOrRuleId: 'RULE-THALES-DIAMETER',
          metadata: Object.freeze({
            vertex: v.id,
            diameterId: seg.id,
            angleDeg: 90.0,
          }),
        })
      );
    }
  }

  // 7. VERIFIED FUNDAMENTALS & PERPENDICULARS RELATIONS (Packet 2: Tangents, Bisectors, Perpendicular Bisectors)
  // 7.1 Tangents (RULE-TANGENT-RADIUS-ORTHOGONALITY, Sutton Fig. 13-14)
  for (const line of Object.values(state.lines)) {
    const lp1 = state.points[line.p1Id];
    const lp2 = state.points[line.p2Id];
    if (!lp1 || !lp2 || line.p1Id === line.p2Id) continue;

    const dx = lp2.x - lp1.x;
    const dy = lp2.y - lp1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) continue;

    // Check base circle
    const circsToCheck: Array<{ id: string; center: { x: number; y: number }; radius: number }> = [
      { id: 'base_circle', center: { x: 0, y: 0 }, radius: state.R },
    ];
    for (const c of Object.values(state.circles)) {
      if (c.id === 'base_circle') continue;
      const cp = state.points[c.centerId] || { x: 0, y: 0 };
      circsToCheck.push({ id: c.id, center: cp, radius: c.radius });
    }

    for (const circ of circsToCheck) {
      if (circ.radius <= 0) continue;
      const { center, radius } = circ;
      const distFromCenter = Math.abs(dy * center.x - dx * center.y + lp2.x * lp1.y - lp2.y * lp1.x) / len;

      if (Math.abs(distFromCenter - radius) < 1.0) {
        // Projection point of center onto line
        const t = -((lp1.x - center.x) * dx + (lp1.y - center.y) * dy) / (len * len);
        const tx = lp1.x + t * dx;
        const ty = lp1.y + t * dy;

        // Check if any point in state coincides with contact point
        const contactPt = Object.values(state.points).find(
          (p) => Math.hypot(p.x - tx, p.y - ty) < 1.5
        );

        relations.push(
          Object.freeze({
            id: `REL_TANGENT_${line.id}_TO_${circ.id}`,
            sourceEntityId: line.id,
            relationType: 'TANGENT_TO',
            targetEntityIds: Object.freeze(contactPt ? [circ.id, contactPt.id] : [circ.id]),
            status: 'VERIFIED',
            description: `Прямая ${line.id} является касательной к окружности ${circ.id} (dist = R = ${radius.toFixed(1)})`,
            formalNotation: `${line.id} ⟂ radius(${circ.id}) (Tangent)`,
            theoremOrRuleId: 'RULE-TANGENT-RADIUS-ORTHOGONALITY',
            metadata: Object.freeze({
              circleId: circ.id,
              contactPointId: contactPt?.id,
              contactPoint: Object.freeze({ x: Number(tx.toFixed(2)), y: Number(ty.toFixed(2)) }),
              radius: radius * scale,
              distanceFromCenter: Number(distFromCenter.toFixed(2)),
            }),
          })
        );
      }
    }
  }

  // 7.2 Verified Perpendicular Bisectors (RULE-PERPENDICULAR-BISECTOR, Sutton Fig. 9)
  for (const line of Object.values(state.lines)) {
    if (line.provenance?.macroType === 'perpendicular_bisector') {
      const sourceIds = (line.provenance as any)?.sourceIds || (line.provenance as any)?.sourceEntityIds || [];
      if (sourceIds.length >= 2) {
        const pA = state.points[sourceIds[0]];
        const pB = state.points[sourceIds[1]];
        const lp1 = state.points[line.p1Id];
        const lp2 = state.points[line.p2Id];

        if (pA && pB && lp1 && lp2) {
          const dxS = pB.x - pA.x;
          const dyS = pB.y - pA.y;
          const dxL = lp2.x - lp1.x;
          const dyL = lp2.y - lp1.y;
          const dot = dxS * dxL + dyS * dyL;
          const lenS = Math.hypot(dxS, dyS);
          const lenL = Math.hypot(dxL, dyL);
          const isPerp = lenS > 0 && lenL > 0 && Math.abs(dot / (lenS * lenL)) < 1e-3;

          const mx = (pA.x + pB.x) / 2;
          const my = (pA.y + pB.y) / 2;
          const distMid = Math.abs(dyL * mx - dxL * my + lp2.x * lp1.y - lp2.y * lp1.x) / lenL;
          const passesMid = distMid < 1.0;

          if (isPerp && passesMid) {
            relations.push(
              Object.freeze({
                id: `REL_VERIFIED_PERP_BISECTOR_${line.id}_OF_${sourceIds[0]}_${sourceIds[1]}`,
                sourceEntityId: line.id,
                relationType: 'PERPENDICULAR_BISECTOR_OF',
                targetEntityIds: Object.freeze([sourceIds[0], sourceIds[1]]),
                status: 'VERIFIED',
                description: `Прямая ${line.id} верифицирована как серединный перпендикуляр к [${sourceIds[0]}${sourceIds[1]}]`,
                formalNotation: `${line.id} ⊥ bisector [${sourceIds[0]}${sourceIds[1]}] (Verified)`,
                theoremOrRuleId: 'RULE-PERPENDICULAR-BISECTOR',
                metadata: Object.freeze({
                  endpoints: Object.freeze([sourceIds[0], sourceIds[1]]),
                  midpoint: Object.freeze({ x: Number(mx.toFixed(2)), y: Number(my.toFixed(2)) }),
                }),
              })
            );
          }
        }
      }
    }
  }

  // 7.3 Verified Angle Bisectors (RULE-ANGLE-BISECTOR, Sutton Fig. 3)
  for (const line of Object.values(state.lines)) {
    if (line.provenance?.macroType === 'angle_bisector') {
      const sourceIds = (line.provenance as any)?.sourceIds || (line.provenance as any)?.sourceEntityIds || [];
      if (sourceIds.length >= 3) {
        const arm1 = state.points[sourceIds[0]];
        const vertex = state.points[sourceIds[1]];
        const arm2 = state.points[sourceIds[2]];
        const lp1 = state.points[line.p1Id];
        const lp2 = state.points[line.p2Id];

        if (arm1 && vertex && arm2 && lp1 && lp2) {
          const dxL = lp2.x - lp1.x;
          const dyL = lp2.y - lp1.y;
          const lenL = Math.hypot(dxL, dyL);
          const distV = Math.abs(dyL * vertex.x - dxL * vertex.y + lp2.x * lp1.y - lp2.y * lp1.x) / lenL;

          if (distV < 1.0) {
            const otherPt = Math.hypot(lp1.x - vertex.x, lp1.y - vertex.y) > 1e-2 ? lp1 : lp2;
            const dirX = otherPt.x - vertex.x;
            const dirY = otherPt.y - vertex.y;
            const dirLen = Math.hypot(dirX, dirY);

            const v1X = arm1.x - vertex.x;
            const v1Y = arm1.y - vertex.y;
            const len1 = Math.hypot(v1X, v1Y);

            const v2X = arm2.x - vertex.x;
            const v2Y = arm2.y - vertex.y;
            const len2 = Math.hypot(v2X, v2Y);

            if (dirLen > 0 && len1 > 0 && len2 > 0) {
              const cos1 = Math.max(-1, Math.min(1, (dirX * v1X + dirY * v1Y) / (dirLen * len1)));
              const cos2 = Math.max(-1, Math.min(1, (dirX * v2X + dirY * v2Y) / (dirLen * len2)));
              const a1Deg = (Math.acos(cos1) * 180) / Math.PI;
              const a2Deg = (Math.acos(cos2) * 180) / Math.PI;

              if (Math.abs(a1Deg - a2Deg) < 0.75) {
                relations.push(
                  Object.freeze({
                    id: `REL_VERIFIED_ANGLE_BISECTOR_${line.id}_OF_${sourceIds[0]}_${sourceIds[1]}_${sourceIds[2]}`,
                    sourceEntityId: line.id,
                    relationType: 'ANGLE_BISECTOR_OF',
                    targetEntityIds: Object.freeze([sourceIds[0], sourceIds[1], sourceIds[2]]),
                    status: 'VERIFIED',
                    description: `Прямая ${line.id} верифицирована как биссектриса угла ∠${sourceIds[0]}${sourceIds[1]}${sourceIds[2]} (α1=α2=${a1Deg.toFixed(1)}°)`,
                    formalNotation: `${line.id} = bisector(∠${sourceIds[0]}${sourceIds[1]}${sourceIds[2]}) (Verified)`,
                    theoremOrRuleId: 'RULE-ANGLE-BISECTOR',
                    metadata: Object.freeze({
                      vertexId: sourceIds[1],
                      halfAngleDeg: Number(a1Deg.toFixed(2)),
                    }),
                  })
                );
              }
            }
          }
        }
      }
    }
  }

  // Deterministic sorting by relation id
  relations.sort((a, b) => a.id.localeCompare(b.id));

  return Object.freeze(relations);
}

/**
 * Pure helper: Filters semantic relations involving a specific entity ID.
 */
export function findSemanticRelationsByEntity(
  relations: readonly SemanticRelation[],
  entityId: string
): readonly SemanticRelation[] {
  return relations.filter(
    (rel) => rel.sourceEntityId === entityId || rel.targetEntityIds.includes(entityId)
  );
}

/**
 * Pure helper: Finds the primary semantic construction that produced an entity.
 */
export function findSemanticConstructionByEntity(
  constructions: readonly SemanticConstruction[],
  entityId: string
): SemanticConstruction | undefined {
  return constructions.find((c) => c.resultEntityId === entityId || c.targetId === entityId);
}
