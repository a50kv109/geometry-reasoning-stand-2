# Contributing to Geometry Reasoning Stand V2

Thank you for your interest in contributing to **Geometry Reasoning Stand V2**.

The Stand is an interactive geometry environment and deterministic reasoning testbed for students, teachers, and autonomous AI agents. To preserve mathematical rigor, all contributions must strictly adhere to the rules below.

---

## 1. Core Architectural Protections (Non-Negotiable)

1. **The Frozen Baseline Rule:** The core mathematical kernel (`src/kernel/`, `src/engines/constructionCore.ts`) is frozen.
   - **Never modify the mathematical kernel or analytical formulas to "help" a specific unit test or UI feature pass.**
   - If an edge case fails, the issue must be resolved by fixing construction parameters or refining preconditions in canonical rules, never by adding ad-hoc calculation hacks.
2. **No Parallel Geometry State:**
   - **New semantic relations and constructions must always be implemented as derived or verified semantics over the existing `GeometryState`.**
   - Never create parallel coordinate stores, shadow caches, or secondary state machines in React hooks, components, or auxiliary modules.
3. **The Vanishing Property:**
   - Derived relations (`TANGENT_TO`, `PERPENDICULAR_BISECTOR_OF`, `INSCRIBED_IN`, `THALES_RIGHT_ANGLE`, etc.) are computed dynamically on the fly.
   - When any precondition is violated by dragging a point or changing a parameter, the relation must immediately evaporate without leaving lingering flags.
4. **Epistemic Isolation:**
   - Exploratory hypotheses by students or AI agents must run inside isolated sandboxes (`ExplorationRunner`).
   - Failed or unverified operations must leave `GeometryState` completely unaltered (`stateChanged: false`).

---

## 2. Development Workflow

### Prerequisites
- Node.js v20.x or higher
- npm v10.x or higher

### Local Setup
```bash
git clone https://github.com/a50kv109/geometry-reasoning-stand-2.git
cd geometry-reasoning-stand-2
npm install
```

### Running Locally
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 3. Mandatory Verification Baseline

Before opening a pull request, you MUST run and pass all test suites, type checking, and production builds:

```bash
# 1. Type check (strict TypeScript)
npm run lint

# 2. Kernel derivation suite (74 tests)
npm run test:kernel

# 3. Agent environment contract suite (18 tests)
npm run test:env

# 4. Packet 1: Triangle-Circle & Thales suite (7 tests)
npm run test:packet1

# 5. Packet 2: Fundamentals & Perpendiculars suite (7 tests)
npm run test:packet2

# 6. Universal Semantic Command Interface suite (16 tests)
npm run test:agent-semantic

# 7. Complete regression suite (all 20 suites)
npm run test:all

# 8. Production bundle build
npm run build
```

---

## 4. Code Standards & Git Hygiene

- **TypeScript:** Strict mode enabled (`noImplicitAny: true`). Explicit parameter and return types for all public exports.
- **Determinism:** Zero non-deterministic operations (`Math.random()`, `Date.now()`, timestamps) in kernel, semantic, and verification modules.
- **No Artifacts:** Never commit `.env`, build output (`dist/`), temporary logs, or editor settings.
