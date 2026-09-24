# Geometry Reasoning Stand — Architecture & System Specification

## 1. System Philosophy & Core Invariant

The **Geometry Reasoning Stand** is architected around a single, non-negotiable principle:

> **ONE GEOMETRY**  
> **ONE MATHEMATICAL KERNEL**  
> **ONE CANONICAL KNOWLEDGE BASE**  
> **MANY CLIENTS**

Neither the graphical User Interface nor the AI Agent interface is the source of mathematical truth. Both are equal clients built on top of the same frozen, deterministic mathematical kernel.

```
       Canonical Geometry Knowledge Graph (CANONICAL_GRAPH)
                               │
                               ▼
                    Deterministic Navigator
             (Pruning, Topology, Preconditions)
                               │
                               ▼
                Consistency & Verification Layer
             (ConsistencyEngine, Trust Boundaries)
                               │
                               ▼
           Geometry Verification Environment (Stand Facade)
              │                                    │
              ▼                                    ▼
       Interactive UI                      AI Agent Interface
     (Human Student / Web)               (Machine Reasoner / API)
```

---

## 2. Core Architectural Principle

### Rich Knowledge Graph + Controlled Deterministic Search
A foundational architectural commitment of the Stand is:

> **DO NOT artificially prune or reduce the Knowledge Graph to fix search performance.**  
> The Knowledge Graph must remain rich, expressive, and geometrically faithful. Performance and termination are guaranteed exclusively by **deterministic structural search invariants** inside the Navigator.

---

## 3. Canonical Knowledge Graph: Semantic Clusters

The knowledge graph (`CANONICAL_GRAPH` in `src/kernel/canonicalPaths.ts`) consists of 30 formal derivation paths partitioned into seven semantic clusters:

1. **Angle & Chord Invariants (`angle/chord`):**
   - Circle inscribed-to-central angle mappings (`DP-INSC-TO-CENT`, `-B`, `-C`).
   - Trigonometric chord lengths from central angles and radius $R$ (`DP-CHORD-TRIG`, `-CA`, `-AB`).
   - Euclidean triangle angle-sum closure ($\angle A + \angle B + \angle C = 180^\circ$).
2. **Triangle Classification (`triangle classification`):**
   - Thales' theorem classification (`DP-THALES-CLASS`) based on diameter subtension.
   - Analytical coordinate vector dot-product classification (`DP-COORD-CLASS`).
3. **Chord & Radial Distance Dual Representation (`chord/radial`):**
   - Orthogonal distance from center to chord $d = \sqrt{R^2 - (L/2)^2}$ (`DP-CHORD-TO-RADIAL-DIST`).
   - Reconstruction of chord length from radial distance $L = 2\sqrt{R^2 - d^2}$ (`DP-RADIAL-DIST-TO-CHORD`).
   - Reference diameter parallel chords (`DP-REF-DIAM-CHORD`).
4. **Transferred-Angle Diagnostic Cluster (`transferred-angle diagnostic`):**
   - Projection of side lengths into minor arc angles $\phi_i = 2 \arcsin(s_i / 2R)$ (`DP-SIDE-*-TO-TRANSFERRED-ANGLE`).
   - Summation of transferred minor angles $\sum \phi_i$ (`DP-TRANSFERRED-ANGLE-SUM`).
   - Global topology classification and obtuse angle recovery $\theta_{\text{obtuse}} = 360^\circ - \phi_{\text{sum}}$ (`DP-OBTUSE-DIAGNOSTIC`).
5. **Perimeter Cluster (`perimeter`):**
   - Direct summation of side lengths $P = a + b + c$ (`DP-TRIANGLE-PERIMETER`).
   - Reversible semantic bridge mappings between chords and standard sides (`DP-MAP-CHORD-*-TO-SIDE-*`).
6. **Area Cluster (`area`):**
   - Classical Heron's formula from semiperimeter $s$ and sides $a, b, c$ (`DP-TRIANGLE-AREA-HERON`).
   - Trigonometric area from angles and circumradius $2R^2 \sin A \sin B \sin C$ (`DP-TRIANGLE-AREA-ANGLES-R`).
   - Coordinate cross-product area formulation (`DP-TRIANGLE-AREA-COORDS`).
   - Normalized circumcircle area ratio $\kappa = \text{Area} / (\pi R^2)$ (`DP-NORMALIZED-AREA`).
7. **Radial Reconstruction & Inradius Cluster (`radial reconstruction/inradius`):**
   - Composite triplet formulation from radial distances $(d_a, d_b, d_c)$ (`DP-RADIAL-TRIPLET-TO-SIDES`).
   - Decomposition of composite triplet into named sides (`DP-DECOMPOSE-SIDES-TRIPLET-*`).
   - Carnot's theorem inradius derivation $r = d_a + d_b + d_c - R$ for acute circumscribed triangles (`DP-RADIAL-SUM-TO-INRADIUS`).

---

## 4. Deterministic Navigator: Search Discipline & Protections

`DeterministicNavigator` (`src/kernel/navigator.ts`) explores the multigraph backward from the target goal. To prevent combinatorial state explosion while preserving all valid mathematical derivation paths, five formal structural protections are enforced:

