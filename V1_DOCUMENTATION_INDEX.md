# V1 DOCUMENTATION INDEX — ARCHIVAL REGISTRY
**Comprehensive Catalog of Architecture, Mathematical, Protocol, and Historical Documents in Triangle Stand V1**

> *This document describes the current state of V1 as of the latest audit.*

---

## 1. Document Classification Matrix

| Filename | Category | Purpose | Status | Relevance / Modern Counterpart |
| :--- | :--- | :--- | :--- | :--- |
| `/V1_CURRENT_ARCHITECTURE.md` | CURRENT ARCHITECTURE | Factual technical snapshot of current V1 architecture | **CURRENT** | Primary reference for current V1 implementation |
| `/V1_CURRENT_STATUS_REPORT.md` | CURRENT REPORT | Executive status of all features, tests, and limitations | **CURRENT** | Primary reference for current V1 working state |
| `/CHANGELOG_V1_CURRENT.md` | CURRENT CHANGELOG | Detailed log of recent modifications and bug fixes | **CURRENT** | Reference for recent evolution & hardening |
| `/V1_REFERENCE_PACKAGE.md` | ARCHIVE PACKAGE | Archive manifest and export tiers for external analysis | **CURRENT** | Master packaging manifest |
| `/TRIANGLE_GEOMETRY_GRAPH_REFERENCE.md` | MATHEMATICAL REFERENCE | Reconstructed constructive DAG model and provenance | **CURRENT** | Primary specification of geometric graph |
| `/V2_ARCHITECTURE_FOUNDATION.md` | ARCHITECTURAL DOCUMENT | Constitutional blueprint for next-generation V2 stand | **CURRENT (V2 SPEC)** | Future architecture constitution |
| `/V2_ARCHITECTURE_CHECKLIST.md` | ARCHITECTURAL DOCUMENT | Definition of Done and startup phase order for V2 | **CURRENT (V2 SPEC)** | Future implementation checklist |
| `/V1_TO_V2_MIGRATION_NOTES.md` | ARCHITECTURAL DOCUMENT | Architectural filter: what to preserve and what to discard | **CURRENT (MIGRATION)** | Guidance for V2 project startup |
| `docs/ARCHITECTURE.md` | HISTORICAL ARCHITECTURE | Original multi-packet architecture specification | **HISTORICAL** | Superseded by `V1_CURRENT_ARCHITECTURE.md` |
| `docs/ENVIRONMENT_CONTRACT.md`| PROTOCOL SPECIFICATION | Epistemic isolation and agent-stand environment contract | **CURRENT** | Active specification for agent verification |
| `docs/AGENT_PROTOCOL.md` | PROTOCOL SPECIFICATION | Machine-readable protocol for autonomous agent solvers | **CURRENT** | Active specification for agent interaction |
| `docs/CONFIGURATION_PASSPORT.md`| PGS SPECIFICATION | Specifications for configuration snapshots & passports | **HISTORICAL** | Superseded by canonical PGS-2D (`src/engines/pgs/`) |
| `docs/AAM_GATEWAY.md` | AGENT REFERENCE | Autonomous Agent Manager benchmark and evaluation rules | **CURRENT** | Active benchmark for multi-lingual NLP |
| `docs/SEMANTIC_INTERFACE.md` | AGENT REFERENCE | Semantic command parser and natural language bridge | **CURRENT** | Active specification for SemanticCommandExecutor |
| `docs/RESEARCH_MODE.md` | MATHEMATICAL REFERENCE | Epistemic ladder and dynamic chord-arc experiment model | **CURRENT** | Active specification for Research Mode |
| `docs/TESTING.md` | TEST SPECIFICATION | Master testing guide and CLI verification runner instructions | **CURRENT** | Active verification baseline |
| `docs/VERIFICATION.md` | TEST SPECIFICATION | Invariant proof prerequisites and kernel verification rules | **CURRENT** | Active verification baseline |
| `docs/PACKAGE_01_GEOMETRIC_VOCABULARY.md` | MATHEMATICAL REFERENCE | Packet 1: Basic vertices, chords, circumcircle definitions | **HISTORICAL** | Retained for pedagogical reference |
| `docs/PACKAGE_02_STRUCTURAL_RELATIONS.md` | MATHEMATICAL REFERENCE | Packet 2: Bisectors, altitudes, and perpendicular lines | **HISTORICAL** | Retained for pedagogical reference |
| `docs/PACKAGE_03_GEOMETRIC_PROPERTIES.md` | MATHEMATICAL REFERENCE | Packet 3: Angle sums, chord-arc trigonometry, Thales rule | **HISTORICAL** | Retained for pedagogical reference |
| `docs/PACKAGE_04_SCHOOL_RULES.md` | MATHEMATICAL REFERENCE | Packet 4: Formal school theorem rules and deduction graphs | **HISTORICAL** | Retained for pedagogical reference |
| `docs/PKG_DYN_THALES_INVARIANT.md` | MATHEMATICAL REFERENCE | Dynamic Thales invariant proof specification | **CURRENT** | Active mathematical invariant reference |
| `docs/EDUCATIONAL_KNOWLEDGE_MAP.md` | EDUCATIONAL REFERENCE | Curricular hierarchy and learning progression maps | **CURRENT** | Active educational specification |
| `docs/TRAINING_SCENARIOS.md` | EDUCATIONAL REFERENCE | Student and agent training challenge scenarios | **CURRENT** | Active training scenario reference |
| `docs/DEVELOPMENT.md` | DEVELOPMENT GUIDE | Contributor setup and coding guidelines | **HISTORICAL** | General dev guidelines |
| `docs/RELEASE_V2.md` | LEGACY ROADMAP | Early draft roadmap for version 2.0.0 | **LEGACY** | Superseded by `V2_ARCHITECTURE_FOUNDATION.md` |

