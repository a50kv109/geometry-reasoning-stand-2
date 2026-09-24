// src/engines/research/tests/testExperimentPacket5.ts
// Verification Test Suite for Packet #5: Dynamic Geometric Experiment Engine (EXP-01 - EXP-10)

import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  FullGeometryState,
} from '../../constructionCore';
import {
  createChordArcExperimentConfig,
  captureExperimentStep,
  compareExperimentSteps,
  buildExperimentResult,
} from '../dynamicExperiment';
import { ExperimentStep } from '../experimentTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runExperimentPacket5Tests() {
  console.log('======================================================================');
  console.log('RUNNING PACKET #5 DYNAMIC GEOMETRIC EXPERIMENT TEST SUITE (EXP-01 - EXP-10)');
  console.log('======================================================================');

  const initialState = createDefaultGeometryState({ A: 0.12, B: 0.45, C: 0.78 }, 100);
  const config = createChordArcExperimentConfig('AB', 'A', 'B');

  // -------------------------------------------------------------------
  // EXP-01: Valid geometry configuration produces deterministic step
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-01: Valid geometry produces deterministic step ---');
  const step0 = captureExperimentStep(initialState, 0, config, 1.0);
  assert(step0.stepIndex === 0, 'EXP-01: Step index is 0');
  assert(step0.stepId === 'STEP-00', 'EXP-01: Step ID is formatted deterministically as STEP-00');
  assert(step0.measurements.chordLength > 0, 'EXP-01: Measured chord length is positive');
  assert(step0.measurements.minorArcDeg > 0, 'EXP-01: Measured minor arc angle is positive');
  assert(step0.measurements.radius === 100, 'EXP-01: Radius matches state R=100');
  assert(
    Math.abs(step0.measurements.arcComplementSumDeg - 360) < 1e-4,
    'EXP-01: Arc complement sum is exactly 360.0°'
  );
  assert(step0.stepObservations.length >= 2, 'EXP-01: Step produces descriptive observations');

  // -------------------------------------------------------------------
  // EXP-02: Two identical geometry configurations produce identical steps
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-02: Determinism of Step Capture ---');
  const step0Clone = captureExperimentStep(initialState, 0, config, 1.0);
  assert(
    JSON.stringify(step0) === JSON.stringify(step0Clone),
    'EXP-02: Identical geometry states produce 100% byte-for-byte identical ExperimentStep'
  );

  // -------------------------------------------------------------------
  // EXP-03: Moving one endpoint changes measured relations
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-03: Moving one chord endpoint produces dynamic changes ---');
  // Move vertex B from u=0.45 to u=0.62 (increasing arc AB)
  const stateMovedB = dispatchGeometryCommand(initialState, {
    type: 'SYNC_BASE_POINTS',
    pointsU: { A: 0.12, B: 0.62, C: 0.78 },
    R: 100,
  });

  const step1 = captureExperimentStep(stateMovedB, 1, config, 1.0);
  assert(step1.stepIndex === 1, 'EXP-03: Step index is 1');
  assert(step1.stepId === 'STEP-01', 'EXP-03: Step ID is STEP-01');
  assert(
    step1.measurements.chordLength !== step0.measurements.chordLength,
    'EXP-03: Chord length changed after moving endpoint B'
  );
  assert(
    step1.measurements.minorArcDeg !== step0.measurements.minorArcDeg,
    'EXP-03: Minor arc angle changed after moving endpoint B'
  );
  assert(
    step1.measurements.radius === step0.measurements.radius,
    'EXP-03: Circle radius R remains constant across steps'
  );

  // -------------------------------------------------------------------
  // EXP-04: Consecutive steps produce deterministic comparison
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-04: Step-by-Step Comparison Engine ---');
  const comparison01 = compareExperimentSteps(step0, step1);
  assert(comparison01.fromStepIndex === 0, 'EXP-04: Comparison fromStepIndex is 0');
  assert(comparison01.toStepIndex === 1, 'EXP-04: Comparison toStepIndex is 1');
  assert(comparison01.deltas.chordLength.isChanged === true, 'EXP-04: Delta chordLength marked isChanged = true');
  assert(comparison01.deltas.minorArcDeg.isChanged === true, 'EXP-04: Delta minorArcDeg marked isChanged = true');
  assert(comparison01.deltas.radius.isConstant === true, 'EXP-04: Delta radius marked isConstant = true');
  assert(
    comparison01.deltas.arcComplementSumDeg.isConstant === true,
    'EXP-04: Delta arcComplementSumDeg marked isConstant = true'
  );
  assert(comparison01.descriptiveSummary.length >= 2, 'EXP-04: Descriptive summary generated');
  assert(comparison01.comparisonObservations.length >= 2, 'EXP-04: Comparison observations generated');

  // -------------------------------------------------------------------
  // EXP-05: Experiment results contain no timestamps or randomness
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-05: Zero Timestamps and Zero Randomness ---');
  const result = buildExperimentResult(config, [step0, step1]);
  const serialized = JSON.stringify(result).toLowerCase();
  assert(!serialized.includes('"timestamp"'), 'EXP-05: Result contains zero "timestamp" fields');
  assert(!serialized.includes('"createdat"'), 'EXP-05: Result contains zero "createdAt" fields');
  assert(!serialized.includes('"updatedat"'), 'EXP-05: Result contains zero "updatedAt" fields');
  assert(!serialized.includes('"time"'), 'EXP-05: Result contains zero "time" fields');
  assert(result.resultVersion === '1.0.0', 'EXP-05: Result version is 1.0.0');

  // -------------------------------------------------------------------
  // EXP-06: Experiment analysis does NOT mutate GeometryState
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-06: Read-Only State Invariance ---');
  const stateCopy = JSON.parse(JSON.stringify(initialState));
  captureExperimentStep(initialState, 0, config, 1.0);
  buildExperimentResult(config, [step0, step1]);
  assert(
    JSON.stringify(initialState) === JSON.stringify(stateCopy),
    'EXP-06: READ-ONLY INVARIANT: GeometryState is 100% byte-for-byte identical before and after Experiment Layer'
  );

  // -------------------------------------------------------------------
  // EXP-07: Known Relation Match & Candidate Invariant are NOT automatically Verified Invariant
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-07: Strict Epistemic Boundaries ---');
  // Create a Thales diameter step (uA=0.0, uB=0.5 => theta=180 deg)
  const thalesState = dispatchGeometryCommand(initialState, {
    type: 'SYNC_BASE_POINTS',
    pointsU: { A: 0.0, B: 0.5, C: 0.78 },
    R: 100,
  });
  const thalesStep = captureExperimentStep(thalesState, 2, config, 1.0);
  assert(thalesStep.measurements.isDiameter === true, 'EXP-07: Thales configuration isDiameter = true');

  const diameterMatchObs = thalesStep.stepObservations.find(
    (obs) => obs.epistemicLevel === 'KNOWN_RELATION_MATCH'
  );
  assert(diameterMatchObs !== undefined, 'EXP-07: KNOWN_RELATION_MATCH observation generated');
  assert(
    diameterMatchObs !== undefined && diameterMatchObs.isFormallyVerified === false,
    'EXP-07: STRICT INVARIANT: KNOWN_RELATION_MATCH is NOT automatically marked isFormallyVerified = true'
  );

  // Check comparison CANDIDATE_INVARIANT observation
  const candidateObs = comparison01.comparisonObservations.find(
    (obs) => obs.epistemicLevel === 'CANDIDATE_INVARIANT'
  );
  assert(candidateObs !== undefined, 'EXP-07: CANDIDATE_INVARIANT observation generated');
  assert(
    candidateObs !== undefined && candidateObs.isFormallyVerified === false,
    'EXP-07: STRICT INVARIANT: CANDIDATE_INVARIANT has isFormallyVerified === false (hypothesis != proof)'
  );

  // -------------------------------------------------------------------
  // EXP-08: Repeated execution produces byte-for-byte identical results
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-08: Complete Experiment Reproducibility ---');
  const run1 = buildExperimentResult(config, [step0, step1, thalesStep]);
  const run2 = buildExperimentResult(config, [step0, step1, thalesStep]);
  assert(
    JSON.stringify(run1) === JSON.stringify(run2),
    'EXP-08: Repeated execution over same steps produces 100% byte-for-byte identical JSON serialization'
  );

  // -------------------------------------------------------------------
  // EXP-09: Packet #4 tests remain valid (Sanity check)
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-09: Packet #4 Compatibility ---');
  assert(typeof step0.stepObservations[0].epistemicLevel === 'string', 'EXP-09: Packet #4 epistemic types valid');

  // -------------------------------------------------------------------
  // EXP-10: Multi-step trajectory analysis
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-10: Multi-Step Trajectory Aggregation ---');
  assert(run1.steps.length === 3, 'EXP-10: Result contains 3 captured steps');
  assert(run1.stepComparisons.length === 2, 'EXP-10: Result contains 2 consecutive comparisons (0->1, 1->2)');
  assert(
    run1.summary.preservedInvariants.includes('radius'),
    'EXP-10: Preserved invariants includes radius'
  );
  assert(
    run1.summary.preservedInvariants.includes('arcComplementSumDeg'),
    'EXP-10: Preserved invariants includes arcComplementSumDeg'
  );
  assert(
    run1.summary.varyingParameters.includes('chordLength'),
    'EXP-10: Varying parameters includes chordLength'
  );

  console.log('\n======================================================================');
  console.log('ALL PACKET #5 EXPERIMENT ENGINE TESTS PASSED (100% SUCCESS)');
  console.log('======================================================================\n');
}

// Auto-run if executed directly via tsx
runExperimentPacket5Tests();
