# V1 CURRENT ARCHITECTURE — FACTUAL TECHNICAL SNAPSHOT
**Detailed Structural and Behavioral Blueprint of Triangle Stand V1 ("Треугольник в кругу")**

---

## 1. System Overview & Epistemic Boundary

This document describes the **actual, factual architecture of the Triangle Stand V1 codebase** as verified by automated test suites and runtime execution. It reflects what is implemented in code today, without aspirational or hypothetical V2 designs.

---

## 2. Core Architectural Subsystems

### A. Geometry Core
* **CURRENT IMPLEMENTATION**:
  - Located in `src/engines/constructionCore.ts` and `src/engines/geometryState.ts`.
  - Defines pure geometric entities: `GeometryPoint`, `GeometrySegment`, `GeometryLine`, `GeometryCircle`.
  - Analytical circle geometry based on radius $R$ and cyclic angle parameters $u \in [0, 1)$ where $(x, y) = (R \cos 2\pi u, R \sin 2\pi u)$.
  - Analytical metric functions in `src/engines/geometryIntersections.ts` (distances, line-line, line-circle, and circle-circle intersections with tolerance $\varepsilon = 10^{-6}$).
  - Classical Euclidean constructions: `angleBisector.ts`, `perpendicularBisector.ts`, `perpendicularLine.ts`, `parallelLine.ts`.
* **CURRENT STATUS**: **VERIFIED** (100% pure analytical mathematics, zero random generators, zero wall-clock time).
* **KNOWN LIMITATIONS**:
  - The core is specialized for circular-embedded triangles. Generic n-gon polygons require external decomposition.

---

### B. Geometry State
* **CURRENT IMPLEMENTATION**:
  - Encapsulated by `FullGeometryState` in `src/engines/constructionCore.ts`.
  - Stored as flat string-keyed dictionaries:
    - `points: Record<string, GeometryPoint>`
    - `segments: Record<string, GeometrySegment>`
    - `lines: Record<string, GeometryLine>`
    - `circles: Record<string, GeometryCircle>`
  - Includes creation counters (`pointCounter`, `segmentCounter`, `lineCounter`, `circleCounter`) and base parameters (`pointsU: { A, B, C }`, `R`).
  - Mutated strictly through pure reducer `dispatchGeometryCommand(state, command)`.
* **CURRENT STATUS**: **VERIFIED** (Deterministic reducer, fully covered by unit tests).
* **KNOWN LIMITATIONS**:
  - Flat dictionaries require scanning when querying relational graph links (e.g. finding all segments attached to a point).

---

### C. Construction & Provenance
* **CURRENT IMPLEMENTATION**:
  - Macro constructions (bisectors, altitudes, perpendiculars, parallels) create an atomic group of objects tagged with `GeometryProvenance`:
    - `macroType`: type of construction.
    - `sourceIds`: array of parent entity keys (e.g. `['chord_AB', 'pt_C']`).
    - `groupId`: shared UUID/prefix linking the primary line, auxiliary compass arcs, and intersection marks.
  - Entities carry `role: 'primary' | 'auxiliary'`.
* **CURRENT STATUS**: **VERIFIED** (Tested in `testPacket2FundamentalsPerpendiculars.ts` and `testSchoolConstruction.ts`).
* **KNOWN LIMITATIONS**:
  - Provenance is an optional property on records rather than an enforced structural type across all entities.

---

### D. Dependency Graph & Recomputation
* **CURRENT IMPLEMENTATION**:
  - Implemented in `src/engines/dependencyRecomputer.ts` and `src/engines/research/constructionTrace.ts`.
  - When base vertices move ($u_A, u_B, u_C$), `recomputeDependentGeometry` traverses discovered macro groups, recalculates compass intersections, updates primary lines, and recomputes secondary intersections with chords and the circumcircle.
  - `buildConstructionTrace` reconstructs topological depths ($0, 1, 2, \dots$) and parent-child trees on demand.
* **CURRENT STATUS**: **VERIFIED** (Zero ghost IDs generated during dragging, invariants maintained at every frame).
* **KNOWN LIMITATIONS**:
  - The graph is not stored as an explicit `Graph<Node, Edge>` object in memory; it is reconstructed dynamically from entity provenance tags and dictionary links.

---

### E. Plane 1 (Authoritative SSOT)
* **CURRENT IMPLEMENTATION**:
  - Stored as `session.plane1: FullGeometryState`.
  - Represents the verified ground truth of the stand.
  - Mutated only when `session.activePlane === 'PLANE_1'`.
* **CURRENT STATUS**: **VERIFIED** (Immutable against Plane 2 mutations, proven in `twoPlaneSession.test.ts`).
* **KNOWN LIMITATIONS**:
  - None.

---

