// src/engines/semantic/aamGateway.ts
// AAM Bridge / Engineering Semantic Gateway v0.1
// Translates natural language engineering queries (RU, UK, EN) into Universal Semantic Tool Calls.
// Architectural Invariant:
// - AAM is a GATEWAY, NOT AN EXECUTOR.
// - ZERO geometric calculations inside AAM (no slopes, no distances, no coordinates).
// - "Language may be ambiguous. Engineering Core must not be."
// - "The agent may be wrong. The stand must not be."

import { FullGeometryState } from '../constructionCore';
import {
  SemanticCommand,
  SemanticCommandResult,
  VerifyRelationPayload,
} from './types';
import { executeSemanticCommand } from './semanticCommandExecutor';

export type AAMIntentType =
  | 'CONSTRUCT_PARALLEL'
  | 'CONSTRUCT_PERPENDICULAR'
  | 'CONSTRUCT_ANGLE_BISECTOR'
  | 'CONSTRUCT_PERPENDICULAR_BISECTOR'
  | 'DRAW_SEGMENT'
  | 'DRAW_POINT'
  | 'DRAW_CIRCLE'
  | 'SET_TRIANGLE_ANGLES'
  | 'MOVE_VERTEX'
  | 'VERIFY_RELATION'
  | 'QUERY_CONFIGURATION'
  | 'QUERY_FACTS'
  | 'QUERY_MEASUREMENTS'
  | 'QUERY_RELATIONS'
  | 'ERASE_OBJECT'
  | 'RESET_GEOMETRY'
  | 'UNKNOWN_INTENT';

export interface AAMNormalizedIntent {
  readonly originalQuery: string;
  readonly intent: AAMIntentType;
  readonly toolCall: SemanticCommand;
  readonly followUpVerification?: VerifyRelationPayload;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly confidence: number;
  readonly language: 'ru' | 'uk' | 'en';
}

export interface AAMGatewayExecutionResult {
  readonly query: string;
  readonly intent: AAMNormalizedIntent;
  readonly toolCallResult: SemanticCommandResult;
  readonly followUpVerificationResult?: SemanticCommandResult;
  readonly nextState: FullGeometryState;
  readonly structuredSummary: {
    readonly construction: 'accepted' | 'rejected' | 'not_requested';
    readonly relation?: string;
    readonly status: 'VERIFIED' | 'REFUTED' | 'UNVERIFIED' | 'NOT_APPLICABLE';
    readonly message: string;
  };
}

/**
 * Detects language based on character set and common vocabulary.
 */
function detectLanguage(text: string): 'ru' | 'uk' | 'en' {
  const lower = text.toLowerCase();
  if (/[іїєґ]/.test(lower) || lower.includes('побудуй') || lower.includes('перевір') || lower.includes('пряму')) {
    return 'uk';
  }
  if (/[а-яё]/.test(lower)) {
    return 'ru';
  }
  return 'en';
}

/**
 * Pure lexical extraction of point/segment/line identifiers from natural language.
 * Examples: "AB", "BC", "CD", "A", "B", "C", "P", "line_1".
 */
function extractEntityId(token: string): string {
  return token.replace(/[^A-Za-z0-9_]/g, '');
}

/**
 * Normalizes human/agent natural language query into formal AAM intent and semantic tool call.
 * ZERO mathematical evaluation is performed here.
 */
