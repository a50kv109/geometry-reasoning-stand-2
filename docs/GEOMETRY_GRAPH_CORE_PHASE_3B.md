# Phase 3B — Research Attention Window (`GEOMETRY_GRAPH_CORE_PHASE_3B.md`)

This document records the exact design, explainable ranking policy, and verification results of the Visible Research Attention Window core module.

---

## 1. Architectural Layout & Separation of Concerns

Phase 3B implements the attention filter mechanism, dynamically mapping large persistent volumes of DRPS findings into a focused Top-5 active display context.

```text
DRPS (Durable JSONL Store)  ──►  Attention Policy (Explainable Ranking)  ──►  Top-5 Attention Window  ──►  UI/Agent
```

### Strict Separation:
1. **DRPS (Durable Storage):** Manages **WHAT IS STORED** (JSONL files on disk, deduplication, incremental counts, and full history).
2. **Attention Policy (Focus Filter):** Manages **WHAT SHOULD BE SHOWN NOW** (reads store, dynamically ranks findings, caps views).
3. **Presentation Layer:** Manages **HOW IS IT SHOWN** (read-only adapter rendering the top list).

---

## 2. Explainable Deterministic Ranking Policy

The sorting algorithm dynamically ranks findings based on the following criteria:
```text
Total Score = StatusPoints + NoveltyPoints + ImpactPoints + RecurrencePoints + WearPoints
```

### Metric Weight Criteria:
* **Status Points:** Represents the epistemic validity of the finding:
  * `VERIFIED`: 100 points
  * `CANDIDATE` / `OBSERVED` / `REPRODUCED`: 50 points
  * `REFUTED`: 1 point (Preserved for historical context but relegated to lowest active priority)
  * `ARCHIVED`: Excluded entirely from active list before scoring.
* **Novelty Points:** `noveltyScore * 10` points ($[0, 10]$ points).
* **Impact Points:** Evaluates disruption severity:
  * `HIGH`: 5 points
  * `MEDIUM`: 3 points
  * `LOW`: 1 point
* **Recurrence Points:** `Math.min(10, recurrenceCount)` points ($[1, 10]$ points).
* **Wear Points:** `maxWearRecorded * 5` points ($[0, 5]$ points).

### Deterministic Tie-Breakers:
If multiple findings evaluate to identical ranking scores, the tie is resolved sequentially:
1. **Recency:** Larger `lastObservedAt` ISO timestamp is prioritized.
2. **Identity:** Deterministic alphabet string comparison on `findingId`.

---

## 3. Phase 3B Verification Results

All tests are implemented in `/src/kernel/tests/researchAttention.test.ts` and successfully verified:
* **TEST A — Empty Store:** Verified (Empty store returns empty attention list).
* **TEST B — 1 Result:** Verified (1 finding returns list of 1).
* **TEST C — 5 Results:** Verified (5 findings return exactly 5).
* **TEST D — 10 Results:** Verified (10 findings return exactly 5, capping the view).
* **TEST E & K — Deterministic Ordering:** Verified (Repeated queries on identical data are 100% deterministic).
* **TEST F — Explainable Policy Weights:** Verified (Findings with higher metrics receive higher priority).
* **TEST G — Archived Findings Excluded:** Verified (`ARCHIVED` findings are excluded entirely).
* **TEST H — Refuted Behavior:** Verified (`REFUTED` findings are retained as historically important, but sink to lowest rank).
* **TEST I — DRPS Isolation:** Verified (Queries never mutate DRPS states).
* **TEST J — Geometry Core Isolation:** Verified (Queries never mutate geometry coordinates).
* **TEST L — Deterministic Tie-Breaking:** Verified (Metric ties are resolved by recency).
