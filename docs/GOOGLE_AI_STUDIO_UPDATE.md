# Google AI Studio Update & Synchronization Guide

This document outlines the architectural invariants, file manifests, and verification procedures for synchronizing the **Geometry Reasoning Stand V2** inside Google AI Studio.

---

## 1. Architectural Invariants to Preserve

1. **"One Geometry, Many Clients"**:
   - `src/engines/` and `src/kernel/` are the sole mathematical source of truth.
   - The React UI (`src/App.tsx`, `src/components/`) and AI interfaces (`src/engines/semantic/`) are clients over this single kernel.
   - No separate parallel state or divergent math solvers are permitted.

2. **Epistemic Isolation**:
   - Unverified student or agent proposals must never mutate canonical truth.
   - Failed verification attempts or invalid project loading must leave the environment state 100% unaltered (`INVALID PROJECT → NO STATE MUTATION`).

3. **Pure Serialization Boundary**:
   - `GeometryProject` persists only the pure SSOT entities (`GeometryState`) and Construction DAG provenance.
   - Derived values (intersections, verified facts, configuration passports) are strictly recomputed deterministically upon load.

---

## 2. File Manifest for this Update

### Core Persistence Engine
- `src/engines/project/types.ts` — GeometryProject schema, metadata, error types.
- `src/engines/project/projectSerializer.ts` — Serializer, deserializer, and validator.
- `src/engines/project/index.ts` — Public export barrel.

### Engine & DAG Recomputation
- `src/engines/dependencyRecomputer.ts` — Restores dependent entities and re-links Construction DAGs.
- `src/engines/semantic/types.ts` — Adds `SAVE_PROJECT` and `LOAD_PROJECT` semantic commands.
- `src/engines/semantic/semanticCommandExecutor.ts` — Handles execution of persistence commands.

### User Interface & Localization
- `src/components/project/ProjectMenu.tsx` — Save, Open, Export, Import, New Project UI dropdown.
- `src/App.tsx` — Mounts ProjectMenu, handles clean workspace restoration.
- `src/i18n/ru.ts`, `src/i18n/uk.ts`, `src/i18n/en.ts` — Multi-language translations.

### Test Suites
- `src/engines/tests/testGeometryProjectSerialization.ts` — 30 regression and round-trip invariance tests.

### Documentation
- `docs/GEOMETRY_PROJECT.md` — Formal technical specification of persistence model.
- `docs/RELEASE_V2.md` — Release notes for V2.1.0.
- `docs/GITHUB_UPDATE.md` — GitHub release checklist.
- `docs/GOOGLE_AI_STUDIO_UPDATE.md` — Google AI Studio synchronization guide.

---

## 3. Mandatory Verification Checklist

Before finalizing any AI Studio session:

```bash
# Verify 100% pass across all test suites
npm run test:all

# Verify 0 TypeScript errors
npm run lint

# Verify successful bundle compilation
npm run build
```
