import { VertexId, VertexPoint, ArcInfo } from '../types';
export type { VertexId, VertexPoint, ArcInfo };

export function normalizeU(u: number): number {
  let val = u % 1;
  if (val < 0) val += 1;
  return val;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function formatArcFraction(fraction: number): {
  fractionStr: string;
  degreesStr: string;
  circleFractionStr: string;
  simplified: string;
} {
  const deg = fraction * 360;
  const roundedDeg = Math.round(deg);
  const eps = 0.008;

  let simplified = '';
  if (Math.abs(fraction - 0.5) < eps) simplified = '1/2';
  else if (Math.abs(fraction - 1/3) < eps) simplified = '1/3';
  else if (Math.abs(fraction - 2/3) < eps) simplified = '2/3';
  else if (Math.abs(fraction - 1/4) < eps) simplified = '1/4';
  else if (Math.abs(fraction - 3/4) < eps) simplified = '3/4';
  else if (Math.abs(fraction - 1/6) < eps) simplified = '1/6';
  else if (Math.abs(fraction - 5/6) < eps) simplified = '5/6';
  else if (Math.abs(fraction - 1/8) < eps) simplified = '1/8';
  else if (Math.abs(fraction - 3/8) < eps) simplified = '3/8';
  else if (Math.abs(fraction - 5/8) < eps) simplified = '5/8';
  else if (Math.abs(fraction - 7/8) < eps) simplified = '7/8';
  else if (Math.abs(fraction - 1/12) < eps) simplified = '1/12';
  else if (Math.abs(fraction - 5/12) < eps) simplified = '5/12';
  else if (Math.abs(fraction - 7/12) < eps) simplified = '7/12';
  else if (Math.abs(fraction - 11/12) < eps) simplified = '11/12';
  else {
    const g = gcd(roundedDeg, 360);
    const num = roundedDeg / g;
    const den = 360 / g;
    if (den <= 72) {
      simplified = `${num}/${den}`;
    } else {
      simplified = `${roundedDeg}/360`;
    }
  }

  return {
    fractionStr: simplified,
    degreesStr: `${roundedDeg}°`,
    circleFractionStr: `${simplified} круга`,
    simplified,
  };
}

export function formatCircleFraction(fraction: number): string {
  const { fractionStr } = formatArcFraction(fraction);
  if (Math.abs(fraction - 0.5) < 0.008) return `${fractionStr} круга (диаметр)`;
  return `${fractionStr} круга`;
}

export function computeGeometryBase(pointsU: { A: number; B: number; C: number }, R: number) {
  const normA = normalizeU(pointsU.A);
  const normB = normalizeU(pointsU.B);
  const normC = normalizeU(pointsU.C);

  const vertices: VertexPoint[] = [
    {
      id: 'A',
      u: normA,
      angleRad: normA * 2 * Math.PI,
      angleDeg: normA * 360,
      x: R * Math.cos(normA * 2 * Math.PI),
      y: R * Math.sin(normA * 2 * Math.PI),
    },
    {
      id: 'B',
      u: normB,
      angleRad: normB * 2 * Math.PI,
      angleDeg: normB * 360,
      x: R * Math.cos(normB * 2 * Math.PI),
      y: R * Math.sin(normB * 2 * Math.PI),
    },
    {
      id: 'C',
      u: normC,
      angleRad: normC * 2 * Math.PI,
      angleDeg: normC * 360,
      x: R * Math.cos(normC * 2 * Math.PI),
      y: R * Math.sin(normC * 2 * Math.PI),
    },
  ];

  // Sort vertices cyclically by u
  const sorted = [...vertices].sort((a, b) => a.u - b.u);

  // Compute the 3 consecutive arcs along the circle
  // Arc between sorted[0] and sorted[1]
  const d01 = sorted[1].u - sorted[0].u;
  // Arc between sorted[1] and sorted[2]
  const d12 = sorted[2].u - sorted[1].u;
  // Arc between sorted[2] and sorted[0]
  const d20 = 1.0 - sorted[2].u + sorted[0].u;

  // Each arc connects two vertices. The remaining vertex is the OPPOSITE vertex!
  // And that arc corresponds to the chord between those two vertices.
  const arcMap: Record<'AB' | 'BC' | 'CA', { fraction: number; opposite: VertexId }> = {
    AB: { fraction: 0, opposite: 'C' },
    BC: { fraction: 0, opposite: 'A' },
    CA: { fraction: 0, opposite: 'B' },
  };

  function registerArc(v1: VertexPoint, v2: VertexPoint, opp: VertexPoint, fraction: number) {
    const pair = [v1.id, v2.id].sort().join('') as 'AB' | 'BC' | 'AC';
    const key = pair === 'AC' ? 'CA' : pair;
    arcMap[key] = { fraction, opposite: opp.id };
  }

  registerArc(sorted[0], sorted[1], sorted[2], d01);
  registerArc(sorted[1], sorted[2], sorted[0], d12);
  registerArc(sorted[2], sorted[0], sorted[1], d20);

  const arcAB = arcMap.AB.fraction;
  const arcBC = arcMap.BC.fraction;
  const arcCA = arcMap.CA.fraction;

  const arcs: Record<'AB' | 'BC' | 'CA', ArcInfo> = {
    AB: {
      startId: 'A',
      endId: 'B',
      oppositeVertexId: 'C',
      label: 'Дуга AB',
      chordLabel: 'AB',
      fraction: arcAB,
      deg: arcAB * 360,
      fractionFormatted: formatCircleFraction(arcAB),
      isDiameter: Math.abs(arcAB - 0.5) < 0.008,
      color: '#10B981', // emerald-500 (AB)
    },
    BC: {
      startId: 'B',
      endId: 'C',
      oppositeVertexId: 'A',
      label: 'Дуга BC',
      chordLabel: 'BC',
      fraction: arcBC,
      deg: arcBC * 360,
      fractionFormatted: formatCircleFraction(arcBC),
      isDiameter: Math.abs(arcBC - 0.5) < 0.008,
      color: '#F59E0B', // amber-500 (BC)
    },
    CA: {
      startId: 'C',
      endId: 'A',
      oppositeVertexId: 'B',
      label: 'Дуга CA',
      chordLabel: 'CA',
      fraction: arcCA,
      deg: arcCA * 360,
      fractionFormatted: formatCircleFraction(arcCA),
      isDiameter: Math.abs(arcCA - 0.5) < 0.008,
      color: '#3B82F6', // blue-500 (CA)
    },
  };

  return {
    vertices,
    sorted,
    arcs,
    R,
  };
}

export * from './constructionCore';
export * from './geometryIntersections';
export * from './perpendicularBisector';
export * from './angleBisector';
export * from './perpendicularLine';
export * from './parallelLine';
export * from './dependencyRecomputer';
export * from './parametricAngleSolver';
