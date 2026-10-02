// src/engines/semantic/visualIdentityResolver.ts
// Pure, deterministic resolver translating visual descriptions (colors, markers) into Canonical Geometry Entities.
// Invariant: "Visual Identity is mutable; Semantic Identity is stable."
// Zero Computer Vision, Zero Network calls, Zero floating-point geometry mutation.

import { FullGeometryState } from '../constructionCore';
import { computeGeometryBase } from '../geometryState';
import {
  CanonicalVisualColor,
  VisualMarkerType,
  VisualQuery,
  VisualResolutionResult,
} from './visualSemanticTypes';

/**
 * Normalizes hex or natural language color name into CanonicalVisualColor.
 */
export function normalizeColorName(token: string): CanonicalVisualColor | null {
  if (!token) return null;
  const raw = token.trim().toLowerCase();

  // 1. Red
  if (
    raw === 'red' ||
    raw.startsWith('красн') ||
    raw.startsWith('червон') ||
    raw === '#ef4444' ||
    raw === '#f87171' ||
    raw === '#dc2626' ||
    raw === 'crimson'
  ) {
    return 'RED';
  }

  // 2. Green
  if (
    raw === 'green' ||
    raw.startsWith('зелен') ||
    raw.startsWith('зелён') ||
    raw === '#10b981' ||
    raw === '#34d399' ||
    raw === '#059669' ||
    raw === 'lime'
  ) {
    return 'GREEN';
  }

  // 3. Blue
  if (
    raw === 'blue' ||
    raw.startsWith('син') ||
    raw.startsWith('голуб') ||
    raw === '#3b82f6' ||
    raw === '#60a5fa' ||
    raw === '#2563eb' ||
    raw === 'azure'
  ) {
    return 'BLUE';
  }

  // 4. Yellow
  if (
    raw === 'yellow' ||
    raw.startsWith('желт') ||
    raw.startsWith('жёлт') ||
    raw.startsWith('жовт') ||
    raw === '#f59e0b' ||
    raw === '#fbbf24' ||
    raw === '#d97706' ||
    raw === 'gold'
  ) {
    return 'YELLOW';
  }

  // 5. Orange
  if (
    raw === 'orange' ||
    raw.startsWith('оранж') ||
    raw.startsWith('помаранч') ||
    raw === '#f97316'
  ) {
    return 'ORANGE';
  }

  // 6. Purple
  if (
    raw === 'purple' ||
    raw.startsWith('фиолет') ||
    raw.startsWith('фіолет') ||
    raw === 'violet' ||
    raw === '#8b5cf6'
  ) {
    return 'PURPLE';
  }

  // 7. Black
  if (
    raw === 'black' ||
    raw.startsWith('черн') ||
    raw.startsWith('чёрн') ||
    raw.startsWith('чорн') ||
    raw === '#111827' ||
    raw === '#000000'
  ) {
    return 'BLACK';
  }

  // 8. White
  if (
    raw === 'white' ||
    raw.startsWith('бел') ||
    raw.startsWith('біл') ||
    raw === '#ffffff'
  ) {
    return 'WHITE';
  }

  // 9. Cyan
  if (raw === 'cyan' || raw === '#06b6d4') {
    return 'CYAN';
  }

  // 10. Magenta
  if (raw === 'magenta' || raw === '#d946ef') {
    return 'MAGENTA';
  }

  return null;
}

/**
 * Extracts visual tokens and constructs VisualQuery from natural language text.
 * Returns null if no visual tokens are present (FAST BYPASS).
 */