| Search Protection Mechanism | Problem It Solves |
|---|---|
| **Ancestor Cycle Prevention** | Prevents backward search loops where a rule's requirement is already an ancestor target in the current search call stack. |
| **Inverse Edge Exclusion** | Prevents oscillating ping-pong loops across dual reversible representations (e.g. `side_a` $\leftrightarrow$ `chord_BC` $\leftrightarrow$ `chord_length`). |
| **Trans-Cluster Directionality** | Prohibits cyclical feedback between projection (sides $\to$ radial distances) and reconstruction (radial distances $\to$ triplet $\to$ sides). |
| **Single Producer Rule** | Prohibits combining independent subpaths that derive the exact same intermediate fact through conflicting rules within a single derivation path. |
| **Canonical Topological Step Ordering** | Uses Kahn's topological sort with an alphabetical tie-breaker (`canonicalizePath`) so that independent permutations of prerequisites do not produce redundant duplicate paths. |

---

## 5. Verification Boundaries & Capabilities

The Stand provides strict, well-defined boundaries between different analytical capabilities:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SOLVE (Oracle Mode)                                      │
│    Executes canonical graph discovery, checks preconditions,│
│    selects canonical route, and produces full TraceStep[].  │
├─────────────────────────────────────────────────────────────┤
│ 2. VERIFY_RESULT (Tolerance Verification)                   │
│    Solves target via canonical oracle and compares proposed  │
│    numerical value against ground truth within tolerance.   │
├─────────────────────────────────────────────────────────────┤
│ 3. VERIFY_STEP / STEP (Local Deduction Transition)          │
│    Validates a single rule transition against current facts │
│    and preconditions; advances environment state if valid.  │
├─────────────────────────────────────────────────────────────┤
│ 4. CONSISTENCY CHECK (ConsistencyEngine)                    │
│    Audits proposed or asserted facts across trust boundaries│
│    and detects semantic alias contradictions.               │
└─────────────────────────────────────────────────────────────┘
```

> [!CAUTION]
> **Boundary Discipline:**
> - `VERIFY_RESULT` verifies numerical correctness against canonical truth, NOT whether the agent's internal reasoning was optimal.
> - `ConsistencyEngine` rejects trust boundary collisions and semantic contradictions; it does NOT infer unstated axiomatic premises.

---

## 6. Engineering History (S11 → S12 → Freeze)

1. **Stage S11 (Connected with Semantic Gaps):**
   - The kernel established cross-theorem links, but suffered from semantic gaps between chord representations and named triangle sides.
2. **Stage S12 (Semantic Graph Expansion):**
   - Introduced bidirectional semantic bridges (`DP-MAP-*`), transferred angle diagnostics, composite triplet decomposition, normalized area, and Carnot inradius routes.
3. **Post-S12 (Combinatorial Search Explosion):**
   - The addition of bidirectional bridges and multi-requirement aggregation rules caused unconstrained backward search branching (>700 paths for `perimeter`).
4. **Recovery & Stabilization:**
   - Introduced Ancestor Cycle Prevention, Inverse Edge Exclusion, Single Producer Rule, and Topological Step Canonicalization in `DeterministicNavigator`.
   - Reduced search time to $<30$ ms while retaining 100% of mathematical paths.
5. **Current State:**
   - **Candidate Frozen Baseline** verified by 74 Kernel, 18 Environment, 6 Tool, and 7 Cross-Cluster Audit tests.

---

## 7. Known Limitations

1. **Deterministic Pruning vs. Mathematical Independence:**
   The Navigator explores structural graph connectivity; the count of valid candidate paths reflects distinct rule sequences in the graph, not necessarily algebraically independent proofs.
2. **Equivalent Representations:**
   Some routes differ only by semantic alias conversions (e.g. via `chord_BC` vs direct `side_a`). The raw route count includes these structural alternatives.
3. **Informational Efficiency is NOT Implemented:**
   The Navigator currently selects the shortest path by step count (`a.length - b.length`) with an alphabetical tie-breaker. It does **not** evaluate information entropy, constraint gain, or cognitive economy.
4. **Educational Optimality:**
   The Stand validates mathematical correctness, not pedagogical suitability or explanatory elegance for a specific grade level.
5. **No Synthetic LLM "Proofs":**
   Verification claims must be backed by executed tests in the Stand. LLM claims of validity without Stand confirmation are treated as unverified hypotheses.
6. **Result Agreement $\neq$ Route Independence:**
   Two methods generating the same numerical output (e.g. Heron vs Trigonometric Area) share geometric truth but are separate formal derivation routes.

---

## 8. Future Research (Out of Scope for Current Freeze)

The topic **"Informational Efficiency of Derivation Routes"** is designated as separate, future foundational research. 

Concepts such as:
- `ConstraintGain`
- `InformationEfficiency`
- `RouteScore`
- `RouteFamily` clustering

**MUST NOT** be introduced into the runtime or mathematical kernel of this frozen version. They will be explored in a dedicated research branch after baseline freeze.

