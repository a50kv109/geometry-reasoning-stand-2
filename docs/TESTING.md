# Test Suite & Verification Baseline (TESTING.md)

## 1. Overview & Verification Guarantee

The Stand maintains a strict, automated verification harness. Every test is deterministic, executes without external network dependencies, and validates exact mathematical invariants.

---

## 2. Test Suites & Commands

All scripts are defined in `package.json` and executed via `tsx`:

| Script | Test Target | Description | Verified Count |
| :--- | :--- | :--- | :--- |
| `npm run test:kernel` | `src/kernel/tests/cliTestRunner.ts` | Canonical derivation graph, path solver, and trust boundaries | **74 / 74 PASS (100%)** |
| `npm run test:env` | `src/environment/tests/runEnvironmentContractTests.ts` | External agent environment contract, observation boundary, and isolation | **18 / 18 PASS (100%)** |
| `npm run test:packet1` | `src/engines/tests/testPacket1TriangleCircle.ts` | Triangle-Circle, Chords, Diameters, and Thales right angle invariants | **7 / 7 PASS (100%)** |
| `npm run test:packet2` | `src/engines/tests/testPacket2FundamentalsPerpendiculars.ts` | Perpendicular bisectors, angle bisectors, orthogonal circle tangents | **7 / 7 PASS (100%)** |
| `npm run test:agent-semantic` | `src/engines/tests/testAgentSemanticInterface.ts` | Universal Semantic Command Interface and natural language pipeline | **16 / 16 PASS (100%)** |
| `npm run test:tool` | `src/tools/tests/testVerifyTransition.ts` | Tool state transitions and validation | PASS |
| `npm run test:temporal` | `src/engines/tests/testTemporalObserver.ts` | Temporal observation and history tracking | PASS |
| `npm run test:school` | `src/engines/tests/testSchoolConstruction.ts` | Classical school construction tools | PASS |
| `npm run test:research` | `src/engines/research/tests/testResearchPacket4.ts` | Research mode dynamic experiment execution | PASS |
| `npm run test:experiment` | `src/engines/research/tests/testExperimentPacket5.ts` | Cross-experiment sampling and invariant detection | PASS |
| `npm run test:graph` | `src/engines/research/tests/testResearchGraphPacket6.ts` | Research graph and canonical rule precondition engine | PASS |
| `npm run test:ev01` | `src/presentation/tests/testEducationalFoundationEV01.ts` | Educational presentation foundations | PASS |
| `npm run test:ux01` | `src/engines/tests/testGeometryUndoLayoutUX01.ts` | Undo/redo stack and layout UX | PASS |
| `npm run test:gcm01` | `src/engines/configuration/tests/testConfigurationViewGCM01.ts` | Configuration passport projection | PASS |
| `npm run test:parallel-preview` | `src/engines/tests/testParallelPreviewUX.ts` | Dynamic preview of parallel constructions | PASS |
| `npm run test:parametric` | `src/engines/tests/testParametricDynamicPerpendicular.ts` | Parametric perpendicular line solver | PASS |
| `npm run test:bisector` | `src/engines/tests/testParametricDynamicBisector.ts` | Parametric angle bisector solver | PASS |
| `npm run test:s03` | `src/engines/configuration/tests/testSemanticQuantityS03.ts` | S-03 semantic quantities and LaTeX mapping | PASS |
| `npm run test:s01s02` | `src/engines/configuration/tests/testSemanticAdapterS01S02.ts` | S-01 relations and S-02 construction adapter | PASS |
| `npm run test:angle-input` | `src/engines/tests/testParametricAngleInput.ts` | Direct angle input and solver stabilization | PASS |
| **`npm run test:all`** | **All 20 test suites combined** | **Complete regression test suite** | **20 / 20 PASS (100%)** |

---

## 3. Running Verification Locally

```bash
# Run the complete test suite
npm run test:all

# Run TypeScript static type checking
npm run lint

# Verify production bundle compilation
npm run build
```

---

## 4. Verification Policy for Pull Requests

No pull request may be merged if any of the following occur:
1. Any test in `test:all` fails or times out.
2. `npm run lint` reports any type errors.
3. `npm run build` fails to produce an optimized production bundle.
4. An exploratory feature mutates the canonical knowledge graph (`CANONICAL_GRAPH`).
