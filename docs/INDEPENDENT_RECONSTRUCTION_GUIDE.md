# Independent Reconstruction Guide (`docs/INDEPENDENT_RECONSTRUCTION_GUIDE.md`)

This guide is designed for **another AI system or human developer** taking over this repository. It explains how to reconstruct, test, run, and understand the active **Geometry Reasoning Stand 2 (GRS-2)** codebase from scratch without relying on any historical conversation logs.

---

## 1. Directory Blueprint

```text
/
├── package.json                         # Node scripts, dependencies, typecheck & build commands
├── vite.config.ts                       # Vite configuration (runs on default port 3000)
├── src/
│   ├── App.tsx                          # Coordinate State management, UI render tabs, presets
│   ├── main.tsx                         # DOM rendering mount
│   ├── environment/                     # GeometryEnvironment API (Observe, Solve, Step)
│   ├── kernel/                          # Mathematical verification layers
│   │   ├── geometryGraph/               # Phase 1 Geometry Core & Phase 2 Pipeline
│   │   │   ├── geometryGraphCore.ts     # Construction, Constraint, and Knowledge Graphs
│   │   │   └── researchPipeline.ts      # Delta, Fingerprint, Comparator, Policy & ACP Adapter
│   │   └── research/                    # Phase 3 Persistence Store, Attention & Surface
│   │       ├── researchFindingStore.ts  # Durable JSONL Database (DRPS)
│   │       ├── researchFindingManager.ts# Lifecycle state transitions & deduplicator
│   │       ├── researchAttention.ts     # Deterministic scoring ranking
│   │       └── researchSurface.ts       # Unified secure read-only presentation facade
│   └── components/                      # Render components
│       └── research/
│           └── ResearchObservationPanel.tsx # UI view rendering tabs, snapshots, and ACP metrics
```

---

## 2. Step-by-Step Reconstruction Path

### Step 1: Clone and Clean Setup
```bash
git clone https://github.com/a50kv109/geometry-reasoning-stand-2.git
cd geometry-reasoning-stand-2

# Install strictly following React 19 rules
npm install --legacy-peer-deps
```

### Step 2: Run Verifications
Run the complete, integrated unit and scenario testing suites directly via Node runtime execution to confirm absolute code readiness:
```bash
npm run test:kernel
```
*Verification Checklist:* Confirm that all 131 tests (including Phase 1, Phase 2, Phase 2.1, Phase 3A, Phase 3B, and Phase 3C) pass with exit code `0`.

### Step 3: Run the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` inside your browser.

### Step 4: Examine the Geometry Core Graph
Open `/src/kernel/geometryGraph/geometryGraphCore.ts`. This module coordinates the active planimetry state. Notice the strict unidirectional flow of coordinates, constraints, and epistemic claims:
* Any coordinate drag (`MOVE_VERTEX`) recalculates constraint states (`SATISFIED` | `VIOLATED`).
* Claim nodes transition from `VERIFIED` to `VANISHED` (or vice versa), demonstrating the **`VALID ⇄ INVALID ⇄ VALID`** topological recovery cycle.

### Step 5: Audit the Research Pipeline & ACP Adapters
Open `/src/kernel/geometryGraph/researchPipeline.ts`. This contains the observational pipeline:
* `StructuralFingerprint` abstracts positional coordinates to coordinate-invariant transitions.
* `ACPAdapter` maps internal metrics (`researchWear`, `stability`) to reflex decisions.
* `ACPMock` evaluates decisions and emits reflex signals: `MAINTAIN` | `THROTTLE` | `DEGRADE_TRUST` | `EMERGENCY_STOP`.

### Step 6: Verify JSONL Persistent Memory (DRPS)
Open `/src/kernel/research/researchFindingStore.ts`. This implements the line-by-line JSONL storage. Look at the `load()` method to see the regex-based validation skipping malformed records.

### Step 7: Explore the Secure Read-Only Surface
Open `/src/kernel/research/researchSurface.ts`. This file exposes only getter methods (`getResearchAttention()`, `viewFinding()`), completely isolating findings from any mutation APIs.

---

## 3. Architecture Invariants
As you continue developing, you must never violate these strict boundaries:
1. **Construction ≠ Constraint ≠ Knowledge:** Physical positions are strictly separated from logic claims. You cannot mutate coordinates by writing to the Knowledge Graph.
2. **VANISHED != DELETE:** Do not delete claims on violation; only transition their status.
3. **Research Surface is strictly Read-Only:** Presentation views must never mutate the finding database or geometry states.
4. **ACP does not solve geometry:** ACP is a reflex decision engine; it never modifies coordinates or constraints.
