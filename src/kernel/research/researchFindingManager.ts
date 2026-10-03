// src/kernel/research/researchFindingManager.ts
// Phase 3A — Coordinator between Research Pipeline and Persistent Finding Store

import { ResearchFinding, FindingType, FindingLifecycleStatus } from './researchFinding';
import { ResearchFindingStore } from './researchFindingStore';
import { GraphDelta } from '../geometryGraph/geometryGraphCore';
import { PolicyState, PatternMatchResult } from '../geometryGraph/researchPipeline';

export class ResearchFindingManager {
  public store: ResearchFindingStore;
  public isStoreAvailable: boolean = true;

  constructor(store: ResearchFindingStore = new ResearchFindingStore()) {
    this.store = store;
  }

  /**
   * Accepts research telemetry on each geometry mutation step.
   * Dedupes structural findings, aggregates evidence, and updates lifecycle.
   */
  public registerObservation(
    delta: GraphDelta,
    matchResult: PatternMatchResult,
    policy: PolicyState,
    fingerprintSnapshot: string,
    fingerprintVersion: string,
    sourceExperimentId: string = 'autonomous_mutation'
  ): ResearchFinding | null {
    const snapshotStr = fingerprintSnapshot;

    // 1. Check if canonical finding already exists in persistent database
    let finding = this.store.findBySnapshot(snapshotStr, fingerprintVersion);

    try {
      if (!finding) {
        // Create new candidate if a completely new pattern was identified
        const findingId = `find_${Math.random().toString(36).substr(2, 9)}`;
        
        let findingType: FindingType = 'ANOMALY';
        if (delta.stateTransitions.some((t) => t.to === 'VIOLATED' || t.to === 'VANISHED')) {
          findingType = 'DEGENERATION_PATTERN';
        } else if (delta.stateTransitions.some((t) => t.from === 'VANISHED' && t.to === 'VERIFIED')) {
          findingType = 'RECOVERY_PATH';
        }

        finding = {
          findingId,
          schemaVersion: '1.0.0',
          findingType,
          status: 'CANDIDATE',
          patternId: `pat_${Math.random().toString(36).substr(2, 9)}`,
          fingerprintSnapshot: snapshotStr,
          fingerprintVersion,
          noveltyScore: policy.novelty,
          impact: policy.impact,
          maxWearRecorded: policy.researchWear,
          recurrenceCount: 1,
          firstObservedAt: new Date().toISOString(),
          lastObservedAt: new Date().toISOString(),
          sourceExperiments: [sourceExperimentId],
          involvedLayers: ['ConstructionGraph', 'ConstraintGraph', 'KnowledgeGraph'],
          standVersion: '2.1.0',
        };

        this.store.addFinding(finding);
      } else {
        // Deduplicate: increment observation count and update timestamps
        finding.recurrenceCount += 1;
        finding.lastObservedAt = new Date().toISOString();
        if (!finding.sourceExperiments.includes(sourceExperimentId)) {
          finding.sourceExperiments.push(sourceExperimentId);
        }

        // Increase tracked max wear if higher
        if (policy.researchWear > finding.maxWearRecorded) {
          finding.maxWearRecorded = policy.researchWear;
        }

        // Advance Candidate to Observed upon second sighting
        if (finding.status === 'CANDIDATE') {
          finding.status = 'OBSERVED';
        }
      }

      // Save changes to persistent file (async in background)
      this.store.save().then(() => {
        this.isStoreAvailable = true;
      }).catch(() => {
        this.isStoreAvailable = false;
      });
    } catch (err) {
      // Epistemic isolation invariant: Store failures must NEVER interrupt Geometry Core
      this.isStoreAvailable = false;
    }

    return finding;
  }

  // Explicit manual transition APIs

  public promoteToReproduced(findingId: string): void {
    const finding = this.store.getFinding(findingId);
    if (finding) {
      finding.status = 'REPRODUCED';
      this.saveStoreSafely();
    }
  }

  public verifyFinding(findingId: string, notes?: string): void {
    const finding = this.store.getFinding(findingId);
    if (finding) {
      finding.status = 'VERIFIED';
      if (notes) {
        finding.humanNotes = notes;
      }
      this.saveStoreSafely();
    }
  }

  public refuteFinding(findingId: string, notes?: string): void {
    const finding = this.store.getFinding(findingId);
    if (finding) {
      finding.status = 'REFUTED';
      if (notes) {
        finding.humanNotes = notes;
      }
      this.saveStoreSafely();
    }
  }

  private saveStoreSafely(): void {
    this.store.save().then(() => {
      this.isStoreAvailable = true;
    }).catch(() => {
      this.isStoreAvailable = false;
    });
  }
}
