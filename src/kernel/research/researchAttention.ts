// src/kernel/research/researchAttention.ts
// Phase 3B — Research Attention Window and Explainable Ranking Policy

import { ResearchFinding } from './researchFinding';
import { ResearchFindingStore } from './researchFindingStore';

export class ResearchAttentionPolicy {
  private store: ResearchFindingStore;

  constructor(store: ResearchFindingStore) {
    this.store = store;
  }

  /**
   * Explanatory scoring function representing the deterministic Top-5 Attention Window rule.
   * Total Score = StatusPoints + NoveltyPoints + ImpactPoints + RecurrencePoints + WearPoints
   */
  public calculateScore(finding: ResearchFinding): number {
    // 1. Status Weight (ARCHIVED is excluded entirely before scoring)
    let statusPoints = 50;
    if (finding.status === 'VERIFIED') {
      statusPoints = 100;
    } else if (finding.status === 'REFUTED') {
      statusPoints = 1; // Heavily penalized but preserved for epistemic history
    }

    // 2. Novelty Points (Scaled up to 10 points)
    const noveltyPoints = finding.noveltyScore * 10;

    // 3. Impact Weight
    let impactPoints = 1;
    if (finding.impact === 'HIGH') {
      impactPoints = 5;
    } else if (finding.impact === 'MEDIUM') {
      impactPoints = 3;
    }

    // 4. Recurrence log weight (Cap at 10 to prevent infinite simulation bias)
    const recurrencePoints = Math.min(10, finding.recurrenceCount);

    // 5. Wear Points
    const wearPoints = finding.maxWearRecorded * 5;

    return statusPoints + noveltyPoints + impactPoints + recurrencePoints + wearPoints;
  }

  /**
   * Retrieves the Top-N visible research findings based on the active attention policy.
   * Strictly filters out ARCHIVED records, sorts by ranking score, and resolves ties deterministically.
   */
  public getTopFindings(limit: number = 5): ResearchFinding[] {
    const all = this.store.listFindings();

    // 1. Filter out ARCHIVED records
    const visible = all.filter((f) => f.status !== 'ARCHIVED');

    // 2. Sort according to active ranking score and deterministic tie-breaker
    return visible
      .sort((a, b) => {
        const scoreA = this.calculateScore(a);
        const scoreB = this.calculateScore(b);

        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Descending
        }

        // Deterministic Tie-Breakers:
        // A. Recency of sighting (lastObservedAt)
        const timeA = new Date(a.lastObservedAt).getTime();
        const timeB = new Date(b.lastObservedAt).getTime();
        if (timeA !== timeB) {
          return timeB - timeA;
        }

        // B. Finding ID alphabet string comparator
        return a.findingId.localeCompare(b.findingId);
      })
      .slice(0, limit);
  }
}