### F. Plane 2 (Isolated Research Workspace)
* **CURRENT IMPLEMENTATION**:
  - Stored as `session.plane2: Plane2WorkspaceState | null`.
  - Independent experimental sandbox for student or AI agent hypothesis generation.
  - Initialized via deep clone (`clonePlane1ToPlane2`) or PGS import (`importPgsToPlane2`).
  - Completely isolated in memory: mutations on Plane 2 never alter Plane 1 references or values.
* **CURRENT STATUS**: **VERIFIED** (Tested in `twoPlaneSession.test.ts` Tests 1–3).
* **KNOWN LIMITATIONS**:
  - Plane 2 must be explicitly initialized before switching active plane to `PLANE_2`.

---

### G. Workspace State & Lifecycle (BUILDING / FIXED)
* **CURRENT IMPLEMENTATION**:
  - `Plane2WorkspaceState` encapsulates:
    - `geometryState: FullGeometryState`
    - `sourceType: 'plane1_clone' | 'pgs_import' | 'empty_sandbox'`
    - `importedPassport?: PGS2DPassport`
    - `receiverVerification?: PGSReceiverVerification`
    - `identityRegistry: Record<string, PortableIdentityMapping>`
    - `isModified: boolean`
  - `plane2Lifecycle` state machine: `'BUILDING' | 'FIXED'`.
  - In `FIXED` mode, any mutation command dispatched to Plane 2 is rejected with error `PLANE_FIXED_READ_ONLY`. Plane 1 mutations and Overlay Lens viewing remain fully active.
* **CURRENT STATUS**: **VERIFIED** (Tested in `twoPlaneSession.test.ts` Tests 4–5 and `planeOverlay.test.ts` Test 9, D).
* **KNOWN LIMITATIONS**:
  - Lifecycle state is currently binary (`BUILDING` vs `FIXED`).

---

### H. Identity & portableId Preservation
* **CURRENT IMPLEMENTATION**:
  - Located in `src/engines/research/types.ts` and `src/engines/research/pgsPlane2Adapter.ts`.
  - Manages three identity layers:
    1. `portableId`: Global semantic passport ID (`pt_A`, `edge_AB`).
    2. `localId`: Engine dictionary key (`A`, `chord_AB`).
    3. `displayLabel`: UI label (`A`, `AB`).
  - Preserved in `identityRegistry`. When vertices are dragged on Plane 2 and exported to PGS, original portable IDs survive without loss.
  - Agent-created objects are registered with source `agent_created` and stable IDs (`pt_agent_P1`).
* **CURRENT STATUS**: **VERIFIED** (Tested in `twoPlaneSession.test.ts` Tests 9–14).
* **KNOWN LIMITATIONS**:
  - Mapping is maintained on Plane 2; Plane 1 uses implicit canonical mapping (`A` $\to$ `pt_A`).

---

### I. PGS-2D Interchange Layer
* **CURRENT IMPLEMENTATION**:
  - Located in `src/engines/pgs/`.
  - Implements canonical `PGS2DPassport` (`v1.0.0`, `transferMode: "EXACT_STATE"`).
  - Encodes `PolygonTopology` with boundary edges and cyclic vertex order.
  - `verifyPgsPassportAsReceiver` performs independent verification of boundary closure, vertex count ($N=3$), non-degeneracy, and circumradius consistency.
  - Transactional import: Failed validation or mathematical refutation triggers an immediate rollback, leaving existing session memory 100% unmutated.
* **CURRENT STATUS**: **VERIFIED** (Covered by 7 tests in `pgsIntegration.test.ts` and 3 tests in `twoPlaneSession.test.ts`).
* **KNOWN LIMITATIONS**:
  - Receiver verifier is strictly constrained to 3-vertex polygons (triangles) in this Stand.

---

### J. AI Agent Toolbox & Command Layer
* **CURRENT IMPLEMENTATION**:
  - Located in `src/engines/semantic/semanticCommandExecutor.ts` and `src/engines/research/sessionDispatcher.ts`.
  - Provides typed command execution for configuration, constructions, plane management, lifecycle, and overlay controls.
  - Human UI interactions and Agent RPC commands trigger the exact same reducer functions ("One Geometry, Many Clients").
* **CURRENT STATUS**: **VERIFIED** (Tested in `planeOverlay.test.ts` Tests A–M and `testAgentSemanticInterface.ts`).
* **KNOWN LIMITATIONS**:
  - Natural language parsing relies on rule-based string templates in `naturalLanguageAdapter.ts`.

---

