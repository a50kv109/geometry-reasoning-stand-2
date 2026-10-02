# TRIANGLE GEOMETRY GRAPH REFERENCE — V1 ARCHAEOLOGICAL AUDIT
**Semantic Reconstruction of the Geometric & Constructive Dependency Graph of Triangle Stand V1**

---

## 1. Executive Summary & Epistemic Boundary

In Triangle Stand V1, there is **no single monolithic `Graph` class or explicit `GeometryGraph` runtime object**. 

Instead, the geometric graph exists as an **implicit topological dependency network** distributed across:
1. `FullGeometryState` (`src/engines/constructionCore.ts`) — Flat relational entity tables (`points`, `segments`, `lines`, `circles`).
2. `recomputeDependentGeometry` (`src/engines/dependencyRecomputer.ts`) — The dynamic propagation algorithm traversing macro groups.
3. `buildConstructionTrace` (`src/engines/research/constructionTrace.ts`) — A structural reconstruction algorithm calculating topological depths ($0, 1, 2, \dots$) and parent-child linkages.
4. `PGS2DPassport` & `PolygonTopology` (`src/engines/pgs/types.ts`) — The serialized boundary polygon graph.

This document reconstructs this graph model with mathematical rigor so that **Geometry Reasoning Stand V2** can design an explicit, first-class **Constructive Dependency DAG** from day zero.

---

## 2. Graph Model (Reconstructed Architecture)

The V1 Geometric Graph is a **Directed Acyclic Graph (DAG)** of geometric entities and geometric constraints:

```text
       ROOT / GROUND TRUTH (Depth 0)
    ┌──────────────────────────────────┐
    │  Circumcircle Center O (0, 0)    │
    │  Circumradius R (Scalar)         │
    │  Parametric Vertices uA, uB, uC  │
    └────────────────┬─────────────────┘
                     │ (Circular Embedding Parameter: x = R*cos(2πu), y = R*sin(2πu))
                     ▼
          BASE VERTICES & CIRCUMCIRCLE (Depth 0)
    ┌────────────────────────────────────────────────────────┐
    │  Point A (uA) ─── Segment AB (chord_AB) ─── Point B   │
    │      │                    │                    │       │
    │  Segment CA (chord_CA)    │             Segment BC     │
    │      │            Circumcircle ω               │       │
    │      └───────────────── Point C ───────────────┘       │
    └────────────────────────┬───────────────────────────────┘
                             │
                             │ (Compass & Straightedge Constructions)
                             ▼
         DERIVED MACRO CONSTRUCTIONS (Depth 1+)
    ┌────────────────────────────────────────────────────────┐
    │  Perpendicular Bisector / Angle Bisector / Altitudes    │
    │  Auxiliary Circles C1, C2 (Compass Radii)              │
    │  Auxiliary Intersection Points P1, P2, Q               │
    │  Primary Derived Line / Segment                        │
    └────────────────────────┬───────────────────────────────┘
                             │
                             │ (Line-Line & Line-Circle Intersections)
                             ▼
         DERIVED SECONDARY INTERSECTIONS (Depth 2+)
    ┌────────────────────────────────────────────────────────┐
    │  Intersection with Triangle Chords (D_AB, D_BC, D_CA)   │
    │  Intersection with Circumcircle (P_circ_1, P_circ_2)   │
    └────────────────────────────────────────────────────────┘
```

---

## 3. Node Types (Entities in the Graph)

Every node in the geometric graph is an entity stored in `FullGeometryState`:

| Node Kind | V1 Interface | Key Fields | Mathematical Representation |
| :--- | :--- | :--- | :--- |
| **Point** | `GeometryPoint` | `id`, `name`, `x`, `y`, `u`, `role`, `provenance`, `parentIds` | Point $P \in \mathbb{R}^2$. If on circle: $P = (R \cos 2\pi u, R \sin 2\pi u)$. |
| **Segment** | `GeometrySegment` | `id`, `p1Id`, `p2Id`, `length`, `role`, `provenance` | Closed segment $[P_1, P_2] \subset \mathbb{R}^2$ with metric length $\|P_2 - P_1\|$. |
| **Line** | `GeometryLine` | `id`, `p1Id`, `p2Id`, `role`, `provenance` | Infinite line $\mathcal{L}(P_1, P_2) = \{ (1-t)P_1 + tP_2 \mid t \in \mathbb{R} \}$. |
| **Circle** | `GeometryCircle` | `id`, `centerId`, `radiusPointId`, `radius`, `role`, `provenance` | Metric locus $\mathcal{C}(O, r) = \{ P \in \mathbb{R}^2 \mid \|P - O\| = r \}$. |

