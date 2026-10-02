# V1 REFERENCE PACKAGE — TECHNICAL AUDIT & ARCHIVE
**Geometry Reasoning Stand (Triangle Stand V1)**

---

## 1. Purpose & Repository Context

This document is the authoritative archivist audit of **Triangle Stand V1**. Its purpose is to provide the engineering team of **Geometry Reasoning Stand V2** with an exact, grounded, and verified reference package.

### Core Premise:
> **V1 is an archaeological reference and behavioral benchmark, NOT a codebase to blindly copy and refactor.**

V1 proved critical architectural breakthroughs in geometric reasoning, including dual-plane sandboxing, canonical PGS-2D semantic interchanges, deterministic invariants, and an optical comparison lens. However, V1 also accumulated technical debt because these features were retrofitted into an initially single-state, UI-driven architecture.

---

## 2. Deep Technical Breakdown of V1 Systems

### A. Real Geometry Core V1
* **File**: `src/engines/constructionCore.ts`
* **Implementation**:
  - The single source of geometric truth (SSOT) defining `GeometryPoint`, `GeometrySegment`, `GeometryLine`, `GeometryCircle`, and `FullGeometryState`.
  - All primitives are identified by unique string keys in flat dictionaries (`points`, `segments`, `lines`, `circles`).
  - Base points have both Cartesian model coordinates `(x, y)` centered at $(0, 0)$ and circular boundary coordinates $u \in [0, 1)$ where $(x, y) = (R \cos(2\pi u), R \sin(2\pi u))$.
  - Implements the pure command reducer `dispatchGeometryCommand(state, command)`.

### B. Geometry State Storage
* **File**: `src/engines/constructionCore.ts`, `src/engines/geometryState.ts`
* **Structure**:
  ```typescript
  export interface FullGeometryState {
    R: number;                                // Base circumradius in mm
    pointsU: { A: number; B: number; C: number }; // Parametric cyclic coordinates
    points: Record<string, GeometryPoint>;    // Flat key-value point dictionary
    segments: Record<string, GeometrySegment>;// Flat key-value segment dictionary
    lines: Record<string, GeometryLine>;      // Flat key-value line dictionary
    circles: Record<string, GeometryCircle>;  // Flat key-value circle dictionary
    pointCounter: number;
    segmentCounter: number;
    lineCounter: number;
    circleCounter: number;
  }
  ```
* **Pure Evaluation**: `computeGeometryBase(pointsU, R)` evaluates analytical side lengths, central angles, arc lengths, inscribed angles, and triangle classifications (`right`, `obtuse`, `acute`).

### C. Plane 1 and Plane 2 Architecture
* **File**: `src/engines/research/types.ts`, `src/engines/research/sessionDispatcher.ts`
* **Mechanics**:
  - `TriangleResearchSession` encapsulates `{ plane1, plane2, activePlane, plane2Lifecycle, overlay }`.
  - **Plane 1** is the authoritative, immutable baseline ground truth.
  - **Plane 2** is the isolated experimental sandbox.
  - `clonePlane1ToPlane2(session)` performs a deep structural clone of Plane 1's geometry into Plane 2, resetting modification flags and initializing an `identityRegistry`.
  - `dispatchSessionCommand(session, command)` directs mutations strictly to `session.activePlane`. If mutating Plane 1, Plane 2 is untouched. If mutating Plane 2, Plane 1 is untouched.

### D. Plane2WorkspaceState
* **File**: `src/engines/research/types.ts`
* **Structure**:
  ```typescript
  export interface Plane2WorkspaceState {
    geometryState: FullGeometryState;       // Pure mathematical state
    sourceType: Plane2SourceType;           // 'plane1_clone' | 'pgs_import' | 'empty_sandbox'
    importedPassport?: PGS2DPassport;       // Original passport if imported
    receiverVerification?: PGSReceiverVerification; // Autonomous verification result
    identityRegistry: Record<string, PortableIdentityMapping>; // Semantic ID preservation
    isModified: boolean;                    // Mutation dirty flag
    createdAt: string;                      // ISO timestamp
  }
  ```
* **Lesson**: Geometry state represents pure spatial configuration; workspace state captures lifecycle, verification, provenance, and identity contracts.

