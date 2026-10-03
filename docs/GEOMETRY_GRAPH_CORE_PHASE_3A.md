# Phase 3A — Research Finding Persistence Core (`GEOMETRY_GRAPH_CORE_PHASE_3A.md`)

This document records the exact design, boundaries, and validation results of the Dynamic Research Pattern Store (DRPS) / Research Finding Store core module.

---

## 1. Objective and Boundary Demarcations

The objective of Phase 3A is to construct a lightweight, persistent, and resilient store for structural findings without introducing coupling or state replication into the core geometry engine.

### Strict Boundaries:
```text
Geometry Core
      ↓
Graph Delta
      ↓
Research Pipeline
      ↓
Research Signal
      ↓
Research Finding Manager (Deduplication, Lifecycle, Evidence)
      ↓
Research Finding Store (JSONL Storage Core)
```

The core mathematical invariants of the platform are preserved via absolute separation:
* **Research Finding != Knowledge Claim:** Logical claims in the geometry graph transition dynamically (`VALID ⇄ INVALID`), while findings in DRPS represent a durable historical archive of stand telemetry.
* **NEW_PATTERN != VERIFIED:** Unseen signatures are logged as candidates, but are never promoted automatically to mathematical or logical truths without explicit supervisor action.

---

## 2. Research Finding Schema Specification

```typescript
export interface ResearchFinding {
  findingId: string;               // Stable unique UUID
  schemaVersion: string;           // "1.0.0"
  findingType: FindingType;        // 'ANOMALY' | 'DEGENERATION_PATTERN' | 'PROPAGATION_VARIANT' | 'RECOVERY_PATH'
  status: FindingLifecycleStatus;  // 'CANDIDATE' | 'OBSERVED' | 'REPRODUCED' | 'VERIFIED' | 'REFUTED' | 'ARCHIVED'

  patternId: string;               // Reference ID to matching PatternBase template
  fingerprintSnapshot: string;     // Stringified snapshot of the StructuralFingerprint
  fingerprintVersion: string;      // "V1" (decouples finding from future algorithm changes)

  noveltyScore: number;            // [0, 1]
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  maxWearRecorded: number;

  recurrenceCount: number;         // Count of repeat occurrences
  firstObservedAt: string;         // ISO string
  lastObservedAt: string;          // ISO string
  sourceExperiments: string[];     // References to executing test cases
  involvedLayers: string[];        // ['ConstructionGraph', 'ConstraintGraph', 'KnowledgeGraph']

  standVersion: string;            // "2.1.0"
  humanNotes?: string;             // Custom operator markdown comments
}
```

---

## 3. Persistent Storage and Deduplication Strategy

* **JSONL File Format:** Local storage is managed in `research_findings.jsonl`. Each line represents a single self-contained JSON finding. This provides human-readable, agent-readable, and append/write atomic replacement safety withoutSQLite or complex database configurations.
* **Deduplication:** When an identical structural fingerprint is registered:
  * No duplicate record is created.
  * `recurrenceCount += 1`.
  * `lastObservedAt` is updated to the current ISO timestamp.
  * `sourceExperiments` aggregates new experiment references.
  * Status is promoted from `CANDIDATE` to `OBSERVED` (if it was `CANDIDATE`).

---

## 4. Phase 3A Verification Results

All 12 core tests are implemented in `/src/kernel/tests/researchFindingStore.test.ts` and successfully verified:
* **TEST A — Create Candidate:** Verified (`status = CANDIDATE`, `recurrenceCount = 1`).
* **TEST B — Duplicate Observation:** Verified (Deduplicated, ID remains unchanged, `status = OBSERVED`, `recurrenceCount = 2`).
* **TEST C — Timestamps & Evidence:** Verified (First and last timestamps are correctly logged and updated).
* **TEST D — Different Fingerprints:** Verified (Non-identical signatures produce separate findings).
* **TEST E — Explicit Reproduction:** Verified (Status promoted to `REPRODUCED` on command, not automatically).
* **TEST F — Refutation:** Verified (Explicit status update to `REFUTED` with custom human notes).
* **TEST G — Persistence/Reload:** Verified (Finds are saved to disk and fully recovered on fresh store load).
* **TEST H — Schema Version:** Verified (`schemaVersion = "1.0.0"` is verified).
* **TEST I — Corrupted Line Resilience:** Verified (Corrupted lines in JSONL are skipped safely, parsing count increments, other valid lines load correctly).
* **TEST J — ACP Isolation:** Verified (Research OFF/ON toggles do not modify or mutate finding store).
* **TEST K — Geometry Core Isolation:** Verified (Persistent errors do not interrupt or crash Geometry Core's calculations).
* **TEST L — Fingerprint Version:** Verified (Different algorithm versions do not mix).

---

## 5. Known Limitations
* The JSONL store uses synchronous ESM Node.js dynamic imports (`await import('fs')`) which are fully Node/ESM-compatible and fall back safely in browser clients.
