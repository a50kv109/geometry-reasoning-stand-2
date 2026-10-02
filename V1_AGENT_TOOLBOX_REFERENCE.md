# V1 AGENT TOOLBOX REFERENCE — COMPLETE TECHNICAL INVENTORY
**Comprehensive Reference Specification of AI Agent Interfaces, Command APIs, Execution Paths, and UI Parity in Triangle Stand V1**

> *This document describes the current state of V1 as of the latest audit.*

---

## 1. Agent Architecture Overview

Triangle Stand V1 implements the non-negotiable architectural invariant:
> **"One Geometry, Many Clients" — "The Agent may be wrong. The Stand must not."**

The Stand provides machine-readable programmatic interfaces that allow an AI Agent to inspect, construct, hypothesize, verify, and optically compare geometric configurations with complete parity to human UI users.

```text
                                   AI AGENT / SOLVER
                                           │
       ┌───────────────────────────────────┼──────────────────────────────────┐
       │ (Formal Deduction)                │ (Semantic High-Level)            │ (Session & Sandbox)
       ▼                                   ▼                                  ▼
 ┌──────────────────────┐        ┌──────────────────────┐           ┌──────────────────────┐
 │ IGeometryEnvironment │        │ SemanticCommand-     │           │ TriangleResearch-    │
 │ (Kernel Verification)│        │ Executor (School Ops)│           │ Session Dispatcher   │
 └──────────┬───────────┘        └──────────┬───────────┘           └──────────┬───────────┘
            │                               │                                  │
            │                               ▼                                  │
            │                    ┌──────────────────────┐                      │
            │                    │ Classical Planners   │                      │
            │                    │ (Bisector, Altitude) │                      │
            │                    └──────────┬───────────┘                      │
            │                               │                                  │
            ▼                               ▼                                  ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                              DETERMINISTIC GEOMETRY CORE                               │
 │   - FullGeometryState / ConstructionCore (Pure Command Reducer)                        │
 │   - DependencyRecomputer (Topological Macro Propagation)                               │
 │   - Plane 1 (Authoritative SSOT) & Plane 2 (Isolated Workspace with FIXED lock)        │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Agent Entry Points

The codebase contains **4 distinct agent entry point layers**:

1. **Formal Environment Layer (`src/environment/GeometryEnvironment.ts`)**:
   - Implements `IGeometryEnvironment`.
   - Used for formal automated theorem proving, deductive reasoning steps, and canonical oracle solving.
2. **Semantic Command Layer (`src/engines/semantic/semanticCommandExecutor.ts`)**:
   - Entry point: `executeSemanticCommand(state, command)`.
   - Accepts high-level school geometric operations (`SET_TRIANGLE_ANGLES`, `CONSTRUCT_ANGLE_BISECTOR`, etc.).
   - Shorthand resolution: resolves natural strings like `"AB"` to `"chord_AB"`.
3. **Session & Multi-Plane Layer (`src/engines/research/sessionDispatcher.ts`)**:
   - Entry points: `dispatchSessionCommand`, `setActivePlane`, `clonePlane1ToPlane2`, `setPlane2Lifecycle`, `setOverlayEnabled`, `setOverlayMix`.
   - Routes mutations to active plane, enforces `FIXED` protection, updates `identityRegistry`.
4. **PGS-2D Interchange Layer (`src/engines/research/pgsPlane2Adapter.ts`, `src/engines/pgs/`)**:
   - Entry points: `importPgsToPlane2(session, passportOrJson)`, `exportPlane2ToPgs(plane2)`.
   - Transactional import with autonomous receiver verification.

---

## 3. Master Command Registry

| Command Identifier | Layer | Target Plane | Read/Write | Purpose | Executor / Handler | Validation & Guard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SET_ACTIVE_PLANE` | Session | Session Meta | Read/Write | Switch active plane between `PLANE_1` and `PLANE_2` | `setActivePlane` | Fails if switching to uninitialized Plane 2 |
| `CLONE_PLANE1_TO_PLANE2` | Session | Plane 2 | Mutating (P2) | Deep-clone Plane 1 state into Plane 2 workspace | `clonePlane1ToPlane2` | Creates new memory references |
| `SET_PLANE2_LIFECYCLE` | Session | Plane 2 | Read/Write | Set Plane 2 mode (`BUILDING` or `FIXED`) | `setPlane2Lifecycle` | Binary state toggle |
| `RESET_PLANE2` | Session | Plane 2 | Mutating (P2) | Reset Plane 2 workspace to null | `resetPlane2` | Resets active plane to `PLANE_1` |
| `SET_OVERLAY_ENABLED`| Session | Overlay Meta | Presentation | Enable/disable dual-plane optical overlay | `setOverlayEnabled` | Zero mutation on geometry |
| `SET_OVERLAY_MIX` | Session | Overlay Meta | Presentation | Adjust overlay transparency blend $mix \in [0, 1]$ | `setOverlayMix` | Clamps to $[0, 1]$, zero mutation |
| `IMPORT_PGS_TO_PLANE2` | PGS | Plane 2 | Mutating (P2) | Transactional import of PGS-2D passport | `importPgsToPlane2` | Autonomous receiver verification + Rollback |
| `EXPORT_PLANE2_TO_PGS` | PGS | Plane 2 | Read-only | Export Plane 2 geometry as canonical PGS-2D | `exportPlane2ToPgs` | Preserves `portableId` via registry |
| `ADD_POINT` | Geometry Core | Active Plane | Mutating | Create point at $(x, y)$ or parametric $u$ | `dispatchGeometryCommand` | Coordinate validation |
| `ADD_SEGMENT` | Geometry Core | Active Plane | Mutating | Create segment connecting two points | `dispatchGeometryCommand` | Endpoints must exist |
| `ADD_LINE` | Geometry Core | Active Plane | Mutating | Create infinite line passing through two points | `dispatchGeometryCommand` | Points must not coincide ($d > 10^{-4}$) |
| `ADD_CIRCLE` | Geometry Core | Active Plane | Mutating | Create circle from center and radius/point | `dispatchGeometryCommand` | Center must exist, $r > 0$ |
| `MOVE_POINT` | Geometry Core | Active Plane | Mutating | Update coordinates of an existing point | `dispatchGeometryCommand` | Point must exist |
| `ERASE_OBJECT` | Geometry Core | Active Plane | Mutating | Delete point, line, segment, or circle | `dispatchGeometryCommand` | Base triangle elements are immutable |
| `SYNC_BASE_POINTS` | Geometry Core | Active Plane | Mutating | Update $u_A, u_B, u_C$ and circumradius $R$ | `dispatchGeometryCommand` | Recomputes dependent geometry |
| `CLEAR_USER_CONSTRUCTIONS`| Geometry Core | Active Plane | Mutating | Delete all auxiliary school constructions | `dispatchGeometryCommand` | Retains base triangle $A, B, C, \omega$ |
| `SET_TRIANGLE_ANGLES`| Semantic | Active Plane | Mutating | Set triangle angles (e.g. $A=40^\circ, B=70^\circ$) | `executeSemanticCommand` | Sum of angles must be $< 180^\circ$ |
| `CONSTRUCT_ANGLE_BISECTOR`| Semantic | Active Plane | Mutating | Construct angle bisector at given vertex | `executeSemanticCommand` | Vertex must exist |
| `CONSTRUCT_PERPENDICULAR`| Semantic | Active Plane | Mutating | Construct perpendicular line to reference through point | `executeSemanticCommand` | Reference and point must exist |
| `CONSTRUCT_PARALLEL` | Semantic | Active Plane | Mutating | Construct parallel line to reference through point | `executeSemanticCommand` | Reference and point must exist |
| `CONSTRUCT_PERPENDICULAR_BISECTOR`| Semantic| Active Plane | Mutating | Construct perpendicular bisector of segment | `executeSemanticCommand` | Segment must exist |
| `GET_GEOMETRY_STATE` | Semantic | Active Plane | Read-only | Query full raw geometry state | `executeSemanticCommand` | None (pure query) |
| `GET_CONFIGURATION` | Semantic | Active Plane | Read-only | Query structural configuration summary | `executeSemanticCommand` | None (pure query) |
| `GET_RELATIONS` | Semantic | Active Plane | Read-only | Query derived geometric relations (S-01) | `executeSemanticCommand` | None (pure query) |
| `GET_MEASUREMENTS` | Semantic | Active Plane | Read-only | Query metric measurements (side lengths, angles) | `executeSemanticCommand` | None (pure query) |
| `GET_VERIFIED_FACTS`| Semantic | Active Plane | Read-only | Query formally verified facts in configuration | `executeSemanticCommand` | None (pure query) |
| `VERIFY_RELATION` | Semantic | Active Plane | Read-only | Verify specific candidate geometric relation | `executeSemanticCommand` | Evaluates epistemic status |
| `ENV_SOLVE` | Formal Kernel | Kernel SSOT | Read-only | Compute canonical derivation trace for target | `GeometryEnvironment.solve` | Target must be reachable |
| `ENV_STEP` | Formal Kernel | Kernel SSOT | Mutating (Fact) | Apply single deduction rule step | `GeometryEnvironment.step` | Rule preconditions must be satisfied |
| `ENV_VERIFY_RESULT` | Formal Kernel | Kernel SSOT | Read-only | Numerically verify agent calculation vs Oracle | `GeometryEnvironment.verifyResult`| Epsilon tolerance comparison |
| `ENV_VERIFY_CLAIM` | Formal Kernel | Kernel SSOT | Read-only | Evaluate arbitrary geometric predicate | `GeometryEnvironment.verifyClaim` | Predicate closure execution |

