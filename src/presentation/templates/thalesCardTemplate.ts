// src/presentation/templates/thalesCardTemplate.ts
// Pure, deterministic Educational Card Projection for Thales Theorem (EV-01).
// Consumes verified epistemic facts from Packet #6 (verifyHypothesis / canonicalRules).
// Does NOT recompute geometry or prove theorems independently.

import { FullGeometryState } from '../../engines/constructionCore';
import { ConstructionTrace } from '../../engines/research/researchTypes';
import { HypothesisNode } from '../../engines/research/researchGraphTypes';
import { verifyHypothesis } from '../../engines/research/researchGraph';
import { RULE_THALES_DIAMETER } from '../../engines/research/canonicalRules';
import {
  VisualizationTemplate,
  EducationalCardViewModel,
  CardLifecycleState,
} from '../educationalTypes';

/**
 * Pure Declarative Visualization Template for Thales Theorem.
 * Specifies focus on diameter AB, vertex C, center O, and 90-degree marker.
 */
export const THALES_VISUALIZATION_TEMPLATE: VisualizationTemplate = {
  templateId: 'VISTEMPLATE-THALES-DIAMETER',
  targetRuleId: RULE_THALES_DIAMETER.id,
  targetProfileId: 'RIGHT_TRIANGLE_DECOMPOSITION',
  highlightEntities: [
    {
      entityId: 'AB',
      entityType: 'segment',
      label: 'Диаметр AB (2R)',
      styleRole: 'reference_baseline',
    },
    {
      entityId: 'pt_C',
      entityType: 'vertex',
      label: 'Вершина прямого угла C',
      styleRole: 'primary_focus',
    },
    {
      entityId: 'O',
      entityType: 'center',
      label: 'Центр окружности O',
      styleRole: 'secondary_focus',
    },
  ],
  dimUnfocused: true,
  showAnnotations: {
    rightAngleMarker: true,
    diameterLabel: true,
    arcMeasures: false,
  },
  activeHighlightMapping: {
    type: 'side',
    id: 'AB',
  },
};

/**
 * Pure projection function: GeometryState + Epistemic Engine -> EducationalCardViewModel.
 * Completely deterministic and read-only.
 */
export function evaluateThalesCard(
  state: FullGeometryState,
  trace?: ConstructionTrace,
  isActive: boolean = false
): EducationalCardViewModel {
  // 1. Basic entity presence check (without geometry calculations)
  const pA = state.points['pt_A'] || state.points['A'];
  const pB = state.points['pt_B'] || state.points['B'];
  const pC = state.points['pt_C'] || state.points['C'];
  const hasPoints = Boolean(pA && pB && pC);
  const hasU = Boolean(
    state.pointsU &&
      state.pointsU.A !== undefined &&
      state.pointsU.B !== undefined &&
      state.pointsU.C !== undefined
  );
  const hasRadius = state.R > 0;

  if (!hasPoints || !hasU || !hasRadius) {
    return {
      cardId: 'CARD-THALES-RIGHT-ANGLE',
      title: 'Теорема Фалеса: прямой угол, опирающийся на диаметр',
      state: 'UNAVAILABLE',
      context: 'Для активации теоремы Фалеса необходимы три точки A, B, C на окружности.',
      inquiry: {
        question: 'Как изменится угол ACB, если перемещать точку C по окружности?',
        promptAction: 'Постройте точки A, B, C на описанной окружности.',
        hint: 'Точки A и B должны образовывать диаметр окружности.',
      },
      evidence: {
        ruleId: RULE_THALES_DIAMETER.id,
        ruleName: RULE_THALES_DIAMETER.name,
        formalStatement: RULE_THALES_DIAMETER.formalStatement,
        isProven: false,
        failedPreconditions: ['Отсутствуют необходимые точки или радиус в GeometryState'],
      },
      template: THALES_VISUALIZATION_TEMPLATE,
    };
  }

  // 2. Consume epistemic verification from Packet #6 kernel (RULE_THALES_DIAMETER)
  const canonicalHypothesis: HypothesisNode = {
    id: 'HYP-THALES-DIAMETER-PRESENTATION',
    signature: 'THALES_DIAMETER_RIGHT_ANGLE',
    title: 'Теорема Фалеса',
    description: 'Вписанный угол, опирающийся на диаметр, равен 90°',
    formula: '∠ACB = 90.0°',
    epistemicStage: 'KNOWN_RELATION_MATCH',
    candidateStatus: 'MATCHED_CANONICAL_PATTERN',
    evidenceNodeIds: [],
    matchedRuleId: RULE_THALES_DIAMETER.id,
    confidenceNote: 'Сформировано для образовательного слоя представления.',
  };

  const verificationResult = verifyHypothesis(canonicalHypothesis, state, trace);
  const isProven = Boolean(verificationResult.theoremNode && verificationResult.verificationNode?.isProven);

  const failedPreconds = verificationResult.verificationNode
    ? verificationResult.verificationNode.preconditionsChecked
        .filter((p) => !p.satisfied)
        .map((p) => `${p.description} (${p.evidence})`)
    : ['Прекондиции не выполнены'];

  let cardState: CardLifecycleState;
  if (isProven) {
    cardState = isActive ? 'ACTIVE' : 'AVAILABLE';
  } else {
    cardState = 'BROKEN';
  }

  return {
    cardId: 'CARD-THALES-RIGHT-ANGLE',
    title: 'Теорема Фалеса: прямой угол, опирающийся на диаметр',
    state: cardState,
    context:
      'Вписанный угол, опирающийся на диаметр окружности, обладает фундаментальным свойством постоянства: его градусная мера всегда равна 90° независимо от положения вершины.',
    inquiry: {
      question: 'Как изменится угол ∠ACB, если перемещать точку C по окружности, пока AB остаётся диаметром?',
      promptAction: 'Перемещайте точку C по окружности и наблюдайте за углом.',
      hint: 'Пока хорда AB проходит через центр O (является диаметром), угол при вершине C сохраняет постоянную меру 90°.',
    },
    verifiedFact: isProven
      ? {
          statement:
            verificationResult.theoremNode?.formalStatement ||
            RULE_THALES_DIAMETER.formalStatement,
          formula: '∠ACB = 90.0°  (при AB = 2R, θ_AB = 180°)',
          mathematicalDomain:
            verificationResult.theoremNode?.mathematicalDomain ||
            RULE_THALES_DIAMETER.mathematicalDomain,
          qED: true,
        }
      : undefined,
    evidence: {
      ruleId: RULE_THALES_DIAMETER.id,
      ruleName: RULE_THALES_DIAMETER.name,
      formalStatement: RULE_THALES_DIAMETER.formalStatement,
      theoremNodeId: verificationResult.theoremNode?.id,
      isProven,
      failedPreconditions: isProven ? undefined : failedPreconds,
    },
    template: THALES_VISUALIZATION_TEMPLATE,
  };
}
