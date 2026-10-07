# Geometry Reasoning Stand — Current Architecture

This is the canonical architectural reference for **Geometry Reasoning Stand 2 (GRS-2)**. This document specifies the exact, actual implementation status of GRS-2 after the integration of Phase 1, Phase 2, Phase 2.1, Phase 3A, Phase 3B, and Phase 3C.

---

## 1. System Purpose
The **Geometry Reasoning Stand V2** is a deterministic, mathematically rigorous geometry execution, verification, graph-analysis, and research-observation substrate. It provides an interactive sandbox for humans (students, teachers, researchers) and automated external reasoners (AI agents) to explore geometric relations under strict Euclidean constraints. It avoids probabilistic guessing and LLM-based hallucinated proofs by running a frozen, exact analytical coordinate and rule-based verification core.

---

## 2. Repository Structure
The repository is structured as a Vite-based single-page application (SPA) in TypeScript, with decoupled kernel, UI, and test suites:
```text
/
├── docs/                                # Project documentation indexes & phase reports
│   └── GEOMETRY_REASONING_STAND_CURRENT_ARCHITECTURE.md  # [THIS FILE]
├── src/
│   ├── App.tsx                          # UI App entry point & state coordinator
│   ├── main.tsx                         # DOM mounting & hydration entry point
│   ├── types.ts                         # Global presentation-level UI types
│   ├── components/                      # React UI presentation components
│   │   ├── research/
│   │   │   ├── ResearchObservationPanel.tsx # Manual capture, snapshot & delta panel
│   │   │   └── ResearchPlaneBar.tsx         # Double-plane session selector (Plane 1 & 2)
│   │   └── configuration/
│   │       └── GeometryConfigurationPanel.tsx # Parameter/angle sweep controls
│   ├── engines/                         # Calculation & Solver cores
│   │   ├── classicalEngine.ts           # Standard geometric property calculator
│   │   └── research/                    # Baseline Phase 2 snapshot & rules structures
│   ├── environment/                     # Agent execution environment API (GeometryEnvironment)
│   └── kernel/                          # HARDENED MATHEMATICAL KERNEL (Phase 1..3C)
│       ├── types.ts                     # Core kernel interfaces (DerivationPath, etc.)
│       ├── navigator.ts                 # Analytical solver and path explorer
│       ├── canonicalPaths.ts            # Euclidean rules graph
│       ├── geometryGraph/               # Phase 1 Geometry Core and Phase 2 Pipeline
│       │   ├── geometryGraphCore.ts     # Core Graphs (Construction, Constraint, Knowledge)
│       │   └── researchPipeline.ts      # Delta, Fingerprint, Policy & ACP Adapter
│       └── research/                    # Phase 3A/3B/3C Persistence Memory, Attention & Surface
│           ├── researchFinding.ts       # Struct types & schemas
│           ├── researchFindingStore.ts  # Atomic JSONL Database (DRPS)
│           ├── researchFindingManager.ts# State machine and deduplicator
│           ├── researchAttention.ts     # Scored deterministic selection policy
│           └── researchSurface.ts       # Unified Read-Only Presentation Facade
└── package.json                         # Node dependencies, scripts, and build tasks
```

---

## 3. Runtime Architecture
During runtime, the system maintains a unidirectional, strictly stratified execution flow:
```text
Geometry Mutation (User dragging or Agent step command)
       ↓
  GeometryState (Single Source of Truth)
       ↓
  Geometry Graph Core (Calculates state deltas)
       ↓
  Research Pipeline (Generates fingerprint, evaluates novelty/wear)
       ↓
  ACP Adapter ──► ACPMock (Signals maintained/degraded trust)
       ↓
  Research Finding Manager ──► DRPS (Persistent JSONL storage)
       ↓
  Research Attention Policy (Extracts Top-5 sorted findings)
       ↓
  Research Surface (Exposes immutable read-only window)
```

---

## 4. Geometry Core
The **Geometry Core** (defined in `src/kernel/geometryGraph/geometryGraphCore.ts`) maintains the mathematical representations of planimetry elements. It separates objects, constraints, and logical verifications into three decoupled graphs, preventing "epistemic pollution" where logical inferences would corrupt physical coordinates.

---

