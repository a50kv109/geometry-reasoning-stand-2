# Geometry Reasoning Stand V2

> **«Ученик или агент могут ошибаться. Стенд — никогда.»**  
> *"The agent may be wrong. The stand must not be."*

**Geometry Reasoning Stand V2** is an interactive, deterministic geometry stand for **students**, **teachers**, **researchers**, and **external AI clients**.

It combines a live interactive drawing canvas, step-by-step school textbooks, and a frozen analytical geometry kernel. In addition to its graphical UI, the Stand provides a formal, machine-readable semantic interface that allows AI reasoners and automated scripts to interact with, explore, and verify geometric configurations without hallucinating mathematical truth.

> **Engineering Guarantee:**  
> The Stand does not decide whether an arbitrary mathematical statement is true. It deterministically evaluates the geometric relations and verification rules implemented in its kernel.

---

## 1. Who is it for? (Для кого этот стенд?)

### 👨‍🎓 Students (Ученикам)
- **Geometry through live interaction:** Drag points, lines, and circles freely on the canvas. All dependent constructions recompute dynamically on the fly.
- **Hands-on theorem discovery:** Watch geometric invariants hold in real time (e.g., sliding a vertex along a circle while its inscribed angle remains constant).
- **Clear, transparent feedback:** The Stand does not guess or grade by heuristics; it shows exact measurements, causal dependencies, and verified rules.

