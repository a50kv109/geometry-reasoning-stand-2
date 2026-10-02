# V2 ARCHITECTURE FOUNDATION — TRIANGLE STAND V2
**Geometry Reasoning Stand Architectural Foundation & Constitution**

> *"The agent may be wrong. The stand must not be. The architecture must never confuse truth, workspace, and presentation."*

---

## 1. Executive Summary & V1 Post-Mortem

Triangle Stand V1 evolved from an interactive single-triangle demonstrator into a rigorous mathematical reasoning system with formal invariant checks, School Mode dynamic constructions, PGS-2D semantic contracts, two-plane research workspaces, agent command interfaces, and an optical comparison Overlay Lens.

Because these capabilities were introduced incrementally into a single-state codebase, V1 encountered critical architectural friction points:
1. **Single-State CanvasRenderer Trap**: `CanvasStage.tsx` was originally designed around one state (`pointsU` + base parameters). When Overlay Lens was introduced, the canvas had to be retrofitted to render two distinct states with transparency.
2. **State Conflation**: Geometry state, workspace state, presentation state, and interchange contracts frequently collided when forced through the same interfaces.
3. **Loss of Portable Identity**: In naive conversions, portable IDs (like `edge_AB`) were stripped into local ephemeral IDs (`chord_AB`), breaking semantic round-trips.

**Triangle Stand V2** is NOT an incremental patch of V1. It is a **Clean Reimplementation** built from day zero around:
* Dual-plane geometry architecture (`Plane 1 Authoritative` vs `Plane 2 Workspace`).
* Explicit multi-layer rendering (`renderGeometryState(state, alpha)`).
* Strict separation of four foundational epistemic domains.
* Canonical PGS-2D as the external semantic interchange contract.

---

## 2. The Architectural Constitution: Absolute Epistemic Invariants

In V2, the following separations are mathematically, architecturally, and contractually non-negotiable:

```text
       ┌────────────────────────────────────────────────────────┐
       │                 THE FOUR DOMAIN BOUNDS                 │
       └────────────────────────────────────────────────────────┘

    GEOMETRY STATE        ≠      WORKSPACE STATE
    (Pure Mathematical Truth)    (Metadata, Isolation, Identity)
          ≠                                ≠
    PRESENTATION STATE    ≠      INTERCHANGE CONTRACT (PGS)
    (Visual, Zoom, Lens)         (Lossless Semantic Passport)
```

### Invariant 1: Four State Classes
1. **Geometry State (`FullGeometryState`)**:
   - Pure, deterministic, minimal mathematical primitives: points, segments, lines, circles, metric coordinates $(x, y)$, and topological parameters $u \in [0, 1)$.
   - Zero UI metadata, zero zoom/pan values, zero layer alphas, zero wall-clock timestamps.
2. **Workspace State (`Plane2WorkspaceState`)**:
   - The operational metadata context: source provenance (`plane1_clone`, `pgs_import`, `empty_sandbox`), `identityRegistry` (mapping `portableId` $\leftrightarrow$ `localId`), lifecycle lock (`BUILDING` vs `FIXED`), and independent `receiverVerification` records.
3. **Presentation State (`PlaneOverlayState`, `ViewTransform`)**:
   - Viewport transformation matrices, DPR scaling, Overlay Lens transparency mixes ($mix \in [0, 1]$), hover states, active tool selection, and tooltips.
   - Changing presentation state **never** mutates Geometry State or Workspace State.
4. **PGS Passport (`PGS2DPassport`)**:
   - The external, platform-agnostic, portable semantic contract for geometric state interchange. It is not an active computation engine; it is a serialization/verification contract.

### Invariant 2: Plane Authority & Epistemic Isolation
* **Plane 1 (Authoritative Stand SSOT)**:
  - Contains verified canonical ground truth.
  - Can only be mutated by authoritative human actions or verified canonical transitions.
* **Plane 2 (Isolated Research Workspace)**:
  - An experimental sandbox for AI agent proposals, student hypotheses, and imported external proofs.
  - **Zero Shared References**: Deep structural cloning ensures that mutations to Plane 2 never alter Plane 1, and mutations to Plane 1 never alter Plane 2.
  - **FIXED Protection**: When Plane 2 lifecycle is set to `FIXED`, any further mutation commands directed to Plane 2 are rejected with `PLANE_FIXED_READ_ONLY`.

---

## 3. The Dual-Plane Architecture