## 5. Construction Graph
Contains raw coordinates and algebraic definitions of planimetry primitives:
* **Nodes:** Points (`POINT`), segments (`SEGMENT`), lines (`LINE`), circles (`CIRCLE`).
* **Attributes:** Absolute numeric coordinates (e.g., `{ x: 0, y: 5 }`), radius (`R`).
* **Operations:** Responds to coordinate mutations (`MOVE_VERTEX`) by evaluating parent-child relations and propagating position updates analytically.

---

## 6. Constraint Graph
Tracks physical constraints defined between construction nodes:
* **Nodes:** Conditions such as `ORTHOGONAL`, `INCIDENCE`, `PARALLEL`.
* **State:** Evaluated dynamically as `SATISFIED` or `VIOLATED` based on current numeric coordinates with an epsilon tolerance threshold ($10^{-5}$).

---

## 7. Knowledge Graph
Stores semantic assertions and logical proof derivations:
* **Nodes:** Theorem validations, rule matches, and axiomatic claims (e.g., Thales inscribed angle claim).
* **State:** Evaluated as `VERIFIED` (proof is mathematically supported) or `INVALID`/`REFUTED` (contradicted by constraint violations).

---

## 8. Graph Delta
Any coordinate modification in the Construction Graph yields a formal `GraphDelta` event tracking the exact state transitions:
```typescript
export interface GraphDelta {
  triggerEvent: string;                     // e.g. "MOVE_VERTEX(pt_A)"
  affectedConstructionEntities: string[];   // affected point IDs
  affectedConstraints: string[];            // affected constraint IDs
  affectedKnowledgeClaims: string[];        // affected claim IDs
  stateTransitions: StateTransition[];      // state transition records
  blastClassification: BlastRadius;         // LOCAL | PATH | GLOBAL
}
```

---

## 9. Blast Radius
Every mutation is evaluated to classify its impact on the rest of the model:
* `LOCAL`: Isolated changes that do not propagate downstream.
* `PATH`: Changes that propagate through direct topological descendants.
* `GLOBAL`: Changes that invalidate global constraints or system-wide invariants.

---

## 10. Epistemic State Model
Planimetry assertions are evaluated across active lifecycles:
* `VERIFIED`: The preconditions of the claim are satisfied.
* `INVALID`/`REFUTED`: Preconditions are met, but coordinate states directly contradict the assertion.
* `VANISHED`: The elements required by the claim are no longer present or do not satisfy structural dependencies.

---

## 11. Dynamic VALID → INVALID → VALID Cycle
* **VANISHED != DELETE:** If the user drags vertex $C$ away from circle $O$, the Thales inscribed angle validation does *not* delete its Knowledge node. It transitions to `VANISHED`.
* **Complete Recovery:** If the user drags $C$ back onto the circle, the state transitions back to `VERIFIED` cleanly. This demonstrates that topology survives intermediate geometry deformability.

---

## 12. Research Pipeline
The **Research Pipeline** (defined in `src/kernel/geometryGraph/researchPipeline.ts`) is a pure, non-mutating observational framework. It intercepts `GraphDelta` events and processes them through fingerprinting and comparison algorithms to detect anomalous or novel structural behaviors.

---

## 13. Structural Fingerprint
Reduces coordinate-dependent shifts to a normalized, coordinate-invariant topological signature:
```typescript
export interface StructuralFingerprint {
  triggerEventClass: string;       // e.g., "MOVE_VERTEX"
  blastRadiusClass: string;        // "LOCAL" | "PATH" | "GLOBAL"
  constraintTransitions: string[]; // e.g. ["SATISFIED -> VIOLATED"]
  knowledgeTransitions: string[];  // e.g. ["VERIFIED -> VANISHED"]
}
```

---

## 14. Comparator
Matches structural fingerprints against registered historical patterns:
* `EXACT_MATCH`: Signature identical to a known pattern.
* `STRUCTURAL_MATCH`: Identical transitions, but trigger or blast radius class differs.
* `STRUCTURAL_VARIANT`: Part of the transition list overlaps with known patterns.
* `NEW_PATTERN`: Unseen, novel transition signature.

---

## 15. Research Policy
Evaluates operational metrics based on pattern matching:
* **Novelty:** High novelty score ($1.0$) for `NEW_PATTERN`, $0.5$ for `STRUCTURAL_VARIANT`, $0.0$ for matching signatures.
* **Impact:** Evaluates disruption severity (`LOW`, `MEDIUM`, `HIGH`) based on blast radius and state violations.
* **Research Wear:** Accumulates "mechanical stress" score. Transitions to violations increment wear ($+0.9$); recovery cycles reduce wear ($-0.5$).
* **Stability:** Numeric ratio of verified claims to total claims.