### E. IdentityRegistry and PortableId
* **File**: `src/engines/research/types.ts`, `src/engines/research/pgsPlane2Adapter.ts`
* **Mechanics**:
  - Three distinct identifiers exist:
    1. `portableId`: Global cross-platform identifier in PGS passports (`pt_A`, `edge_AB`, `circle_circumcircle`).
    2. `localId`: Engine dictionary key (`A`, `chord_AB`, `base_circle`).
    3. `displayLabel`: Visual label rendered on canvas (`A`, `AB`, `ω`).
  - `identityRegistry` maps `localId -> { portableId, localId, displayLabel, source }`.
  - Guarantees that when exporting Plane 2 back to PGS after dynamic editing, the original semantic `portableId` is preserved.

### F. PGS-2D Import/Export
* **File**: `src/engines/pgs/pgsProjector.ts`, `src/engines/pgs/pgsImporter.ts`, `src/engines/research/pgsPlane2Adapter.ts`
* **Mechanics**:
  - `exportPlane2ToPgs(plane2)` projects `FullGeometryState` + `identityRegistry` into a canonical `PGS2DPassport` (`v1.0.0`, `transferMode: "EXACT_STATE"`).
  - Encodes `PolygonTopology` with vertices in cyclic order and auxiliary construction lines/points.

### G. Transactional Import & Receiver Verification
* **File**: `src/engines/pgs/pgsReceiverVerifier.ts`, `src/engines/research/pgsPlane2Adapter.ts`
* **Pipeline**:
  1. Parse JSON and validate against schema (`validatePgsPassport`).
  2. Autonomous Receiver Verification (`verifyPgsPassportAsReceiver`):
     - Validates that claim is a triangle (`vertexCount === 3`).
     - Verifies boundary edge closure ($A \to B \to C \to A$).
     - Recomputes circumcircle radius from coordinates and compares with declared $R$.
     - Rejects 4-gons or degenerate topologies with status `REFUTED`.
  3. Candidate Construction: Reconstructs state in temporary memory.
  4. Commit: Only replaces Plane 2 if verification succeeds. If verification fails, live state remains 100% unmutated.

### H. Agent Toolbox & Command Layer
* **File**: `src/engines/semantic/semanticCommandExecutor.ts`, `src/engines/semantic/types.ts`, `src/engines/research/sessionDispatcher.ts`
* **Mechanics**:
  - Agent interacts through strongly-typed commands (`SemanticCommand` and `GeometryCommand`).
  - Operations include adding points, constructing perpendiculars/bisectors/parallels, setting triangle angles, and querying epistemic relations.
  - Commands use the identical domain logic as user mouse interactions.

### I. Overlay Lens
* **File**: `src/engines/research/sessionDispatcher.ts`, `src/components/research/PlaneOverlaySlider.tsx`, `src/components/CanvasStage.tsx`
* **Mechanics**:
  - Presentation state: `session.overlay = { enabled: boolean, mix: number }`.
  - $mix \in [0, 1]$ controls optical transparency blending: $\alpha_1 = 1 - mix$ for Plane 1, $\alpha_2 = mix$ for Plane 2.
  - Zero-mutation guarantee: Moving the mix slider never alters `FullGeometryState`, never switches `activePlane`, and never mutates exported PGS output.

### J. Renderer Flaw in V1: The Overlay Incident
* **The Incident**:
  - In V1, `PlaneOverlaySlider.tsx` and `researchSession.overlay` existed in state, but the visual canvas did not show Plane 2 underneath Plane 1.
  - **Root Cause**: `CanvasStage.tsx` was originally coded around a single set of props (`pointsU`, `posA`, `posB`, `posC`). All 11 drawing steps used closure variables computed from Plane 1 alone.
  - **The Failed First Fix**: An attempt was made to add an overlay by pasting a miniature `renderGeometryState` function inside `useEffect`, but an accidental premature closing bracket `}, [ ... ]);` was included. This severed the hook into two pieces, leaving 1000 lines of drawing code outside the function scope, causing build failures and identifier collision errors.
  - **The Resolution**: The premature close was removed, and Step 5 (Triangle Body) was cleanly branched to call `renderGeometryState(ctx, plane1, 1 - mix)` and `renderGeometryState(ctx, plane2, mix)`.
  - **V2 Lesson**: The renderer must be a pure projection function taking an explicit list of layer descriptors (`renderLayer(state, alpha)`) from day zero.

### K. Key Verification Test Matrix
* `src/engines/tests/twoPlaneSession.test.ts` (14/14 PASS): Proves deep isolation, independent mutations, FIXED rejection, transactional rollback, and identity round-trips.
* `src/engines/tests/planeOverlay.test.ts` (22/22 PASS): Proves overlay transparency math, zero-mutation invariants on geometry/PGS, and complete AI agent parity across all toolbox commands.
* `src/engines/tests/pgsIntegration.test.ts` (7/7 PASS): Proves canonical schema validation, topology isolation, and metric reconstruction.