export function normalizeAAMIntent(rawQuery: string): AAMNormalizedIntent {
  const query = (rawQuery || '').trim();
  const lower = query.toLowerCase();
  const lang = detectLanguage(query);

  // Check if this query requests follow-up verification:
  // e.g. "...и проверь, параллельна ли...", "...and verify if it is parallel...", "...та перевір чи..."
  const hasFollowUpVerification =
    lower.includes('провер') ||
    lower.includes('перевір') ||
    lower.includes('verify') ||
    lower.includes('check');

  const isApproximate =
    lower.includes('примерно') ||
    lower.includes('приблизно') ||
    lower.includes('approximately') ||
    lower.includes('roughly');

  // --------------------------------------------------------------------------
  // 1. SET_TRIANGLE_ANGLES
  // e.g. "Задай углы треугольника A=40, B=70", "Set triangle angles A=40, B=70", "A: 40, B: 70"
  // --------------------------------------------------------------------------
  const angleMatchA = query.match(/(?:∠|угол\s*|кут\s*|angle\s*)?A\s*[:=]\s*([\d.]+)/i);
  const angleMatchB = query.match(/(?:∠|угол\s*|кут\s*|angle\s*)?B\s*[:=]\s*([\d.]+)/i);
  const angleMatchC = query.match(/(?:∠|угол\s*|кут\s*|angle\s*)?C\s*[:=]\s*([\d.]+)/i);

  if (
    (angleMatchA || angleMatchB || angleMatchC) &&
    (lower.includes('угол') || lower.includes('кут') || lower.includes('angle') || lower.includes('треугольник') || lower.includes('трикутник') || lower.includes('='))
  ) {
    const aVal = angleMatchA ? parseFloat(angleMatchA[1]) : undefined;
    const bVal = angleMatchB ? parseFloat(angleMatchB[1]) : undefined;
    const cVal = angleMatchC ? parseFloat(angleMatchC[1]) : undefined;

    return {
      originalQuery: query,
      intent: 'SET_TRIANGLE_ANGLES',
      toolCall: {
        command: 'SET_TRIANGLE_ANGLES',
        angles: { A: aVal, B: bVal, C: cVal },
      },
      parameters: { A: aVal, B: bVal, C: cVal },
      confidence: 1.0,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 2. CONSTRUCT_PARALLEL
  // e.g. "Проведи через точку A прямую, параллельную BC"
  // UK: "Проведи через точку A пряму, паралельну BC"
  // EN: "Construct line through A parallel to BC"
  // --------------------------------------------------------------------------
  const isParallelConstruction =
    (lower.includes('параллел') || lower.includes('паралел') || lower.includes('parallel')) &&
    (lower.includes('проведи') || lower.includes('построй') || lower.includes('побудуй') || lower.includes('construct') || lower.includes('draw')) &&
    !lower.includes('?');

  if (isParallelConstruction) {
    // Pattern: through X parallel to Y
    const throughMatch = query.match(/(?:через|through)(?:\s+(?:точку|точки|point))?\s+([A-Za-z0-9_]+)/i);
    const refMatch = query.match(/(?:параллел[ьяьюеі]|параллельную|паралельну|parallel\s*(?:line\s*)?to)\s*(?:к|до|to)?(?:\s+(?:отрезка|отрезку|відрізка|відрізку|segment|line|прямой|пряму|прямої))?\s*([A-Za-z0-9_]+)/i);

    const throughPt = throughMatch ? extractEntityId(throughMatch[1]) : '';
    const refLine = refMatch ? extractEntityId(refMatch[1]) : '';

    let followUp: VerifyRelationPayload | undefined = undefined;
    if (hasFollowUpVerification && (lower.includes('действительно') || lower.includes('действительно ли') || lower.includes('чи дійсно') || lower.includes('whether') || lower.includes('if it is') || lower.includes('проверь её') || lower.includes('перевір її') || lower.includes('verify it'))) {
      followUp = {
        command: 'VERIFY_RELATION',
        relation: 'PARALLEL',
        subject: 'constructed_line',
        reference: refLine,
      };
    }

    return {
      originalQuery: query,
      intent: 'CONSTRUCT_PARALLEL',
      toolCall: {
        command: 'CONSTRUCT_PARALLEL',
        reference: refLine,
        through: throughPt,
      },
      followUpVerification: followUp,
      parameters: { through: throughPt, reference: refLine, approximate: isApproximate },
      confidence: throughPt && refLine ? 1.0 : 0.4,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 3. CONSTRUCT_PERPENDICULAR
  // e.g. "Проведи через A перпендикуляр к BC", "Construct perpendicular from A to BC"
  // --------------------------------------------------------------------------
  const isPerpConstruction =
    (lower.includes('перпендикуляр') || lower.includes('perpendicular')) &&
    !lower.includes('серединный') &&
    !lower.includes('серединний') &&
    (lower.includes('проведи') || lower.includes('построй') || lower.includes('побудуй') || lower.includes('construct') || lower.includes('draw') || lower.includes('через') || lower.includes('through') || lower.includes('from')) &&
    !lower.includes('?');

  if (isPerpConstruction && !lower.startsWith('провер') && !lower.startsWith('перевір') && !lower.startsWith('is ') && !lower.startsWith('verify')) {
    const throughMatch = query.match(/(?:через|from|through)(?:\s+точку)?\s+([A-Za-z0-9_]+)/i);
    const refMatch = query.match(/(?:перпендикуляр[а-я]*|perpendicular\s*(?:line\s*)?(?:to|from)?)\s*(?:к|до|to)?\s+([A-Za-z0-9_]+)/i);

    const throughPt = throughMatch ? extractEntityId(throughMatch[1]) : '';
    const refLine = refMatch ? extractEntityId(refMatch[1]) : '';

    let followUp: VerifyRelationPayload | undefined = undefined;
    if (hasFollowUpVerification) {
      followUp = {
        command: 'VERIFY_RELATION',
        relation: 'PERPENDICULAR',
        subject: 'constructed_line',
        reference: refLine,
      };
    }

    return {
      originalQuery: query,
      intent: 'CONSTRUCT_PERPENDICULAR',
      toolCall: {
        command: 'CONSTRUCT_PERPENDICULAR',
        reference: refLine,
        through: throughPt,
      },
      followUpVerification: followUp,
      parameters: { through: throughPt, reference: refLine, approximate: isApproximate },
      confidence: throughPt && refLine ? 1.0 : 0.4,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 4. CONSTRUCT_ANGLE_BISECTOR
  // e.g. "Построй биссектрису угла ABC", "биссектриса угла C", "Construct angle bisector of angle ABC"
  // --------------------------------------------------------------------------
  if (lower.includes('биссектрис') || lower.includes('бісектрис') || lower.includes('bisector')) {
    if (!lower.includes('серединн') && !lower.includes('perpendicular bisector')) {
      const angleMatch = query.match(/(?:биссектрис[ау]|бісектрис[уа]|bisector)(?:\s+угла|\s+кута|\s+of\s+angle)?\s+([A-Za-z0-9_]+)/i);
      const angleId = angleMatch ? extractEntityId(angleMatch[1]).toUpperCase() : '';

      let vertex = angleId;
      let pAId: string | undefined = undefined;
      let pBId: string | undefined = undefined;

      if (angleId.length === 3) {
        pAId = angleId[0];
        vertex = angleId[1];
        pBId = angleId[2];
      }

      return {
        originalQuery: query,
        intent: 'CONSTRUCT_ANGLE_BISECTOR',
        toolCall: {
          command: 'CONSTRUCT_ANGLE_BISECTOR',
          vertex,
          pAId,
          pBId,
        },
        parameters: { vertex, pAId, pBId },
        confidence: vertex ? 1.0 : 0.3,
        language: lang,
      };
    }
  }

  // --------------------------------------------------------------------------
  // 5. CONSTRUCT_PERPENDICULAR_BISECTOR
  // e.g. "Построй серединный перпендикуляр к AB", "Construct perpendicular bisector of AB"
  // --------------------------------------------------------------------------
  if (lower.includes('серединн') || lower.includes('perpendicular bisector')) {
    const refMatch = query.match(/(?:серединный\s+перпендикуляр|серединний\s+перпендикуляр|perpendicular\s+bisector)(?:\s+к|\s+до|\s+отрезка|\s+відрізка|\s+of)?\s+([A-Za-z0-9_]+)/i);
    const refLine = refMatch ? extractEntityId(refMatch[1]).toUpperCase() : '';

    return {
      originalQuery: query,
      intent: 'CONSTRUCT_PERPENDICULAR_BISECTOR',
      toolCall: {
        command: 'CONSTRUCT_PERPENDICULAR_BISECTOR',
        reference: refLine,
      },
      parameters: { reference: refLine },
      confidence: refLine ? 1.0 : 0.3,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 6. VERIFY_RELATION - PERPENDICULAR
  // e.g. "Проверь, действительно ли AB перпендикулярна CD", "AB перпендикулярна CD?", "Verify if AB is perpendicular to CD"
  // --------------------------------------------------------------------------
  if (
    (lower.includes('перпендикуляр') || lower.includes('perpendicular')) &&
    (lower.includes('провер') || lower.includes('перевір') || lower.includes('verify') || lower.includes('is ') || lower.includes('действительно ли') || lower.includes('чи дійсно') || lower.includes('?'))
  ) {
    const match = query.match(/([A-Za-z0-9_]+)\s+(?:перпендикулярн[а-яіїє]*|perpendicular\s+to)\s+(?:к|до|to)?\s*([A-Za-z0-9_]+)/i);
    const subj = match ? extractEntityId(match[1]) : '';
    const ref = match ? extractEntityId(match[2]) : '';

    return {
      originalQuery: query,
      intent: 'VERIFY_RELATION',
      toolCall: {
        command: 'VERIFY_RELATION',
        relation: 'PERPENDICULAR',
        subject: subj,
        reference: ref,
      },
      parameters: { relation: 'PERPENDICULAR', subject: subj, reference: ref },
      confidence: subj && ref ? 1.0 : 0.4,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 7. VERIFY_RELATION - PARALLEL
  // e.g. "Проверь параллельность линии L и отрезка BC", "Проверь, параллельна ли AB BC", "Verify if L is parallel to BC"
  // --------------------------------------------------------------------------
  if (
    (lower.includes('параллел') || lower.includes('паралел') || lower.includes('parallel')) &&
    (lower.includes('провер') || lower.includes('перевір') || lower.includes('verify') || lower.includes('сохранилось ли') || lower.includes('чи збереглася') || lower.includes('?'))
  ) {
    const match1 = query.match(/(?:линии\s+|лінії\s+|line\s+)?([A-Za-z0-9_]+)\s+(?:и|та|and)\s+(?:отрезка\s+|відрізка\s+|segment\s+)?([A-Za-z0-9_]+)/i);
    const match2 = query.match(/(?:параллельн[а-яіїє]*|parallel\s*(?:to)?)\s*(?:ли)?\s*([A-Za-z0-9_]+)\s*(?:к|до|to)?\s*([A-Za-z0-9_]+)/i);
    const match = match1 || match2;
    const subj = match ? extractEntityId(match[1]) : '';
    const ref = match ? extractEntityId(match[2]) : '';

    return {
      originalQuery: query,
      intent: 'VERIFY_RELATION',
      toolCall: {
        command: 'VERIFY_RELATION',
        relation: 'PARALLEL',
        subject: subj,
        reference: ref,
      },
      parameters: { relation: 'PARALLEL', subject: subj, reference: ref },
      confidence: subj && ref ? 1.0 : 0.4,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 8. VERIFY_RELATION - DIAMETER
  // e.g. "Является ли AB диаметром этой окружности?", "Is AB a diameter of this circle?"
  // --------------------------------------------------------------------------
  if (lower.includes('диаметр') || lower.includes('діаметр') || lower.includes('diameter')) {
    const match = query.match(/(?:является\s+ли|чи\s+є|is)\s+([A-Za-z0-9_]+)\s+диаметр|діаметр|diameter/i) ||
                  query.match(/([A-Za-z0-9_]+)\s+(?:диаметр|діаметр|diameter)/i);
    const chord = match ? extractEntityId(match[1]) : 'AB';

    return {
      originalQuery: query,
      intent: 'VERIFY_RELATION',
      toolCall: {
        command: 'VERIFY_RELATION',
        relation: 'DIAMETER',
        subject: chord,
        reference: 'base_circle',
      },
      parameters: { relation: 'DIAMETER', subject: chord },
      confidence: 1.0,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 9. VERIFY_RELATION - THALES THEOREM
  // e.g. "Проверь теорему Фалеса для треугольника ABC", "Verify Thales theorem for triangle ABC"
  // --------------------------------------------------------------------------
  if (lower.includes('фалес') || lower.includes('thales')) {
    return {
      originalQuery: query,
      intent: 'VERIFY_RELATION',
      toolCall: {
        command: 'VERIFY_RELATION',
        relation: 'THALES_INSCRIBED_RIGHT_ANGLE',
        subject: 'C',
        reference: 'AB',
      },
      parameters: { theorem: 'THALES' },
      confidence: 1.0,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 10. VERIFY_RELATION - POINT_ON_CIRCLE
  // e.g. "Проверь, лежит ли точка P на окружности", "Verify if point P lies on the circle"
  // --------------------------------------------------------------------------
  if (
    (lower.includes('лежит') || lower.includes('лежить') || lower.includes('lies on')) &&
    (lower.includes('окружност') || lower.includes('колі') || lower.includes('circle'))
  ) {
    const ptMatch = query.match(/(?:точка|точки|point)\s+([A-Za-z0-9_]+)/i);
    const pt = ptMatch ? extractEntityId(ptMatch[1]) : 'P';

    return {
      originalQuery: query,
      intent: 'VERIFY_RELATION',
      toolCall: {
        command: 'VERIFY_RELATION',
        relation: 'POINT_ON_CIRCLE',
        subject: pt,
        reference: 'base_circle',
      },
      parameters: { relation: 'POINT_ON_CIRCLE', subject: pt },
      confidence: 1.0,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 11. ERASE_OBJECT
  // e.g. "Удали прямую line_1", "Видали об'єкт line_1", "Erase object line_1", "Удали объект chord_BC"
  // --------------------------------------------------------------------------
  if (lower.includes('удали') || lower.includes('видали') || lower.includes('erase') || lower.includes('delete')) {
    const idMatch = query.match(/(?:объект|об'єкт|прямую|пряму|хорду|точку|отрезок|відрізок|object|line|chord|point|segment)\s+([A-Za-z0-9_]+)/i) ||
                    query.match(/(?:удали|видали|erase|delete)\s+([A-Za-z0-9_]+)/i);
    const objId = idMatch ? extractEntityId(idMatch[1]) : '';

    return {
      originalQuery: query,
      intent: 'ERASE_OBJECT',
      toolCall: {
        command: 'ERASE_OBJECT',
        id: objId,
      },
      parameters: { id: objId },
      confidence: objId ? 1.0 : 0.3,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 12. DRAW_SEGMENT / CHORD
  // e.g. "Построй хорду между A и B", "Построй отрезок AB", "Construct chord between A and B"
  // --------------------------------------------------------------------------
  if (lower.includes('хорд') || lower.includes('chord') || lower.includes('отрезок') || lower.includes('відрізок') || lower.includes('segment')) {
    const ptsMatch = query.match(/(?:между|між|between)\s+([A-Za-z0-9_]+)\s+(?:и|та|and)\s+([A-Za-z0-9_]+)/i) ||
                     query.match(/(?:отрезок|відрізок|хорду|хорда|segment|chord)\s+([A-Za-z0-9_]{2})/i);
    let p1 = 'A';
    let p2 = 'B';
    if (ptsMatch) {
      if (ptsMatch[2]) {
        p1 = extractEntityId(ptsMatch[1]);
        p2 = extractEntityId(ptsMatch[2]);
      } else if (ptsMatch[1] && ptsMatch[1].length >= 2) {
        p1 = ptsMatch[1][0];
        p2 = ptsMatch[1][1];
      }
    }

    return {
      originalQuery: query,
      intent: 'DRAW_SEGMENT',
      toolCall: {
        command: 'DRAW_SEGMENT',
        p1Id: p1,
        p2Id: p2,
      },
      parameters: { p1Id: p1, p2Id: p2 },
      confidence: 1.0,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 12. DRAW_POINT
  // e.g. "Построй точку P с координатами (30, 40)", "Construct point P at (30, 40)"
  // --------------------------------------------------------------------------
  if (lower.includes('точку') || lower.includes('point')) {
    const coordsMatch = query.match(/\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?/);
    const nameMatch = query.match(/(?:точку|point)\s+([A-Za-z0-9_]+)/i);
    const ptName = nameMatch ? extractEntityId(nameMatch[1]) : 'P';
    const x = coordsMatch ? parseFloat(coordsMatch[1]) : 50;
    const y = coordsMatch ? parseFloat(coordsMatch[2]) : 50;

    return {
      originalQuery: query,
      intent: 'DRAW_POINT',
      toolCall: {
        command: 'DRAW_POINT',
        name: ptName,
        x,
        y,
      },
      parameters: { name: ptName, x, y },
      confidence: 1.0,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 13. DRAW_CIRCLE / CIRCUMCIRCLE
  // e.g. "Построй окружность через три точки", "Construct circle through three points"
  // --------------------------------------------------------------------------
  if (lower.includes('окружност') || lower.includes('коло') || lower.includes('circle')) {
    return {
      originalQuery: query,
      intent: 'DRAW_CIRCLE',
      toolCall: {
        command: 'DRAW_CIRCLE',
        centerId: 'O',
        radius: 100,
      },
      parameters: { centerId: 'O', radius: 100 },
      confidence: 1.0,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 14. GET_CONFIGURATION / PASSPORT
  // e.g. "Покажи конфигурацию", "Паспорт конфигурации", "Show configuration passport"
  // --------------------------------------------------------------------------
  if (lower.includes('паспорт') || lower.includes('конфигураци') || lower.includes('конфігурац') || lower.includes('configuration')) {
    return {
      originalQuery: query,
      intent: 'QUERY_CONFIGURATION',
      toolCall: {
        command: 'GET_CONFIGURATION',
      },
      parameters: {},
      confidence: 1.0,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 15. GET_VERIFIED_FACTS
  // e.g. "Покажи доказанные факты", "Какие факты доказаны?", "Show verified facts and invariants"
  // --------------------------------------------------------------------------
  if (lower.includes('доказан') || lower.includes('доведен') || lower.includes('verified') || lower.includes('инвариант')) {
    return {
      originalQuery: query,
      intent: 'QUERY_FACTS',
      toolCall: {
        command: 'GET_VERIFIED_FACTS',
      },
      parameters: {},
      confidence: 1.0,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 16. GET_MEASUREMENTS
  // e.g. "Измерь угол при вершине C", "Какой угол при C?", "Measure angle at vertex C"
  // --------------------------------------------------------------------------
  if (lower.includes('измерь') || lower.includes('виміряй') || lower.includes('measure') || lower.includes('какой угол') || lower.includes('який кут')) {
    const targetMatch = query.match(/(?:при|of|at)?\s*(?:вершине|вершині|vertex)?\s*([A-Za-z0-9_]+)/i);
    const target = targetMatch ? extractEntityId(targetMatch[1]).toUpperCase() : 'C';

    return {
      originalQuery: query,
      intent: 'QUERY_MEASUREMENTS',
      toolCall: {
        command: 'GET_MEASUREMENTS',
        filter: { target },
      },
      parameters: { target },
      confidence: 1.0,
      language: lang,
    };
  }

  // --------------------------------------------------------------------------
  // 18. RESET_GEOMETRY
  // e.g. "Сбрось геометрию", "Скинь геометрію", "Reset geometry"
  // --------------------------------------------------------------------------
  if (lower.includes('сбрось') || lower.includes('скинь') || lower.includes('reset') || lower.includes('исходное состояние')) {
    return {
      originalQuery: query,
      intent: 'RESET_GEOMETRY',
      toolCall: {
        command: 'RESET_GEOMETRY',
      },
      parameters: {},
      confidence: 1.0,
      language: lang,
    };
  }

  // Fallback
  return {
    originalQuery: query,
    intent: 'UNKNOWN_INTENT',
    toolCall: {
      command: 'GET_GEOMETRY_STATE',
    },
    parameters: {},
    confidence: 0.2,
    language: lang,
  };
}

/**
 * Executes a normalized AAM intent through the Universal Semantic Tool Interface.
 * Enforces the strict epistemic invariant:
 * - AAM normalizes intent.
 * - Geometry Stand executes and returns deterministic mathematical truth.
 */
export function executeAAMGateway(
  state: FullGeometryState,
  queryOrIntent: string | AAMNormalizedIntent
): AAMGatewayExecutionResult {
  const intent = typeof queryOrIntent === 'string' ? normalizeAAMIntent(queryOrIntent) : queryOrIntent;

  // Strict epistemic rejection of non-deterministic approximations
  if (intent.parameters?.approximate) {
    return {
      query: intent.originalQuery,
      intent,
      toolCallResult: {
        success: false,
        command: intent.toolCall.command,
        stateChanged: false,
        nextState: state,
        previousState: state,
        errorCode: 'PRECONDITION_FAILED',
        errorMessage: 'Приближённые построения («примерно») недопустимы в детерминированном стенде евклидовой геометрии.',
      },
      nextState: state,
      structuredSummary: {
        construction: 'rejected',
        status: 'REFUTED',
        message: 'Приближённые построения недопустимы: стенд евклидовой геометрии строго детерминирован.',
      },
    };
  }

  // 1. Dispatch primary semantic command to Stand
  const toolResult = executeSemanticCommand(state, intent.toolCall);

  let followUpResult: SemanticCommandResult | undefined = undefined;
  let constructionSummary: 'accepted' | 'rejected' | 'not_requested' = 'not_requested';
  let relationName: string | undefined = undefined;
  let epistemicStatus: 'VERIFIED' | 'REFUTED' | 'UNVERIFIED' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
  let finalMessage = '';

  const isConstruction = [
    'CONSTRUCT_PARALLEL',
    'CONSTRUCT_PERPENDICULAR',
    'CONSTRUCT_ANGLE_BISECTOR',
    'CONSTRUCT_PERPENDICULAR_BISECTOR',
    'DRAW_SEGMENT',
    'DRAW_POINT',
    'DRAW_CIRCLE',
    'SET_TRIANGLE_ANGLES',
  ].includes(intent.intent);

  if (isConstruction) {
    constructionSummary = toolResult.success ? 'accepted' : 'rejected';
    finalMessage = toolResult.success
      ? `Конструкция принята Stand (${intent.toolCall.command}).`
      : `Конструкция отклонена Stand: ${toolResult.errorMessage || 'ошибка предусловий'}`;
  }

  // 2. If follow-up verification was requested and construction succeeded
  if (intent.followUpVerification && toolResult.success) {
    let verifyPayload = { ...intent.followUpVerification };
    // Bind 'constructed_line' placeholder to newly created line ID
    if (
      verifyPayload.subject === 'constructed_line' &&
      toolResult.createdEntities &&
      toolResult.createdEntities.length > 0
    ) {
      verifyPayload.subject = toolResult.createdEntities[0].id;
    }

    followUpResult = executeSemanticCommand(toolResult.nextState, verifyPayload);
    if (followUpResult.verification) {
      relationName = followUpResult.verification.relation;
      epistemicStatus = followUpResult.verification.status;
      finalMessage += ` | Верификация: [${relationName}: ${epistemicStatus}] ${followUpResult.verification.explanation}`;
    }
  } else if (intent.intent === 'VERIFY_RELATION' && toolResult.verification) {
    relationName = toolResult.verification.relation;
    epistemicStatus = toolResult.verification.status;
    finalMessage = `Верификация отношения [${relationName}]: ${epistemicStatus} — ${toolResult.verification.explanation}`;
  } else if (!isConstruction) {
    finalMessage = toolResult.infoMessage || `Запрос [${intent.intent}] успешно обработан Stand.`;
  }

  return {
    query: intent.originalQuery,
    intent,
    toolCallResult: toolResult,
    followUpVerificationResult: followUpResult,
    nextState: toolResult.nextState,
    structuredSummary: {
      construction: constructionSummary,
      relation: relationName,
      status: epistemicStatus,
      message: finalMessage,
    },
  };
}
