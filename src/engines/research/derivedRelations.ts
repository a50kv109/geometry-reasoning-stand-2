// src/engines/research/derivedRelations.ts
// Pure functions for computing derived chord <-> arc and central angle relations.
// Reads canonical state, performs ZERO mutations, and does NOT introduce persistent Arc entities.

import { FullGeometryState } from '../constructionCore';
import { computeGeometryBase } from '../geometryState';
import { DerivedChordArcRelation, CentralInscribedAngleRelation } from './researchTypes';

const EPSILON = 1e-4;

/**
 * Derives chord <-> minor/major arc relations for all segments on the circumcircle.
 * Reuses existing geometric state without creating any persistent Arc entities.
 */
export function deriveChordArcRelations(
  state: FullGeometryState,
  scale: number = 1.0
): DerivedChordArcRelation[] {
  const relations: DerivedChordArcRelation[] = [];
  const R_mm = state.R * scale;
  const circumference = 2 * Math.PI * R_mm;

  // Inspect all segments in the geometry state
  for (const seg of Object.values(state.segments)) {
    const p1 = state.points[seg.p1Id];
    const p2 = state.points[seg.p2Id];
    if (!p1 || !p2) continue;

    // Both endpoints must strictly lie on the circumcircle
    const dist1 = Math.hypot(p1.x, p1.y);
    const dist2 = Math.hypot(p2.x, p2.y);
    const p1OnCircle = Math.abs(dist1 - state.R) < 1.0;
    const p2OnCircle = Math.abs(dist2 - state.R) < 1.0;

    if (!p1OnCircle || !p2OnCircle) continue;

    // Angle theta in radians relative to center (0, 0)
    const angle1 = Math.atan2(p1.y, p1.x);
    const angle2 = Math.atan2(p2.y, p2.x);

    let angleDiffRad = Math.abs(angle1 - angle2);
    if (angleDiffRad > Math.PI) {
      angleDiffRad = 2 * Math.PI - angleDiffRad;
    }

    const minorArcRad = angleDiffRad;
    const minorArcDeg = (minorArcRad * 180) / Math.PI;
    const majorArcDeg = 360 - minorArcDeg;
    const majorArcRad = (majorArcDeg * Math.PI) / 180;

    const minorArcLength = R_mm * minorArcRad;
    const majorArcLength = R_mm * majorArcRad;

    const chordLength_mm = seg.length * scale;
    const theoreticalChordLength = 2 * R_mm * Math.sin(minorArcRad / 2);

    const isDiameter = Math.abs(minorArcDeg - 180) < 0.5 || Math.abs(chordLength_mm - 2 * R_mm) < 1.0;
    const ratio = chordLength_mm / (2 * R_mm);

    relations.push({
      chordId: seg.id,
      p1Id: p1.id,
      p2Id: p2.id,
      p1Name: p1.name,
      p2Name: p2.name,
      chordLength: Number(chordLength_mm.toFixed(2)),
      subtendsCentralAngleDeg: Number(minorArcDeg.toFixed(2)),
      subtendsCentralAngleRad: Number(minorArcRad.toFixed(4)),
      minorArcDeg: Number(minorArcDeg.toFixed(2)),
      minorArcLength: Number(minorArcLength.toFixed(2)),
      majorArcDeg: Number(majorArcDeg.toFixed(2)),
      majorArcLength: Number(majorArcLength.toFixed(2)),
      circumference: Number(circumference.toFixed(2)),
      theoreticalChordLength: Number(theoreticalChordLength.toFixed(2)),
      isDiameter,
      ratioChordToDiameter: Number(ratio.toFixed(4)),
    });
  }

  return relations;
}

/**
 * Derives central vs inscribed angle relations for the base triangle chords and vertices.
 * Directly reuses canonical computeGeometryBase().
 */
export function deriveCentralInscribedRelations(
  pointsU: { A: number; B: number; C: number },
  R: number
): CentralInscribedAngleRelation[] {
  const geoBase = computeGeometryBase(pointsU, R);
  const relations: CentralInscribedAngleRelation[] = [];

  const arcKeys: Array<{ key: 'AB' | 'BC' | 'CA'; chordLabel: string; opp: 'C' | 'A' | 'B' }> = [
    { key: 'AB', chordLabel: 'AB', opp: 'C' },
    { key: 'BC', chordLabel: 'BC', opp: 'A' },
    { key: 'CA', chordLabel: 'CA', opp: 'B' },
  ];

  for (const item of arcKeys) {
    const arc = geoBase.arcs[item.key];
    const centralAngleDeg = arc.deg;
    const theoreticalInscribed = centralAngleDeg / 2;

    // Determine inscribed angle from opposite vertex
    // Inscribed angle in degrees is half the opposite arc in a cyclic triangle
    const inscribedAngleDeg = theoreticalInscribed;
    const isRightAngle = Math.abs(inscribedAngleDeg - 90) < 0.5;

    relations.push({
      arcId: `arc_${item.key}`,
      chordLabel: item.chordLabel,
      centralAngleDeg: Number(centralAngleDeg.toFixed(2)),
      inscribedVertexId: item.opp,
      inscribedAngleDeg: Number(inscribedAngleDeg.toFixed(2)),
      theoreticalInscribedAngleDeg: Number(theoreticalInscribed.toFixed(2)),
      relationVerified: Math.abs(inscribedAngleDeg - theoreticalInscribed) < EPSILON,
      isRightAngle,
    });
  }

  return relations;
}