---

## 4. Geometry Commands Details

### 1. Primitive Creation (`ADD_POINT`, `ADD_SEGMENT`, `ADD_LINE`, `ADD_CIRCLE`)
* **Input Schema**: Entity definition object with coordinates/parent IDs, optional `role` (`primary` | `auxiliary`), and optional `provenance`.
* **Behavior**: Inserts object into flat dictionary of active plane, increments entity counter.
* **Plane 2 Identity Sync**: If dispatched on Plane 2, automatically registers new entity in `identityRegistry` with `source: 'agent_created'` and portable ID (e.g. `pt_agent_P1`).

### 2. Parametric Angle Setting (`SET_TRIANGLE_ANGLES`)
* **Input Schema**: `{ command: 'SET_TRIANGLE_ANGLES', angles: { A?: number, B?: number, C?: number } }`.
* **Behavior**: Solves for unknown third angle (if 2 provided), validates $\sum < 180^\circ$, recalculates cyclic parameters $u_A, u_B, u_C$, and triggers `dependencyRecomputer` to update all dependent constructions.

### 3. School Macro Constructions (`CONSTRUCT_PERPENDICULAR`, `CONSTRUCT_ANGLE_BISECTOR`, etc.)
* **Behavior**: Calls classical geometry planners (`planPerpendicularLine`, etc.). Generates an atomic macro group containing the primary line and auxiliary compass circles/intersection points.

