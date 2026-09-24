// src/engines/semantic/naturalLanguageAdapter.ts
// Pure adapter: Translates Teacher / Student / AI Natural Language into normalized Semantic Commands.
// Isolated from Geometry Core: Does zero geometry calculations, only lexical extraction & normalization.

import { SemanticCommand } from './types';

/**
 * Parses teacher or student natural language text into a structured SemanticCommand.
 * Returns null if the intent cannot be recognized unambiguously.
 */
export function parseNaturalLanguageToSemanticCommand(
  text: string
): SemanticCommand | null {
  if (!text || typeof text !== 'string') return null;
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. SET_TRIANGLE_ANGLES
  // e.g., "Построй треугольник с углами A=40, B=70", "A=40°, B=70°, C=70°", "triangle angles A: 40, B: 60"
  const angleMatchA = raw.match(/(?:∠|угол\s*)?A\s*[:=]\s*([\d.]+)/i);
  const angleMatchB = raw.match(/(?:∠|угол\s*)?B\s*[:=]\s*([\d.]+)/i);
  const angleMatchC = raw.match(/(?:∠|угол\s*)?C\s*[:=]\s*([\d.]+)/i);

  if (angleMatchA || angleMatchB || angleMatchC) {
    const aVal = angleMatchA ? parseFloat(angleMatchA[1]) : undefined;
    const bVal = angleMatchB ? parseFloat(angleMatchB[1]) : undefined;
    const cVal = angleMatchC ? parseFloat(angleMatchC[1]) : undefined;

    if (aVal !== undefined || bVal !== undefined || cVal !== undefined) {
      return {
        command: 'SET_TRIANGLE_ANGLES',
        angles: {
          A: aVal,
          B: bVal,
          C: cVal,
        },
      };
    }
  }

  // 2. CONSTRUCT_ANGLE_BISECTOR
  // e.g. "Построй биссектрису угла C", "биссектриса C", "bisector of angle C"
  const bisectorMatch = raw.match(/(?:биссектрис[ау]|bisector)(?:\s+угла|\s+angle)?\s+([A-Za-z0-9_]+)/i);
  if (bisectorMatch) {
    return {
      command: 'CONSTRUCT_ANGLE_BISECTOR',
      vertex: bisectorMatch[1].toUpperCase(),
    };
  }

  // 3. CONSTRUCT_PERPENDICULAR_BISECTOR
  // e.g. "Построй серединный перпендикуляр к AB", "серединный перпендикуляр отрезка AB", "perpendicular bisector of AB"
  const perpBisectorMatch = raw.match(/(?:серединный\s+перпендикуляр|perpendicular\s+bisector)(?:\s+к|\s+отрезка|\s+of)?\s+([A-Za-z0-9_]+)/i);
  if (perpBisectorMatch) {
    return {
      command: 'CONSTRUCT_PERPENDICULAR_BISECTOR',
      reference: perpBisectorMatch[1].toUpperCase(),
    };
  }

  // 4. CONSTRUCT_PARALLEL
  // e.g. "Проведи через точку C прямую, параллельную AB", "параллель к AB через C", "parallel to AB through C"
  const parallelMatch1 = raw.match(/(?:параллел[ьяью]|параллельную|прямую,?\s*параллельную|parallel\s*(?:line\s*)?to)\s*(?:к|to)?\s+([A-Za-z0-9_]+)\s+(?:через|through)(?:\s+точку)?\s+([A-Za-z0-9_]+)/i);
  const parallelMatch2 = raw.match(/(?:через|through)(?:\s+точку)?\s+([A-Za-z0-9_]+)\s+(?:проведи\s+)?(?:прямую,?\s*)?(?:параллел[ьяью]|параллельную|parallel\s*(?:line\s*)?to)\s*(?:к|to)?\s+([A-Za-z0-9_]+)/i);
  if (parallelMatch1) {
    return {
      command: 'CONSTRUCT_PARALLEL',
      reference: parallelMatch1[1].toUpperCase(),
      through: parallelMatch1[2].toUpperCase(),
    };
  }
  if (parallelMatch2) {
    return {
      command: 'CONSTRUCT_PARALLEL',
      reference: parallelMatch2[2].toUpperCase(),
      through: parallelMatch2[1].toUpperCase(),
    };
  }

  // 5. CONSTRUCT_PERPENDICULAR
  // e.g. "Построй перпендикуляр к AB через C", "перпендикуляр к AB через точку P", "perpendicular to AB through C"
  const perpMatch1 = raw.match(/(?:перпендикуляр[а-я]*|прямую,?\s*перпендикулярную|perpendicular\s*(?:line\s*)?to)\s*(?:к|to)?\s+([A-Za-z0-9_]+)\s+(?:через|through)(?:\s+точку)?\s+([A-Za-z0-9_]+)/i);
  const perpMatch2 = raw.match(/(?:через|through)(?:\s+точку)?\s+([A-Za-z0-9_]+)\s+(?:проведи\s+)?(?:прямую,?\s*)?(?:перпендикуляр[а-я]*|перпендикулярную|perpendicular\s*(?:line\s*)?to)\s*(?:к|to)?\s+([A-Za-z0-9_]+)/i);
  if (perpMatch1) {
    return {
      command: 'CONSTRUCT_PERPENDICULAR',
      reference: perpMatch1[1].toUpperCase(),
      through: perpMatch1[2].toUpperCase(),
    };
  }
  if (perpMatch2) {
    return {
      command: 'CONSTRUCT_PERPENDICULAR',
      reference: perpMatch2[2].toUpperCase(),
      through: perpMatch2[1].toUpperCase(),
    };
  }

  // 6. GET_RELATIONS
  // e.g. "Покажи отношения", "какие отношения существуют?", "get relations"
  if (lower.includes('отношени') || lower.includes('relation')) {
    return {
      command: 'GET_RELATIONS',
    };
  }

  // 7. GET_MEASUREMENTS / ANGLE QUERY
  // e.g. "Какой угол при C?", "измерь угол C", "measure angle C"
  const angleQueryMatch = raw.match(/(?:какой\s+угол|измерь\s+угол|measure\s+angle)(?:\s+при|\s+of)?\s+([A-Za-z0-9_]+)/i);
  if (angleQueryMatch) {
    return {
      command: 'GET_MEASUREMENTS',
      filter: {
        target: angleQueryMatch[1].toUpperCase(),
      },
    };
  }

  // 8. GET_VERIFIED_FACTS
  // e.g. "Покажи доказанные факты", "какие факты доказаны?", "verified facts"
  if (lower.includes('доказан') || lower.includes('verified') || lower.includes('инвариант')) {
    return {
      command: 'GET_VERIFIED_FACTS',
    };
  }

  // 9. GET_CONFIGURATION
  // e.g. "Покажи конфигурацию", "паспорт конфигурации", "configuration"
  if (lower.includes('конфигураци') || lower.includes('паспорт') || lower.includes('configuration')) {
    return {
      command: 'GET_CONFIGURATION',
    };
  }

  return null;
}
