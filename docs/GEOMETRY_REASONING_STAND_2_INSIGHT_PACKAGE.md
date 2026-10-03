# Geometry Reasoning Stand 2 — Insight & Knowledge Migration Package (`GEOMETRY_REASONING_STAND_2_INSIGHT_PACKAGE.md`)
**Document Version:** 1.0.0-MIGRATION  
**Status:** Canonical Engineering Knowledge Contract  
**Scope:** Complete extraction of architectural invariants, graph ontologies, research pipelines, and anti-patterns for seamless migration to new environments.

---

## 1. Audit of Sources

| Source / Document / Module | Type | Status | Role in Migration |
| :--- | :--- | :--- | :--- |
| `docs/GEOMETRY_GRAPH_KNOWLEDGE_BASE.md` | Architectural Base | VERIFIED | Core ontological foundation |
| `docs/AAM_GATEWAY.md` | Interface Spec | VERIFIED | Natural language bridge & Visual Semantic PoC |
| `docs/SEMANTIC_INTERFACE.md` | API Spec | VERIFIED | Universal Semantic Tool Interface |
| `src/kernel/` | Geometry Core | VERIFIED | Pure analytical geometry primitives |
| `src/engines/geometryCore.ts` | Computation Engine | VERIFIED | Deterministic geometry recomputer |
| `src/engines/semantic/` | Semantic & Visual Layer | VERIFIED | Identity resolver & semantic guard |
| `src/research/acp_adapter.ts` | Research Integration | IMPLEMENTED | Translates policy signals to ACP format |
| `src/research/policy_layer.ts` | Research Logic | IMPLEMENTED | Evaluates Novelty, Impact, and Wear |
| `src/research/structural_fingerprint.ts` | Research Preprocessor | IMPLEMENTED | Extracts topology hash, ignoring coordinates |
| `src/research/dispatcher.ts` | Research Pipeline | IMPLEMENTED | Coordinates graph delta to research signal |
| `acp_integration.test.ts` | Validation Suite | VERIFIED | E2E test scenarios for research mode |

---

## 2. Insight Registry

1. **INSIGHT-01: Novelty != Wear**
   * *Status:* VERIFIED
   * *Meaning:* A known structural failure (e.g. collapse) has Novelty = 0, but high Wear/Impact.
2. **INSIGHT-02: Novelty != Impact**
   * *Status:* VERIFIED
   * *Meaning:* A completely new structural combination may have low computational impact or vice versa.
3. **INSIGHT-03: Geometry Graph != Research Layer**
   * *Status:* VERIFIED
   * *Meaning:* Geometry execution is pure and isolated; research observation is an external observer.
4. **INSIGHT-04: ACP != Geometry Solver**
   * *Status:* VERIFIED
   * *Meaning:* ACP is an external deterministic regulator reflex, not a geometric calculator.
5. **INSIGHT-05: ACP != Knowledge Graph**
   * *Status:* VERIFIED
   * *Meaning:* Epistemic truth belongs to the Knowledge Graph; ACP only receives normalized state vectors.
6. **INSIGHT-06: ACP != Pattern Detector**
   * *Status:* VERIFIED
   * *Meaning:* Pattern recognition is performed by the Structural Fingerprint & Pattern Comparator, not ACP.
7. **INSIGHT-07: Construction Graph != Constraint Graph**
   * *Status:* VERIFIED
   * *Meaning:* Generative lineage ("HOW") is strictly separated from spatial invariants ("UNDER WHAT CONDITIONS").
8. **INSIGHT-08: Constraint Graph != Knowledge Graph**
   * *Status:* VERIFIED
   * *Meaning:* Spatial residuals ($\Delta$) are distinct from formal theorem truth states (`VERIFIED`, `VANISHED`).
9. **INSIGHT-09: Object != Knowledge Claim**
   * *Status:* REPORTED
   * *Meaning:* Physical entities exist independently of whether a theorem about them holds.
10. **INSIGHT-10: State != Topology**
    * *Status:* VERIFIED
    * *Meaning:* Coordinate mutation does not require rebuilding generative DAG topology unless bifurcating.