### Role Hierarchy:
* `role: "primary"`: Core mathematical objects of the stand or resulting user constructions.
* `role: "auxiliary"`: Compass arcs, construction circles, intermediate points, and projection lines created to support a macro.

---

## 4. Edge Types (Geometric Dependencies)

Edges in V1 represent **functional and geometric constraints**:

1. **Incidence / Boundary Edge (`DefinesEndpoint`)**:
   - `Segment(AB) -> Point(A)`, `Segment(AB) -> Point(B)`.
   - `Line(L) -> Point(P1)`, `Line(L) -> Point(P2)`.
   - Direction: Segment depends on its defining points.
2. **Radial Metric Edge (`DefinesRadius`)**:
   - `Circle(ω) -> Point(Center)`, `Circle(ω) -> Point(RadiusPoint)`.
   - Direction: Circle depends on its center and defining radius point.
3. **Parametric Circular Constraint (`ConstrainedToCircle`)**:
   - `Point(A) -> Circle(Circumcircle)` via cyclic parameter $u_A \in [0, 1)$.
   - Moving $u_A$ deterministically recomputes Cartesian $(x_A, y_A)$.
4. **Macro Construction Source (`MacroSourceEdge`)**:
   - Stored in `provenance.sourceIds`.
   - Example (Perpendicular to AB through C): Line depends on `[chord_AB, pt_C]`.
5. **Analytical Intersection Edge (`IntersectionDependency`)**:
   - Intermediate point $Q$ depends on intersection of auxiliary circles: $Q \in \mathcal{C}_1 \cap \mathcal{C}_2$.
   - Dependent chord intersection $D$ depends on `[Line, Segment]`.

---

## 5. Root Objects vs Derived Objects

### Root Objects (Topological Depth 0)
These nodes have no parents in the geometric DAG; their values originate from direct user manipulation or the canonical environment configuration:
* `circumcircle`: Base circle with radius $R$ centered at $(0, 0)$.
* `pt_O`: Center point $(0, 0)$.
* `pt_A`, `pt_B`, `pt_C`: Base triangle vertices parameterized by $u_A, u_B, u_C$.
* `chord_AB`, `chord_BC`, `chord_CA`: Base triangle chords connecting the base vertices.

### Derived Objects (Topological Depth 1+)
These nodes are deterministically computed from Root or lower-depth nodes:
* **Depth 1 (Elementary Constructions)**:
  - Midpoints of triangle sides ($M_{AB} = \frac{A + B}{2}$).
  - Construction circles for compass arcs ($\mathcal{C}(P, r)$).
  - Primary bisector, altitude, or parallel lines.
* **Depth 2 (Secondary Intersections)**:
  - Intersection points between an altitude line and a triangle chord ($D_{AB} = \mathcal{L}_{\text{altitude}} \cap \text{chord}_{AB}$).
  - Intersection points of lines with the circumcircle ($P_{\text{circ}} = \mathcal{L} \cap \omega$).
* **Depth 3+ (Compound Constructions)**:
  - Euler line (connecting Orthocenter and Circumcenter).
  - Incircle and contact points on sides.

---

## 6. Construction Provenance Model

In V1, provenance is captured on derived entities via the `GeometryProvenance` interface:

```typescript
export interface GeometryProvenance {
  macroType: 'perpendicular_bisector' | 'angle_bisector' | 'perpendicular' | 'parallel';
  sourceIds: string[];   // [targetLineOrSegmentId, pointThroughId]
  groupId: string;       // Unique ID linking all entities of the construction
}
```

### The Macro Group Concept:
When a high-level construction is executed (e.g. `planPerpendicularLine`), it does not merely add one line. It generates an **atomic subgraph (Macro Group)** consisting of:
1. `primary`: The final perpendicular line.
2. `auxiliary points`: Compass intersection marks $P_1, P_2, Q$.
3. `auxiliary circles`: Radius arcs used to find the orthogonal direction.
4. `auxiliary segments`: Projection brackets or guide lines.

All entities in the macro share the same `groupId`. If the base triangle is dragged, the entire macro subgraph recalculates coherently.

---

## 7. Dependency Recomputation Pipeline

The recomputation engine (`src/engines/dependencyRecomputer.ts`) executes a deterministic, single-pass topological update:

```text
                  USER DRAGS VERTEX B (uB changes)
                               │
                               ▼
            Step 1: Update Root Vertex Coordinates
            (A, B, C re-evaluate (x, y) = R*(cos 2πu, sin 2πu))
                               │
                               ▼
            Step 2: Update Base Triangle Chords
            (Lengths of AB, BC, CA recalculated via hypot)
                               │
                               ▼
            Step 3: Discover Macro Groups
            (Scan lines for role='primary' and provenance)
                               │
                               ▼
            Step 4: Execute Macro Solvers in Topological Order
            - Perpendicular: recompute compass circles & direction Q
            - Parallel: recompute projection and parallel vector
            - Angle Bisector: recompute unit vectors and bisector ray
            - Perpendicular Bisector: recompute midpoint and normal
                               │
                               ▼
            Step 5: Recompute Dependent Intersections
            - Intersect primary lines with chords AB, BC, CA
            - Intersect primary lines with circumcircle ω
                               │
                               ▼
                     RETURN NEXT STATE (SSOT)
```

