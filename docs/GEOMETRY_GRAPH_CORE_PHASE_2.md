# Phase 2 — Research Pipeline & ACP Integration (`GEOMETRY_GRAPH_CORE_PHASE_2.md`)

This document records the design, implementation, and verification of Phase 2 (Research Pipeline) on top of the Geometry Reasoning Stand Three-Graph Core.

---

## 1. Research Pipeline Architecture

```text
Graph Delta
    ↓
Structural Fingerprint (Cleaned of numerical coordinate/ID noise)
    ↓
Pattern Comparator (EXACT, STRUCTURAL, VARIANT, NEW)
    ↓
Policy Layer (Novelty, Impact, Wear, Stability)
    ↓
ACP Adapter (Normalized Wear Accumulator mapping)
    ↓
ACPInterface (Mock / Documented)
    ↓
Research Signal (MAINTAIN, THROTTLE, DEGRADE_TRUST, EMERGENCY_STOP)
```

---

## 2. Component Specifications

### A. Structural Fingerprint
* **Trigger Class:** Extracts abstract actions (e.g., `MOVE_VERTEX`).
* **Blast Class:** `LOCAL | PATH | GLOBAL` based on dependency topology.
* **Transition Lists:** State changes of Constraints and Claims, sorted to maintain order and coordinate-invariance.
* **Excluded:** Coordinates, UUIDs, precise node IDs, transaction order, timestamps.

### B. Pattern Comparator
* **EXACT_MATCH:** 100% fingerprint equivalence.
* **STRUCTURAL_MATCH:** Transitions match, but trigger/blast details differ.
* **STRUCTURAL_VARIANT:** Partial overlap of transition signatures.
* **NEW_PATTERN:** Unseen transitions.

### C. Policy Layer & Wear Accumulator (PROPOSED)
* **Novelty:** Measures similarity to known base templates (0.0 for known, 1.0 for new).
* **Impact:** Evaluates disruption severity (`LOW | MEDIUM | HIGH`).
* **Wear Accumulator:** Dampened accumulator (clamped $[0, 1]$). Decrements on `RECOVERY` (-0.5), increments on `DEGENERATION` (+0.9).
* **Stability:** Verified knowledge node ratio.

### D. ACP Interface & Core
* **ACP Interface:** Accepts `effort`, `velocity`, `wear`, `stability`.
* **Output:** `MAINTAIN | THROTTLE | DEGRADE_TRUST | EMERGENCY_STOP`.
* **ACP Core Status:** `NOT_CONNECTED` (Mock interface used strictly to maintain frozen contract).

---

## 3. Real Status Classifications

| Aspect | Status | Evidence |
| :--- | :--- | :--- |
| **Geometry Core Isolation** | `VERIFIED` | Geometry Core operates with zero dependencies or imports of Research Layer. |
| **Deterministic Fingerprints** | `VERIFIED` | Coordinate mutation invariance tests prove identical fingerprints. |
| **Wear Accumulator** | `EXPERIMENTAL` | Implemented in Adapter layer, decreases on recovery, increases on violation. |
| **Physical ACP-Core** | `NOT_CONNECTED` | Strict mock interface (`ACPMock`) with frozen rules. |
| **GLOBAL Blast Radius** | `PoC APPROXIMATION` | Classified by root-node mutation and dependency depth. |
| **Symmetric constraints** | `NOT IMPLEMENTED` | Supports multi-target constraint evaluations without bidirectional solver loops. |

---

## 4. Phase 2 Verification Results
* **TEST A: Normal Move** — PASS (`MAINTAIN`, Novelty = 0.0)
* **TEST B: Known Degeneration** — PASS (`DEGRADE_TRUST`, Wear = 0.9)
* **TEST C: Recovery** — PASS (`MAINTAIN`, Wear decreases to 0.4)
* **TEST D: Global Safe** — PASS (`MAINTAIN`, Novelty = 0.0)
* **TEST E: New Pattern** — PASS (Novelty = 1.0, `NEW_PATTERN`)
* **TEST F: Coordinate Invariance** — PASS (Fingerprints remain identical regardless of $x, y$)
* **TEST G: ACP ON/OFF Equivalence** — PASS (Core coordinates do not change because of ACP)
* **TEST H: ACP Failure Behavior** — PASS (Crashes return `ACP_UNAVAILABLE_FALLBACK` without disrupting Geometry Core)