---

## 16. ACP Adapter / ACP Status
* **ACP Status:** **`BLOCKED_BY_DEPENDENCY`** / **`NOT_CONNECTED`**.
* **Reason:** The real physical `acp-core` library/dependency is genuinely unavailable in this runtime context.
* **Implementation Details:** Integration is achieved at the interface boundary via `ACPInterface`, `ACPMock`, and `ACPAdapter`. 
* **Reflex Signal Output:** The mock evaluates normalized inputs (`effort`, `velocity`, `wear`, `stability`) to emit deterministic reflex signals: `MAINTAIN` | `THROTTLE` | `DEGRADE_TRUST` | `EMERGENCY_STOP`.
* **Failure Isolation:** Any exception or crash in the ACP Adapter results in `ACP_UNAVAILABLE_FALLBACK`, which leaves the active Geometry Core completely unaffected and operational.

---

## 17. Research Finding Model
The каноническая representation of an observed structural anomaly (defined in `src/kernel/research/researchFinding.ts`):
```typescript
export interface ResearchFinding {
  findingId: string;           // stable UUID-hash
  schemaVersion: string;       // version tracking (e.g., "1.0.0")
  findingType: string;         // "ANOMALY" | "STABLE_PATTERN"
  status: 'CANDIDATE' | 'OBSERVED' | 'REPRODUCED' | 'VERIFIED' | 'REFUTED' | 'ARCHIVED';
  patternId: string;           // mapped fingerprint ID
  fingerprintSnapshot: string; // JSON representation of the fingerprint
  fingerprintVersion: string;  // snapshot layout version
  noveltyScore: number;        // novelty [0, 1]
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  maxWearRecorded: number;     // peak wear observed
  recurrenceCount: number;     // aggregation counter
  firstObservedAt: string;     // timestamp ISO
  lastObservedAt: string;      // timestamp ISO
  sourceExperiments: string[]; // log of experiment contexts
  involvedLayers: string[];    // affected layers (e.g., "KnowledgeGraph")
  standVersion: string;        // software version
}
```

---

## 18. Research Finding Store
Implemented under `src/kernel/research/researchFindingStore.ts` as the **Durable Research Pattern Store (DRPS)**:
* **Atomic JSONL Format:** Entries are saved line-by-line as separate JSON strings in `research_findings.jsonl`.
* **Resilience Guarantee:** Skips malformed, partial, or corrupted lines safely during loading, increments a `corruptedRecordsCount` metric, and correctly loads all remaining valid records.

---

## 19. Research Finding Manager
Implemented under `src/kernel/research/researchFindingManager.ts` to coordinate deduplication and lifecycle transitions:
* **Deduplication:** Matching fingerprint signatures are automatically aggregated into the same `ResearchFinding` ID, increments `recurrenceCount` ($+1$), and appends the source experiment to `sourceExperiments`.
* **Lifecycle State Transitions:**
  * Sighting 1: Mapped to `CANDIDATE`.
  * Sighting $\ge$ 2: Mapped to `OBSERVED`.
  * Manual promotion triggers transition to `REPRODUCED` -> `VERIFIED` / `REFUTED` / `ARCHIVED`.

---

## 20. Research Attention Policy
Implemented under `src/kernel/research/researchAttention.ts` as the **ResearchAttentionPolicy**:
* **Scoring Weights:** Computes interest score:
  $$\text{Total Score} = \text{StatusPoints} + \text{NoveltyPoints} + \text{ImpactPoints} + \text{RecurrencePoints} + \text{WearPoints}$$
  * `VERIFIED` = 100 points, `CANDIDATE`/`OBSERVED`/`REPRODUCED` = 50 points, `REFUTED` = 1 point (preserved but sunken priority).
  * `ARCHIVED` records are filtered out.
* **Deterministic Tie-Breakers:** Ties are resolved by recency (`lastObservedAt`) and `findingId` sort order.

---

## 21. Research Top-5
The `ResearchAttentionPolicy` enforces a strict Top-5 selection limit. This limits active focus in the attention window without deleting records from the underlying persistent DRPS database.

---

