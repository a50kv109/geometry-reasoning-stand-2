# AI Coding Agent Guidelines — Geometry Reasoning Stand

This document establishes non-negotiable architectural and engineering rules for AI coding agents modifying or extending this repository.

---

## 1. Project Purpose & Scope

The **Geometry Reasoning Stand** is a deterministic verification environment for geometric reasoning.
- **Principle**: *"The agent may be wrong. The stand must not be."*
- Mathematical truth is deterministic and provable via analytical geometry and formal theorems.
- Avoid introducing probabilistic AI logic, heuristic approximations, or LLM-based solvers into the core mathematical kernel.

---

## 2. Architectural Invariants

### "One Geometry, Many Clients"
- The mathematical kernel (`src/kernel/`) and environment facade (`src/environment/`) are the **sole source of geometric truth**.
- The React UI (`src/App.tsx`, `src/components/`, `src/lessons/`) is merely an interactive visual client.
- The Agent interface (`src/environment/`) is a machine-readable client over the same kernel.
- **Rule**: Never duplicate mathematical formulas or create divergent calculation paths between UI and environment.

### Purity of the Kernel
- `src/kernel/canonicalPaths.ts` and `src/kernel/navigator.ts` must remain pure functions and deterministic classes.
- Zero network I/O, asynchronous side effects, or external API calls inside the kernel.
- New theorems must be formally added as `DerivationPath` entries with strict `requires`, `provides`, and `precondition` closures.

### Epistemic Isolation
- Unverified student or agent proposals must never mutate `CANONICAL_GRAPH`.
- Exploratory hypotheses must be executed strictly within `ExplorationRunner` sandboxes.
- Failed verification attempts must leave the environment state 100% unaltered.

---

## 3. Mandatory Verification Baseline

Before completing any task or claiming success, you MUST execute and pass all test suites:

```bash
# 1. Kernel Tests (8/8)
npm run test:kernel

# 2. Environment Contract Tests (18/18)
npm run test:env

# 3. Full Test Suite
npm run test:all

# 4. Typecheck
npm run lint

# 5. Production Build
npm run build
```

---

## 4. Documentation & Hygiene

- All documentation in `docs/` must use relative Markdown links without URL redirects.
- Never hardcode secrets or credentials into `.env.example` or code.
- Maintain strict typing throughout TypeScript files (`noImplicitAny`, proper return types).
