# V1 TO V2 MIGRATION NOTES — WHAT TO PRESERVE AND WHAT TO DISCARD
**Architectural Filter: Carrying Proven Mathematical Invariants into V2 while Leaving V1 Historical Artifacts Behind**

---

## 1. What NOT to Carry into V2 (V1 Legacy to Discard)

When implementing V2, do NOT blindly copy V1 code. The following historical artifacts must be deliberately discarded and re-engineered:

```text
    DO NOT COPY FROM V1                         V2 ARCHITECTURAL REPLACEMENT
 ──────────────────────────────────────────   ──────────────────────────────────────────────────
 1. Single-state CanvasStage props            Multi-layer RenderLayer pipeline with explicit
    (pointsU passed loose to Canvas)          FullGeometryState per layer.

 2. Monolithic 1800-line CanvasStage.tsx      Separate into:
    (math, drawing, UI controls, hit tests)   - CanvasRenderer (pure drawing logic)
                                              - InteractionController (hit testing & drags)
                                              - CanvasStage (React layout container)

 3. Retrofitted Overlay in single hook        Dedicated View Model where active layers
    (alpha hacking inside main useEffect)     and transparency weights are first-class inputs.

 4. Loose coordinate passing in App.tsx       Encapsulated TriangleResearchSession passed down
    (passing pointsU, R, rotationDeg loosely) as a cohesive domain model.

 5. Inline identity stripping                 Centralized identityRegistry within
    (dropping pt_ prefixes during import)     Plane2WorkspaceState.

 6. Ad-hoc Agent handler methods              Standardized SessionDispatcher accepting
    (duplicate mutation logic in UI & agent)  universal GeometryCommand payloads.
```

---

## 2. What MUST Be Preserved (Proven V1 Knowledge Assets)

The following core components from V1 are proven, verified by automated test suites, and represent the gold standard of geometric truth to carry into V2:

### A. Mathematical Kernel & Algorithms
1. **`computeGeometryBase` & Trigonometric Core**:
   - Exact Euclidean circumcircle metrics: $R$, parameter normalization $u \in [0, 1)$, chord formula $c = 2R\sin(\theta/2)$, and complementary arc partition $\theta_{\min} + \theta_{\maj} = 360^\circ$.
2. **Construction Solvers**:
   - `angleBisector.ts`, `perpendicularBisector.ts`, `perpendicularLine.ts`, `parallelLine.ts`, and `geometryIntersections.ts`.
3. **Topological Dependency Recomputer**:
   - Deterministic recomputation of derived points and intersection lines when base vertices move (`dependencyRecomputer.ts`).

### B. Interchange & Verification Contracts (PGS-2D)
1. **Canonical PGS Schema**:
   - `PGS2DPassport` specification, `PolygonTopology`, `transferMode: "EXACT_STATE"`, and `sourceClaim` structures.
2. **Receiver Verification Routine**:
   - `verifyPgsPassportAsReceiver`: independent validation of triangle boundary closure, radius agreement, and non-degeneracy before accepting any external claim.
3. **Portable Identity Persistence**:
   - Invariant that `portableId` survives round-trip `PGS -> Workspace -> PGS`.

### C. Workspace & Session Invariants
1. **Isolation Guarantee**:
   - Mutations on Plane 2 do not touch Plane 1.
   - Mutations on Plane 1 do not touch Plane 2.
2. **Lifecycle Enforcement**:
   - Plane 2 in `FIXED` mode rejects all incoming mutation commands with `PLANE_FIXED_READ_ONLY`.
   - Plane 2 in `FIXED` mode does not block Plane 1 mutations or Overlay Lens viewing.
3. **Presentation Separation**:
   - Overlay mix alterations ($0.0 \dots 1.0$) NEVER mutate geometry state, active plane, or exported PGS passports.

### D. Automated Test Suites (The Reference Standards)
The test suites in `src/engines/tests/` are the behavioral specifications that V2 must satisfy:
* `src/engines/tests/pgsImporter.test.ts` (7/7 tests)
* `src/engines/tests/twoPlaneSession.test.ts` (14/14 tests)
* `src/engines/tests/planeOverlay.test.ts` (22/22 tests: 9 overlay invariants + 13 agent integration tests)

---

## 3. Minimal Foundation Package for New V2 Project

When spinning up the new Google AI Studio repository for **Triangle Stand V2**, import ONLY this curated foundation package:

```text
foundation-v2/
├── ARCHITECTURE/
│   ├── V2_ARCHITECTURE_FOUNDATION.md     (Constitutional requirements & invariants)
│   ├── V2_ARCHITECTURE_CHECKLIST.md      (Definition of Done & phase order)
│   └── V1_TO_V2_MIGRATION_NOTES.md       (This document)
│
├── SCHEMAS/
│   ├── pgs2d.schema.json                 (Canonical PGS-2D contract)
│   └── pgsTypes.ts                       (TypeScript interfaces for PGS-2D)
│
├── KERNEL_ALGORITHMS/                    (Pure mathematical functions only)
│   ├── geometryMath.ts                   (Trigonometry, circle projections, angles)
│   └── constructionSolvers.ts            (Bisectors, perpendiculars, intersections)
│
└── BEHAVIORAL_TEST_SPEC/                 (Acceptance test matrix to satisfy)
    ├── pgs_interchange.spec.ts
    ├── two_plane_isolation.spec.ts
    └── overlay_and_agent.spec.ts
```

With this clean foundation, the AI engineer in the new repository can build Triangle Stand V2 cleanly from day zero without inheriting technical debt, single-state assumptions, or legacy canvas spaghetti.