### K. Observation, Verification & Epistemic Pipeline
* **CURRENT IMPLEMENTATION**:
  - Located in `src/engines/research/observationModel.ts`, `temporalObserver.ts`, and `derivedRelations.ts`.
  - 6-level epistemic hierarchy:
    1. `MEASUREMENT`: Direct scalar readings (side lengths, radius, angles).
    2. `FACT`: Axiomatic facts (sum of triangle angles = 180°, arc partition = 360°).
    3. `OBSERVATION`: Empirical trigonometric relations ($c \approx 2R \sin(\theta/2)$).
    4. `CANDIDATE_INVARIANT`: Proposed conjectures ($\angle ACB = \frac{1}{2} \smile AB$).
    5. `KNOWN_RELATION_MATCH`: Structural pattern match (Thales configuration, `isFormallyVerified: false`).
    6. `VERIFIED_INVARIANT`: Formally proven by the Consistency Kernel (`isFormallyVerified: true`).
* **CURRENT STATUS**: **VERIFIED** (Tested in `testResearchPacket4.ts` and `testExperimentPacket5.ts`).
* **KNOWN LIMITATIONS**:
  - Precondition proofs are validated against hardcoded analytical kernel rules.

---

### L. Canvas Renderer & Multi-Layer Drawing
* **CURRENT IMPLEMENTATION**:
  - Located in `src/components/CanvasStage.tsx` (1837 lines).
  - 11-step rendering pipeline on HTML5 2D Canvas:
    1. Background & Grid.
    2. Model transform & rotation.
    3. Circumcircle & center.
    4. School construction guides (auxiliary circles, lines).
    5. **Triangle Body & Overlay Lens** (branches to `renderGeometryState` for Plane 1 with $\alpha = 1 - mix$ and Plane 2 with $\alpha = mix$).
    6. Arc dimension overlays & angles.
    7. Base vertices ($A, B, C$) with interactive drag hitboxes.
    8. Auxiliary points & smart targets.
    9. Interactive tool preview guides.
    10. Labels and text metrics.
    11. Viewport HUD & indicators.
* **CURRENT STATUS**: **VERIFIED** (Dual-layer rendering verified, 60 FPS performance).
* **KNOWN LIMITATIONS**:
  - `CanvasStage.tsx` is a monolithic file mixing math, hit-testing, drag-and-drop, UI controls, and canvas drawing.

---

### M. Overlay Lens & Presentation State
* **CURRENT IMPLEMENTATION**:
  - Located in `src/components/research/PlaneOverlaySlider.tsx` and `src/engines/research/sessionDispatcher.ts`.
  - State: `session.overlay = { enabled: boolean, mix: number }` with $mix \in [0, 1]$.
  - $\alpha_1 = 1 - mix$, $\alpha_2 = mix$.
  - Adjusting $mix$ is purely a presentation-layer operation: **zero mutation** of geometry, active plane, or exported PGS passports.
* **CURRENT STATUS**: **VERIFIED** (Covered by Tests 1–9 in `planeOverlay.test.ts`).
* **KNOWN LIMITATIONS**:
  - Interactive vertex dragging while in 50/50 overlay mode operates on the active plane's vertices.

---

### N. UI Component Hierarchy
* **CURRENT IMPLEMENTATION**:
  - Root: `src/App.tsx`.
  - Header: `LanguageSelector`, `PresetSelectors` (Right, Obtuse, Acute), `ProjectMenu`, `Reset`, `Undo/Redo`.
  - Top Bar: `ResearchPlaneBar` (Plane 1 / Plane 2 selection, Clone, Import, Export, FIXED lock).
  - Center Canvas: `CanvasStage` wrapped in `SchoolModeWrapper`.
  - Overlay Bar: `PlaneOverlaySlider` (rendered when Plane 2 is active or initialized).
  - Side Panels: `WorkspaceSplitter` dividing Canvas and Sidebar.
  - Sidebar: Tabs for `Research Observation Panel`, `School Construction Panel`, `Invariant Observer`, `Dynamic Experiment Panel`, `Educational Knowledge Map`.
* **CURRENT STATUS**: **WORKING / VERIFIED**.
* **KNOWN LIMITATIONS**:
  - State synchronization between React hooks in `App.tsx` and the research session is handled via multiple `useCallback` hooks rather than a single unified store.

---

### O. Test Architecture
* **CURRENT IMPLEMENTATION**:
  - 25 automated CLI test suites executed via `tsx` under `npm run test:all`.
  - 100% deterministic: zero network calls, zero mock timers.
  - Comprehensive coverage:
    - Kernel & Environment (`test:kernel`, `test:env`).
    - Constructions & Invariants (`test:school`, `test:temporal`).
    - Research Packets 4, 5, 6 (`test:research`, `test:experiment`, `test:graph`).
    - PGS-2D Interchange (`test:pgs`).
    - Two-Plane Session & Isolation (`test:session`).
    - Overlay Lens & Agent Parity (`test:overlay`).
* **CURRENT STATUS**: **VERIFIED** (All 25 test suites PASS with 0 failures).
* **KNOWN LIMITATIONS**:
  - Tests are pure Node/CLI-based; visual canvas pixel-matching is tested analytically rather than via browser screenshot comparisons.