---

## 2. Topic Index & Direct Cross-References

### 1. Current Architecture & Status
* `V1_CURRENT_ARCHITECTURE.md`: Subsystem-by-subsystem implementation and known limitations.
* `V1_CURRENT_STATUS_REPORT.md`: Working vs broken vs partial feature status.
* `CHANGELOG_V1_CURRENT.md`: Recent change log and defect resolutions.

### 2. Geometry & Mathematical Graph
* `TRIANGLE_GEOMETRY_GRAPH_REFERENCE.md`: Complete reconstructed constructive DAG, node/edge types, provenance, and recomputation pipeline.
* `src/engines/constructionCore.ts`: Geometric types and pure command reducer.
* `src/engines/dependencyRecomputer.ts`: Dynamic topological propagation engine.
* `src/engines/geometryIntersections.ts`: Analytical Euclidean solvers.

### 3. Dual-Plane & Workspace Architecture
* `src/engines/research/types.ts`: `TriangleResearchSession`, `Plane2WorkspaceState`, `PortableIdentityMapping`.
* `src/engines/research/sessionDispatcher.ts`: Command dispatching, plane isolation, and `FIXED` lifecycle lock.
* `src/engines/tests/twoPlaneSession.test.ts`: 14 behavioral tests proving isolation, rollback, and identity persistence.

### 4. Interchange & PGS-2D
* `src/engines/pgs/types.ts`: Canonical schema for `PGS2DPassport` and `PolygonTopology`.
* `src/engines/pgs/pgsReceiverVerifier.ts`: Autonomous receiver verifier.
* `src/engines/research/pgsPlane2Adapter.ts`: Transactional import/export adapter.
* `src/engines/tests/pgsIntegration.test.ts`: 7 acceptance tests for PGS serialization.

### 5. Overlay Lens & Multi-Layer Rendering
* `src/components/research/PlaneOverlaySlider.tsx`: Presentation mix slider ($mix \in [0, 1]$).
* `src/components/CanvasStage.tsx` (Step 5): Multi-pass canvas rendering with transparency.
* `src/engines/tests/planeOverlay.test.ts`: 22 tests verifying overlay invariants and AI agent parity.

### 6. AI Agent Protocols & Tooling
* `docs/AGENT_PROTOCOL.md`: Protocol contract.
* `src/engines/semantic/types.ts`: `SemanticCommand` schemas.
* `src/engines/semantic/semanticCommandExecutor.ts`: Universal command execution engine.
* `src/engines/tests/testAgentSemanticInterface.ts`: Semantic command test suite.

---

## 3. Known Issues & Architectural Lessons

1. **Monolithic CanvasStage (`CanvasStage.tsx`)**:
   - Status: **WORKING BUT LEGACY**.
   - Issue: 1837 lines combining rendering, hit-testing, and event handling.
   - Recommendation for V2: Decompose into `CanvasRenderer`, `InteractionController`, and layout wrapper.
2. **Implicit Graph Structure**:
   - Status: **WORKING BUT DISTRIBUTED**.
   - Issue: Graph dependencies are reconstructed on-the-fly rather than stored in a dedicated `DAG` structure.
   - Recommendation for V2: First-class `ConstructiveDAG` with explicit `Node` and `Edge` collections.
3. **State Synchronization in `App.tsx`**:
   - Status: **WORKING BUT FRAGILE**.
   - Issue: Geometry state and Research session are synchronized across multiple React state hooks.
   - Recommendation for V2: Single encapsulated `TriangleResearchSession` domain store.
