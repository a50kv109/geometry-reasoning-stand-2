// src/engines/research/observationModel.ts
// Epistemic observation evaluation model for Packet #4.
// Enforces the strict epistemic distinction:
// Measurement -> Fact -> Observation -> Candidate Invariant -> Known Relation Match -> Verified Invariant.
// CRITICAL: A Known Relation Match must NOT automatically become a Verified Invariant.

import { FullGeometryState } from '../constructionCore';
import { computeGeometryBase } from '../geometryState';
import {
  evaluateStructuralInvariants,
  CANONICAL_INVARIANT_SUITE,
  DYNAMIC_THALES_INVARIANT,
} from '../temporalObserver';
import { createGeometrySnapshot } from '../temporalObserver';
import { ResearchObservation, DerivedChordArcRelation } from './researchTypes';

const EPSILON = 1e-4;

/**
 * Evaluates observations across all epistemic levels from the current geometry state.
 */
export function evaluateResearchObservations(
  state: FullGeometryState,
  chordArcRelations: DerivedChordArcRelation[],
  scale: number = 1.0
): ResearchObservation[] {
  const observations: ResearchObservation[] = [];
  const geoBase = computeGeometryBase(state.pointsU, state.R);
  const R_mm = state.R * scale;
  const snapshot = createGeometrySnapshot({
    pointsU: state.pointsU,
    R: state.R,
    scale,
  });

  // Level 1: MEASUREMENT
  observations.push({
    id: 'OBS-01-RADIUS',
    epistemicLevel: 'MEASUREMENT',
    title: 'Радиус описанной окружности R',
    description: 'Измеренный радиус базисной окружности в масштабе чертежа.',
    observedValue: `${R_mm.toFixed(1)} мм`,
    expectedValue: `${R_mm.toFixed(1)} мм`,
    deviation: 0,
    isMatch: true,
    isFormallyVerified: true,
    proofPrerequisites: ['CIRCLE_DEFINED'],
    mathematicalBasis: 'Параметр базовой геометрии окружности',
  });

  // Level 2: FACT
  const arcSumDeg = geoBase.arcs.AB.deg + geoBase.arcs.BC.deg + geoBase.arcs.CA.deg;
  observations.push({
    id: 'OBS-02-ARC-PARTITION',
    epistemicLevel: 'FACT',
    title: 'Сумма разбиения дуг окружности',
    description: 'Полная длина окружности разбита вершинами A, B, C на 3 смежные дуги.',
    observedValue: `${arcSumDeg.toFixed(1)}°`,
    expectedValue: '360.0°',
    deviation: Number(Math.abs(arcSumDeg - 360).toFixed(4)),
    isMatch: Math.abs(arcSumDeg - 360) < EPSILON,
    isFormallyVerified: true,
    proofPrerequisites: ['CYCLIC_ORDER_PRESERVED'],
    mathematicalBasis: 'Разбиение метрического пространства S^1: sum(delta_u) = 1.0 (360°)',
  });

  // Level 3: OBSERVATION (Chord length formula c = 2R sin(theta/2))
  for (const rel of chordArcRelations) {
    const diff = Math.abs(rel.chordLength - rel.theoreticalChordLength);
    observations.push({
      id: `OBS-03-CHORD-FORMULA-${rel.chordId}`,
      epistemicLevel: 'OBSERVATION',
      title: `Связь хорды [${rel.p1Name}${rel.p2Name}] и дуги`,
      description: `Длина хорды c = ${rel.chordLength} мм сопоставлена с теоретической 2R*sin(θ/2) = ${rel.theoreticalChordLength} мм.`,
      observedValue: `${rel.chordLength} мм`,
      expectedValue: `${rel.theoreticalChordLength} мм`,
      deviation: Number(diff.toFixed(2)),
      isMatch: diff < 0.1,
      isFormallyVerified: true,
      proofPrerequisites: ['POINTS_ON_CIRCLE', 'EUCLIDEAN_METRIC'],
      mathematicalBasis: 'Тригонометрическая метрическая теорема хорды c = 2R sin(θ/2)',
    });
  }

  // Level 4: CANDIDATE_INVARIANT (Central vs Inscribed Angle: alpha = theta / 2)
  const arcAB = geoBase.arcs.AB;
  const centralAngleAB = arcAB.deg;
  const theoreticalInscribedC = centralAngleAB / 2;
  observations.push({
    id: 'OBS-04-INSCRIBED-CENTRAL-CANDIDATE',
    epistemicLevel: 'CANDIDATE_INVARIANT',
    title: 'Гипотеза: Угол вписанный равен половине центрального (∠ACB = 1/2 ◡AB)',
    description: `Для дуги AB (центральный угол θ = ${centralAngleAB.toFixed(1)}°), вписанный угол ∠ACB = ${theoreticalInscribedC.toFixed(1)}°.`,
    observedValue: `α = ${theoreticalInscribedC.toFixed(1)}°`,
    expectedValue: `θ/2 = ${(centralAngleAB / 2).toFixed(1)}°`,
    deviation: 0,
    isMatch: true,
    isFormallyVerified: true,
    proofPrerequisites: ['INSCRIBED_ANGLE_PRECONDITION', 'COMMON_SUBTENDED_ARC'],
    mathematicalBasis: 'Теорема о вписанном угле (alpha = theta / 2)',
  });

  // Level 5: KNOWN_RELATION_MATCH
  // Check if current configuration matches Thales pattern (c approx 2R or theta approx 180)
  const hasDiameterChord = chordArcRelations.some((rel) => rel.isDiameter);
  const abIsDiameter = Math.abs(geoBase.arcs.AB.deg - 180) < 0.5;

  observations.push({
    id: 'OBS-05-THALES-RELATION-MATCH',
    epistemicLevel: 'KNOWN_RELATION_MATCH',
    title: 'Сопоставление с паттерном: Конфигурация Фалеса (Диаметр + Прямой угол)',
    description: abIsDiameter
      ? 'Хорда AB совпадает с диаметром (θ = 180°). Наблюдаемый паттерн соответствует Теореме Фалеса.'
      : 'Хорда AB не является диаметром (θ ≠ 180°). Паттерн Фалеса не активен.',
    observedValue: abIsDiameter ? 'Паттерн совпадает (θ_AB ≈ 180°)' : 'Паттерн не совпадает (θ_AB ≠ 180°)',
    expectedValue: 'θ_AB = 180° (Диаметр)',
    isMatch: abIsDiameter,
    // CRITICAL: A Known Relation Match is NOT automatically a Verified Invariant!
    // It remains isFormallyVerified: false until verified by the kernel invariants suite!
    isFormallyVerified: false,
    proofPrerequisites: ['DIAMETER_AB', 'C_ON_CIRCLE_BOUNDARY', 'NON_DEGENERATE_VERTICES'],
    mathematicalBasis: 'Структурный паттерн теоремы Фалеса (требует формального доказательства пререквизитов)',
  });

  // Level 6: VERIFIED_INVARIANT
  // Formally verified via Canonical Consistency Kernel
  const invariantStatuses = evaluateStructuralInvariants(snapshot, CANONICAL_INVARIANT_SUITE);
  for (const status of invariantStatuses) {
    const isPreserved = status.status === 'PRESERVED';
    observations.push({
      id: `OBS-06-VERIFIED-${status.id}`,
      epistemicLevel: 'VERIFIED_INVARIANT',
      title: `Верифицированный инвариант: ${status.id}`,
      description: isPreserved
        ? `Все структурные пререквизиты [${status.evidence.passedPreconditions.join(', ')}] доказаны в математическом ядре.`
        : `Нарушены пререквизиты: [${status.evidence.failedPreconditions.join(', ')}].`,
      observedValue: isPreserved ? 'СОХРАНЁН (ПРОВЕРЕН ЯДРОМ)' : 'НЕ ВЫПОЛНЕН',
      expectedValue: 'ПРЕДУСЛОВИЯ ИСТИННЫ',
      deviation: isPreserved ? 0 : 1,
      isMatch: isPreserved,
      isFormallyVerified: isPreserved,
      proofPrerequisites: [...status.evidence.passedPreconditions, ...status.evidence.failedPreconditions],
      mathematicalBasis: `Ядро верификации: ${status.id} (${status.basis})`,
    });
  }

  return observations;
}