11. **INSIGHT-11: VANISHED != DELETE**
    * *Status:* VERIFIED
    * *Meaning:* When conditions fail, knowledge claims transition to `VANISHED`, never deleted.
12. **INSIGHT-12: ACP must not mutate Geometry Graph**
    * *Status:* VERIFIED
    * *Meaning:* One-way pipeline invariant; regulators cannot modify coordinates or topology.
13. **INSIGHT-13: Coordinates must not determine Structural Fingerprint**
    * *Status:* VERIFIED
    * *Meaning:* Fingerprints ignore XYZ to ensure translation invariance across distinct geometric positions.

---

## 3. Graph Ontology

### A. Construction Graph
* **Purpose:** Manages generative lineage and dependency trees. Answers: *"HOW was the object constructed?"*
* **Node Types:** `POINT`, `SEGMENT`, `LINE`, `CIRCLE`, `POLYGON`.
* **Edge Types:** `CONSTRUCTED_FROM` (Directed Acyclic Edges).
* **State:** Immutable derivation history.
* **Forbidden:** Must not calculate theorem truth or spatial residuals.

### B. Constraint Graph
* **Purpose:** Manages spatial invariants and residuals. Answers: *"UNDER WHAT CONDITIONS must the configuration exist?"*
* **Node Types:** Distance constraints, collinearity, orthogonality, incidence.
* **State:** `SATISFIED` or `VIOLATED` with numeric residual $\Delta$.
* **Forbidden:** Must not store or prove formal mathematical theorems.

### C. Knowledge Graph
* **Purpose:** Manages epistemic truth claims. Answers: *"WHAT IS CURRENTLY KNOWN about the configuration?"*
* **Node Types:** Theorems, properties, metric relations.
* **State:** `VERIFIED`, `REFUTED`, or `VANISHED`.
* **Forbidden:** Must never delete nodes when invalidated (uses `VANISHED`).

---

## 4. Inter-Graph Contracts

1. **Construction → Constraint:**
   * *Input:* Updated coordinates & topological adjacency.
   * *Output:* Constraint evaluation triggers.
   * *Responsibility:* Pass physical state without computing epistemic truth.
2. **Constraint → Knowledge:**
   * *Input:* Constraint satisfaction flags (`SATISFIED` / `VIOLATED`) & residuals.
   * *Output:* Epistemic state transitions (`VERIFIED` / `VANISHED`).
   * *Responsibility:* Bridge spatial metrics to formal logic.
3. **Knowledge → Observation / Research:**
   * *Input:* Final epistemic state & metrics.
   * *Output:* `Graph Delta` and UI observation passports.
   * *Responsibility:* Pure telemetry export; zero mutation of underlying geometry.

---

## 5. Research Pipeline

```text
Graph Delta
    ↓
Structural Fingerprint (Ignores coords & IDs)
    ↓
Pattern Comparator (EXACT, STRUCTURAL, VARIANT, NEW)
    ↓
Policy Layer (Evaluates Novelty, Impact, Wear)
    ↓
ACP Adapter (Maps to effort, velocity, wear, stability)
    ↓
ACPInterface (Mock / Restricted Contract)
    ↓
Research Signal (MAINTAIN, THROTTLE, DEGRADE_TRUST, EMERGENCY_STOP)
```

* **Deterministic?** Yes, entirely.
* **Side Effects?** None; strictly observational.
* **Can Mutate Graph?** Absolutely forbidden.

---

## 6. ACP Contract

* **ACP Input Vector:** `effort` $\in [0,1]$, `velocity` $\in [0,1]$, `wear` $\in [0,1]$, `stability` $\in [0,1]$.
* **ACP Output Reflex:** `MAINTAIN`, `THROTTLE`, `DEGRADE_TRUST`, `EMERGENCY_STOP`.
* **Real ACP-Core Status:** `NOT INTEGRATED` (Blocked by dependency / environment isolation).
* **Mock / Interface Status:** `IMPLEMENTED` via `ACPInterface` respecting the frozen contract.

---

## 7. Structural Fingerprint Specification