**Purity Guarantee**: `recomputeDependentGeometry` never creates new entity IDs during dragging. It mutates coordinates of existing IDs in-place or returns fresh object copies with identical keys.

---

## 8. Identity & Naming Architecture

In V1, geometric graph entities possess a tripartite identity:

```text
       PORTABLE ID (PGS)                 LOCAL ID (Core Engine)               DISPLAY LABEL (UI)
   "Global Semantic Contract"          "Internal Flat Dictionary Key"         "Human Math Notation"
  ┌─────────────────────────┐          ┌─────────────────────────┐          ┌─────────────────────┐
  │ pt_A                    │   <───>  │ A                       │   <───>  │ A                   │
  │ edge_AB                 │   <───>  │ chord_AB                │   <───>  │ AB                  │
  │ circle_circumcircle     │   <───>  │ base_circle             │   <───>  │ ω                   │
  │ pt_agent_P1             │   <───>  │ p2_pt_agent_P1          │   <───>  │ P1                  │
  └─────────────────────────┘          └─────────────────────────┘          └─────────────────────┘
```

The mapping is maintained in the `identityRegistry` of `Plane2WorkspaceState`. 

### Identity Rules:
1. Primary triangle vertices and edges have immutable canonical portable IDs (`pt_A`, `pt_B`, `pt_C`, `edge_AB`, `edge_BC`, `edge_CA`).
2. Auxiliary objects generated by macros receive deterministic local keys: `pt_${groupId}_P1`, `circle_${groupId}_c1`.
3. Agent-created objects on Plane 2 receive portable IDs stamped with source provenance `agent_created`.

---

## 9. Graph Invariants Verified by Automated Tests

The following topological invariants of the graph are formally proven by the test suite:

1. **Topological Order Invariance** (`testPacket2FundamentalsPerpendiculars.ts`, `testSchoolConstruction.ts`):
   - A derived entity is never evaluated before its parent entities.
   - All parents in `sourceIds` must exist in `nextState` before macro recomputation executes.
2. **Deterministic Depth Assignment** (`constructionTrace.ts`, tested in `researchGraph.test.ts`):
   - Base elements always have depth 0.
   - Derived elements strictly have $\text{depth} = 1 + \max(\text{depth}(\text{parents}))$.
3. **No Phantom Node Mutation** (`test:session`, Tests 1–3):
   - Recomputing dependencies on Plane 2 leaves the node graph of Plane 1 100% byte-for-byte identical.
4. **Degeneracy Protection** (`geometryIntersections.ts`):
   - If two parent points coincide ($\text{distance} < 10^{-4}$), line generation collapses gracefully without throwing `NaN` or dividing by zero.

---

## 10. Architectural Value for V2 (What to Carry vs What to Discard)

### What to Preserve & Formalize in V2 (High Value):
1. **Explicit Constructive DAG**: In V2, make the Graph a first-class citizen (`ConstructiveDAG` with explicit `Node` and `Edge` collections), rather than an ad-hoc reconstruction inside `constructionTrace.ts`.
2. **Provenance as First-Class Metadata**: Every geometric entity in V2 must know its mathematical derivation: `ruleId`, `parentEntityIds`, and `macroGroupId`.
3. **Two-Stage Recomputation**:
   - Stage 1: Update base parameters ($u$, $R$).
   - Stage 2: Deterministic topological propagation along DAG edges.
4. **Analytical Precision**: Pure Euclidean analytical geometry without numerical heuristic solvers.

### What NOT to Copy from V1 (Implementation Traps):
1. **Implicit Graph Spread Across 4 Files**: Do not scatter graph discovery across `discoverMacroGroups`, `buildConstructionTrace`, and `FullGeometryState`. V2 should have a dedicated, unified graph engine.
2. **Hardcoded String Prefix Matching**: In V1, code relied on fragile conventions like `id.startsWith('chord_')` or `resolveLineOrSegmentId`. In V2, use typed domain discriminators (`entity.type === 'CHORD'`).
3. **Flat Record Dictionaries for Graph**: V1 stored nodes in 4 flat dictionaries (`points`, `segments`, `lines`, `circles`), forcing recomputers to search across multiple tables to find a parent. V2 should use a unified node repository: `nodes: Map<EntityId, GeometryEntity>`.
