// src/engines/research/crossExperimentAnalyzer.ts
// Pure, deterministic cross-experiment comparison and hypothesis synthesis for Packet #6.
// Invariants:
// 1. Zero side effects, zero timestamps, zero random identifiers.
// 2. Strict epistemic boundary: Aggregated evidence or pattern match NEVER auto-promotes to VERIFIED_INVARIANT.

import { ResearchExperimentResult, ExperimentStep } from './experimentTypes';
import {
  EvidenceNode,
  HypothesisNode,
  RelationSignature,
  EpistemicStage,
} from './researchGraphTypes';
import { findCanonicalRuleBySignature } from './canonicalRules';

/**
 * Normalizes an experiment step / comparison into structured evidence nodes.
 */
export function extractEvidenceFromExperiment(
  result: ResearchExperimentResult
): EvidenceNode[] {
  const evidenceNodes: EvidenceNode[] = [];
  const config = result.experiment;
  const targetEntity = config?.targetChordKey || 'AB';
  const expId = config?.experimentId || 'chord_arc_dynamic';
  const steps = result.steps || [];

  if (steps.length === 0) return evidenceNodes;

  // 1. Evidence for Chord Metric Law: c(theta) approx 2R * sin(theta / 2)
  const chordLengths = steps.map((s) => s.measurements.chordLength);
  const minC = Math.min(...chordLengths);
  const maxC = Math.max(...chordLengths);
  const allFollowChordLaw = steps.every(
    (s) => Math.abs(s.measurements.chordLength - s.measurements.theoreticalChordLength) < 0.2
  );

  if (allFollowChordLaw) {
    evidenceNodes.push({
      id: `EVID-${expId}-${targetEntity}-CHORD-LAW`,
      experimentId: expId,
      targetEntity: `chord_${targetEntity}`,
      signature: 'CYCLIC_CHORD_METRIC_LAW',
      title: `Эмпирический закон хорды [${targetEntity}]`,
      sampleCount: steps.length,
      observedMetricSummary: `c ∈ [${minC.toFixed(1)}, ${maxC.toFixed(1)}] мм строго согласуется с 2R·sin(θ/2) на ${steps.length} шагах`,
      preservedInvariants: result.summary.preservedInvariants,
      varyingParameters: result.summary.varyingParameters,
      parameterRange: {
        min: minC,
        max: maxC,
        unit: 'мм',
      },
    });
  }

  // 2. Evidence for Arc Complement Partition: theta_min + theta_maj = 360 deg
  const allArcSum360 = steps.every(
    (s) => Math.abs(s.measurements.arcComplementSumDeg - 360) < 1e-4
  );
  if (allArcSum360) {
    evidenceNodes.push({
      id: `EVID-${expId}-${targetEntity}-ARC-SUM`,
      experimentId: expId,
      targetEntity: `arc_${targetEntity}`,
      signature: 'ARC_COMPLEMENT_PARTITION_360',
      title: `Инвариант полной суммы дуг [${targetEntity}]`,
      sampleCount: steps.length,
      observedMetricSummary: `Сумма дополнительной пары дуг строго равна 360.0° на всех ${steps.length} шагах`,
      preservedInvariants: ['arcComplementSumDeg'],
      varyingParameters: result.summary.varyingParameters,
      parameterRange: {
        min: 360,
        max: 360,
        unit: '°',
      },
    });
  }

  // 3. Evidence for Radius Invariance: R = const
  const radiusList = steps.map((s) => s.measurements.radius);
  const minR = Math.min(...radiusList);
  const maxR = Math.max(...radiusList);
  if (minR === maxR) {
    evidenceNodes.push({
      id: `EVID-${expId}-${targetEntity}-RADIUS-CONST`,
      experimentId: expId,
      targetEntity: `circumcircle`,
      signature: 'CIRCUMCIRCLE_RADIUS_CONSTANT',
      title: `Постоянство радиуса описанной окружности R = ${minR.toFixed(1)} мм`,
      sampleCount: steps.length,
      observedMetricSummary: `Радиус окружности остаётся фиксированным (R = ${minR} мм) при движении вершин`,
      preservedInvariants: ['radius'],
      varyingParameters: result.summary.varyingParameters,
      parameterRange: {
        min: minR,
        max: maxR,
        unit: 'мм',
      },
    });
  }

  // 4. Evidence for Thales Pattern Match (if any step exhibits diameter)
  const diameterSteps = steps.filter((s) => s.measurements.isDiameter);
  if (diameterSteps.length > 0) {
    evidenceNodes.push({
      id: `EVID-${expId}-${targetEntity}-THALES-MATCH`,
      experimentId: expId,
      targetEntity: `chord_${targetEntity}`,
      signature: 'THALES_DIAMETER_RIGHT_ANGLE',
      title: `Конфигурация диаметра для хорды [${targetEntity}]`,
      sampleCount: diameterSteps.length,
      observedMetricSummary: `На ${diameterSteps.length} шагах хорда достигла максимальной длины 2R (θ = 180°)`,
      preservedInvariants: ['radius'],
      varyingParameters: ['chordLength'],
      parameterRange: {
        min: 2 * minR,
        max: 2 * minR,
        unit: 'мм',
      },
    });
  }

  return evidenceNodes;
}

/**
 * Synthesizes candidate hypotheses from collected evidence across experiments.
 * Deterministic and pure function.
 */
