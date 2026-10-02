// src/engines/semantic/semanticGuard.ts
// Lightweight Semantic Guard / Intent Validator for Geometry Stand V1
// Invariant: "Semantic Guard does not solve geometry. It verifies intent consistency & disambiguates."
// Protects Geometry Engine from contradictory or ambiguous student inputs.

import { FullGeometryState } from '../constructionCore';
import { SemanticCommand } from './types';
import {
  VisualResolutionResult,
  SemanticGuardDecision,
} from './visualSemanticTypes';

export interface GuardEvaluationOptions {
  readonly requestedAction:
    | 'CONSTRUCT_ANGLE_BISECTOR'
    | 'CONSTRUCT_PERPENDICULAR'
    | 'CONSTRUCT_PARALLEL'
    | 'CONSTRUCT_PERPENDICULAR_BISECTOR'
    | 'GET_MEASUREMENTS';
  readonly throughPointId?: string;
  readonly originalText?: string;
}

/**
 * Evaluates semantic consistency of a resolved visual entity and requested geometric action.
 */
export function evaluateSemanticGuard(
  state: FullGeometryState,
  resolution: VisualResolutionResult,
  options: GuardEvaluationOptions
): SemanticGuardDecision {
  const text = (options.originalText || '').toLowerCase();

  // 1. Handle Ambiguity
  if (resolution.status === 'AMBIGUOUS') {
    return {
      action: 'CLARIFY',
      clarificationPrompt: resolution.explanation + '. Уточните, к какому именно объекту применить действие?',
      options: resolution.candidates.map((c) => c.description),
    };
  }

  // 2. Handle Not Found
  if (resolution.status === 'NOT_FOUND') {
    return {
      action: 'REJECT',
      reason: resolution.explanation || 'Указанный визуальный объект не найден на чертеже.',
      suggestedCorrection: 'Проверьте цвета и маркеры объектов на чертеже.',
    };
  }

  // 3. Handle Resolved Target
  if (resolution.status === 'RESOLVED') {
    // A. Contradiction Check: Right angle vs Acute claim
    if (
      resolution.angleInfo?.isRightAngle &&
      (text.includes('остр') || text.includes('acute') || text.includes('гостр'))
    ) {
      return {
        action: 'REJECT',
        reason: `Угол с чёрным квадратиком является прямым (90°), а не острым.`,
        suggestedCorrection: `Построить биссектрису прямого угла ${resolution.angleInfo.vertexId} (разделит его на два угла по 45°)?`,
      };
    }

    // B. Action: CONSTRUCT_ANGLE_BISECTOR
    if (options.requestedAction === 'CONSTRUCT_ANGLE_BISECTOR') {
      if (resolution.targetType === 'angle' && resolution.angleInfo) {
        const vertex = resolution.angleInfo.vertexId;
        return {
          action: 'EXECUTE',
          command: {
            command: 'CONSTRUCT_ANGLE_BISECTOR',
            vertex,
          },
          explanation: `Биссектриса угла при вершине ${vertex}`,
        };
      }
      return {
        action: 'REJECT',
        reason: 'Биссектрису можно построить только для угла, но указан отрезок или прямая.',
        suggestedCorrection: 'Укажите угол или два пересекающихся отрезка.',
      };
    }

    // C. Action: CONSTRUCT_PERPENDICULAR
    if (options.requestedAction === 'CONSTRUCT_PERPENDICULAR') {
      if (resolution.targetType === 'segment' || resolution.targetType === 'line') {
        const refId = resolution.entityId;
        const throughPt = options.throughPointId || 'C';

        // Check if through point belongs to the segment (invalid for altitude)
        const seg = state.segments[refId];
        if (seg && (seg.p1Id === throughPt || seg.p2Id === throughPt)) {
          return {
            action: 'REJECT',
            reason: `Вершина ${throughPt} уже является концом отрезка ${refId}. Высота из точки проводится к противоположной стороне.`,
            suggestedCorrection: `Провести перпендикуляр через точку, не лежащую на отрезке.`,
          };
        }

        return {
          action: 'EXECUTE',
          command: {
            command: 'CONSTRUCT_PERPENDICULAR',
            reference: refId,
            through: throughPt,
          },
          explanation: `Перпендикуляр к ${refId} через точку ${throughPt}`,
        };
      }
      return {
        action: 'REJECT',
        reason: 'Перпендикуляр строится к прямой или отрезку.',
      };
    }

    // D. Action: GET_MEASUREMENTS
    if (options.requestedAction === 'GET_MEASUREMENTS') {
      if (resolution.targetType === 'angle' && resolution.angleInfo) {
        return {
          action: 'EXECUTE',
          command: {
            command: 'GET_MEASUREMENTS',
            filter: {
              target: resolution.angleInfo.vertexId,
            },
          },
          explanation: `Измерение угла при вершине ${resolution.angleInfo.vertexId}`,
        };
      }
    }
  }

  return {
    action: 'REJECT',
    reason: 'Неизвестная семантическая комбинация.',
  };
}
