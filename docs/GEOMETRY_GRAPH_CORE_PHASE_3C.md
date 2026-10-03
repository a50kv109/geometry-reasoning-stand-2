# Phase 3C — Research Surface Integration (`GEOMETRY_GRAPH_CORE_PHASE_3C.md`)

This document records the exact design, data flow, and verification results of the presentation integration surface (Research Surface) for the Geometry Reasoning Stand.

---

## 1. Architectural Layout & Data Flow

Phase 3C establishes the final Presentation Access layer of our architectural stack, completing the decoupled epistemic observation pipeline.

```text
Geometry Mutation (User / Agent)
       ↓
  Graph Delta
       ↓
 Research Pipeline (Fingerprint, Comparator, Policy)
       ↓
  Research Signal
       ↓
 Research Finding Manager (Deduplication, Lifecycle)
       ↓
      DRPS (Persistent Storage Memory)
       ↓
 Attention Policy (Scoring & Focus Filtering)
       ↓
 Research Surface (Read-Only Presentation Window Facade)
```

---

## 2. Decoupled Concepts Definition

The architecture enforces absolute separation between three core concepts:
1. **MEMORY (Durable Storage):** Managed strictly by `ResearchFindingStore` (JSONL database).
2. **ATTENTION (Scoring & Ranking):** Managed strictly by `ResearchAttentionPolicy` (explanatory deterministic priority weights).
3. **PRESENTATION / ACCESS (Facade Window):** Managed strictly by `ResearchSurface` (provides secure, immutable, read-only slices to agents or UI).

---

## 3. Surface Facade API

The `ResearchSurface` class exposes the following read-only, non-mutating facade methods:
* `getResearchAttention(limit?: number)`: Returns a list of structured `SurfaceFindingRepresentation` objects containing finding details and derived attention score.
* `viewFinding(findingId)`: Detailed inspect of a specific finding safely.
* `viewEvidence(findingId)`: Slices and presents provenance trace details (`recurrenceCount`, `sourceExperiments`, `timestamps`).

### Unified Struct:
```typescript
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
  researchPriority: number; // attention policy calculated ranking score
}
```

---

## 4. Phase 3C Verification Results

All tests are implemented in `/src/kernel/tests/researchSurface.test.ts` and successfully verified:
* **TEST 1 — End-to-End E2E Integration Pathway:** Verified (Full pathway from mutation step trigger to final surface query).
* **TEST 2 — Isolation Guarantee:** Verified (Queries on `ResearchSurface` never mutate geometry coords, graphs, or finding database records).
* **TEST 3 — Persistence Lifecycle Recovery:** Verified (Create finding -> Restart session -> Reload store -> Finding recovered perfectly on surface).
* **TEST 4 — Multiple Findings Limit:** Verified (DRPS stores all 10 registered findings, but surface restricts results to Top-5 ordered by novelty).
* **TEST 5 — Accurate Status Display:** Verified (Lifecycle statuses like `CANDIDATE`, `OBSERVED`, `REPRODUCED`, `VERIFIED`, and `REFUTED` are displayed correctly).

---

## 5. UI Integration Status
* **UI Integration:** **DEFERRED** (As requested, UI integration is deferred to a subsequent presentation layer task to keep the backend core perfectly isolated and clean. `DEFERRED_UI_INTEGRATION = "UI integration deferred."` is checked by unit tests).
