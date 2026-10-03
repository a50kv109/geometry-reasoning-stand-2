// src/kernel/research/researchFinding.ts
// Phase 3A — Research Finding Model and Status Lifecycle Contracts

export type FindingLifecycleStatus = 'CANDIDATE' | 'OBSERVED' | 'REPRODUCED' | 'VERIFIED' | 'REFUTED' | 'ARCHIVED';
export type FindingType = 'ANOMALY' | 'DEGENERATION_PATTERN' | 'PROPAGATION_VARIANT' | 'RECOVERY_PATH';

export interface ResearchFinding {
  // 1. Identification
  findingId: string;
  schemaVersion: string; // e.g., "1.0.0"
  findingType: FindingType;
  status: FindingLifecycleStatus;

  // 2. Pattern Identity
  patternId: string;
  fingerprintSnapshot: string; // stringified StructuralFingerprint
  fingerprintVersion: string;  // e.g., "V1" or "V2"

  // 3. Metrics (Policy Layer)
  noveltyScore: number;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  maxWearRecorded: number;

  // 4. Evidence Aggregation
  recurrenceCount: number;
  firstObservedAt: string; // ISO string
  lastObservedAt: string;  // ISO string
  sourceExperiments: string[];
  involvedLayers: string[];

  // 5. Provenance & Metadata
  standVersion: string; // Geometry Stand version (e.g., "2.1.0")
  humanNotes?: string;
}