```text
                        TRIANGLE STAND V2
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
     PLANE 1 (Authoritative)              PLANE 2 (Workspace)
  ┌─────────────────────────┐          ┌─────────────────────────┐
  │  FullGeometryState      │          │  Plane2WorkspaceState   │
  │  - points, segments     │          │  - geometryState        │
  │  - lines, circles       │          │  - identityRegistry     │
  │  - canonical invariant  │          │  - sourceType           │
  │    guarantees           │          │  - lifecycle:           │
  └─────────────────────────┘          │    [BUILDING | FIXED]   │
                                       │  - receiverVerification │
                                       └─────────────────────────┘
                                                    │
                                                    ▼
                                           TRANSACTIONAL PGS
                                           - importPgsToPlane2()
                                           - exportPlane2ToPgs()
```

### Plane Isolation Contracts
| Operation | Target Plane | Effect on Plane 1 | Effect on Plane 2 |
| :--- | :--- | :--- | :--- |
| `dispatchSessionCommand(P1)` | Plane 1 | Mutates P1 | **100% Unchanged** |
| `dispatchSessionCommand(P2)` | Plane 2 (BUILDING) | **100% Unchanged** | Mutates P2 |
| `dispatchSessionCommand(P2)` | Plane 2 (FIXED) | **100% Unchanged** | **Rejected (`PLANE_FIXED_READ_ONLY`)** |
| `importPgsToPlane2(candidate)` | Plane 2 (Invalid/Refuted) | **100% Unchanged** | **100% Unchanged (Rollback)** |
| `setOverlayMix(mix)` | Presentation | **100% Unchanged** | **100% Unchanged** |

---

## 4. Identity & Identity Registry

### The Problem in V1
When exporting Geometry State to PGS and re-importing it, local identifiers like `A`, `B`, `chord_AB` risked losing their semantic lineage or colliding with newly created auxiliary points (`P1`, `P2`).

### The V2 Identity Model
Every entity has three distinct identities:
1. `portableId`: Globally stable, semantic identifier used in PGS passports (`pt_A`, `pt_B`, `edge_AB`, `circle_circumcircle`).
2. `localId`: Context-specific key within the active engine's dictionary (`A`, `B`, `seg_01`).
3. `displayLabel`: Human-facing UI label (`A`, `B`, `c`, `α`).

```typescript
export interface PortableIdentityMapping {
  portableId: string;
  localId: string;
  displayLabel?: string;
  source: 'imported' | 'agent_created' | 'cloned_from_plane1';
}
```

The `identityRegistry` is maintained as part of the `Plane2WorkspaceState`. When an agent creates new objects on Plane 2, they are automatically stamped with stable portable IDs (e.g. `pt_agent_P1`) and tagged with source `agent_created`.

---

## 5. Interchange Contract (PGS-2D) & Transactional Import Pipeline

### PGS is an Interchange Contract, NOT an Engine
PGS-2D is a canonical JSON schema that guarantees interoperability between reasoning agents and the Stand.
- **Source Claim $\neq$ Receiver Verification**: Even if a passport claims `verified: true`, the Stand's independent receiver verifier re-checks topological boundary conditions, closure, and Euclidean metric consistency before accepting the passport.
- **Transfer Modes**:
  - `EXACT_STATE`: Byte-for-byte, coordinate-accurate snapshot reconstruction.
  - `CONSTRUCTIVE_STATE`: Procedural rule-based derivation sequence.
  Triangle Stand V2 enforces `EXACT_STATE` with strict metric verification.

### Transactional Import Pipeline

```text
                      INPUT (JSON or Object)
                               │
                               ▼
                    Step 1: Parse & Decode
                    (Reject syntax errors)
                               │
                               ▼
               Step 2: Canonical Schema Validation
                (Structure, required fields, enums)
                               │
                               ▼
             Step 3: Independent Receiver Verification
            (Check: PolygonTopology, Vertices, Radius)
                               │
            ┌──────────────────┴──────────────────┐
            ▼ [FAILS / REFUTED]                   ▼ [VERIFIED]
       ROLLBACK                              Step 4: Commit
   (Leave live state                     (Instantiate candidate
   100% unmutated;                       state + identityRegistry;
    return details)                       attach to Plane 2)
```

**Cardinal Rule**: Under zero circumstances may an invalid or refuted passport alter live workspace memory.

---

## 6. The Dual-Client Command Pattern: UI and Agent Parity

In V2, the Human UI and the Autonomous AI Agent are **two parallel clients of the exact same domain operations**:

