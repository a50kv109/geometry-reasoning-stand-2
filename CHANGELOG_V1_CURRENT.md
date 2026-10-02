# CHANGELOG V1 CURRENT — HISTORICAL EVOLUTION & AUDIT RECORD
**Chronological Log of Modifications, Fixes, and Architectural Hardening in Triangle Stand V1**

---

## 1. Context & Scope

This document captures the real, verified change history of the **Triangle Geometry Reasoning Stand V1** ("Треугольник в кругу") leading up to its final frozen reference state.

---

## 2. Detailed Change Records

### Change 1: Dual-Plane Architecture & Research Session Integration
* **Date / Phase**: Phase 4–5 Hardening
* **Files Affected**:
  - `src/engines/research/types.ts`
  - `src/engines/research/sessionDispatcher.ts`
  - `src/engines/research/planeClone.ts`
  - `src/App.tsx`
* **Modules**: Research Engine, Session Dispatcher, Application Root
* **What Changed**:
  - Introduced `TriangleResearchSession` state holding `{ plane1, plane2, activePlane, plane2Lifecycle, overlay }`.
  - Implemented `dispatchSessionCommand` to route geometry mutations strictly to the active plane.
  - Implemented deep cloning of Plane 1 into Plane 2 (`clonePlane1ToPlane2`).
  - Added lifecycle state machine for Plane 2 (`BUILDING` vs `FIXED`).
* **Why Changed / Defect Fixed**:
  - Previously, all user actions directly mutated a single global `geometryState`. There was no way for an AI agent or student to experiment with hypotheses in a sandbox without destroying the authoritative ground truth.
* **Current Status**: **VERIFIED**
* **Test Verification**: Covered by `src/engines/tests/twoPlaneSession.test.ts` (Tests 1–5).
* **Architectural Impact**: Fundamental separation of SSOT Ground Truth (Plane 1) from Experimental Sandbox (Plane 2).
* **User Behavior Impact**: User/Agent can switch active planes, clone Plane 1 to Plane 2, and lock Plane 2 with the `FIXED` toggle.

---

### Change 2: Lossless PGS-2D Serialization & Autonomous Receiver Verifier
* **Date / Phase**: Phase 5 PGS Integration
* **Files Affected**:
  - `src/engines/pgs/types.ts`
  - `src/engines/pgs/pgsJsonCodec.ts`
  - `src/engines/pgs/pgsValidator.ts`
  - `src/engines/pgs/pgsReceiverVerifier.ts`
  - `src/engines/pgs/pgsProjector.ts`
  - `src/engines/research/pgsPlane2Adapter.ts`
* **Modules**: PGS Interchange Layer, Plane 2 Adapter
* **What Changed**:
  - Defined canonical schema `PGS2DPassport` (`v1.0.0`, `transferMode: "EXACT_STATE"`).
  - Built autonomous `verifyPgsPassportAsReceiver` checking boundary polygon topology, cyclic vertex order, edge closure, and circumcircle consistency.
  - Implemented `identityRegistry` on `Plane2WorkspaceState` preserving `portableId` across round-trips.
  - Built transactional rollback: invalid or refuted passports leave existing session memory 100% unmutated.
* **Why Changed / Defect Fixed**:
  - External geometry exchanges previously risked corrupting live state when invalid JSON or non-triangle configurations (e.g. quadrilaterals) were imported. Also, local object renames stripped global semantic identifiers.
* **Current Status**: **VERIFIED**
* **Test Verification**: Covered by `src/engines/tests/pgsIntegration.test.ts` (7 tests) and `src/engines/tests/twoPlaneSession.test.ts` (Tests 6–14).
* **Architectural Impact**: Established external semantic contract separation from internal computation engine.
* **User Behavior Impact**: UI buttons for PGS import/export on Plane 2 with visual verification badges and error alerts on invalid data.

---

### Change 3: The Overlay Lens & CanvasStage Multi-Layer Rendering Fix
* **Date / Phase**: Phase 6 Overlay Integration
* **Files Affected**:
  - `src/components/research/PlaneOverlaySlider.tsx`
  - `src/components/CanvasStage.tsx`
  - `src/engines/research/sessionDispatcher.ts`
  - `src/App.tsx`