## 22. Research Surface
Implemented under `src/kernel/research/researchSurface.ts` as `ResearchSurface`:
* **Strictly Read-Only:** Exposes only `getResearchAttention()`, `viewFinding(findingId)`, and `viewEvidence(findingId)`.
* **Zero Mutation:** Contains no API to write or modify states, preventing any accidental or adversarial edits of the persistent database or active geometry layers.

---

## 23. Research Mode
* **Product-Level Mode:** Activated by the **`🔬 Исследование`** button in the header.
* **Behavior:** Activates the dual plane environment (Plane 1 and Plane 2 Workspace) and displays the `ResearchObservationPanel` for manual experimental capture and coordinate sweep tests.
* **Normal Mode Isolation:** When the user switches back to `Школьный режим`, the Research Pipeline and ACP Adapter are completely bypassed during dragging operations, preventing performance overhead or trust calculations.

---

## 24. UI Integration
* **Status:** **`PARTIALLY IMPLEMENTED`** / **`DEFERRED`**.
* **Details:** The product-level Research Mode button, panels, and snapshots are fully integrated in `src/App.tsx` and `src/components/research/`. However, the final `ResearchSurface` top-5 finding presentation has been deferred (`DEFERRED_UI_INTEGRATION = "UI integration deferred."`) to keep the presentation layer independent of the hard analytical kernel.

---

## 25. Agent Integration
* **API Entry:** Exposed in `GeometryEnvironment` (`src/environment/GeometryEnvironment.ts`).
* **Queries:** Exposes `observe()`, `solve()`, and `step(ruleId)` APIs for deterministic path derivation and contract checks.

---

## 26. PGS-2D Integration
* **Role:** An inter-stand semantic contract/passport mapping geometric invariants between discrete stand instances (`src/engines/research/`).
* **Boundary:** Does *not* represent a live, active dump of internal graphs. Maintains strict decoupling from runtime geometry models.

---

## 27. Persistence
* **Geometry Project:** Conforms to `GeometryProjectV1`, saving construction states, rotation angles, and passport configurations securely.
* **DRPS Store:** Automatically loaded and stored line-by-line via asynchronous atomic writers in `research_findings.jsonl`.

---

## 28. Build / Run
```bash
# Install dependencies
npm install

# Run Vite dev server (on port 3000)
npm run dev

# Build production bundle
npm run build
```

---

## 29. Test Architecture
Tests are implemented under `/src/kernel/tests/` and `/src/environment/tests/`, running directly on the Node runtime environment via `tsx` scripts to avoid browser overhead and guarantee deterministic outputs.

---

## 30. Current Test Matrix
All test suites pass perfectly:
* **Standard GRS-2 Kernel Tests:** 74/74 passed.
* **Phase 1 Geometry Graph Core Tests:** 10/10 passed.
* **Phase 2 Research Pipeline Tests:** 8/8 passed.
* **Phase 2.1 Blind E2E Research Experiment:** 10/10 automated scenarios passed.
* **Phase 3A Research Finding Store Tests:** 12/12 passed.
* **Phase 3B Research Attention Window Tests:** 12/12 passed.
* **Phase 3C Research Surface Tests:** 5/5 passed.

---

## 31. Known Limitations
1. **No Real ACP-Core Dependency:** Requires a real implementation library for physical connection.
2. **Planimetry Only:** Stereo 3D operations are explicitly out of scope.
3. **No Automated Proof-Synthesis:** Unguided automated theorem search is planned but not currently supported.

---

## 32. Open Research Questions
* **Dynamic Multi-Solution Branching:** Representing multiple valid coordinate layouts of the same geometric constraint system as separate topology tracks in the graph layers.

---

## 33. Architecture Invariants
* **"One Geometry, Many Clients":** Core mathematical calculations must never be duplicated or diverge between frontend UI and backend agent clients.
* **Epistemic Isolation:** Hypothesis and experimental steps must never pollute the canonical state.
* **Deterministic Behavior:** Random state functions must be strictly blocked.

---

## 34. HOW ANOTHER AI SYSTEM SHOULD RECONSTRUCT THIS STAND

If you are another AI system taking over this repository, follow this execution mapping to reconstruct and verify the active stand architecture:

### 1. Identify Core Entry Points
* The React application entry point is `/src/App.tsx`.
* The AI Agent Environment API is `/src/environment/GeometryEnvironment.ts`.
* The hard analytical kernel solver is `/src/kernel/navigator.ts`.