### 👩‍🏫 Teachers (Учителям)
- **Interactive digital blackboard:** Pre-configured scenarios for Euclidean geometry (Thales' theorem, inscribed angles, remarkable points, tangents).
- **Dynamic Configuration Passport:** Real-time tables of angles, chord lengths, arc measures, and relations for classroom demonstrations.
- **Strict mathematical consistency:** Impossible to accidentally draw a "false theorem" or misleading diagram — properties are only recognized when their analytical preconditions are satisfied.

### 🤖 AI Clients & Researchers (ИИ-Агентам и исследователям)
- **Deterministic Reasoning Gym:** An isolated, machine-readable API (`src/environment/` and `src/engines/semantic/`) for evaluating geometric problem-solving.
- **Epistemic Isolation:** The agent can explore hypotheses and auxiliary lines in a sandbox without mutating the canonical geometry state.
- **Zero Prompt-Guessing:** Commands return structured JSON with clear separation between constructed entities, derived relations, and formally verified facts.

---

## 2. Walkthrough: The Core Idea in Action (Попробуйте в стенде)

To immediately understand what makes the Stand unique, try this classic scenario:

```
                  C (drag along circle)
                 /| \
                / |  \
               /  |   \
        A ────┼───O───┼──── B (Diameter)
               \     /
                \   /
                 \_/
```

1. **Open the Stand:** The default canvas loads circle $O$, diameter $AB$, and vertex $C$ on the circumference.
2. **Move vertex $C$:** Drag point $C$ smoothly along the semicircle.
3. **Observe the invariant:** Angle $\angle ACB$ remains continuously equal to $90.0^\circ$ at every position.
4. **Check the Configuration Passport:** The relation `THALES_RIGHT_ANGLE` is active with status `VERIFIED` referencing `RULE-THALES-DIAMETER`.
5. **Test the Vanishing Property:** Drag point $C$ away from the circle (into the interior or exterior). The moment $|OC| \ne R$, the Thales relation **instantly vanishes** from the passport without leaving lingering artifacts.

---

## 3. What can it do? (Функциональные возможности)

### 🏫 School Mode (Школьный конструктор)
- **Primitives:** Free points, constrained points on circles, line segments, infinite lines, circles by center and radius.
- **Classical Constructions:** Perpendicular bisectors, angle bisectors, orthogonal tangents (at boundary point and from external point), parallel lines, and altitudes.
- **Dependency Propagation:** Full Directed Acyclic Graph (DAG) recomputing child positions via closed-form analytical formulas.

### 🔬 Research Mode (Исследовательский режим)
- **Parameter Sweeps:** Continuous variations of angles, coordinates, and scales.
- **Dynamic Invariant Detection:** Recording metric constancy across parameter ranges.
- **Epistemic History:** Tracing the exact causal derivation and depth of every entity.

### 🔌 Universal Semantic Interface (20 детерминированных команд)
Uniform API for both human UI actions and external AI clients:
- **Configuration:** `SET_TRIANGLE_ANGLES`, `SET_VERTEX_POSITION`, `MOVE_VERTEX`, `RESET_GEOMETRY`, `CLEAR_USER_CONSTRUCTIONS`.
- **Primitives:** `DRAW_POINT`, `DRAW_SEGMENT`, `DRAW_LINE`, `DRAW_CIRCLE`.
- **Constructions:** `CONSTRUCT_ANGLE_BISECTOR`, `CONSTRUCT_PERPENDICULAR`, `CONSTRUCT_PARALLEL`, `CONSTRUCT_PERPENDICULAR_BISECTOR`, `ERASE_OBJECT`.
- **Queries:** `GET_GEOMETRY_STATE`, `GET_CONFIGURATION`, `GET_RELATIONS`, `GET_MEASUREMENTS`, `GET_VERIFIED_FACTS`.
- **Batch:** `BATCH_SEMANTIC_COMMANDS`.

### 🛡 Verification & Canonical Rules Base
Analytical verification of 7 canonical Euclidean rules (`src/engines/research/canonicalRules.ts`):
1. `RULE_INSCRIBED_ANGLE` ($\alpha = \theta / 2$)
2. `RULE_CYCLIC_CHORD_LAW` ($L = 2R\sin(\theta/2)$)
3. `RULE_THALES_DIAMETER` ($\angle C = 90^\circ \iff AB\text{ is diameter}$)
4. `RULE_ARC_COMPLEMENT_SUM` ($\sum \theta_i = 360^\circ$)
5. `RULE_PERPENDICULAR_BISECTOR` ($|PA| = |PB| \land M \in l$)
6. `RULE_ANGLE_BISECTOR` ($\angle AVL = \angle BVL$)
7. `RULE_TANGENT_RADIUS_ORTHOGONALITY` ($\text{dist}(O, l) = R \land \vec{OT} \perp \vec{d}_l$)

---

## 4. Architecture (Архитектурная схема)

```
        Human User (Web UI)            External AI Client (API)
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   │
                                   ▼
                      Universal Semantic Interface
                     (src/engines/semantic/types.ts)
                                   │
                                   ▼
                       Geometry Construction DAG
              (dependencyRecomputer.ts / constructionCore.ts)
                                   │
                                   ▼
                             GeometryState
                     (Single Source of Truth / SSOT)
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
     Semantic Relations                       Canonical Rules Base
       (S-01, S-02, S-03)                      (canonicalRules.ts)
              │                                         │
              └────────────────────┬────────────────────┘
                                   │
                                   ▼
                        Configuration Passport
                   (Read-Only Semantic Projection)
                                   │
                                   ▼
                       React Presentation Layer
                 (Interactive Canvas, Tables, Panels)
```

---

## 5. Current Implementation Status

| Component | Status | Details |
| :--- | :--- | :--- |
| **Geometry Core & DAG** | `IMPLEMENTED & VERIFIED` | Closed-form analytical propagations, 0 external math libraries |
| **School Canvas & Toolbar** | `IMPLEMENTED & VERIFIED` | Point dragging, construction tools, object inventory |
| **Semantic Interface (20 commands)**| `IMPLEMENTED & VERIFIED` | Complete typed schema, error codes, and invariance tests |
| **Canonical Rules Base (7 rules)** | `IMPLEMENTED & VERIFIED` | Precondition evaluators for Thales, chords, bisectors, tangents |
| **Configuration Passport (S-01..S-03)**| `IMPLEMENTED & VERIFIED` | Read-only projection of relations, constructions, and LaTeX values |
| **Natural Language Adapter** | `IMPLEMENTED & VERIFIED` | Deterministic parsing for common Russian/English geometry phrases |
| **Research Mode Experiments** | `IMPLEMENTED & VERIFIED` | Parameter sweeps and invariant constancy checks |
| **Automated Lemma Discovery** | `PLANNED` | Current version verifies facts against rules; unguided synthesis is planned |
| **3D Solid Geometry (Стереометрия)**| `OUT OF SCOPE` | The Stand is dedicated exclusively to Euclidean 2D planimetry |

*Reference Material Note:* Historical and pedagogical works (such as Andrew Sutton's *Ruler & Compass*) are used strictly as a **reference catalog for construction patterns and benchmark designs**, not as the software product itself.

---

## 6. Quick Start

### Prerequisites
- Node.js $\ge$ 20.x
- npm $\ge$ 10.x

### Installation & Development Run
```bash
git clone https://github.com/your-username/geometry-reasoning-stand.git
cd geometry-reasoning-stand
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 7. Automated Testing & Verification Baseline

The repository includes **21 individual test scripts** defined in `package.json`.  
Running `npm run test:all` executes the **20 main test suites** sequentially:

```bash
# Complete regression test suite (20 suites)
npm run test:all

# Individual key suites:
npm run test:kernel          # 74 autonomous kernel derivation tests
npm run test:env             # 18 agent environment contract tests
npm run test:packet1         # 7 Triangle-Circle & Thales invariant tests
npm run test:packet2         # 7 Fundamentals, Bisectors & Tangent tests
npm run test:agent-semantic  # 16 Semantic Command Interface tests

# Static type check
npm run lint

# Production build
npm run build
```

**Actual Verified Baseline on Current Codebase:**
- `npm run test:all`: **20/20 suites passed (100% PASS)**
- `npm run lint`: **0 errors (clean TypeScript compilation)**
- `npm run build`: **Successful production bundle build (Vite)**

---

## 8. Documentation Index

Comprehensive technical documentation is available in `docs/`:

- [docs/OVERVIEW.md](./docs/OVERVIEW.md) — Mission, target audiences, and feature pillars.
- [docs/SEMANTIC_INTERFACE.md](./docs/SEMANTIC_INTERFACE.md) — 60-second Agent Quickstart, real JSON protocols, and all 20 commands.
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Kernel knowledge graph, Navigator, and consistency engines.
- [docs/GEOMETRY_MODEL.md](./docs/GEOMETRY_MODEL.md) — `GeometryState` structure, Construction DAG, and analytical recomputation.
- [docs/VERIFICATION.md](./docs/VERIFICATION.md) — Epistemic tiers, Vanishing Property, and 7 canonical Euclidean rules.
- [docs/RESEARCH_MODE.md](./docs/RESEARCH_MODE.md) — Parameter sweeps, dynamic experiments, and invariant detection.
- [docs/CONFIGURATION_PASSPORT.md](./docs/CONFIGURATION_PASSPORT.md) — Structure and operation of the read-only passport.
- [docs/TESTING.md](./docs/TESTING.md) — Detailed test registry and validation policies.
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — Developer guidelines for adding tools and canonical rules.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contributing guidelines and architectural rules.
- [SECURITY.md](./SECURITY.md) — Security policy and vulnerability disclosure channels.
- [CHANGELOG.md](./CHANGELOG.md) — Version 2.0.0 release notes.

---

## 9. Version 2 Generation

- **Version 1:** Initial exploratory prototype exploring interactive canvases.
- **Version 2:** An independent, architecturally hardened generation featuring a frozen mathematical core, strict epistemic separation, a 20-command semantic interface, and full test reproducibility.

---

## 10. License

Released under the open-source [MIT License](./LICENSE).  
Copyright (c) 2026 Geometry Reasoning Stand Contributors.