```text
       ┌──────────────┐                  ┌──────────────┐
       │   HUMAN UI   │                  │   AI AGENT   │
       │ (React/DOM)  │                  │ (RPC/Toolbox)│
       └──────┬───────┘                  └──────┬───────┘
              │                                 │
              └───────────────┬─────────────────┘
                              ▼
                   SESSION COMMAND DISPATCHER
             - dispatchSessionCommand()
             - clonePlane1ToPlane2()
             - importPgsToPlane2()
             - exportPlane2ToPgs()
             - setActivePlane()
             - setPlane2Lifecycle()
             - setOverlayMix()
                              │
                              ▼
                     RESEARCH SESSION SSOT
```

### Agent Command Families
* **Geometry**: `ADD_POINT`, `ADD_SEGMENT`, `ADD_LINE`, `ADD_CIRCLE`, `MOVE_POINT`, `ERASE_OBJECT`, `SYNC_BASE_POINTS`.
* **Workspace**: `SELECT_PLANE`, `CLONE_PLANE1_TO_PLANE2`, `SET_PLANE2_LIFECYCLE(BUILDING|FIXED)`, `RESET_PLANE2`.
* **PGS**: `IMPORT_PGS_TO_PLANE2`, `EXPORT_PLANE2_TO_PGS`.
* **Presentation**: `SET_OVERLAY_ENABLED`, `SET_OVERLAY_MIX`.
* **Observation / Reflection**: `INSPECT_PLANE_1`, `INSPECT_PLANE_2`, `INSPECT_OVERLAY`, `EVALUATE_INVARIANTS`, `DIFF_PLANES`.

### The Agent Scientific Observation Loop
The agent uses Plane 2 as an epistemic sandbox:
$$\text{OBSERVE (P1)} \longrightarrow \text{HYPOTHESIZE} \longrightarrow \text{ACT (Mutate P2)} \longrightarrow \text{OBSERVE (P2)} \longrightarrow \text{COMPARE (Overlay Lens)}$$

---

## 7. Rendering Architecture: Explicit Layers & Overlay Lens

### The Core V1 Renderer Flaw
In V1, `CanvasStage` read `pointsU` directly from top-level component props, computing positions and drawing chords inline. This forced canvas rendering to assume a single geometric context. Attempting to add an overlay required hacking global transparency and splitting hooks.

### The V2 Multi-Layer Renderer
In V2, the renderer has no concept of a "current active plane". It is a pure visual projection function:

```typescript
export interface RenderLayerDescriptor {
  state: FullGeometryState;
  alpha: number;             // [0, 1]
  colorProfile: 'authoritative' | 'workspace' | 'contrast';
  showLabels: boolean;
}

export function renderLayer(
  ctx: CanvasRenderingContext2D,
  viewTransform: ViewTransform,
  layer: RenderLayerDescriptor
): void;
```

### The Overlay Formula
The CanvasStage receives a list of layers to render in order:
$$\text{Layer}_1 = \text{Plane 1 State} \quad \text{with} \quad \alpha_1 = 1 - mix$$
$$\text{Layer}_2 = \text{Plane 2 State} \quad \text{with} \quad \alpha_2 = mix$$

Where:
* $mix = 0$: Plane 1 is 100% visible, Plane 2 is completely hidden.
* $mix = 0.5$: 50/50 Optical Comparison Lens.
* $mix = 1.0$: Plane 2 is 100% visible, Plane 1 is completely hidden.

Changing $mix$ is purely a render-loop parameter update. It executes at 60 FPS without recalculating geometry and without touching the domain session.

---

## 8. Epistemic Classification Hierarchy

When researching invariants or observing relations, the Stand enforces an explicit 6-stage epistemic ladder:

```text
    Level 1: MEASUREMENT          c = 142.3 mm, θ = 89.4°
               │
    Level 2: FACT                 θ_min + θ_maj = 360.0°
               │
    Level 3: OBSERVATION          c ≈ 2R·sin(θ/2) holds within 0.05 mm
               │
    Level 4: CANDIDATE_INVARIANT  Hypothesis: ∠ACB = 1/2 ◡AB for all C
               │
    Level 5: KNOWN_RELATION_MATCH Pattern matches Thales Configuration
               │                  (isFormallyVerified: false!)
               ▼
    Level 6: VERIFIED_INVARIANT   Proven by Kernel Proof Prerequisites
                                  (isFormallyVerified: true)
```

**Crucial V2 Rule**: An observation matching a textbook formula (Level 5) MUST NOT be classified as verified (Level 6) until all formal geometric preconditions in the analytical kernel are evaluated and satisfied.
