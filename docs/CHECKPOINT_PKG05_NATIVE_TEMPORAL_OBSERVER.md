# PKG-05 NATIVE TEMPORAL OBSERVER

**Status:** FROZEN BASELINE  
**Decision:** ACCEPTED WITH LIMITATIONS (DESIGN DECISION: Functional UI Observation Pipeline)

---

## 1. Architectural Invariants ("One Geometry, Many Clients")

The temporal layer strictly extends the existing observer architecture without introducing parallel models:

- **ONE Geometry State:** The single source of geometric truth is `pointsU` {A, B, C}, $R$, and `scale` managed in the host state (`src/App.tsx`) and calculated via pure functions (`src/engines/geometryState.ts`).
- **ONE Knowledge Graph:** `CANONICAL_GRAPH` in `src/kernel/canonicalPaths.ts` remains 100% static, containing exactly 28 deductive rules. Zero temporal nodes, delta nodes, or transition edges exist in the knowledge graph ($G_0 \equiv G_{1000}$).
- **ONE Temporal Observer:** `src/engines/temporalObserver.ts` is the sole module responsible for temporal observation and structural invariant verification.
- **ONE Snapshot Model:** `GeometrySnapshot` (`src/types.ts`) is the immutable canonical projection of geometry state at time $t$.
- **ONE Delta Model:** `GeometryDelta` (`src/types.ts`) is the canonical representation of state deltas ($\Delta \text{arcs}$, $\Delta \text{angles}$, $\Delta \text{chords}$, $\Delta \text{area}$, $\Delta \text{perimeter}$).
- **ONE Transition Model:** `GeometryTransition` (`src/types.ts`) connects two snapshots with verified `invariantStatuses`.

---

## 2. Production UI Flow

The production UI implements a clean, reactive functional observation pipeline:

```
CanvasStage (pointer drag)
  │
  ▼
onChangePoints (activeVertex -> newU)
  │
  ▼
setPointsU (React state update in App.tsx)
  │
  ▼
geometry computation (classicalEngine / matrixEngine / computeGeometryBase)
  │
  ▼
createGeometrySnapshot (S_curr from pointsU, R, scale)
  │
  ▼
computeTransition (baselineSnapshot -> currentSnapshot)
  │
  ▼
evaluateStructuralInvariants (preconditions: DIAMETER_AB, C_ON_CIRCLE_BOUNDARY, NON_DEGENERATE_VERTICES)
  │
  ▼
TriangleStateTable (renders deltas and verified Thales invariant status: PRESERVED / DEGENERATE / BROKEN)
```

---

## 3. Role of NativeGeometryTemporalSession

- **Not Production UI Owner:** `NativeGeometryTemporalSession` is **intentionally NOT** instantiated in the production React component tree (`App.tsx`). This is a deliberate design decision: React's declarative state model natively handles single-transition comparison via `useMemo` and `useState` (`baselineSnapshot`).
- **Designated Role:** Bounded history ring buffer (capacity: 1000), deterministic replay infrastructure, temporal regression testing (`testTemporalObserver.ts`), and future autonomous agent history exploration.

---

## 4. Formal Invariant Specification

### Dynamic Thales Theorem Invariant (`INV-DYN-THALES`)

Given configuration:
- Triangle $ABC$
- $AB$ is Diameter ($\text{arc}_{AB} = 0.5 \pm 0.008$)
- $C \in \text{CircleBoundary}$ (`onBoundary.C !== false`)
- $C \neq A$ and $C \neq B$ ($\text{cyclicDistance}(C, A) \ge 10^{-4}$, $\text{cyclicDistance}(C, B) \ge 10^{-4}$)

$$\implies \angle ACB = 90^\circ$$

### Structural Premise Verification Rule
- **PRESERVED:** All structural premises (`DIAMETER_AB`, `C_ON_CIRCLE_BOUNDARY`, `NON_DEGENERATE_VERTICES`) hold.
- **DEGENERATE:** If $C$ coincides with $A$ or $B$, status is strictly `DEGENERATE` with `preservedValue: null`.
- **BROKEN:** If $C$ leaves the circle boundary or $AB$ ceases to be a diameter, status is strictly `BROKEN` with `preservedValue: null`.
- **Principle:** **Numeric stability alone is NEVER proof of invariant preservation.** Structural premises must be analytically verified.

---

## 5. Preserve vs. Recompute (Phase 1 Policy)

- **Observation and Validation First:** The invariant engine provides an analytical assessment (`StructuralInvariantStatus`).
- **No Silent Substitution:** The invariant status does **not** silently short-circuit canonical calculation in Phase 1. Both `ClassicalEngine` and `MatrixEngine` execute full independent recomputation.
- **Equivalence Baseline:** Invariant preservation and independent full recomputation were verified to produce identical results in 100/100 states ($\Delta < 10^{-4}$). Selective reuse/caching may only be introduced in subsequent phases with dedicated equivalence guards.

---

## 6. Architectural Boundary Isolation

Strict epistemic isolation is maintained across all system boundaries:

- **Temporal Observer $\neq$ Navigator:** The navigator (`DeterministicNavigator`) searches static derivation paths in `CANONICAL_GRAPH`. It has zero knowledge of temporal snapshots or deltas.
- **Temporal Observer $\neq$ ConsistencyEngine:** `ConsistencyEngine` verifies semantic trust boundaries and agent claim consistency; `TemporalObserver` observes geometric state transitions.
- **Temporal Observer $\neq$ Knowledge Graph:** Knowledge graph contains deductive theorems, not temporal history states.
- **Temporal Observer $\neq$ Geometry Engine:** `GeometrySnapshot` is engine-agnostic and contains zero engine-specific execution artifacts.
- **Temporal Observer $\neq$ Second Geometry State:** `pointsU` remains the sole geometric state source.
- **Temporal Observer $\neq$ Temporal Analyzer v2:** Zero dependencies on external, asynchronous, or non-deterministic temporal analyzers.

---

## 7. Audit & Verification Record

### Verification Limitations
- `REAL_BROWSER_TEST`: **NOT AVAILABLE IN CURRENT AGENT HEADLESS CONTAINER ENVIRONMENT.**
- `RUNTIME_PATH_STATIC_ANALYSIS`: **PASS.** Direct source code inspection proves that user pointer events in `CanvasStage` flow through `onChangePoints` $\to$ `setPointsU` $\to$ `computeTransition` $\to$ `invariantStatuses` $\to$ `TriangleStateTable`.

### Verification Suite Results
- **Temporal Suite:** 15/15 PASS (`npm run test:temporal`)
- **Kernel Suite:** 74/74 PASS (`npm run test:kernel`)
- **Environment Contract Suite:** 18/18 PASS (`npm run test:env`)
- **Public Tool Verification:** 6/6 PASS (`npm run test:tool`)
- **Audit Chains:** Chains A–G PASS (`npm run test:audit`)
- **Typecheck:** 0 errors (`npm run lint`)
- **Production Build:** Vite production build successful (`npm run build`)
- **Performance:** Sub-frame overhead of $+3.68\ \mu\text{s/op}$ per state transition.