---

## 5. Plane & Session Commands Details

* **`setActivePlane(session, planeId)`**:
  - Switches `session.activePlane` to `'PLANE_1'` or `'PLANE_2'`.
  - Guard: Throws error if attempting to switch to `PLANE_2` when `plane2 === null`.
* **`clonePlane1ToPlane2(session)`**:
  - Deep-clones `session.plane1` into `session.plane2`.
  - Sets `sourceType = 'plane1_clone'`, initializes `identityRegistry`, sets `isModified = false`.
* **`setPlane2Lifecycle(session, 'FIXED')`**:
  - Locks Plane 2 against all further mutations.
  - Subsequent mutation attempts return `{ success: false, error: 'PLANE_FIXED_READ_ONLY' }`.

---

## 6. PGS-2D Commands Details

* **`exportPlane2ToPgs(plane2)`**:
  - Pure function mapping `Plane2WorkspaceState` $\to$ `PGS2DPassport` (v1.0.0, `EXACT_STATE`).
  - Reads `identityRegistry` so exported entities retain their canonical `portableId` (`pt_A`, `edge_AB`).
* **`importPgsToPlane2(session, passportOrJson)`**:
  - Decodes JSON, validates against schema.
  - Runs autonomous `verifyPgsPassportAsReceiver` checking polygon vertex count ($N=3$), edge closure, and circumcircle consistency.
  - On failure: returns `{ success: false, error: '...', session: session }` (existing session left 100% unmutated).
  - On success: constructs temporary candidate `Plane2WorkspaceState`, populates `identityRegistry`, and commits to session.

