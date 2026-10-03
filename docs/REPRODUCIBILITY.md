# Reproducibility Guide (`docs/REPRODUCIBILITY.md`)

This document establishes the exact, repeatable procedures to install, typecheck, test, build, and verify **Geometry Reasoning Stand 2 (GRS-2)** from a fresh clone.

---

## 1. Prerequisites
Ensure your local host machine satisfies the following hardware and runtime software baselines:
* **Operating System:** Linux (Ubuntu 20.04+ recommended), macOS, or Windows WSL2.
* **Node.js:** version $\ge 22.x$ (LTS recommended).
* **Package Manager:** `npm` ($\ge 10.x$) or `bun` ($\ge 1.1.x$). 

---

## 2. Recommended Installation Workflows

### Path A: Canonical npm Workflow (Recommended)
This is the standard, most deterministic installation pathway:
```bash
# Clean clone
git clone https://github.com/a50kv109/geometry-reasoning-stand-2.git
cd geometry-reasoning-stand-2

# Install dependencies (strictly ignoring peer-dep pressure if any React 19 issues arise)
npm install --legacy-peer-deps
```

### Path B: High-Performance bun Workflow
If you prefer extremely fast package resolutions:
```bash
# Clean clone
git clone https://github.com/a50kv109/geometry-reasoning-stand-2.git
cd geometry-reasoning-stand-2

# Install via bun using the pre-existing bun.lock
bun install
```

---

## 3. Strict Verification Pipeline

Execute the following sequential commands to ensure 100% integrity of the cloned repository:

### Step 1: Static Typecheck & Linting
Verify there are no syntax or typing issues across the TypeScript modules:
```bash
npm run lint
```
*Expected output:* `tsc --noEmit` exits with status `0` and zero errors.

### Step 2: Autonomous Kernel & Integration Tests
Execute the complete integrated test matrix, verifying geometric invariants, research pipelines, JSONL store resilience, attention policies, and surface interfaces:
```bash
npm run test:kernel
```
*Expected output:* All 131 test scenarios pass cleanly with exit code `0`.

### Step 3: Global Regression Suite
Run all pre-existing engine, persistence, AAM language gateway, and UX validation tests:
```bash
npm run test:all
```
*Expected output:* All 22 test suites (containing 100+ assertions) execute and return successfully.

### Step 4: Production Compiling
Verify that Vite can build a fully optimized production bundle:
```bash
npm run build
```
*Expected output:* Vite builds the optimized production assets inside `/dist` successfully.

---

## 4. Local Execution

### Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` (or the port specified in terminal) in your browser.

### Verify Research Mode in Browser
1. Click the **`🔬 Исследование`** button in the header bar.
2. Confirm the workspace splits into the double-plane layout (Plane 1 and Plane 2 Workspace).
3. Drag any vertex ($A, B, C$) on the canvas.
4. Click on the **`Находки и статус ACP`** tab inside the Research Observation Panel on the right.
5. Verify that the Top-5 active findings display correctly and that the ACP Mock decision reflex engine shows the correct signals.

---

## 5. Troubleshooting
* **`esbuild` or `vite` binary missing:**
  If you see "vite: not found" or compile errors related to esbuild binary paths, clear your cache and run a clean install:
  ```bash
  rm -rf node_modules
  npm cache clean --force
  npm install --legacy-peer-deps
  ```
* **JSONL Store File Write Permissions:**
  The `research_findings.jsonl` database requires file write permissions on the directory. In browser sandboxes, file writing is safely bypassed to use local in-memory fallback.