---

## 3. Four-Tier Transmission Package

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      PACKAGE TRANSMISSION TIERS                        │
 ├────────────────────────────────────────────────────────────────────────┤
 │  PACKAGE A: MUST TRANSFER       (Essential reference & invariants)     │
 │  PACKAGE B: STRONGLY RECOMMENDED(Architectural lessons & adapters)     │
 │  PACKAGE C: OPTIONAL REFERENCE  (Educational & natural language tools) │
 │  PACKAGE D: DO NOT TRANSFER     (V1 spaghetti & legacy anti-patterns)  │
 └────────────────────────────────────────────────────────────────────────┘
```

### PACKAGE A — MUST TRANSFER (Constitutional Foundations)
1. **`V2_ARCHITECTURE_FOUNDATION.md`** — The V2 architecture constitution.
2. **`V2_ARCHITECTURE_CHECKLIST.md`** — Definition of Done and 10-phase startup order.
3. **`V1_TO_V2_MIGRATION_NOTES.md`** — Historical filter: what to preserve and what to discard.
4. **`src/engines/research/types.ts`** — Types for `TriangleResearchSession`, `Plane2WorkspaceState`, and `PortableIdentityMapping`.
5. **`src/engines/research/sessionDispatcher.ts`** — Reference implementation of dual-plane command routing and FIXED protection.
6. **`src/engines/pgs/types.ts`** — Canonical TypeScript contracts for PGS-2D passports.
7. **`src/engines/pgs/pgsReceiverVerifier.ts`** — Autonomous receiver verification algorithm.
8. **`src/engines/tests/twoPlaneSession.test.ts`** — 14-point test specification for workspace isolation.
9. **`src/engines/tests/planeOverlay.test.ts`** — 22-point test specification for overlay lens and agent toolbox.

### PACKAGE B — STRONGLY RECOMMENDED (Core Algorithms & Incident History)
1. **`src/engines/constructionCore.ts`** — SSOT geometric types and classical command reducer (`dispatchGeometryCommand`).
2. **`src/engines/dependencyRecomputer.ts`** — Analytical DAG topological recalculation engine.
3. **`src/engines/geometryIntersections.ts`** — Deterministic line-line, line-circle, and circle-circle solvers.
4. **`src/engines/research/pgsPlane2Adapter.ts`** — Transactional import/export adapter with `identityRegistry` preservation.
5. **`src/engines/temporalObserver.ts`** — Metric snapshot and invariant evaluator.
6. **`src/engines/tests/pgsIntegration.test.ts`** — PGS-2D round-trip behavioral test specification.
7. **`src/components/CanvasStage.tsx` (Lines 265–315 & 525–575 only)** — **Negative reference**: study the single-state renderer bottleneck and the dual-state overlay integration fix.

### PACKAGE C — OPTIONAL REFERENCE (Context & Tooling)
1. **`src/engines/parametricAngleSolver.ts`** — Analytical triangle solver given angle constraints.
2. **`src/engines/angleBisector.ts`**, **`perpendicularBisector.ts`**, **`perpendicularLine.ts`**, **`parallelLine.ts`** — Classical Euclidean construction algorithms.
3. **`src/engines/semantic/semanticCommandExecutor.ts`** — Natural language / semantic shorthand resolver (`resolveLineOrSegmentId`).
4. **`src/engines/research/observationModel.ts`** — 6-level epistemic ladder evaluation.

### PACKAGE D — DO NOT TRANSFER / DO NOT COPY (Legacy Anti-Patterns)
1. **`src/components/CanvasStage.tsx` (Full 1837-line file)** — **DO NOT COPY**. Monolithic file mixing math, hit testing, drag-drop, tooltips, and rendering. V2 must split this into `CanvasRenderer`, `InteractionController`, and `CanvasStage`.
2. **`src/App.tsx` (State Management)** — **DO NOT COPY**. Manages `pointsU`, `geometryState`, and `researchSession` loosely with ad-hoc `useEffect` synchronization. V2 must pass a cohesive `TriangleResearchSession`.
3. **`src/components/research/ResearchPlaneBar.tsx`** — Reference UI layout only; do not copy component structure directly.

---

## 4. Master Export Manifest

| Priority | Source File Path | Type | Why Transfer / Role in V2 | Copy Code Directly to V2? |
| :--- | :--- | :--- | :--- | :--- |
| **MUST** | `/V2_ARCHITECTURE_FOUNDATION.md` | ARCHITECTURAL DOCUMENT | Core Constitution of V2 | **YES (as reference doc)** |
| **MUST** | `/V2_ARCHITECTURE_CHECKLIST.md` | ARCHITECTURAL DOCUMENT | Definition of Done & Phase Order | **YES (as reference doc)** |
| **MUST** | `/V1_TO_V2_MIGRATION_NOTES.md` | ARCHITECTURAL DOCUMENT | Migration guidance & boundaries | **YES (as reference doc)** |
| **MUST** | `src/engines/research/types.ts` | VERIFIED IMPLEMENTATION | Session & Plane 2 state schemas | **YES (Core types)** |
| **MUST** | `src/engines/research/sessionDispatcher.ts`| VERIFIED IMPLEMENTATION | State isolation & FIXED guard | **YES (Adapt to V2)** |
| **MUST** | `src/engines/pgs/types.ts` | VERIFIED IMPLEMENTATION | Canonical PGS-2D contracts | **YES (Strict contract)** |
| **MUST** | `src/engines/pgs/pgsReceiverVerifier.ts` | VERIFIED IMPLEMENTATION | Independent receiver verification | **YES (Pure algorithm)** |
| **MUST** | `src/engines/tests/twoPlaneSession.test.ts`| TEST SPECIFICATION | Behavioral test specification | **YES (Benchmark suite)** |
| **MUST** | `src/engines/tests/planeOverlay.test.ts` | TEST SPECIFICATION | Overlay & Agent test specification | **YES (Benchmark suite)** |
| **RECOMMENDED**| `src/engines/constructionCore.ts` | VERIFIED IMPLEMENTATION | Geometry models & pure reducer | **YES (Mathematical kernel)** |
| **RECOMMENDED**| `src/engines/dependencyRecomputer.ts` | VERIFIED IMPLEMENTATION | Topological dependency DAG | **YES (Mathematical kernel)** |
| **RECOMMENDED**| `src/engines/geometryIntersections.ts`| VERIFIED IMPLEMENTATION | Deterministic intersection math | **YES (Mathematical kernel)** |
| **RECOMMENDED**| `src/engines/research/pgsPlane2Adapter.ts`| VERIFIED IMPLEMENTATION | Lossless PGS $\leftrightarrow$ Workspace adapter | **YES (Adapt to V2)** |
| **RECOMMENDED**| `src/engines/temporalObserver.ts` | VERIFIED IMPLEMENTATION | Invariant evaluation kernel | **YES (Proof engine)** |
| **RECOMMENDED**| `src/engines/tests/pgsIntegration.test.ts`| TEST SPECIFICATION | PGS round-trip acceptance tests | **YES (Benchmark suite)** |
| **DO NOT COPY**| `src/components/CanvasStage.tsx` | LEGACY / DO NOT COPY | Monolithic single-state canvas | **NO — Study incident only** |
| **DO NOT COPY**| `src/App.tsx` | LEGACY / DO NOT COPY | Ad-hoc synchronized React state | **NO — Redesign session SSOT** |

---

## 5. Epistemic Status of V1 Capabilities

1. **[PROVEN FACT]**:
   - Plane 1 / Plane 2 memory reference isolation (`test:session`).
   - `FIXED` mode protects Plane 2 from mutation while keeping Plane 1 and Overlay active (`test:session`, `test:overlay`).
   - Transactional PGS import rollback on schema error or geometric refutation (`test:session`, `test:pgs`).
   - Stable preservation of `portableId` across round-trip exports (`test:session`).
   - 100% Agent parity across all workspace and overlay commands (`test:overlay`).
   - Mathematical constancy of circumcircle radius $R$ and cyclic chord formula $c = 2R\sin(\theta/2)$.
2. **[LESSON LEARNED]**:
   - Single-state canvas rendering cannot cleanly handle multi-layer overlays without architectural refactoring.
   - Geometry state must remain mathematically pure; operational metadata belongs in `Plane2WorkspaceState`.
   - Ad-hoc state synchronization in `App.tsx` creates fragile update loops.
3. **[DESIGN PROPOSAL FOR V2]**:
   - Independent `RenderLayerDescriptor` architecture with pure `renderLayer(ctx, state, alpha)`.
   - Unified viewport coordinate transformation matrix separating model geometry from canvas scaling.