---

## 7. Overlay / Presentation Commands Details

* **`setOverlayEnabled(session, enabled)`**:
  - Sets `session.overlay.enabled = true | false`.
* **`setOverlayMix(session, mix)`**:
  - Sets `session.overlay.mix = Math.max(0, Math.min(1, mix))`.
  - **Zero-Mutation Invariant**: Moving mix slider changes only transparency weights ($\alpha_1 = 1 - mix, \alpha_2 = mix$). Geometry references, active plane, and PGS passports are guaranteed byte-for-byte unmutated.

---

## 8. Observation & Epistemic Commands Details

* **`GET_MEASUREMENTS`**: Returns exact side lengths ($a, b, c$), central angles ($\theta_{AB}, \theta_{BC}, \theta_{CA}$), and inscribed angles ($\angle A, \angle B, \angle C$).
* **`GET_RELATIONS`**: Returns structural relations (e.g. `PERPENDICULAR_TO`, `ANGLE_BISECTOR_OF`, `PARALLEL_TO`).
* **`GET_VERIFIED_FACTS`**: Returns formal facts established in the configuration.
* **`ENV_VERIFY_CLAIM`**: Allows an agent to submit a custom predicate closure `(facts: FactMap) => { valid: boolean, evidence: string }` to be deterministically verified against the kernel fact base.

---

## 9. Identity & Shorthand Handling

The Agent Toolbox supports flexible identity resolution via `resolveLineOrSegmentId` and `resolvePointId`:

```text
 Agent input "AB"      ───►  Resolves to "chord_AB"
 Agent input "chord_AB" ───►  Resolves to "chord_AB"
 Agent input "C"       ───►  Resolves to point "C"
 Agent input "pt_A"    ───►  Mapped via identityRegistry to local "A"
```

---

## 10. UI ↔ Agent Parity Evaluation

| User UI Operation | Equivalent Agent Command | Shared Domain Reducer? | Parity Status |
| :--- | :--- | :--- | :--- |
| Click "Plane 1" / "Plane 2" tab | `setActivePlane(session, planeId)` | **YES** (`sessionDispatcher.ts`) | **BOTH USE SAME COMMAND** |
| Click "Клонировать Plane 1" | `clonePlane1ToPlane2(session)` | **YES** (`planeClone.ts`) | **BOTH USE SAME COMMAND** |
| Toggle "BUILDING / FIXED" lock | `setPlane2Lifecycle(session, mode)` | **YES** (`sessionDispatcher.ts`) | **BOTH USE SAME COMMAND** |
| Drag Overlay slider ($0 \dots 1$) | `setOverlayMix(session, mix)` | **YES** (`sessionDispatcher.ts`) | **BOTH USE SAME COMMAND** |
| Drag vertex $A, B, C$ on canvas | `SYNC_BASE_POINTS` / `MOVE_POINT` | **YES** (`constructionCore.ts`) | **BOTH USE SAME DOMAIN COMMAND** |
| Click preset (Right / Obtuse) | `SET_TRIANGLE_ANGLES` | **YES** (`parametricAngleSolver.ts`) | **BOTH USE SAME DOMAIN COMMAND** |
| Select tool "Биссектриса" | `CONSTRUCT_ANGLE_BISECTOR` | **YES** (`angleBisector.ts`) | **BOTH USE SAME DOMAIN COMMAND** |
| Select tool "Высота / Перпендикуляр"| `CONSTRUCT_PERPENDICULAR` | **YES** (`perpendicularLine.ts`) | **BOTH USE SAME DOMAIN COMMAND** |
| Select tool "Параллель" | `CONSTRUCT_PARALLEL` | **YES** (`parallelLine.ts`) | **BOTH USE SAME DOMAIN COMMAND** |
| Click "Импорт PGS" / "Экспорт PGS" | `importPgsToPlane2` / `exportPlane2ToPgs` | **YES** (`pgsPlane2Adapter.ts`) | **BOTH USE SAME DOMAIN COMMAND** |
| View Measurements in sidebar | `GET_MEASUREMENTS` / `observe()` | **YES** (`derivedRelations.ts`) | **BOTH USE SAME DOMAIN QUERY** |

