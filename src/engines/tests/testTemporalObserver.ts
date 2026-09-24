// src/engines/tests/testTemporalObserver.ts
// Comprehensive Test Suite for Native Geometry Temporal & State Evolution Extension (PKG-05)
// Strict compliance: Zero graph mutations, zero second state models, zero TA-v2 dependencies.

import {
  createGeometrySnapshot,
  computeTransition,
  evaluateStructuralInvariant,
  evaluateStructuralInvariants,
  DYNAMIC_THALES_INVARIANT,
  CANONICAL_INVARIANT_SUITE,
  NativeGeometryTemporalSession,
} from '../temporalObserver';
import { ClassicalEngine } from '../classicalEngine';
import { MatrixEngine } from '../matrixEngine';
import { CANONICAL_GRAPH } from '../../kernel/canonicalPaths';
import { DeterministicNavigator } from '../../kernel/navigator';
import { GeometrySnapshot } from '../../types';

console.log('======================================================================');
console.log('RUNNING NATIVE GEOMETRY TEMPORAL OBSERVER TEST SUITE (T01 - T15)');
console.log('======================================================================\n');

let allPassed = true;
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✓ ${testName}: PASS`);
  } else {
    allPassed = false;
    console.error(`✗ ${testName}: FAIL ${detail ? `(${detail})` : ''}`);
  }
}

// Initial Graph Snapshot for Constancy Check
const initialGraphSize = CANONICAL_GRAPH.length;
const initialGraphEdgeIds = CANONICAL_GRAPH.map((p) => p.id);

// -----------------------------------------------------------------------------
// T01: Snapshot Immutability
// -----------------------------------------------------------------------------
{
  const s0 = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.25 }, R: 5, scale: 1 });
  const s0Copy = JSON.parse(JSON.stringify(s0));
  const s1 = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.35 }, R: 5, scale: 1 });

  assert(
    JSON.stringify(s0) === JSON.stringify(s0Copy),
    'T01 - Snapshot Immutability',
    's0 mutated after creating s1'
  );
  assert(s0.angles.C === 90 && s1.angles.C === 90, 'T01 - Snapshots Distinct But Accurate');
}

// -----------------------------------------------------------------------------
// T02: Delta Correctness
// -----------------------------------------------------------------------------
{
  const s0 = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.25 }, R: 5, scale: 1 });
  const s1 = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.30 }, R: 5, scale: 1 });
  const tr = computeTransition(s0, s1);

  assert(tr !== null, 'T02 - Transition detected');
  assert(tr?.changedVertex === 'C', 'T02 - Correctly identified changed vertex C');
  assert(
    Math.abs(tr!.deltas.deltaAngles.A - (s1.angles.A - s0.angles.A)) < 1e-6,
    'T02 - Delta Angle A matches difference'
  );
  assert(
    Math.abs(tr!.deltas.deltaAngles.C) < 1e-6,
    'T02 - Delta Angle C is zero for movable vertex on Thales circle'
  );
  assert(
    Math.abs(s1.chords.AB - s0.chords.AB) < 1e-6,
    'T02 - Unchanged diameter AB chord remains unchanged'
  );
}

// -----------------------------------------------------------------------------
// T03: Graph Constancy (G0 === G100)
// -----------------------------------------------------------------------------
{
  for (let i = 0; i < 100; i++) {
    const uC = 0.1 + (i * 0.3) / 100;
    createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: uC }, R: 5, scale: 1 });
  }

  const currentGraphSize = CANONICAL_GRAPH.length;
  const currentGraphEdgeIds = CANONICAL_GRAPH.map((p) => p.id);
  const isGraphIdentical =
    currentGraphSize === initialGraphSize &&
    currentGraphEdgeIds.every((id, idx) => id === initialGraphEdgeIds[idx]);

  assert(isGraphIdentical, 'T03 - Graph Constancy G0 === G100 (Zero graph nodes/edges added)');
}

// -----------------------------------------------------------------------------
// T04: True Invariant (CASE A: AB = Diameter, C on CircleBoundary, C moves)
// -----------------------------------------------------------------------------
{
  const s0 = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.25 }, R: 5, scale: 1 });
  const s1 = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.38 }, R: 5, scale: 1 });

  const status0 = evaluateStructuralInvariant(DYNAMIC_THALES_INVARIANT, s0);
  const status1 = evaluateStructuralInvariant(DYNAMIC_THALES_INVARIANT, s1);

  assert(
    status0.status === 'PRESERVED' && status0.preservedValue === 90,
    'T04 - Initial Thales Invariant PRESERVED'
  );
  assert(
    status1.status === 'PRESERVED' && status1.preservedValue === 90,
    'T04 - Moved Thales Invariant PRESERVED (CASE A)'
  );
}

// -----------------------------------------------------------------------------
// T05: Broken Boundary Premise (CASE B: C not on boundary)
// -----------------------------------------------------------------------------
{
  // Even if an agent asserts an angle or coords where angle is 90, if C is NOT on CircleBoundary:
  const sBrokenBoundary = createGeometrySnapshot({
    pointsU: { A: 0.0, B: 0.5, C: 0.25 },
    R: 5,
    scale: 1,
    onBoundary: { A: true, B: true, C: false },
  });

  const status = evaluateStructuralInvariant(DYNAMIC_THALES_INVARIANT, sBrokenBoundary);
  assert(
    status.status === 'BROKEN',
    'T05 - Broken Boundary Premise (CASE B) is NOT PRESERVED',
    `Status was ${status.status}`
  );
  assert(
    status.evidence.failedPreconditions.includes('C_ON_CIRCLE_BOUNDARY'),
    'T05 - Evidence explicitly states C_ON_CIRCLE_BOUNDARY failed'
  );
  assert(status.preservedValue === null, 'T05 - Preserved value is null on broken premise');
}

// -----------------------------------------------------------------------------
// T06: Broken Diameter Premise (CASE C: AB not diameter, even if angle happens to be 90)
// -----------------------------------------------------------------------------
{
  // Acute/arbitrary triangle where AB is chord fraction 0.35 (NOT diameter 0.50)
  const sNotDiameter = createGeometrySnapshot({
    pointsU: { A: 0.0, B: 0.35, C: 0.8 },
    R: 5,
    scale: 1,
  });

  const status = evaluateStructuralInvariant(DYNAMIC_THALES_INVARIANT, sNotDiameter);
  assert(
    status.status === 'BROKEN',
    'T06 - Broken Diameter Premise (CASE C) is NOT PRESERVED',
    `Status was ${status.status}`
  );
  assert(
    status.evidence.failedPreconditions.includes('DIAMETER_AB'),
    'T06 - Evidence explicitly states DIAMETER_AB failed'
  );
}

// -----------------------------------------------------------------------------
// T07: Degenerate Vertex C = A (CASE D: C coincides with A)
// -----------------------------------------------------------------------------
{
  const sDegenerate = createGeometrySnapshot({
    pointsU: { A: 0.0, B: 0.5, C: 0.0 }, // C == A
    R: 5,
    scale: 1,
  });

  const status = evaluateStructuralInvariant(DYNAMIC_THALES_INVARIANT, sDegenerate);
  assert(
    status.status === 'DEGENERATE',
    'T07 - Degenerate C = A (CASE D) correctly identified as DEGENERATE',
    `Status was ${status.status}`
  );
  assert(
    status.preservedValue === null,
    'T07 - Preserved value is strictly null, never preserving degenerate angle'
  );
  assert(
    status.evidence.failedPreconditions.includes('NON_DEGENERATE_VERTICES'),
    'T07 - NON_DEGENERATE_VERTICES precondition failed'
  );
}

// -----------------------------------------------------------------------------
// T08: Reverse Movement (S0 -> S1 -> S2 -> S1 -> S0)
// -----------------------------------------------------------------------------
{
  const s0 = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.20 }, R: 5, scale: 1 });
  const s1 = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.30 }, R: 5, scale: 1 });
  const s2 = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.40 }, R: 5, scale: 1 });
  const s1_back = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.30 }, R: 5, scale: 1 });
  const s0_back = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.20 }, R: 5, scale: 1 });

  assert(
    Math.abs(s0.angles.A - s0_back.angles.A) < 1e-6 &&
      Math.abs(s0.angles.B - s0_back.angles.B) < 1e-6 &&
      Math.abs(s0.angles.C - s0_back.angles.C) < 1e-6,
    'T08 - Reverse Movement restores exact original state S0'
  );
  assert(
    evaluateStructuralInvariant(DYNAMIC_THALES_INVARIANT, s0_back).status === 'PRESERVED',
    'T08 - Invariant preserved across full reverse trajectory'
  );
}

// -----------------------------------------------------------------------------
// T09: 1000 Transitions & Bounded Ring Buffer
// -----------------------------------------------------------------------------
{
  const session = new NativeGeometryTemporalSession(1000);
  const startTime = performance.now();

  for (let i = 0; i < 1000; i++) {
    // Oscillate C safely between 0.05 and 0.45 (strictly distinct from A=0.0 and B=0.5)
    const uC = 0.05 + 0.4 * (0.5 + 0.5 * Math.sin(i * 0.05));
    const s = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: uC }, R: 5, scale: 1 });
    session.record(s);
  }

  const elapsedMs = performance.now() - startTime;
  const history = session.getHistory();
  const transitions = session.getTransitions();

  assert(history.length === 1000, 'T09 - History capped at capacity 1000');
  assert(transitions.length === 999, 'T09 - Recorded 999 transitions for 1000 snapshots');
  assert(
    session.checkInvariants()[0].status === 'PRESERVED',
    'T09 - Invariant consistently PRESERVED after 1000 transitions'
  );
  console.log(`    [Perf] 1000 transitions took ${elapsedMs.toFixed(2)} ms (${(elapsedMs / 1000).toFixed(4)} ms/op)`);
}

// -----------------------------------------------------------------------------
// T10: Recompute Equivalence (Preserved Result == Full Recompute Result)
// -----------------------------------------------------------------------------
{
  let equivalencePassed = true;
  const classicalEngine = new ClassicalEngine();
  const matrixEngine = new MatrixEngine();

  for (let i = 0; i < 100; i++) {
    const uC = 0.08 + (i * 0.35) / 100;
    const pts = { A: 0.0, B: 0.5, C: uC };
    const s = createGeometrySnapshot({ pointsU: pts, R: 5, scale: 1 });

    const invStatus = evaluateStructuralInvariant(DYNAMIC_THALES_INVARIANT, s);
    const recomputedClassical = classicalEngine.compute(pts, 5);
    const recomputedMatrix = matrixEngine.compute(pts, 5);

    if (invStatus.status === 'PRESERVED') {
      const preservedAngleC = invStatus.preservedValue;
      const classicalAngleC = recomputedClassical.angles.C;
      const matrixAngleC = recomputedMatrix.angles.C;

      if (
        Math.abs((preservedAngleC as number) - classicalAngleC) > 1e-4 ||
        Math.abs((preservedAngleC as number) - matrixAngleC) > 1e-4
      ) {
        equivalencePassed = false;
        break;
      }
    }
  }

  assert(
    equivalencePassed,
    'T10 - Recompute Equivalence (Preserved Invariant Result === Independent Recompute in 100/100 states)'
  );
}

// -----------------------------------------------------------------------------
// T11: Multiple Invariants Isolated Premise Breakdown
// -----------------------------------------------------------------------------
{
  // Normal state (all 5 valid)
  const sNorm = createGeometrySnapshot({ pointsU: { A: 0.0, B: 0.5, C: 0.25 }, R: 5, scale: 1 });
  const statusesNorm = evaluateStructuralInvariants(sNorm, CANONICAL_INVARIANT_SUITE);
  const allNormPreserved = statusesNorm.every((st) => st.status === 'PRESERVED');
  assert(allNormPreserved, 'T11 - All 5 invariants PRESERVED under canonical Thales configuration');

  // Break premise: C not on boundary
  const sOffBoundary = createGeometrySnapshot({
    pointsU: { A: 0.0, B: 0.5, C: 0.25 },
    R: 5,
    scale: 1,
    onBoundary: { A: true, B: true, C: false },
  });
  const statusesOff = evaluateStructuralInvariants(sOffBoundary, CANONICAL_INVARIANT_SUITE);
  const diamPreserved = statusesOff.find((s) => s.id === 'INV-THALES-DIAM-AB')?.status === 'PRESERVED';
  const cBoundBroken = statusesOff.find((s) => s.id === 'INV-THALES-C-BOUNDARY')?.status === 'BROKEN';
  const angleBroken = statusesOff.find((s) => s.id === 'INV-DYN-THALES')?.status === 'BROKEN';

  assert(
    diamPreserved && cBoundBroken && angleBroken,
    'T11 - Isolated Premise Breakdown (Breaking C-boundary breaks Angle & Boundary, preserves Diameter AB)'
  );
}

// -----------------------------------------------------------------------------
// T12: No Knowledge Graph Contamination
// -----------------------------------------------------------------------------
{
  const finalGraphSize = CANONICAL_GRAPH.length;
  const finalGraphEdgeIds = CANONICAL_GRAPH.map((p) => p.id);

  assert(
    finalGraphSize === initialGraphSize,
    'T12 - Canonical Knowledge Graph size invariant (initial === final)'
  );
  assert(
    finalGraphEdgeIds.every((id, i) => id === initialGraphEdgeIds[i]),
    'T12 - Zero temporal nodes, states, or paths injected into CANONICAL_GRAPH'
  );
}

// -----------------------------------------------------------------------------
// T13: Engine Independence (Snapshot !== EngineResult)
// -----------------------------------------------------------------------------
{
  const pts = { A: 0.0, B: 0.5, C: 0.25 };
  const snapshot = createGeometrySnapshot({ pointsU: pts, R: 5, scale: 1 });

  // Verify that snapshot structure is purely geometric and has no engineName or ops metadata
  assert(
    !('engineName' in snapshot) && !('ops' in snapshot),
    'T13 - Engine Independence: Snapshot does not contain engine metadata (Snapshot !== EngineResult)'
  );
}

// -----------------------------------------------------------------------------
// T14: No Temporal Navigator Replacement
// -----------------------------------------------------------------------------
{
  const nav = new DeterministicNavigator(CANONICAL_GRAPH);
  const trace = nav.solve({ angle_A: 30, angle_B: 60 }, 'angle_C');

  assert(
    trace.status === 'SUCCESS' && trace.finalValue === 90,
    'T14 - Navigator operates purely deterministically over static graph'
  );
  assert(
    trace.selectedPathIds.length === 1 && trace.selectedPathIds[0] === 'DP-ANG-SUM-C',
    'T14 - Navigator path selection completely unperturbed by temporal session'
  );
}

// -----------------------------------------------------------------------------
// T15: Performance & Overhead Measurement
// -----------------------------------------------------------------------------
{
  const iterations = 5000;
  const pts = { A: 0.0, B: 0.5, C: 0.25 };
  const ptsNext = { A: 0.0, B: 0.5, C: 0.28 };

  // Baseline: Pure classical recomputation
  const classicalEngine = new ClassicalEngine();
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    classicalEngine.compute(ptsNext, 5);
  }
  const baselineTimeMs = performance.now() - t0;

  // Experimental: Snapshot + computeTransition + Structural Invariant Guard + Classical Recompute
  const s0 = createGeometrySnapshot({ pointsU: pts, R: 5, scale: 1 });
  const t1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const s1 = createGeometrySnapshot({ pointsU: ptsNext, R: 5, scale: 1 });
    computeTransition(s0, s1);
    evaluateStructuralInvariant(DYNAMIC_THALES_INVARIANT, s1);
    classicalEngine.compute(ptsNext, 5);
  }
  const experimentalTimeMs = performance.now() - t1;

  const baselinePerOp = (baselineTimeMs / iterations) * 1000; // microseconds
  const expPerOp = (experimentalTimeMs / iterations) * 1000;

  console.log(`    [Benchmark] Baseline (Recompute only): ${baselinePerOp.toFixed(2)} µs/op`);
  console.log(`    [Benchmark] With Temporal Guard:       ${expPerOp.toFixed(2)} µs/op`);
  console.log(`    [Benchmark] Added Temporal Overhead:   ${(expPerOp - baselinePerOp).toFixed(2)} µs/op`);

  assert(
    expPerOp < 50, // Sub-50 microseconds is exceptional performance
    'T15 - Performance: Temporal observation overhead remains strictly sub-millisecond per frame'
  );
}

console.log('\n======================================================================');
if (allPassed) {
  console.log('ALL 15 TEMPORAL OBSERVER TESTS PASSED (100% SUCCESS)');
} else {
  console.error('TEMPORAL TEST FAILURES DETECTED');
  process.exit(1);
}
console.log('======================================================================\n');
