// src/kernel/research/researchSurface.ts
// Phase 3C — Presentation Access Layer (Research Surface) for GRS-2
// Strictly read-only, unified facade exposing the Top-5 Attention Window and metadata queries.

import { ResearchAttentionPolicy } from './researchAttention';
import { ResearchFinding } from './researchFinding';

export interface SurfaceFindingRepresentation {
  findingId: string;
  findingType: string;
  status: string;
  patternId: string;
  noveltyScore: number;
  impact: string;
  recurrenceCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  involvedLayers: string[];
  researchPriority: number; // Derived priority weight based on attention policy score
}

export class ResearchSurface {
  private attentionPolicy: ResearchAttentionPolicy;

  constructor(attentionPolicy: ResearchAttentionPolicy) {
    this.attentionPolicy = attentionPolicy;
  }

  /**
   * Main integration facade API returning a structured Top-5 visible findings list.
   * Does not mutate any of the underlying store or geometry models.
   */
  public getResearchAttention(limit: number = 5): SurfaceFindingRepresentation[] {
    const topFindings = this.attentionPolicy.getTopFindings(limit);
    return topFindings.map((f) => ({
      findingId: f.findingId,
      findingType: f.findingType,
      status: f.status,
      patternId: f.patternId,
      noveltyScore: f.noveltyScore,
      impact: f.impact,
      recurrenceCount: f.recurrenceCount,
      firstObservedAt: f.firstObservedAt,
      lastObservedAt: f.lastObservedAt,
      involvedLayers: [...f.involvedLayers],
      researchPriority: this.attentionPolicy.calculateScore(f),
    }));
  }

  /**
   * Clean navigation API to retrieve details of a specific finding safely.
   */
  public viewFinding(findingId: string): SurfaceFindingRepresentation | null {
    const list = this.getResearchAttention(100);
    const found = list.find((f) => f.findingId === findingId);
    return found || null;
  }

  /**
   * Clean navigation API to inspect the source experiments and timestamps of a finding.
   */
  public viewEvidence(findingId: string): { recurrenceCount: number; sourceExperiments: string[]; firstObservedAt: string; lastObservedAt: string } | null {
    const visibleTop = this.attentionPolicy.getTopFindings(100);
    const original = visibleTop.find((f) => f.findingId === findingId);
    if (!original) return null;

    return {
      recurrenceCount: original.recurrenceCount,
      sourceExperiments: [...original.sourceExperiments],
      firstObservedAt: original.firstObservedAt,
      lastObservedAt: original.lastObservedAt,
    };
  }
}
export const DEFERRED_UI_INTEGRATION = 'UI integration deferred.';