---

## 11. End-to-End Execution Trace

### Example: Agent constructs perpendicular on Plane 2 and verifies via Overlay

```text
 1. Agent calls setActivePlane(session, 'PLANE_2')
    └── session.activePlane = 'PLANE_2'

 2. Agent calls clonePlane1ToPlane2(session)
    └── session.plane2 = { geometryState: clone(plane1), sourceType: 'plane1_clone', ... }

 3. Agent calls dispatchSessionCommand(session, {
      type: 'ADD_LINE',
      line: { p1Id: 'C', p2Id: 'pt_perp_target', role: 'primary', provenance: { ... } }
    })
    ├── sessionDispatcher checks session.activePlane === 'PLANE_2'
    ├── sessionDispatcher checks session.plane2Lifecycle !== 'FIXED'
    ├── dispatchGeometryCommand updates session.plane2.geometryState.lines
    └── session.plane2.identityRegistry registers 'line_1' -> 'line_line_1' (agent_created)

 4. Agent calls setOverlayEnabled(session, true) + setOverlayMix(session, 0.5)
    └── session.overlay = { enabled: true, mix: 0.5 }

 5. Renderer (CanvasStage Step 5) executes:
    ├── renderGeometryState(ctx, session.plane1, alpha = 0.5)
    └── renderGeometryState(ctx, session.plane2.geometryState, alpha = 0.5)

 6. Agent calls exportPlane2ToPgs(session.plane2)
    └── Generates PGS2DPassport containing base triangle + agent perpendicular line
```

---

## 12. Automated Test Verification Matrix

| Test Suite File | Test Cases | What is Formally Proven | Status |
| :--- | :--- | :--- | :--- |
| `src/engines/tests/testAgentSemanticInterface.ts` | AGENT-01 to AGENT-16 | Semantic execution, angle solving, bisectors, perpendiculars, idempotency, shorthand resolution, natural language parsing | **16/16 PASS** |
| `src/engines/tests/planeOverlay.test.ts` | TESTS A to M | Agent plane switching, cloning, mutation on P2, FIXED protection, P1 mutation while P2 is FIXED, overlay inspection, PGS import/export | **13/13 PASS** |
| `src/engines/tests/twoPlaneSession.test.ts` | TESTS 1 to 14 | Memory reference isolation, independent mutation, transactional PGS rollback, identity registry round-trip | **14/14 PASS** |
| `src/environment/tests/runEnvironmentContractTests.ts`| ENV-01 to ENV-18 | Kernel step execution, oracle solving, numerical verification, predicate claim verification | **18/18 PASS** |

---

## 13. Summary Tables

### TABLE A — VERIFIED AGENT CAPABILITIES IN V1