* **Included in Hash:**
  * `trigger_event_class` (e.g., `MOVE_VERTEX`, `CONSTRUCT`)
  * `construction_blast_bucket` (`LOCAL` [1-3], `PATH` [4-10], `GLOBAL` [>10])
  * `constraint_transition_signature` (e.g., `{SAT -> VIO}`)
  * `knowledge_transition_signature` (e.g., `{VER -> VAN}`)
* **Excluded (Noise):**
  * Exact Cartesian coordinates ($x, y$)
  * Specific object UUIDs (`point_A`, `line_12`)
  * Transaction ordering or event timestamps
* **Result:** Two geometric operations performed at different screen locations yield the exact same fingerprint if their topological and epistemic cascades match.

---

## 8. Pattern Comparator

* **EXACT_MATCH:** 100% structural and epistemic signature match.
* **STRUCTURAL_MATCH:** Semantic signature matches; scale/blast bucket differs.
* **STRUCTURAL_VARIANT:** Partial match of constraint/knowledge transitions.
* **NEW_PATTERN:** Unseen combination of state transitions.

---

## 9. Policy Layer (Novelty != Impact != Wear != Stability)

* **Novelty:** Measures whether the structural transition sequence exists in `PatternBase`.
* **Impact:** Measures the breadth of topological disruption (Blast Radius).
* **Wear:** Measures system degradation / distress (e.g. known degeneration yields high wear despite 0 novelty).
* **Stability:** Ratio of verified knowledge claims to total claims.

---

## 10. Valid → Invalid → Valid Dynamic Cycle

```text
VALID STATE
  │ (Mutation causes collinearity)
  ▼
INVALID STATE
  │ - Constraint Graph: SATISFIED → VIOLATED
  │ - Knowledge Graph: VERIFIED → VANISHED (VANISHED != DELETE)
  │ - Research Signal: DEGRADE_TRUST / THROTTLE
  │ (Mutation restores non-degeneracy)
  ▼
VALID STATE
  │ - Constraint Graph: VIOLATED → SATISFIED
  │ - Knowledge Graph: VANISHED → VERIFIED (Restored!)
  └─ Research Signal: MAINTAIN
```

---

## 11. Test Matrix

| Test ID | Input | Graph Change | Fingerprint | Pattern | Novelty | Impact | Wear | ACP Action | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST A** | Move vertex | 1 node | LOCAL | EXACT | 0.0 | LOW | 0.0 | MAINTAIN | VERIFIED |
| **TEST B** | Degeneration | 5 nodes | PATH | EXACT | 0.0 | HIGH | 0.9 | DEGRADE_TRUST | VERIFIED |
| **TEST C** | Recovery | 5 nodes | PATH | EXACT | 0.0 | RECOVERY | -0.5 | MAINTAIN | VERIFIED |
| **TEST D** | Large safe blast | 150 nodes | GLOBAL | STRUCTURAL | 0.0 | LOW | 0.1 | MAINTAIN | VERIFIED |
| **TEST E** | New anomaly | 150 nodes | GLOBAL | NEW_PATTERN | 1.0 | HIGH | 1.0 | DEGRADE_TRUST | VERIFIED |
| **TEST F** | Coord invariance | Shifted x,y | Identical | EXACT | 0.0 | LOW | 0.0 | MAINTAIN | VERIFIED |
| **TEST G** | ACP A/B test | Toggle mode | Identical Geo | N/A | 0.0 | N/A | 0.0 | Match | VERIFIED |
| **TEST H** | ACP fallback | Offline mode | Fallback | N/A | N/A | N/A | N/A | FALLBACK | VERIFIED |

---

## 12. GGP Patterns & Principles

* **GGP-01 (Ontology First):** Define entities before solvers (`VERIFIED`).
* **GGP-02 (Construction != Constraint):** Generative DAG separated from spatial invariants (`VERIFIED`).
* **GGP-03 (Constraint != Knowledge):** Spatial residuals distinct from mathematical proofs (`VERIFIED`).
* **GGP-04 (Object != Knowledge Claim):** Entities exist independently of theorem validity (`REPORTED`).
* **GGP-05 (State != Topology):** Coordinate mutation does not rebuild DAG (`VERIFIED`).
* **GGP-06 (Isolated Graphs & Contracts):** Explicit unidirectional data flow (`VERIFIED`).
* **GGP-07 (Reversible Cycle):** Flawless `VALID → INVALID → VALID` recovery (`VERIFIED`).