export function synthesizeHypothesesFromEvidence(
  evidenceNodes: EvidenceNode[]
): HypothesisNode[] {
  const hypotheses: HypothesisNode[] = [];
  const groupedBySignature = new Map<RelationSignature, EvidenceNode[]>();

  for (const evid of evidenceNodes) {
    const list = groupedBySignature.get(evid.signature) || [];
    list.push(evid);
    groupedBySignature.set(evid.signature, list);
  }

  for (const [signature, evidenceList] of groupedBySignature.entries()) {
    const evidenceIds = evidenceList.map((e) => e.id);
    const distinctEntities = new Set(evidenceList.map((e) => e.targetEntity));
    const totalSamples = evidenceList.reduce((acc, e) => acc + e.sampleCount, 0);
    const multiExperiment = evidenceList.length > 1 || distinctEntities.size > 1;

    // Check pattern match with canonical rules
    const canonicalRule = findCanonicalRuleBySignature(signature);

    let stage: EpistemicStage = 'CANDIDATE_INVARIANT';
    let status: HypothesisNode['candidateStatus'] = 'FORMULATED';

    if (multiExperiment) {
      stage = 'CROSS_EXPERIMENT_EVIDENCE';
      status = 'SUPPORTED_BY_MULTI_EXPERIMENT';
    }

    if (canonicalRule) {
      stage = 'KNOWN_RELATION_MATCH';
      status = 'MATCHED_CANONICAL_PATTERN';
    }

    let title = '';
    let description = '';
    let formula = '';

    switch (signature) {
      case 'CYCLIC_CHORD_METRIC_LAW':
        title = 'Гипотеза метрического закона хорды: c(θ) = 2R·sin(θ/2)';
        description = `Подтверждено на ${totalSamples} шагах в ${evidenceList.length} экспериментах для объектов: [${Array.from(distinctEntities).join(', ')}].`;
        formula = 'c = 2R · sin(θ / 2)';
        break;

      case 'INSCRIBED_CENTRAL_ANGLE_RATIO':
        title = 'Гипотеза соотношения вписанного и центрального углов: α = θ/2';
        description = `Подтверждено соотношение угла при вершине и дуги окружности на ${totalSamples} измерениях.`;
        formula = 'α = θ / 2';
        break;

      case 'THALES_DIAMETER_RIGHT_ANGLE':
        title = 'Гипотеза прямого угла на диаметре (Теорема Фалеса)';
        description = `При угле дуги θ = 180° хорда является диаметром 2R, а противолежащий угол равен 90°.`;
        formula = '∠C = 90° ⟺ AB = 2R';
        break;

      case 'ARC_COMPLEMENT_PARTITION_360':
        title = 'Гипотеза инварианта полной меры окружности: θ_min + θ_maj = 360°';
        description = `Любая пара дополнительных дуг строго суммируется в 360.0° во всех ${evidenceList.length} экспериментах.`;
        formula = 'θ_min + θ_maj = 360.0°';
        break;

      case 'CIRCUMCIRCLE_RADIUS_CONSTANT':
        title = 'Инвариант постоянства базисного радиуса R';
        description = `Радиус описанной окружности инвариантен относительно перемещения точек по дуге.`;
        formula = 'R = const';
        break;

      default:
        title = `Пользовательская геометрическая гипотеза (${signature})`;
        description = `Эмпирически наблюдаемая закономерность (${totalSamples} измерений).`;
        formula = 'f(x) = const';
        break;
    }

    hypotheses.push({
      id: `HYP-${signature}`,
      signature,
      title,
      description,
      formula,
      epistemicStage: stage,
      candidateStatus: status,
      evidenceNodeIds: evidenceIds,
      matchedRuleId: canonicalRule?.id,
      confidenceNote: `Эмпирическое подтверждение: ${totalSamples} измерений. ${
        canonicalRule
          ? `Совпадение с каноническим правилом: ${canonicalRule.name}. Требуется формальная верификация прекондиций.`
          : 'Каноническое правило не найдено в базе.'
      }`,
    });
  }

  // Also include canonical hypothesis candidates if not already populated from explicit evidence
  const canonicalSignatures: RelationSignature[] = [
    'INSCRIBED_CENTRAL_ANGLE_RATIO',
    'THALES_DIAMETER_RIGHT_ANGLE',
    'ARC_COMPLEMENT_PARTITION_360',
  ];

  for (const sig of canonicalSignatures) {
    if (!groupedBySignature.has(sig)) {
      const canonicalRule = findCanonicalRuleBySignature(sig);
      if (canonicalRule) {
        let desc = '';
        let formula = canonicalRule.formula;
        switch (sig) {
          case 'INSCRIBED_CENTRAL_ANGLE_RATIO':
            desc = 'Для угла треугольника с вершиной на окружности угол вдвое меньше центрального угла дуги.';
            break;
          case 'THALES_DIAMETER_RIGHT_ANGLE':
            desc = 'При угле дуги θ = 180° хорда является диаметром 2R, а противолежащий угол равен 90°.';
            break;
          case 'ARC_COMPLEMENT_PARTITION_360':
            desc = 'Любая пара дополнительных дуг строго суммируется в 360.0°.';
            break;
        }

        hypotheses.push({
          id: `HYP-${sig}`,
          signature: sig,
          title: `Гипотеза: ${canonicalRule.name}`,
          description: desc,
          formula,
          epistemicStage: 'KNOWN_RELATION_MATCH',
          candidateStatus: 'MATCHED_CANONICAL_PATTERN',
          evidenceNodeIds: [],
          matchedRuleId: canonicalRule.id,
          confidenceNote: `Структурный паттерн правила ${canonicalRule.name}. Готов к верификации прекондиций.`,
        });
      }
    }
  }

  return hypotheses;
}