### 2. Verify Graph Core & State Transitions
* View `/src/kernel/geometryGraph/geometryGraphCore.ts`. This contains `GeometryGraphManager`, which is responsible for coordinating the three distinct graphs: **Construction Graph**, **Constraint Graph**, and **Knowledge Graph**.
* To check how coordinate mutations propagate to state transitions, verify the `mutateCoordinates` method in `GeometryGraphManager`. It calculates state updates and outputs a `GraphDelta` object.
* Look at `/src/kernel/tests/geometryGraphCore.test.ts` to see unit tests verifying that `VANISHED` states are correctly restored back to `VERIFIED` (the `VALID ⇄ INVALID ⇄ VALID` cycle).

### 3. Verify the Research Pipeline and ACP Adapter
* View `/src/kernel/geometryGraph/researchPipeline.ts`. This file defines:
  * `StructuralFingerprint` generator, transforming a mutable coordinate change (`GraphDelta`) into an invariant transition signature.
  * `PatternComparator`, matching fingerprints to patterns using exact and structural overlaps.
  * `ACPInterface` and `ACPMock`, exposing the interface for trust degradation.
  * `ACPAdapter`, mapping policy properties (`researchWear`, `stability`) to mock inputs.
* To reconstruct the pipeline execution, call:
  ```typescript
  const dispatcher = new ResearchDispatcher();
  const delta = { triggerEvent: 'MOVE_VERTEX', ... };
  const { signal, policy } = dispatcher.dispatch(delta, verifiedClaims, totalClaims);
  ```

### 4. Verify Persistent Research Memory & Attention
* View the modules under `/src/kernel/research/`:
  * `researchFindingStore.ts` (`ResearchFindingStore`): Atomic writer/reader processing `research_findings.jsonl`. Review `load()` to see how corrupted records are safely bypassed using regex validation.
  * `researchFindingManager.ts` (`ResearchFindingManager`): Manages canonical deduplication and status transitions.
  * `researchAttention.ts` (`ResearchAttentionPolicy`): Calculates deterministic Top-5 attention using the total priority score.
  * `researchSurface.ts` (`ResearchSurface`): Decoupled read-only presentation facade.
* Execute `/src/kernel/tests/cliTestRunner.ts` by running `npm run test:kernel`. This will execute all tests sequentially and print a full verification trace of all 131 tests to confirm absolute correctness.

---

## 35. Dynamic Triangle Reconstruction & Live Incircle (PAT-27)

### Dynamic Triangle Reconstruction («Перестроение △»)
- **Mode:** `deform_triangle` in `SchoolToolbar.tsx` and `CanvasStage.tsx`.
- **Behavior:** User drags vertices $A, B, C$ continuously along the circumcircle via `SYNC_BASE_POINTS`.
- **DAG Recomputation:** All dependent geometric entities (tangents, perpendiculars, bisectors, incircle) propagate updates deterministically through `recomputeGeometricDependencies()`.

### Live Incircle Macro (`INCIRCLE(ABC)`)
- **Semantic Macro:** Defined in `src/engines/incircle.ts` and `src/engines/dependencyRecomputer.ts`.
- **Live Dependency vs Materialized Snapshot (PAT-27):** Unlike manual bisector intersection snapshots (`intersect()`) which do not update automatically on vertex displacement, `INCIRCLE(ABC)` binds to the triangle itself. Its incenter $I$, radius $r$, and tangency points $T_A, T_B, T_C$ recompute live on every frame.
- **Independent Verification:** Tested via `verifyIncircle()` across non-degenerate scalene/equilateral configurations and degenerate collapses (`npm run test:incircle`).

---

## 36. UI React Stability Protocol

To prevent re-render cascades and `Maximum update depth exceeded` exceptions:
1. **Tool Switch Isolation (`SchoolModeWrapper.tsx`):** The `useEffect` tracking tool switching depends exclusively on `[activeTool]`. Dynamic parameters (`geometryState`, `onDispatchCommand`) are accessed through stable `useRef` handles (`geometryStateRef`, `onDispatchCommandRef`).
2. **State Transition Guard:** Multi-step tool resets check `prevToolRef.current === activeTool` before dispatching state mutations, eliminating redundant renders.
3. **Resize Observer Boundary (`CanvasStage.tsx`):** `setDimensions` uses functional state equality checking `prev.width === size && prev.height === size` to guard against ResizeObserver feedback loops.