---

## 13. Architectural Invariants

1. **ACP must not mutate Geometry Graph.**
2. **Constraint = VIOLATED + Knowledge = VERIFIED** is strictly prohibited as an inconsistent epistemic state.
3. **Normal Mode** must execute with zero overhead or dependency on the Research Layer.
4. **Coordinates** must never participate in Structural Fingerprint hashes.
5. **Research Layer** is an observer, never a solver.

---

## 14. "Do Not Repeat" Register (Anti-Patterns)

* **The Flat Parents Array:** Never store un typed list of parents `parents[]`. Use directed edges.
* **Construction = Constraint:** Never force global symmetries into generative DAG children.
* **Coordinate-Dependent Novelty:** Never allow screen positions to trigger false research novelty.
* **Hidden AI Inside Policy:** Never use LLM calls inside deterministic policy calculations.
* **Mock ACP Presented as Real:** Always explicitly document when ACP is running on a mock interface.

---

## 15. Migration Dependency Graph

```text
[Knowledge Graph]
       │
       ▼
[Geometry Graph (Construction + Constraint)]
       │
       ▼
[Graph Delta]
       │
       ▼
[Structural Fingerprint] ──► [Pattern Comparator]
                                       │
                                       ▼
                               [Policy Layer]
                                       │
                                       ▼
                               [ACP Adapter]
                                       │
                                       ▼
                             [ACPInterface (Mock)]
                                       │
                                       ▼
                              [Research Signal]
```

---

## 16. Migration Manifest

* **A. MUST TRANSFER:** Three-graph core, Graph Delta, Structural Fingerprint, Pattern Comparator, Policy Layer, ACP Adapter.
* **B. SHOULD TRANSFER:** E2E test suite, Visual Semantic PoC, AAM Gateway.
* **C. OPTIONAL:** Historical experiment reports.
* **D. DO NOT TRANSFER:** Legacy flat-array parent implementations.
* **E. NOT YET IMPLEMENTED:** Physical ACP-Core binary integration.
* **F. PROPOSED:** Object != Knowledge Claim ontological extensions.
* **G. VERIFIED:** All core invariants and dynamic test matrix.
* **H. EXPERIMENTAL:** Temporal event bus semantics.

---

## 17. Bootstrap Prompt ("BOOTSTRAP NEW GEOMETRY REASONING STAND 2")

*(Copy the prompt below into the new Google AI Studio session)*

```text
BOOTSTRAP NEW GEOMETRY REASONING STAND 2

You are bootstrapping a clean repository for "Geometry Reasoning Stand 2" based on the provided Insight Package (`GEOMETRY_REASONING_STAND_2_INSIGHT_PACKAGE.md`).

RULES & CONSTRAINTS:
1. Respect all architectural invariants. Do NOT allow ACP or Research layers to mutate the Geometry Graph.
2. Maintain strict separation between Construction Graph (DAG), Constraint Network, and Knowledge Graph.
3. Implement Structural Fingerprint with strict exclusion of Cartesian coordinates (x, y), object UUIDs, and transaction ordering.
4. Enforce the dynamic cycle VALID -> INVALID -> VALID, respecting that VANISHED != DELETE.
5. Treat ACP as an external deterministic regulator reflex (effort, velocity, wear, stability -> MAINTAIN, THROTTLE, DEGRADE_TRUST, EMERGENCY_STOP). Use an isolated `ACPInterface` mock, clearly documenting that the physical ACP-Core is not integrated.
6. Build in phased increments:
   - Phase 1: Three-graph core + Graph Delta.
   - Phase 2: Structural Fingerprint, Pattern Comparator, Policy Layer, ACP Adapter.
   - Phase 3: E2E Validation Test Suite.

Begin by acknowledging the Insight Package and scaffolding Phase 1.
```