| Capability | Interface Method | Verified by Test | Operational Status |
| :--- | :--- | :--- | :--- |
| Switch active plane | `setActivePlane` | `planeOverlay.test.ts` (Test A) | **VERIFIED** |
| Deep-clone Plane 1 to Plane 2 | `clonePlane1ToPlane2` | `planeOverlay.test.ts` (Test B) | **VERIFIED** |
| Mutate Plane 2 geometry | `dispatchSessionCommand` | `planeOverlay.test.ts` (Test C) | **VERIFIED** |
| Enforce FIXED mode lock | `setPlane2Lifecycle` | `planeOverlay.test.ts` (Test D) | **VERIFIED** |
| Mutate Plane 1 while Plane 2 is FIXED | `dispatchSessionCommand` | `planeOverlay.test.ts` (Test E) | **VERIFIED** |
| Enable & adjust Overlay lens ($mix \in [0, 1]$)| `setOverlayEnabled`, `setOverlayMix` | `planeOverlay.test.ts` (Tests F, G, H) | **VERIFIED** |
| Read-only inspection of both planes | Direct state query | `planeOverlay.test.ts` (Tests J, K) | **VERIFIED** |
| Export Plane 2 to PGS passport | `exportPlane2ToPgs` | `planeOverlay.test.ts` (Test M) | **VERIFIED** |
| Transactional PGS import | `importPgsToPlane2` | `planeOverlay.test.ts` (Test L) | **VERIFIED** |
| Set triangle angles parametrically | `SET_TRIANGLE_ANGLES` | `testAgentSemanticInterface.ts` (AGENT-01) | **VERIFIED** |
| Construct angle bisector | `CONSTRUCT_ANGLE_BISECTOR` | `testAgentSemanticInterface.ts` (AGENT-03) | **VERIFIED** |
| Construct perpendicular line | `CONSTRUCT_PERPENDICULAR` | `testAgentSemanticInterface.ts` (AGENT-04) | **VERIFIED** |
| Construct parallel line | `CONSTRUCT_PARALLEL` | `testAgentSemanticInterface.ts` (AGENT-05) | **VERIFIED** |
| Construct perpendicular bisector | `CONSTRUCT_PERPENDICULAR_BISECTOR` | `testAgentSemanticInterface.ts` (AGENT-06) | **VERIFIED** |
| Query relations & facts | `GET_RELATIONS`, `GET_VERIFIED_FACTS` | `testAgentSemanticInterface.ts` (AGENT-08, 09) | **VERIFIED** |
| Shorthand entity resolution (`"AB"` $\to$ `"chord_AB"`)| `resolveLineOrSegmentId` | `testAgentSemanticInterface.ts` (AGENT-15) | **VERIFIED** |
| Formal deductive step execution | `IGeometryEnvironment.step` | `runEnvironmentContractTests.ts` | **VERIFIED** |
| Numerical result verification vs Oracle | `IGeometryEnvironment.verifyResult` | `runEnvironmentContractTests.ts` | **VERIFIED** |
| Geometric claim predicate verification | `IGeometryEnvironment.verifyClaim` | `runEnvironmentContractTests.ts` | **VERIFIED** |

---

### TABLE B — V2 RELEVANT REFERENCE (Lessons from V1 Agent Toolbox)

| Subsystem in V1 | Behavioral Fact Demonstrated in V1 | Value for V2 Architecture |
| :--- | :--- | :--- |
| **Client Parity** | V1 proves that UI event handlers and Agent RPC commands can share 100% identical pure reducer functions. | V2 should maintain unified command dispatchers rather than separate UI/Agent code paths. |
| **Isolation & Guarding** | V1 proves that dispatching a command to Plane 2 with a `FIXED` guard cleanly rejects mutations without side effects. | V2 should adopt the same session dispatcher pattern with immutable state return. |
| **Shorthand Resolution** | V1 proves that agents benefit from flexible shorthand reference resolution (`"AB"`, `"chord_AB"`). | V2 should incorporate typed shorthand resolvers in its Agent API. |
| **Presentation vs Geometry** | V1 proves that Overlay commands (`mix`, `enabled`) must strictly modify presentation state and never touch geometry state. | V2 should keep `PresentationState` structurally isolated from `GeometryState`. |
| **Transactional Rollback** | V1 proves that autonomous receiver verification must reject invalid/refuted passports before modifying session state. | V2 should enforce transactional rollback on all external agent inputs. |

---

## 14. Missing Capabilities & Known Limitations in V1 Agent Toolbox

1. **Direct Drag Simulation**: The agent cannot issue continuous intermediate drag coordinates along a trajectory; it updates points discretely via `SYNC_BASE_POINTS` or `MOVE_POINT`.
2. **Visual Pixel Feedback**: The agent inspects analytical geometry state and relations, not rendered canvas bitmap pixels.
3. **Multi-Step Macro Rollback**: If a composite agent construction fails halfway, rollback is handled via full state restore (`previousState`), not fine-grained sub-command rollback.
4. **Generic Polygon Support**: Semantic commands in V1 are specialized for triangle and circle geometry.