export function extractVisualQuery(text: string): VisualQuery | null {
  if (!text || typeof text !== 'string') return null;
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // Check for RIGHT_ANGLE_SQUARE marker:
  // e.g. "черный квадратик", "угол с квадратиком", "black square", "чёрный угол", "прямой угол с квадратиком"
  const hasSquareMarker =
    lower.includes('квадратик') ||
    lower.includes('квадрат') ||
    lower.includes('square') ||
    lower.includes('чёрный уголок') ||
    lower.includes('черный уголок') ||
    lower.includes('чорний кутик');

  if (hasSquareMarker) {
    return {
      marker: 'RIGHT_ANGLE_SQUARE',
      entityType: 'angle',
      rawVisualTokens: ['RIGHT_ANGLE_SQUARE'],
    };
  }

  // Check for compound dual-color angle descriptions:
  // e.g. "красно-зелёный угол", "красно-зелёного угла", "сине-жёлтый", "red-green angle", "червоно-зелений кут"
  const dualColorPattern = /([а-яёіїєґa-z]+)-([а-яёіїєґa-z]+)(?:\s+(?:угол[а-я]*|кут[а-я]*|angle[s]?))?/i;
  const dualMatch = raw.match(dualColorPattern);
  if (dualMatch) {
    const c1 = normalizeColorName(dualMatch[1]);
    const c2 = normalizeColorName(dualMatch[2]);
    if (c1 && c2 && c1 !== c2) {
      return {
        colors: [c1, c2],
        entityType: 'angle',
        rawVisualTokens: [dualMatch[1], dualMatch[2]],
      };
    }
  }

  // Check for angle between two colors:
  // e.g. "угол между красной и зелёной", "angle between red and green"
  const betweenPattern = /(?:угол[а-я]*|кут[а-я]*|angle[s]?)\s+(?:между|між|between)\s+([а-яёіїєґa-z]+)\s+(?:и|та|and)\s+([а-яёіїєґa-z]+)/i;
  const betweenMatch = raw.match(betweenPattern);
  if (betweenMatch) {
    const c1 = normalizeColorName(betweenMatch[1]);
    const c2 = normalizeColorName(betweenMatch[2]);
    if (c1 && c2 && c1 !== c2) {
      return {
        colors: [c1, c2],
        entityType: 'angle',
        rawVisualTokens: [betweenMatch[1], betweenMatch[2]],
      };
    }
  }

  // Check for single color entity description:
  // e.g. "красная сторона", "зелёная линия", "синий отрезок", "red edge", "blue line"
  const singleColorEdgePattern = /([а-яёіїєґa-z]+)\s+(?:сторон[а-я]*|отрез[а-я]*|прям[а-я]*|лини[а-я]*|ліні[а-я]*|edge|segment|line)/i;
  const singleMatch = raw.match(singleColorEdgePattern);
  if (singleMatch) {
    const c = normalizeColorName(singleMatch[1]);
    if (c) {
      return {
        colors: [c],
        entityType: 'segment',
        rawVisualTokens: [singleMatch[1]],
      };
    }
  }

  // Alternative single color: "к синей стороне", "до червоної лінії"
  const prefixColorPattern = /(?:к|до|to|on)\s+([а-яёіїєґa-z]+)\s+(?:сторон[а-я]*|лини[а-я]*|ліні[а-я]*|edge|line)/i;
  const prefixMatch = raw.match(prefixColorPattern);
  if (prefixMatch) {
    const c = normalizeColorName(prefixMatch[1]);
    if (c) {
      return {
        colors: [c],
        entityType: 'segment',
        rawVisualTokens: [prefixMatch[1]],
      };
    }
  }

  return null;
}

/**
 * Finds all segments in FullGeometryState matching a given canonical color.
 */
function findSegmentsByColor(
  state: FullGeometryState,
  targetColor: CanonicalVisualColor
): { id: string; p1Id: string; p2Id: string; color: string }[] {
  const matches: { id: string; p1Id: string; p2Id: string; color: string }[] = [];

  for (const [id, seg] of Object.entries(state.segments)) {
    if (seg.color && normalizeColorName(seg.color) === targetColor) {
      matches.push({ id, p1Id: seg.p1Id, p2Id: seg.p2Id, color: seg.color });
    }
  }

  // Also inspect lines
  for (const [id, line] of Object.entries(state.lines)) {
    if (line.color && normalizeColorName(line.color) === targetColor) {
      matches.push({ id, p1Id: line.p1Id, p2Id: line.p2Id, color: line.color });
    }
  }

  return matches;
}

/**
 * Resolves a VisualQuery into a concrete geometric entity in the given FullGeometryState.
 */