* **Modules**: Presentation Layer, Canvas Rendering Engine
* **What Changed**:
  - Added `PlaneOverlayState` with `{ enabled: boolean, mix: number }` ($mix \in [0, 1]$).
  - Extended `CanvasStage` props to receive `overlayEnabled`, `overlayMix`, `overlayPlane1State`, and `overlayPlane2State`.
  - In `CanvasStage.tsx` (Step 5), implemented dual-pass rendering calling `renderGeometryState(ctx, overlayPlane1State, 1 - overlayMix)` and `renderGeometryState(ctx, overlayPlane2State, overlayMix)`.
* **Why Changed / Defect Fixed**:
  - **The Incident**: UI slider existed, but canvas only rendered Plane 1 because `CanvasStage` was historically locked to a single set of `pointsU` props.
  - **The Syntax Defect**: A premature closing bracket was initially pasted into `useEffect` during refactoring, breaking the build. This was cleanly resolved by properly scoping `renderGeometryState` helper and branching inside Step 5.
* **Current Status**: **VERIFIED**
* **Test Verification**: Covered by `src/engines/tests/planeOverlay.test.ts` (Tests 1–9).
* **Architectural Impact**: Proved the necessity of an explicit multi-layer rendering pipeline.
* **User Behavior Impact**: Visual optical comparison slider smoothly blends Plane 1 and Plane 2 with transparency at 60 FPS without mutating geometry.

---

### Change 4: AI Agent Semantic Toolbox & Command Parity
* **Date / Phase**: Phase 6 Agent Parity
* **Files Affected**:
  - `src/engines/semantic/types.ts`
  - `src/engines/semantic/semanticCommandExecutor.ts`
  - `src/engines/research/sessionDispatcher.ts`
* **Modules**: Semantic Command Layer, Agent Tooling
* **What Changed**:
  - Implemented command handlers for `ADD_POINT`, `ADD_SEGMENT`, `ADD_LINE`, `ADD_CIRCLE`, `MOVE_POINT`, `ERASE_OBJECT`, `SYNC_BASE_POINTS`, and `SET_TRIANGLE_ANGLES`.
  - Added programmatic methods for Plane selection, Plane cloning, Plane 2 lifecycle toggling, Overlay enabling, and Overlay mix adjustment.
  - Ensured Agent commands strictly trigger the same validation and isolation logic as UI events.
* **Why Changed / Defect Fixed**:
  - Prevented divergent calculation paths between Human UI and AI Agent ("One Geometry, Many Clients").
* **Current Status**: **VERIFIED**
* **Test Verification**: Covered by `src/engines/tests/planeOverlay.test.ts` (Tests A–M) and `src/engines/tests/testAgentSemanticInterface.ts`.
* **Architectural Impact**: Verified complete client parity over the same mathematical kernel.
* **User Behavior Impact**: Agent can autonomously inspect, clone, mutate, verify, and compare planes via typed RPC commands.

---

### Change 5: Research Scientific Observation & Dynamic Experiment Engine
* **Date / Phase**: Phase 4–6 Research Layer
* **Files Affected**:
  - `src/engines/research/researchTypes.ts`
  - `src/engines/research/derivedRelations.ts`
  - `src/engines/research/observationModel.ts`
  - `src/engines/research/dynamicExperiment.ts`
  - `src/engines/research/crossExperimentAnalyzer.ts`
  - `src/engines/research/researchGraph.ts`
* **Modules**: Research Engine, Epistemic Pipeline
* **What Changed**:
  - Implemented 6-level epistemic ladder (`MEASUREMENT` $\to$ `FACT` $\to$ `OBSERVATION` $\to$ `CANDIDATE_INVARIANT` $\to$ `KNOWN_RELATION_MATCH` $\to$ `VERIFIED_INVARIANT`).
  - Derived dynamic chord-arc relations ($c = 2R \sin(\theta/2)$) and complementary arc partitions ($\theta_{\min} + \theta_{\maj} = 360^\circ$).
  - Enforced rule: Known relation match (e.g. Thales configuration) is **NOT** automatically a verified invariant until analytical preconditions are evaluated.
* **Why Changed / Defect Fixed**:
  - Replaced ad-hoc UI text descriptions with formal epistemic classification.
* **Current Status**: **VERIFIED**
* **Test Verification**: Covered by `src/engines/research/tests/testResearchPacket4.ts`, `testExperimentPacket5.ts`, and `testResearchGraphPacket6.ts`.
* **Architectural Impact**: Epistemic isolation between empirical observation and formal kernel proof.
* **User Behavior Impact**: Research Panel displays structured observations, hypothesis confidence, and verification proofs.
