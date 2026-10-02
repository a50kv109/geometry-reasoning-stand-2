# V2 ARCHITECTURE CHECKLIST — DEFINITION OF DONE & STARTUP ORDER
**Verification Baseline and Phase Order for Triangle Stand V2 Implementation**

---

## 1. Verified Facts vs Architectural Proposals

To ensure complete epistemic honesty during the V1 $\rightarrow$ V2 transition, all architecture points are partitioned into:
1. **[PROVEN FACT]**: Formally implemented and verified by automated tests in V1.
2. **[LESSON LEARNED]**: Observed implementation obstacle in V1 requiring architectural redesign in V2.
3. **[DESIGN PROPOSAL]**: Proposed clean-room structure for V2.

### Status Table
| Architectural Component | Category | Evidence in V1 / Plan for V2 |
| :--- | :--- | :--- |
| Deep State Isolation between P1 and P2 | **[PROVEN FACT]** | Verified in `twoPlaneSession.test.ts` (Tests 1–3) |
| FIXED Plane 2 Lifecycle Lock | **[PROVEN FACT]** | Verified in `twoPlaneSession.test.ts` (Tests 4–5) & `planeOverlay.test.ts` (Test 9, D) |
| Transactional PGS Import with Rollback | **[PROVEN FACT]** | Verified in `twoPlaneSession.test.ts` (Tests 6–8) & `pgsImporter.test.ts` |
| Portable Identity Preservation (`identityRegistry`) | **[PROVEN FACT]** | Verified in `twoPlaneSession.test.ts` (Tests 9–14) |
| Overlay Mix Zero-Mutation Contract | **[PROVEN FACT]** | Verified in `planeOverlay.test.ts` (Tests 4–6, H–I) |
| Agent API Parity with Domain Operations | **[PROVEN FACT]** | Verified in `planeOverlay.test.ts` (Tests A–M) |
| Single-State CanvasRenderer Fragility | **[LESSON LEARNED]** | `CanvasStage.tsx` broke twice when retrofitting second layer into single hook |
| State Domain Conflation (pointsU vs FullGeometryState) | **[LESSON LEARNED]** | Top-level components passed loose coordinates rather than encapsulated domain states |
| Independent `RenderLayerDescriptor` Pipeline | **[DESIGN PROPOSAL]** | V2 clean-room multi-layer projection renderer |
| Unified Viewport Coordinate Transform Matrix | **[DESIGN PROPOSAL]** | Decoupling model zoom/pan from geometry model |

---

## 2. V2 Startup & Implementation Order

When constructing Triangle Stand V2 from scratch, the phases MUST proceed strictly in this order:

```text
  Phase 0: Constitutional Setup
    │      Define types, invariant contracts, and domain boundary interfaces
    ▼
  Phase 1: Pure Mathematical Geometry Core
    │      Points, segments, circles, Euclidean metrics, dependency graph
    ▼
  Phase 2: Canonical PGS-2D Adapter & Codec
    │      JSON serializer, schema validator, independent receiver verifier
    ▼
  Phase 3: Dual-Plane Session Layer
    │      TriangleResearchSession, plane1/plane2, cloning, isolation
    ▼
  Phase 4: Workspace Metadata & Identity Registry
    │      identityRegistry, portableId mapping, FIXED lifecycle guard
    ▼
  Phase 5: Unified Domain Command Dispatcher
    │      dispatchSessionCommand(), transactional import with rollback
    ▼
  Phase 6: Multi-Layer Projection Renderer
    │      RenderLayerDescriptor, renderLayer(state, alpha), ViewTransform
    ▼
  Phase 7: Agent Interface & Tooling RPC
    │      Geometry, Workspace, Presentation, Observation command sets
    ▼
  Phase 8: Interactive Presentation Layer & Overlay Lens
    │      React canvas integration, 60fps mix slider, tool selection
    ▼
  Phase 9: Scientific Observation & Epistemic Evaluation
    │      Observations, candidate invariants, formal proof precondition check
    ▼
  Phase 10: Test Suite Verification
           All 7 PGS tests, 14 session tests, 22 overlay/agent tests PASS
```

---

## 3. Definition of Done (Measurable Acceptance Criteria)

Before declaring Triangle Stand V2 ready for production, the following criteria must be 100% satisfied:

- [ ] **Dual-Plane Purity**:
  - `Plane 1` is authoritative and never polluted by unverified agent experiments.
  - `Plane 2` mutations NEVER mutate Plane 1 memory references or values.
  - `Plane 1` mutations NEVER mutate Plane 2 memory references or values.
- [ ] **Lifecycle Enforceability**:
  - Setting `Plane 2` to `FIXED` immediately rejects any further mutation attempts with error `PLANE_FIXED_READ_ONLY`.
  - Setting `Plane 2` to `FIXED` does NOT block authoritative mutations on `Plane 1`.
  - Setting `Plane 2` to `FIXED` does NOT block the Overlay Lens slider.
- [ ] **Lossless PGS Identity Round-Trip**:
  - `PGS -> Plane 2 -> PGS` export preserves exact `portableId` tags for all original objects (`pt_A`, `edge_AB`, etc.).
  - Agent-created objects receive prefixed portable identifiers (e.g. `pt_agent_P1`) with source tag `agent_created`.
- [ ] **Transactional Import Safety**:
  - Supplying invalid JSON or a structurally flawed passport fails cleanly with detailed error logs.
  - Supplying a mathematically refuted configuration (e.g., quadrilateral fed to triangle stand) is rejected by the Receiver Verifier.
  - On any import failure, existing session memory (both Plane 1 and Plane 2) remains 100% unmutated.
- [ ] **Multi-Layer Rendering Independence**:
  - The Canvas renderer function accepts arbitrary geometry states explicitly: `renderLayer(state, alpha)`.
  - Changing the Overlay mix slider from `0.0` to `1.0` produces continuous visual blending without recomputing geometric formulas or altering Geometry State.
- [ ] **Client Parity**:
  - Every action performable by a human via UI buttons/clicks is accessible to an AI agent via equivalent typed commands.
  - The UI and the Agent invoke the identical underlying `dispatchSessionCommand` routines.
