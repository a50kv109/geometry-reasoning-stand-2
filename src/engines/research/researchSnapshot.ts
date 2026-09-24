// src/engines/research/researchSnapshot.ts
// Deterministic Research Snapshot Generator for Packet #4.
// CRITICAL: Contains ZERO timestamps, ZERO random numbers, ZERO network or clock calls.

import { FullGeometryState } from '../constructionCore';
import { deriveChordArcRelations, deriveCentralInscribedRelations } from './derivedRelations';
import { buildConstructionTrace } from './constructionTrace';
import { evaluateResearchObservations } from './observationModel';
import { ResearchSnapshot } from './researchTypes';

/**
 * Creates a 100% deterministic ResearchSnapshot from current geometry state and scale.
 * Pure function: for identical inputs, produces identical output.
 */
export function createResearchSnapshot(
  state: FullGeometryState,
  scale: number = 1.0
): ResearchSnapshot {
  const chordArcRelations = deriveChordArcRelations(state, scale);
  const centralInscribedRelations = deriveCentralInscribedRelations(state.pointsU, state.R);
  const constructionTrace = buildConstructionTrace(state);
  const observations = evaluateResearchObservations(state, chordArcRelations, scale);

  const vertices = Object.values(state.points)
    .filter((p) => p.isBaseVertex || p.id === 'pt_O' || p.onCircle)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      u: p.u,
      x: Number(p.x.toFixed(2)),
      y: Number(p.y.toFixed(2)),
      onCircle: Boolean(p.onCircle || p.isBaseVertex),
    }));

  const candidateCount = observations.filter((o) => o.epistemicLevel === 'CANDIDATE_INVARIANT').length;
  const matchedRelationCount = observations.filter((o) => o.epistemicLevel === 'KNOWN_RELATION_MATCH' && o.isMatch).length;
  const verifiedInvariantCount = observations.filter((o) => o.epistemicLevel === 'VERIFIED_INVARIANT' && o.isFormallyVerified).length;

  return {
    snapshotVersion: '1.0.0',
    source: {
      pointsU: {
        A: Number(state.pointsU.A.toFixed(6)),
        B: Number(state.pointsU.B.toFixed(6)),
        C: Number(state.pointsU.C.toFixed(6)),
      },
      R: state.R,
      scale,
    },
    vertices,
    chordArcRelations,
    centralInscribedRelations,
    constructionTrace,
    observations,
    summary: {
      totalEntities: constructionTrace.totalEntities,
      candidateCount,
      matchedRelationCount,
      verifiedInvariantCount,
    },
  };
}
