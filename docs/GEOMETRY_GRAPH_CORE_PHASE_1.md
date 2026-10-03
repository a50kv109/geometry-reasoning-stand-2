# Phase 1 — Geometry Graph Core Documentation (`GEOMETRY_GRAPH_CORE_PHASE_1.md`)

This document records the exact design, ontology, and validation results of Phase 1 of the Geometry Reasoning Stand Three-Graph Core.

---

## 1. Core Ontology

### A. Construction Graph (DAG)
* **Purpose:** Lineage and generative history tracking. *"HOW was the object constructed?"*
* **Node Types:** `POINT`, `SEGMENT`, `LINE`, `CIRCLE`, `POLYGON`.
* **State:** Coordinates ($x, y$), length, radius, and related geometric data.
* **Invariants:** Pure DAG; no theorem solvers or metric constraints inside.

### B. Constraint Graph (Network)
* **Purpose:** Tracks spatial invariants and numeric residuals ($\Delta$). *"UNDER WHAT CONDITIONS?"*
* **Node Types:** Orthogonality, collinearity, distance, incidence.
* **State:** `SATISFIED` or `VIOLATED`.

### C. Knowledge Graph (Epistemic Network)
* **Purpose:** Stores formal claims/theorems. *"WHAT IS CURRENTLY KNOWN?"*
* **States:** `VERIFIED`, `REFUTED`, `VANISHED`.
* **Invariant:** `VANISHED != DELETE`.

---

## 2. Inter-Graph Contracts

1. **Construction → Constraint:** Sends coordinates and topology adjacencies to trigger constraint evaluations.
2. **Constraint → Knowledge:** Propagates constraint state transitions (`SATISFIED` / `VIOLATED`) to transition dependent theorem nodes.
3. **Knowledge → Observation:** Exports the final epistemic states and telemetry reports.

---

## 3. Graph Delta Schema

Every mutation outputs a `GraphDelta`:
* `triggerEvent`: string (e.g., `MOVE_VERTEX(pt_A)`)
* `affectedConstructionEntities`: array of construction node IDs
* `affectedConstraints`: array of constraint IDs
* `affectedKnowledgeClaims`: array of claim IDs
* `stateTransitions`: array of `{ nodeId, from, to }` state transitions
* `blastClassification`: `'LOCAL' | 'PATH' | 'GLOBAL'` (determined strictly by semantic topology)

---

## 4. Blast Radius Semantics
* **LOCAL:** Cascade is isolated strictly to immediate children (depth $d \le 1$).
* **GLOBAL:** Originates from a core root node ($parentIds = \emptyset$) with depth $> 1$.
* **PATH:** Originates from a dependent node ($parentIds \ne \emptyset$) with depth $> 1$.

---

## 5. Phase 1 Verification Results
* **Construction DAG integrity:** PASS
* **Constraint isolation:** PASS
* **Knowledge VANISHED != DELETE:** PASS
* **VALID → INVALID → VALID cycle:** PASS
* **Graph Delta generation:** PASS
* **Blast Radius LOCAL/PATH/GLOBAL:** PASS
* **Coordinate Mutation Invariance:** PASS
* **Strict Separation (runs standalone):** PASS
