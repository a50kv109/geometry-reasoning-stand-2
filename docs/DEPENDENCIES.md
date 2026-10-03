# System Dependencies Reference (`docs/DEPENDENCIES.md`)

This document maps all first-class core subsystems and external dependencies of the Geometry Reasoning Stand 2 (GRS-2) ecosystem.

---

## 1. Subsystem Directory Mapping

| Name | Role | Repository | Version / Commit | Integration Method | License | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Geometry Reasoning Stand V2** | Analytical planimetry verification, Solver, and UI | [geometry-reasoning-stand-2](https://github.com/a50kv109/geometry-reasoning-stand-2) | `2.1.0` / `commit-equivalent 4a1fec4` | Primary Workspace | MIT | **IMPLEMENTED** |
| **ACP-Core** | Frozen deterministic engineering reflex runtime | [acp-core](https://github.com/a50kv109/acp-core) | `1.0.0` / `pinned commit-equiv 4a1fec4` | Interface & Mock Adapter (`ACPInterface`) | MIT | **PREPARED / BLOCKED_BY_DEPENDENCY** (MOCK ACTIVE) |
| **PGS-2D** | Static inter-stand semantic contract passport | [geometry-reasoning-stand-2](https://github.com/a50kv109/geometry-reasoning-stand-2) | Included in GRS-2 core | Direct TypeScript Serialization (`projectStateToPgsPassport`) | MIT | **IMPLEMENTED** |

---

## 2. ACP Integration Boundary

### Real ACP-Core Status
* **Status:** **`BLOCKED_BY_DEPENDENCY`** / **`NOT_CONNECTED`**.
* **Rationale:** GRS-2 is a browser-oriented single-page application built on React/TypeScript. The reference `acp-core` is written in Python (`src/core/reflex.py`). Because direct execution of Python modules within the browser sandbox is not natively supported without a backend server or a WASM-based Python runtime (like Pyodide), GRS-2 establishes a strict interface boundary.
* **Mock Active:** The system uses `ACPMock` (implemented in `src/kernel/geometryGraph/researchPipeline.ts`), which mirrors the exact mathematical mapping of the core Python ReflexEngine rules:
  * High Wear ($\ge 0.8$) or Low Stability ($\le 0.3$) $\implies$ `DEGRADE_TRUST`
  * Peak Wear ($\ge 1.0$) or Zero Stability ($0.0$) $\implies$ `EMERGENCY_STOP`
  * High Effort ($\ge 0.9$) or High Velocity ($\ge 0.9$) $\implies$ `THROTTLE`
  * Default Normal State $\implies$ `MAINTAIN`

---

## 3. PGS-2D Boundary Status
* **Status:** **`IMPLEMENTED`** & **`VERIFIED`**.
* **Integration Method:** Static JSON schema exported from and imported into Plane 2 Workspace. 
* **Design Rule:** PGS-2D is a static semantic transaction boundary, *not* a runtime memory dump of the active internal DAG. This protects GRS-2 from topological pollution across different sandbox workspaces.