export function resolveVisualIdentity(
  state: FullGeometryState,
  query: VisualQuery
): VisualResolutionResult {
  if (!query) {
    return {
      status: 'NOT_FOUND',
      query: {},
      explanation: 'Empty visual query',
    };
  }

  // --------------------------------------------------------------------------
  // 1. Resolve Marker (e.g. RIGHT_ANGLE_SQUARE)
  // --------------------------------------------------------------------------
  if (query.marker === 'RIGHT_ANGLE_SQUARE') {
    // Check if any triangle angle is right (90°)
    const geoBase = computeGeometryBase(state.pointsU, state.R);
    const angleA = Math.round(geoBase.arcs.BC.fraction * 180 * 100) / 100;
    const angleB = Math.round(geoBase.arcs.CA.fraction * 180 * 100) / 100;
    const angleC = Math.round(geoBase.arcs.AB.fraction * 180 * 100) / 100;

    const rightAngles: { vertex: string; angleVal: number; ray1: string; ray2: string }[] = [];

    if (Math.abs(angleA - 90) < 0.1) rightAngles.push({ vertex: 'A', angleVal: angleA, ray1: 'chord_AB', ray2: 'chord_CA' });
    if (Math.abs(angleB - 90) < 0.1) rightAngles.push({ vertex: 'B', angleVal: angleB, ray1: 'chord_AB', ray2: 'chord_BC' });
    if (Math.abs(angleC - 90) < 0.1) rightAngles.push({ vertex: 'C', angleVal: angleC, ray1: 'chord_BC', ray2: 'chord_CA' });

    if (rightAngles.length === 1) {
      const ra = rightAngles[0];
      return {
        status: 'RESOLVED',
        targetType: 'angle',
        entityId: `angle_${ra.vertex}`,
        angleInfo: {
          vertexId: ra.vertex,
          ray1Id: ra.ray1,
          ray2Id: ra.ray2,
          color1: 'BLACK',
          color2: 'BLACK',
          isRightAngle: true,
        },
        matchedColors: ['BLACK'],
        confidence: 1.0,
      };
    } else if (rightAngles.length > 1) {
      return {
        status: 'AMBIGUOUS',
        candidates: rightAngles.map((ra) => ({
          entityId: `angle_${ra.vertex}`,
          description: `Прямой угол при вершине ${ra.vertex}`,
          type: 'angle',
        })),
        explanation: `На чертеже несколько прямых углов (${rightAngles.map((ra) => ra.vertex).join(', ')})`,
      };
    } else {
      return {
        status: 'NOT_FOUND',
        query,
        explanation: 'На чертеже не обнаружен угол с маркером прямого угла (90°)',
      };
    }
  }

  // --------------------------------------------------------------------------
  // 2. Resolve Dual-Color Angle (e.g. RED + GREEN)
  // --------------------------------------------------------------------------
  if (query.colors && query.colors.length === 2 && query.entityType === 'angle') {
    const [c1, c2] = query.colors;
    const segs1 = findSegmentsByColor(state, c1);
    const segs2 = findSegmentsByColor(state, c2);

    if (segs1.length === 0 || segs2.length === 0) {
      return {
        status: 'NOT_FOUND',
        query,
        explanation: `Не найдены объекты с цветами ${c1} или ${c2}`,
      };
    }

    // Find all intersections (common endpoints) between segs1 and segs2
    const intersectingPairs: { vertexId: string; s1Id: string; s2Id: string }[] = [];

    for (const s1 of segs1) {
      for (const s2 of segs2) {
        if (s1.id === s2.id) continue;
        // Common vertex?
        if (s1.p1Id === s2.p1Id || s1.p1Id === s2.p2Id) {
          intersectingPairs.push({ vertexId: s1.p1Id, s1Id: s1.id, s2Id: s2.id });
        } else if (s1.p2Id === s2.p1Id || s1.p2Id === s2.p2Id) {
          intersectingPairs.push({ vertexId: s1.p2Id, s1Id: s1.id, s2Id: s2.id });
        }
      }
    }

    if (intersectingPairs.length === 1) {
      const pair = intersectingPairs[0];
      return {
        status: 'RESOLVED',
        targetType: 'angle',
        entityId: `angle_${pair.vertexId}`,
        angleInfo: {
          vertexId: pair.vertexId,
          ray1Id: pair.s1Id,
          ray2Id: pair.s2Id,
          color1: c1,
          color2: c2,
        },
        matchedColors: [c1, c2],
        confidence: 1.0,
      };
    } else if (intersectingPairs.length > 1) {
      return {
        status: 'AMBIGUOUS',
        candidates: intersectingPairs.map((p) => ({
          entityId: `angle_${p.vertexId}`,
          description: `Угол при вершине ${p.vertexId} между ${p.s1Id} и ${p.s2Id}`,
          type: 'angle',
        })),
        explanation: `Обнаружено ${intersectingPairs.length} углов между сторонами цветов ${c1} и ${c2}`,
      };
    } else {
      return {
        status: 'NOT_FOUND',
        query,
        explanation: `Стороны цветов ${c1} и ${c2} не имеют общей вершины`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // 3. Resolve Single Color Entity (e.g. RED edge)
  // --------------------------------------------------------------------------
  if (query.colors && query.colors.length === 1) {
    const targetColor = query.colors[0];
    const matchingSegs = findSegmentsByColor(state, targetColor);

    if (matchingSegs.length === 1) {
      return {
        status: 'RESOLVED',
        targetType: 'segment',
        entityId: matchingSegs[0].id,
        matchedColors: [targetColor],
        confidence: 1.0,
      };
    } else if (matchingSegs.length > 1) {
      return {
        status: 'AMBIGUOUS',
        candidates: matchingSegs.map((s) => ({
          entityId: s.id,
          description: `Отрезок ${s.id} (${s.p1Id}${s.p2Id}) цвета ${targetColor}`,
          type: 'segment',
        })),
        explanation: `На чертеже обнаружено несколько линий цвета ${targetColor} (${matchingSegs.map((s) => s.id).join(', ')})`,
      };
    } else {
      return {
        status: 'NOT_FOUND',
        query,
        explanation: `На чертеже нет объектов цвета ${targetColor}`,
      };
    }
  }

  return {
    status: 'NOT_FOUND',
    query,
    explanation: 'Не удалось сопоставить визуальный запрос',
  };
}
