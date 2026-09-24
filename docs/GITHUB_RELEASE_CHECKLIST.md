# GitHub Release Checklist

This checklist defines the criteria for the public release of **Geometry Reasoning Stand**.

---

## 1. Repository Content Hygiene

- [x] **Project Metadata**: `package.json`, `index.html`, and `metadata.json` reflect `Geometry Reasoning Stand`.
- [x] **License**: Standard MIT License file `LICENSE` present in root.
- [x] **Instructions for Agents**: `AGENTS.md` provides architectural guidelines.
- [x] **Documentation**: Complete set in `docs/` (`ARCHITECTURE.md`, `ENVIRONMENT_CONTRACT.md`, `AGENT_PROTOCOL.md`, `TRAINING_SCENARIOS.md`, `GITHUB_RELEASE_CHECKLIST.md`).
- [x] **Examples**: `examples/agentQuickstart.ts` runnable without errors.
- [x] **Secret Hygiene**: `.env.example` contains only harmless placeholders; 0 secrets in codebase.
- [x] **Relative Links**: All markdown documentation links are valid relative paths without redirects.

---

## 2. Technical Quality & Tests

- [x] **Typecheck / Lint**: `npm run lint` passes with 0 errors.
- [x] **Production Build**: `npm run build` compiles Vite bundle and server cleanly.
- [x] **Autonomous Kernel Tests**: 8/8 tests pass (`npm run test:kernel`).
- [x] **Environment Contract Tests**: 18/18 tests pass (`npm run test:env`).
- [x] **Agent Quickstart**: Programmatic verification completes cleanly (`npx tsx examples/agentQuickstart.ts`).

---

## 3. Publication Distinction Note

- **Filesystem / Workspace Presence**: All release files are physically created in the project repository workspace.
- **Publication Action**: Initiated via Google AI Studio's "Publish to GitHub" workflow.
