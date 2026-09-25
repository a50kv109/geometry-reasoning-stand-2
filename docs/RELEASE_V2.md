# Release Notes — Geometry Reasoning Stand V2.1.0

## Summary of Major Capabilities

### 1. Geometry Project Persistence (`GeometryProjectV1`)
- **Deterministic Serialization**: Full preservation of parametric geometry, circumradius $R$, triangle parameters `pointsU`, user construction entities (points, segments, lines, circles), and Construction DAG provenance.
- **Pure Recomputation Boundary**: Derived intersections, angle measurements, verified theorem facts, and Configuration Passports are never saved as static state — they are deterministically recomputed upon project load.
- **Transaction Safety**: Strict rejection principle (`INVALID PROJECT → NO STATE MUTATION`). Projects with invalid JSON, unsupported versions, dangling references, duplicate IDs, or corrupted entities are rejected without altering the active workspace.
- **Living Model Proof**: Loaded projects remain 100% interactive and parametric — moving vertices dynamically recomputes geometric invariants.

### 2. User Interface Integration
- **Project Dropdown Menu**: Accessible directly in the Stand header with:
  - *Save Project (`.json`)* — exports clean human-readable JSON.
  - *Open Project (`.json`)* — restores and recomputes geometry via standard browser File API.
  - *New Project* — resets the workspace to the initial canonical Thales state.
- **Clean Undo Isolation**: Loading a project initializes a fresh undo history stack with the restored state as the base snapshot.

### 3. AI Agent Semantic Protocol Extension
- Added `SAVE_PROJECT` and `LOAD_PROJECT` to the Universal Semantic Tool Interface (`src/engines/semantic/types.ts`).
- External AI clients can serialize an active problem session, transmit the JSON payload, and restore it across agent instances.

### 4. Multilingual Localization (RU / UK / EN)
- Complete localization for all persistence controls, error messages, and project notifications.

---

## Verification & Test Suites

- `test:kernel` — **74/74 (100%)** mathematical kernel tests passing.
- `test:env` — **18/18 (100%)** contract environment tests passing.
- `test:aam` — **20/20 (100%)** AAM Gateway benchmark tests passing.
- `test:project` — **30/30 (100%)** project persistence and transaction safety tests passing.
- `test:all` — **22 test suites** executed and passing.
- `lint` (`tsc --noEmit`) — **0 errors**.
- `build` — Clean production bundle build.

---

## Known Scope & Boundaries
- Schema version 1 is strictly enforced. Future schema migrations (V2+) will follow the formal migration pipeline specified in `docs/GEOMETRY_PROJECT.md`.
- Epistemic temporary hypotheses created inside exploration sandboxes are not part of canonical project persistence.
