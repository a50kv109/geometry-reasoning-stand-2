// src/kernel/tests/runKernelTests.ts
// Autonomous Test Suite for Deterministic Geometry Kernel
// Runs all 8 mandatory tests from the Integration Contract Gate

import { DeterministicNavigator } from '../navigator';
import { CANONICAL_GRAPH, DP_ANG_SUM_C, DP_PYTH_HYP, DP_CHORD_TRIG, DP_INSC_TO_CENT } from '../canonicalPaths';
import { ExplorationRunner } from '../exploration/runner';
import { ConsistencyEngine } from '../consistencyEngine';
import { FactMap, Hypothesis, DerivationPath } from '../types';

export interface TestResultReport {
  testId: string;
  testName: string;
  input: Record<string, any>;
  target: string;
  candidatePaths: string[][];
  preconditionResults: { path: string[]; status: string; reason?: string }[];
  selectedPath: string[];
  executionResult: any;
  expected: any;
  observed: any;
  pass: boolean;
  notes?: string;
}

export function runAllKernelTests(): TestResultReport[] {
  const reports: TestResultReport[] = [];
  const nav = new DeterministicNavigator(CANONICAL_GRAPH);
  const runner = new ExplorationRunner();

  // =========================================================================
  // TEST 1 — Angle Sum
  // Known: angle_A = 30, angle_B = 60
  // Target: angle_C
  // Expected: 90
  // =========================================================================
  {
    const input: FactMap = { angle_A: 30, angle_B: 60 };
    const target = 'angle_C';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 90;
    const observed = trace.finalValue;
    const pass = trace.status === 'SUCCESS' && Math.abs(Number(observed) - expected) < 1e-5;

    reports.push({
      testId: 'TEST 1',
      testName: 'Angle Sum (DP-ANG-SUM-C)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
    });
  }

  // =========================================================================
  // TEST 2 — Inscribed -> Central
  // Known: angle_A = 30, R = 5
  // Target: central_angle_BC
  // Expected: 60 degrees
  // =========================================================================
  {
    const input: FactMap = { angle_A: 30, R: 5 };
    const target = 'central_angle_BC';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 60;
    const observed = trace.finalValue;
    const pass = trace.status === 'SUCCESS' && Math.abs(Number(observed) - expected) < 1e-5;

    reports.push({
      testId: 'TEST 2',
      testName: 'Inscribed to Central Angle (DP-INSC-TO-CENT)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
    });
  }

  // =========================================================================
  // TEST 3 — Chord
  // Known: angle_A = 30, R = 5
  // Target: chord_BC
  // Expected: 2 * 5 * sin(30°) = 5.0
  // Multi-step route: angle_A -> central_angle_BC -> chord_BC
  // =========================================================================
  {
    const input: FactMap = { angle_A: 30, R: 5 };
    const target = 'chord_BC';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 5.0;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-4;

    reports.push({
      testId: 'TEST 3',
      testName: 'Chord via Inscribed and Central (Multi-step)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
      notes: 'Demonstrates multi-step derivation: angle_A -> central_angle_BC -> chord_BC',
    });
  }

  // =========================================================================
  // TEST 4 — Thales
  // Known: coord_A = { x: 0, y: -5 }, coord_C = { x: 0, y: 5 }, R = 5 (dist AC = 10 = 2R)
  // Target: triangle_class
  // Expected: "right"
  // =========================================================================
  {
    const input: FactMap = {
      coord_A: { x: 0, y: -5 },
      coord_C: { x: 0, y: 5 },
      R: 5,
    };
    const target = 'triangle_class';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 'right';
    const observed = trace.finalValue;
    const pass = trace.status === 'SUCCESS' && observed === expected && trace.selectedPathIds.includes('DP-THALES-CLASS');

    reports.push({
      testId: 'TEST 4',
      testName: 'Thales Right Triangle (DP-THALES-CLASS)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
    });
  }

  // =========================================================================
  // TEST 5 — Competing Paths (M10-B Acute)
  // Known: coord_A = { x: 0, y: 5 }, coord_B = { x: 4.33, y: -2.5 }, coord_C = { x: -4.33, y: -2.5 }, R = 5
  // (Equilateral acute triangle, dist AC = Math.hypot(-4.33, -7.5) ≈ 8.66 != 10 = 2R)
  // Target: triangle_class
  // Expected: Thales path rejected (PRECONDITION_FAILED), Coordinate path selected, result = "acute"
  // =========================================================================
  {
    const input: FactMap = {
      coord_A: { x: 0, y: 5 },
      coord_B: { x: 4.330127, y: -2.5 },
      coord_C: { x: -4.330127, y: -2.5 },
      R: 5,
    };
    const target = 'triangle_class';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 'acute';
    const observed = trace.finalValue;
    
    // Validate competing paths behavior:
    const thalesPre = preResults.find(r => r.path.includes('DP-THALES-CLASS'));
    const coordPre = preResults.find(r => r.path.includes('DP-COORD-CLASS'));

    const pass = 
      thalesPre?.status === 'PRECONDITION_FAILED' &&
      coordPre?.status === 'VALID' &&
      trace.selectedPathIds.includes('DP-COORD-CLASS') &&
      observed === expected;

    reports.push({
      testId: 'TEST 5',
      testName: 'Competing Paths Resolution (Thales rejected, Coord selected)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: 'Thales rejected & Coord selected = acute',
      observed: `Thales: ${thalesPre?.status}, Selected: ${trace.selectedPathIds.join(',')}, Result: ${observed}`,
      pass,
      notes: 'Proves branch isolation: failing precondition does not contaminate competing coordinate path.',
    });
  }

  // =========================================================================
  // TEST 6 — Dynamic Value Propagation
  // Known: angle_A = 30, angle_B = 60, leg_a = 3, leg_b = 4
  // Target: hypotenuse_c
  // Precondition of DP-PYTH-HYP requires angle_C == 90.
  // angle_C is NOT in initial input; it must be derived by DP-ANG-SUM-C and propagated in sandbox.
  // Expected: angle_C computed dynamically as 90 -> DP-PYTH-HYP precondition passes -> hypotenuse_c = 5.0
  // =========================================================================
  {
    const input: FactMap = {
      angle_A: 30,
      angle_B: 60,
      leg_a: 3,
      leg_b: 4,
    };
    const target = 'hypotenuse_c';
    const candidates = nav.discover(target);
    const preResults = candidates.map(p => {
      const chk = nav.check(p, input);
      return { path: p.map(e => e.id), status: chk.status, reason: chk.reason };
    });
    const trace = nav.solve(input, target);
    const expected = 5.0;
    const observed = Number(trace.finalValue);

    const hasAngSum = trace.selectedPathIds.includes('DP-ANG-SUM-C');
    const hasPyth = trace.selectedPathIds.includes('DP-PYTH-HYP');
    const pass = trace.status === 'SUCCESS' && hasAngSum && hasPyth && Math.abs(observed - expected) < 1e-4;

    reports.push({
      testId: 'TEST 6',
      testName: 'Dynamic Value Propagation (angle_C dynamically unlocks Pythagoras)',
      input,
      target,
      candidatePaths: candidates.map(p => p.map(e => e.id)),
      preconditionResults: preResults,
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: 'angle_C derived as 90°, unlocking hypotenuse_c = 5.0',
      observed: `Selected: ${trace.selectedPathIds.join(' -> ')}, Result: ${observed}`,
      pass,
      notes: 'Step 1 (DP-ANG-SUM-C) produced angle_C=90, allowing Step 2 (DP-PYTH-HYP) precondition to pass.',
    });
  }

  // =========================================================================
  // TEST 7 — Exploration Isolation
  // Test that an exploratory hypothesis executed by ExplorationRunner:
  // 1) Successfully yields VERIFIED in its experimental context
  // 2) Canonical Navigator does NOT automatically acquire the new target or path
  // =========================================================================
  {
    // Define an experimental hypothesis: area = 0.5 * leg_a * leg_b
    const customAreaPath: DerivationPath = {
      id: 'HYP-RIGHT-TRI-AREA',
      description: 'Гипотеза: площадь прямоугольного треугольника S = 0.5 * a * b',
      requires: ['leg_a', 'leg_b', 'angle_C'],
      provides: 'hypothetical_area',
      precondition: (k: FactMap) => Math.abs(Number(k['angle_C']) - 90) < 1e-4,
      operation: (k: FactMap) => 0.5 * Number(k['leg_a']) * Number(k['leg_b']),
    };

    const hypothesis: Hypothesis = {
      id: 'H-EXP-001',
      source: 'student_experiment',
      target: 'hypothetical_area',
      proposedPath: [customAreaPath],
      expectedValue: 6.0,
    };

    const input: FactMap = {
      leg_a: 3,
      leg_b: 4,
      angle_C: 90,
    };

    // 1. Run in exploration space
    const expTrace = runner.testHypothesis(hypothesis, input);

    // 2. Query canonical navigator for the same target
    const canonicalTrace = nav.solve(input, 'hypothetical_area');

    const pass =
      expTrace.status === 'VERIFIED' &&
      expTrace.computedResult === 6.0 &&
      canonicalTrace.status !== 'SUCCESS' &&
      canonicalTrace.finalValue === null &&
      CANONICAL_GRAPH.length === 43;

    reports.push({
      testId: 'TEST 7',
      testName: 'Exploration Isolation (No canonical promotion)',
      input,
      target: 'hypothetical_area',
      candidatePaths: [hypothesis.proposedPath.map(e => e.id)],
      preconditionResults: [{ path: ['HYP-RIGHT-TRI-AREA'], status: expTrace.status, reason: expTrace.reason }],
      selectedPath: expTrace.stepsExecuted,
      executionResult: expTrace.computedResult,
      expected: 'Exploration: VERIFIED (6.0), Canonical: FAIL (no route), Graph length: 43',
      observed: `Exploration: ${expTrace.status} (${expTrace.computedResult}), Canonical status: ${canonicalTrace.status}, Canonical graph size: ${CANONICAL_GRAPH.length}`,
      pass,
      notes: 'Guarantees epistemic boundary: experimental success never mutates canonical knowledge graph.',
    });
  }

  // =========================================================================
  // TEST 8 — Trace Verification
  // Check that every executed derivation exposes full structured trace:
  // - inputs
  // - selected path
  // - steps with intermediate values
  // - precondition checks
  // - final result and status
  // =========================================================================
  {
    const input: FactMap = { angle_A: 30, angle_B: 60, leg_a: 3, leg_b: 4 };
    const trace = nav.solve(input, 'hypotenuse_c');

    const hasInputs = Object.keys(trace.initialFacts).length === 4;
    const hasSelected = trace.selectedPathIds.length === 2;
    const hasSteps = trace.steps.length === 2;
    const step1Valid = trace.steps[0].pathId === 'DP-ANG-SUM-C' && trace.steps[0].outputProduced === 90;
    const step2Valid = trace.steps[1].pathId === 'DP-PYTH-HYP' && trace.steps[1].preconditionPassed === true && trace.steps[1].outputProduced === 5;
    const hasSuccess = trace.status === 'SUCCESS';

    const pass = hasInputs && hasSelected && hasSteps && step1Valid && step2Valid && hasSuccess;

    reports.push({
      testId: 'TEST 8',
      testName: 'Trace Structure & Epistemic Completeness',
      input,
      target: 'hypotenuse_c',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: trace.steps.map(s => ({
        path: [s.pathId],
        status: s.preconditionPassed ? 'PASS' : 'FAIL',
        reason: s.description,
      })),
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: 'Full trace with 2 steps, explicit inputs, intermediate values, and precondition confirmation',
      observed: `Steps: ${trace.steps.length}, Step 1 output: ${trace.steps[0]?.outputProduced}, Step 2 output: ${trace.steps[1]?.outputProduced}, Status: ${trace.status}`,
      pass,
      notes: 'Trace structure meets requirements for educational transparency without UI leakage.',
    });
  }

  // =========================================================================
  // TEST 9 — S2: Normal Valid Chord to Radial Distance
  // Known: chord_length = 6, R = 5
  // Target: radial_distance -> d = √(5² - (6/2)²) = √(25 - 9) = 4.0
  // =========================================================================
  {
    const input: FactMap = { chord_length: 6, R: 5 };
    const target = 'radial_distance';
    const trace = nav.solve(input, target);
    const expected = 4.0;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-5 && trace.selectedPathIds.includes('DP-CHORD-TO-RADIAL-DIST');

    reports.push({
      testId: 'TEST 9',
      testName: 'Universal Chord to Radial Distance (DP-CHORD-TO-RADIAL-DIST)',
      input,
      target,
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-CHORD-TO-RADIAL-DIST'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
      notes: 'Computes d = √(R² - (L/2)²) deterministically.',
    });
  }

  // =========================================================================
  // TEST 10 — S2: Diameter Boundary (L = 2R => d = 0)
  // Known: chord_length = 10, R = 5
  // Target: radial_distance -> d = 0.0
  // =========================================================================
  {
    const input: FactMap = { chord_length: 10, R: 5 };
    const target = 'radial_distance';
    const trace = nav.solve(input, target);
    const expected = 0.0;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-5;

    reports.push({
      testId: 'TEST 10',
      testName: 'Diameter Boundary Condition (L = 2R => d = 0)',
      input,
      target,
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-CHORD-TO-RADIAL-DIST'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
      notes: 'Confirms universal circle property: diameter chord passes directly through center.',
    });
  }

  // =========================================================================
  // TEST 11 — S2: Degenerate Limiting Case (L = 0 => d = R)
  // Known: chord_length = 0, R = 5
  // Target: radial_distance -> d = 5.0
  // =========================================================================
  {
    const input: FactMap = { chord_length: 0, R: 5 };
    const target = 'radial_distance';
    const trace = nav.solve(input, target);
    const expected = 5.0;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-5;

    reports.push({
      testId: 'TEST 11',
      testName: 'Degenerate Chord Limit (L = 0 => d = R)',
      input,
      target,
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-CHORD-TO-RADIAL-DIST'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
      notes: 'Confirms point chord limit on the circle boundary.',
    });
  }

  // =========================================================================
  // TEST 12 — S2: Inverse Round-Trip Consistency (L -> d -> L)
  // Known: radial_distance = 4, R = 5
  // Target: chord_length -> L = 2√(5² - 4²) = 2 * 3 = 6.0
  // =========================================================================
  {
    const input: FactMap = { radial_distance: 4, R: 5 };
    const target = 'chord_length';
    const trace = nav.solve(input, target);
    const expected = 6.0;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-5 && trace.selectedPathIds.includes('DP-RADIAL-DIST-TO-CHORD');

    reports.push({
      testId: 'TEST 12',
      testName: 'Inverse Radial Distance to Chord (DP-RADIAL-DIST-TO-CHORD)',
      input,
      target,
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-RADIAL-DIST-TO-CHORD'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
      notes: 'Validates perfect bijective round-trip inverse consistency.',
    });
  }

  // =========================================================================
  // TEST 13 — S2: Scale Invariance Consistency (R = 50, L = 60 => d = 40)
  // Known: chord_length = 60, R = 50
  // Target: radial_distance -> d = √(50² - 30²) = 40.0
  // =========================================================================
  {
    const input: FactMap = { chord_length: 60, R: 50 };
    const target = 'radial_distance';
    const trace = nav.solve(input, target);
    const expected = 40.0;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-5;

    reports.push({
      testId: 'TEST 13',
      testName: 'Scale Invariance Consistency (R = 50)',
      input,
      target,
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-CHORD-TO-RADIAL-DIST'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
      notes: 'Confirms linear geometric scale invariance.',
    });
  }

  // =========================================================================
  // TEST 14 — S2: Invalid Domain Structured Rejections (L > 2R, d > R)
  // Check that bounds violations are caught by structured preconditions without throwing
  // =========================================================================
  {
    const invalidLInput: FactMap = { chord_length: 12, R: 5 }; // 12 > 2*5 = 10
    const traceL = nav.solve(invalidLInput, 'radial_distance');
    const rejL = traceL.status === 'PRECONDITION_FAILED';

    const invalidDInput: FactMap = { radial_distance: 6, R: 5 }; // 6 > 5
    const traceD = nav.solve(invalidDInput, 'chord_length');
    const rejD = traceD.status === 'PRECONDITION_FAILED';

    const pass = rejL && rejD;

    reports.push({
      testId: 'TEST 14',
      testName: 'Domain Bounds Structured Rejections (L > 2R, d > R)',
      input: { invalid_chord_length: 12, invalid_radial_distance: 6, R: 5 },
      target: 'radial_distance & chord_length',
      candidatePaths: [['DP-CHORD-TO-RADIAL-DIST'], ['DP-RADIAL-DIST-TO-CHORD']],
      preconditionResults: [
        { path: ['DP-CHORD-TO-RADIAL-DIST'], status: traceL.status, reason: traceL.message },
        { path: ['DP-RADIAL-DIST-TO-CHORD'], status: traceD.status, reason: traceD.message },
      ],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED for both bounds violations',
      observed: `L>2R: ${traceL.status}, d>R: ${traceD.status}`,
      pass,
      notes: 'Precondition guards return structured failure without throwing exceptions.',
    });
  }

  // =========================================================================
  // TEST 15 — S3: Reference Diameter Parallel Chord (θ = 0° => L = 2R = 10)
  // =========================================================================
  {
    const input: FactMap = { reference_angle: 0, R: 5, is_parallel_to_reference_diameter: true };
    const target = 'chord_length';
    const trace = nav.solve(input, target);
    const expected = 10.0;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-5 && trace.selectedPathIds.includes('DP-REF-DIAM-CHORD');

    reports.push({
      testId: 'TEST 15',
      testName: 'Reference Diameter Parallel Chord (θ = 0° => L = 10)',
      input,
      target,
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-REF-DIAM-CHORD'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
      notes: 'Parallel chord coincident with diameter (θ = 0°) yields L = 2R = 10.',
    });
  }

  // =========================================================================
  // TEST 16 — S3: Reference Diameter Parallel Chord (θ = 45° => L = 10 / √2)
  // =========================================================================
  {
    const input: FactMap = { reference_angle: 45, R: 5, is_parallel_to_reference_diameter: true };
    const target = 'chord_length';
    const trace = nav.solve(input, target);
    const expected = 10 / Math.SQRT2;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-5;

    reports.push({
      testId: 'TEST 16',
      testName: 'Reference Diameter Parallel Chord (θ = 45° => L = 10/√2)',
      input,
      target,
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-REF-DIAM-CHORD'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
      notes: 'Parallel chord at θ = 45° yields L = 2R * cos(45°) = 7.071.',
    });
  }

  // =========================================================================
  // TEST 17 — S3: Reference Diameter Parallel Chord (θ = 90° => L = 0)
  // =========================================================================
  {
    const input: FactMap = { reference_angle: 90, R: 5, is_parallel_to_reference_diameter: true };
    const target = 'chord_length';
    const trace = nav.solve(input, target);
    const expected = 0.0;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-5;

    reports.push({
      testId: 'TEST 17',
      testName: 'Reference Diameter Parallel Chord (θ = 90° => L = 0)',
      input,
      target,
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-REF-DIAM-CHORD'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected,
      observed,
      pass,
      notes: 'Radial angle perpendicular to diameter (θ = 90°) yields degenerate tangent point L = 0.',
    });
  }

  // =========================================================================
  // TEST 18 — S3: Out-of-bounds Domain Rejection (θ = 120° > 90°)
  // =========================================================================
  {
    const input: FactMap = { reference_angle: 120, R: 5, is_parallel_to_reference_diameter: true };
    const trace = nav.solve(input, 'chord_length');
    const pass = trace.status === 'PRECONDITION_FAILED';

    reports.push({
      testId: 'TEST 18',
      testName: 'Out-of-Bounds Angle Rejection (θ = 120° > 90°)',
      input,
      target: 'chord_length',
      candidatePaths: [['DP-REF-DIAM-CHORD']],
      preconditionResults: [{ path: ['DP-REF-DIAM-CHORD'], status: trace.status, reason: trace.message }],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED',
      observed: trace.status,
      pass,
      notes: 'Strictly bounds θ to [0, 90°] without extrapolation or obtuse folding.',
    });
  }

  // =========================================================================
  // TEST 19 — S3: Missing Context Rejection (No reference context flag)
  // =========================================================================
  {
    const input: FactMap = { reference_angle: 45, R: 5 }; // missing is_parallel_to_reference_diameter
    const trace = nav.solve(input, 'chord_length');
    const pass = trace.status === 'MISSING_INPUT' || trace.status === 'NO_VALID_PATH' || trace.status === 'PRECONDITION_FAILED';

    reports.push({
      testId: 'TEST 19',
      testName: 'Missing Context Marker Rejection',
      input,
      target: 'chord_length',
      candidatePaths: [['DP-REF-DIAM-CHORD']],
      preconditionResults: [{ path: ['DP-REF-DIAM-CHORD'], status: trace.status, reason: trace.message }],
      selectedPath: [],
      executionResult: null,
      expected: 'Rejection due to missing contextual marker is_parallel_to_reference_diameter',
      observed: trace.status,
      pass,
      notes: 'Guarantees reference-diameter construction is never applied as an ungrounded universal law.',
    });
  }

  // =========================================================================
  // TEST 20 — S3: Inverse Contextual Loop (L -> θ -> L)
  // =========================================================================
  {
    const initialL = 10 / Math.SQRT2; // 7.0710678...
    const inputTheta: FactMap = { chord_length: initialL, R: 5, is_parallel_to_reference_diameter: true };
    const traceTheta = nav.solve(inputTheta, 'reference_angle');
    const derivedTheta = Number(traceTheta.finalValue);

    const inputL: FactMap = { reference_angle: derivedTheta, R: 5, is_parallel_to_reference_diameter: true };
    const traceL = nav.solve(inputL, 'chord_length');
    const derivedL = Number(traceL.finalValue);

    const pass =
      traceTheta.status === 'SUCCESS' &&
      Math.abs(derivedTheta - 45) < 1e-4 &&
      traceL.status === 'SUCCESS' &&
      Math.abs(derivedL - initialL) < 1e-4;

    reports.push({
      testId: 'TEST 20',
      testName: 'Inverse Reference-Diameter Contextual Loop (L -> θ -> L)',
      input: { initialL, R: 5, is_parallel_to_reference_diameter: true },
      target: 'reference_angle & chord_length',
      candidatePaths: [['DP-REF-DIAM-ANGLE'], ['DP-REF-DIAM-CHORD']],
      preconditionResults: [
        { path: ['DP-REF-DIAM-ANGLE'], status: traceTheta.status },
        { path: ['DP-REF-DIAM-CHORD'], status: traceL.status },
      ],
      selectedPath: ['DP-REF-DIAM-ANGLE', 'DP-REF-DIAM-CHORD'],
      executionResult: { derivedTheta, derivedL },
      expected: { derivedTheta: 45.0, derivedL: initialL },
      observed: { derivedTheta, derivedL },
      pass,
      notes: 'Validates bidirectional inverse consistency for contextual reference-diameter paths.',
    });
  }

  // =========================================================================
  // TEST 21 — S4: Adversarial Context Absence vs Numerical Validity
  // Numerically plausible values for S3 (R=5, θ=30°) without context flag must reject cleanly
  // =========================================================================
  {
    const input: FactMap = { reference_angle: 30, R: 5 }; // valid numbers, missing context
    const trace = nav.solve(input, 'chord_length');
    const pass = trace.status === 'MISSING_INPUT' || trace.status === 'PRECONDITION_FAILED' || trace.status === 'NO_VALID_PATH';

    reports.push({
      testId: 'TEST 21',
      testName: 'Adversarial Defense: Context Absence Rejection',
      input,
      target: 'chord_length',
      candidatePaths: [['DP-REF-DIAM-CHORD']],
      preconditionResults: [{ path: ['DP-REF-DIAM-CHORD'], status: trace.status, reason: trace.message }],
      selectedPath: [],
      executionResult: null,
      expected: 'Structured rejection (MISSING_INPUT / PRECONDITION_FAILED)',
      observed: trace.status,
      pass,
      notes: 'Prevents AI agents from invoking contextual formulas without establishing geometric context.',
    });
  }

  // =========================================================================
  // TEST 22 — S4: Floating-Point Micro-Tolerance Boundary Stabilization (L ≈ 2R)
  // L = 10.00005 for R = 5 (within 1e-4 tolerance) safely evaluates d ≈ 0.0
  // =========================================================================
  {
    const input: FactMap = { chord_length: 10.00005, R: 5 };
    const trace = nav.solve(input, 'radial_distance');
    const pass = trace.status === 'SUCCESS' && Number(trace.finalValue) < 1e-3;

    reports.push({
      testId: 'TEST 22',
      testName: 'Floating-Point Micro-Tolerance Stabilization (L ≈ 2R)',
      input,
      target: 'radial_distance',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-CHORD-TO-RADIAL-DIST'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: 'SUCCESS with radial_distance ≈ 0.0',
      observed: `${trace.status} (d=${trace.finalValue})`,
      pass,
      notes: 'Absorbs microscopic floating-point rounding drift without crashing square root operations.',
    });
  }

  // =========================================================================
  // TEST 23 — S4: Out-of-Bounds Rejection Beyond Micro-Tolerance (L = 10.1 > 2R)
  // L = 10.1 for R = 5 exceeds 1e-4 tolerance and must trigger PRECONDITION_FAILED
  // =========================================================================
  {
    const input: FactMap = { chord_length: 10.1, R: 5 };
    const trace = nav.solve(input, 'radial_distance');
    const pass = trace.status === 'PRECONDITION_FAILED';

    reports.push({
      testId: 'TEST 23',
      testName: 'Strict Boundary Rejection Beyond Tolerance (L = 10.1 > 2R)',
      input,
      target: 'radial_distance',
      candidatePaths: [['DP-CHORD-TO-RADIAL-DIST']],
      preconditionResults: [{ path: ['DP-CHORD-TO-RADIAL-DIST'], status: trace.status, reason: trace.message }],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED',
      observed: trace.status,
      pass,
      notes: 'Guarantees that tolerance does not permit genuinely invalid geometric inputs.',
    });
  }

  // =========================================================================
  // TEST 24 — S4: Angular Boundary Stabilization & Rejection
  // θ = 90.00005° succeeds (L ≈ 0); θ = 90.5° fails with PRECONDITION_FAILED
  // =========================================================================
  {
    const inputNear: FactMap = { reference_angle: 90.00005, R: 5, is_parallel_to_reference_diameter: true };
    const traceNear = nav.solve(inputNear, 'chord_length');
    const passNear = traceNear.status === 'SUCCESS' && Math.abs(Number(traceNear.finalValue)) < 1e-3;

    const inputFar: FactMap = { reference_angle: 90.5, R: 5, is_parallel_to_reference_diameter: true };
    const traceFar = nav.solve(inputFar, 'chord_length');
    const passFar = traceFar.status === 'PRECONDITION_FAILED';

    const pass = passNear && passFar;

    reports.push({
      testId: 'TEST 24',
      testName: 'Angular Boundary Stabilization & Rejection (θ ≈ 90° vs 90.5°)',
      input: { theta_near: 90.00005, theta_far: 90.5, R: 5 },
      target: 'chord_length',
      candidatePaths: [['DP-REF-DIAM-CHORD']],
      preconditionResults: [
        { path: ['DP-REF-DIAM-CHORD (near)'], status: traceNear.status },
        { path: ['DP-REF-DIAM-CHORD (far)'], status: traceFar.status },
      ],
      selectedPath: traceNear.selectedPathIds,
      executionResult: { nearVal: traceNear.finalValue, farStatus: traceFar.status },
      expected: 'Near: SUCCESS (~0), Far: PRECONDITION_FAILED',
      observed: `Near: ${traceNear.status} (${traceNear.finalValue}), Far: ${traceFar.status}`,
      pass,
      notes: 'Validates strict angular bounds at 90° with micro-tolerance stabilization.',
    });
  }

  // =========================================================================
  // TEST 25 — S4: Physical Non-Positivity Rejections (R <= 0, L < 0, d < 0)
  // All non-physical inputs trigger PRECONDITION_FAILED without exceptions or NaN
  // =========================================================================
  {
    const traceZeroR = nav.solve({ chord_length: 5, R: 0 }, 'radial_distance');
    const traceNegR = nav.solve({ chord_length: 5, R: -5 }, 'radial_distance');
    const traceNegL = nav.solve({ chord_length: -3, R: 5 }, 'radial_distance');
    const traceNegD = nav.solve({ radial_distance: -2, R: 5 }, 'chord_length');

    const pass =
      traceZeroR.status === 'PRECONDITION_FAILED' &&
      traceNegR.status === 'PRECONDITION_FAILED' &&
      traceNegL.status === 'PRECONDITION_FAILED' &&
      traceNegD.status === 'PRECONDITION_FAILED' &&
      traceZeroR.finalValue === null &&
      traceNegR.finalValue === null &&
      traceNegL.finalValue === null &&
      traceNegD.finalValue === null;

    reports.push({
      testId: 'TEST 25',
      testName: 'Physical Non-Positivity Domain Rejections (R<=0, L<0, d<0)',
      input: { R_zero: 0, R_neg: -5, L_neg: -3, d_neg: -2 },
      target: 'radial_distance & chord_length',
      candidatePaths: [['DP-CHORD-TO-RADIAL-DIST'], ['DP-RADIAL-DIST-TO-CHORD']],
      preconditionResults: [
        { path: ['R=0'], status: traceZeroR.status },
        { path: ['R=-5'], status: traceNegR.status },
        { path: ['L=-3'], status: traceNegL.status },
        { path: ['d=-2'], status: traceNegD.status },
      ],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED for all non-physical inputs with finalValue === null',
      observed: `R=0: ${traceZeroR.status}, R=-5: ${traceNegR.status}, L=-3: ${traceNegL.status}, d=-2: ${traceNegD.status}`,
      pass,
      notes: 'Protects kernel against NaN leakage, infinite loops, and division by non-positive radius.',
    });
  }

  // =========================================================================
  // TEST 26 — S5: Transferred Minor Central Angle (Chord -> Minor Central Angle)
  // L = 5√3, R = 5 => θ = 2 * arcsin(5√3 / 10) = 2 * 60° = 120°
  // =========================================================================
  {
    const input: FactMap = { chord_length: 5 * Math.sqrt(3), R: 5 };
    const trace = nav.solve(input, 'minor_central_angle');
    const expected = 120.0;
    const observed = Number(trace.finalValue);
    const pass = trace.status === 'SUCCESS' && Math.abs(observed - expected) < 1e-4;

    reports.push({
      testId: 'TEST 26',
      testName: 'Transferred Minor Central Angle (L = 5√3, R = 5 => θ = 120°)',
      input,
      target: 'minor_central_angle',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-SIDE-TO-MINOR-ANGLE'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: 120.0,
      observed,
      pass,
      notes: 'Computes unsigned minor central angle subtended by transferred standalone chord.',
    });
  }

  // =========================================================================
  // TEST 27 — S5: Equilateral Triangle Angle Sum (60/60/60 => Θ = 360° => ACUTE_RIGHT)
  // θ_a = 120°, θ_b = 120°, θ_c = 120° => Θ = 360° => Class = ACUTE_RIGHT
  // =========================================================================
  {
    const input: FactMap = { theta_a: 120, theta_b: 120, theta_c: 120 };
    const traceSum = nav.solve(input, 'transferred_angle_sum');
    const inputDiag: FactMap = { transferred_angle_sum: Number(traceSum.finalValue) };
    const traceClass = nav.solve(inputDiag, 'diagnostic_triangle_class');

    const pass =
      traceSum.status === 'SUCCESS' &&
      Math.abs(Number(traceSum.finalValue) - 360) < 1e-4 &&
      traceClass.status === 'SUCCESS' &&
      traceClass.finalValue === 'ACUTE_RIGHT';

    reports.push({
      testId: 'TEST 27',
      testName: 'Equilateral Triangle Angle Sum (60/60/60 => Θ = 360° => ACUTE_RIGHT)',
      input,
      target: 'transferred_angle_sum & diagnostic_triangle_class',
      candidatePaths: [['DP-TRANSFERRED-ANGLE-SUM'], ['DP-OBTUSE-DIAGNOSTIC']],
      preconditionResults: [
        { path: ['DP-TRANSFERRED-ANGLE-SUM'], status: traceSum.status },
        { path: ['DP-OBTUSE-DIAGNOSTIC'], status: traceClass.status },
      ],
      selectedPath: [...traceSum.selectedPathIds, ...traceClass.selectedPathIds],
      executionResult: { sum: traceSum.finalValue, class: traceClass.finalValue },
      expected: { sum: 360, class: 'ACUTE_RIGHT' },
      observed: { sum: traceSum.finalValue, class: traceClass.finalValue },
      pass,
      notes: 'Equilateral partition of circumcircle yields zero deficit (Θ = 360°).',
    });
  }

  // =========================================================================
  // TEST 28 — S5: Right Scalene Triangle Angle Sum (30/60/90 => Θ = 360° => ACUTE_RIGHT)
  // θ_a = 60°, θ_b = 120°, θ_c = 180° => Θ = 360° => Class = ACUTE_RIGHT
  // =========================================================================
  {
    const input: FactMap = { theta_a: 60, theta_b: 120, theta_c: 180 };
    const traceSum = nav.solve(input, 'transferred_angle_sum');
    const traceClass = nav.solve({ transferred_angle_sum: Number(traceSum.finalValue) }, 'diagnostic_triangle_class');

    const pass =
      traceSum.status === 'SUCCESS' &&
      Math.abs(Number(traceSum.finalValue) - 360) < 1e-4 &&
      traceClass.status === 'SUCCESS' &&
      traceClass.finalValue === 'ACUTE_RIGHT';

    reports.push({
      testId: 'TEST 28',
      testName: 'Right Scalene Triangle Angle Sum (30/60/90 => Θ = 360° => ACUTE_RIGHT)',
      input,
      target: 'transferred_angle_sum & diagnostic_triangle_class',
      candidatePaths: [['DP-TRANSFERRED-ANGLE-SUM'], ['DP-OBTUSE-DIAGNOSTIC']],
      preconditionResults: [
        { path: ['DP-TRANSFERRED-ANGLE-SUM'], status: traceSum.status },
        { path: ['DP-OBTUSE-DIAGNOSTIC'], status: traceClass.status },
      ],
      selectedPath: [...traceSum.selectedPathIds, ...traceClass.selectedPathIds],
      executionResult: { sum: traceSum.finalValue, class: traceClass.finalValue },
      expected: { sum: 360, class: 'ACUTE_RIGHT' },
      observed: { sum: traceSum.finalValue, class: traceClass.finalValue },
      pass,
      notes: 'Right triangle includes diameter (180°), still partition sums to 360° with non-negative center placement.',
    });
  }

  // =========================================================================
  // TEST 29 — S5: Standard Obtuse Triangle Diagnostic (120/30/30 => Θ = 240° => A = 120°)
  // θ_a = fold(2*120°) = 120°, θ_b = 60°, θ_c = 60° => Θ = 240° => Class = OBTUSE, Recovered A = 120°
  // =========================================================================
  {
    const input: FactMap = { theta_a: 120, theta_b: 60, theta_c: 60 };
    const traceSum = nav.solve(input, 'transferred_angle_sum');
    const inputSum: FactMap = { transferred_angle_sum: Number(traceSum.finalValue) };
    const traceClass = nav.solve(inputSum, 'diagnostic_triangle_class');
    const traceRecover = nav.solve(inputSum, 'recovered_obtuse_angle');

    const expectedA = 120.0;
    const observedA = Number(traceRecover.finalValue);

    const pass =
      traceSum.status === 'SUCCESS' &&
      Math.abs(Number(traceSum.finalValue) - 240) < 1e-4 &&
      traceClass.status === 'SUCCESS' &&
      traceClass.finalValue === 'OBTUSE' &&
      traceRecover.status === 'SUCCESS' &&
      Math.abs(observedA - expectedA) < 1e-4;

    reports.push({
      testId: 'TEST 29',
      testName: 'Standard Obtuse Triangle Diagnostic (120/30/30 => Θ = 240° => A = 120°)',
      input,
      target: 'transferred_angle_sum, diagnostic_triangle_class, recovered_obtuse_angle',
      candidatePaths: [['DP-TRANSFERRED-ANGLE-SUM'], ['DP-OBTUSE-DIAGNOSTIC'], ['DP-SUM-TO-OBTUSE-MAGNITUDE']],
      preconditionResults: [
        { path: ['DP-TRANSFERRED-ANGLE-SUM'], status: traceSum.status },
        { path: ['DP-OBTUSE-DIAGNOSTIC'], status: traceClass.status },
        { path: ['DP-SUM-TO-OBTUSE-MAGNITUDE'], status: traceRecover.status },
      ],
      selectedPath: [...traceSum.selectedPathIds, ...traceClass.selectedPathIds, ...traceRecover.selectedPathIds],
      executionResult: { sum: traceSum.finalValue, class: traceClass.finalValue, recoveredA: observedA },
      expected: { sum: 240, class: 'OBTUSE', recoveredA: 120 },
      observed: { sum: traceSum.finalValue, class: traceClass.finalValue, recoveredA: observedA },
      pass,
      notes: 'Detects 120° deficit (360 - 240 = 120°) and inverts folding operator: A = 180 - 240/4 = 120°.',
    });
  }

  // =========================================================================
  // TEST 30 — S5: Strongly Obtuse Triangle Diagnostic (170/5/5 => Θ = 40° => A = 170°)
  // θ_a = fold(2*170°) = 20°, θ_b = 10°, θ_c = 10° => Θ = 40° => Class = OBTUSE, Recovered A = 170°
  // =========================================================================
  {
    const input: FactMap = { theta_a: 20, theta_b: 10, theta_c: 10 };
    const traceSum = nav.solve(input, 'transferred_angle_sum');
    const inputSum: FactMap = { transferred_angle_sum: Number(traceSum.finalValue) };
    const traceClass = nav.solve(inputSum, 'diagnostic_triangle_class');
    const traceRecover = nav.solve(inputSum, 'recovered_obtuse_angle');

    const expectedA = 170.0;
    const observedA = Number(traceRecover.finalValue);

    const pass =
      traceSum.status === 'SUCCESS' &&
      Math.abs(Number(traceSum.finalValue) - 40) < 1e-4 &&
      traceClass.status === 'SUCCESS' &&
      traceClass.finalValue === 'OBTUSE' &&
      traceRecover.status === 'SUCCESS' &&
      Math.abs(observedA - expectedA) < 1e-4;

    reports.push({
      testId: 'TEST 30',
      testName: 'Strongly Obtuse Triangle Diagnostic (170/5/5 => Θ = 40° => A = 170°)',
      input,
      target: 'transferred_angle_sum, diagnostic_triangle_class, recovered_obtuse_angle',
      candidatePaths: [['DP-TRANSFERRED-ANGLE-SUM'], ['DP-OBTUSE-DIAGNOSTIC'], ['DP-SUM-TO-OBTUSE-MAGNITUDE']],
      preconditionResults: [
        { path: ['DP-TRANSFERRED-ANGLE-SUM'], status: traceSum.status },
        { path: ['DP-OBTUSE-DIAGNOSTIC'], status: traceClass.status },
        { path: ['DP-SUM-TO-OBTUSE-MAGNITUDE'], status: traceRecover.status },
      ],
      selectedPath: [...traceSum.selectedPathIds, ...traceClass.selectedPathIds, ...traceRecover.selectedPathIds],
      executionResult: { sum: traceSum.finalValue, class: traceClass.finalValue, recoveredA: observedA },
      expected: { sum: 40, class: 'OBTUSE', recoveredA: 170 },
      observed: { sum: traceSum.finalValue, class: traceClass.finalValue, recoveredA: observedA },
      pass,
      notes: 'Strongly obtuse case validates extreme folding limit down to Θ = 40° and exact inversion to 170°.',
    });
  }

  // =========================================================================
  // TEST 31 — S5: Precondition Rejection on Non-Obtuse Sum for Obtuse Recovery
  // Θ = 360° must reject DP-SUM-TO-OBTUSE-MAGNITUDE with PRECONDITION_FAILED
  // =========================================================================
  {
    const input: FactMap = { transferred_angle_sum: 360 };
    const trace = nav.solve(input, 'recovered_obtuse_angle');
    const pass = trace.status === 'PRECONDITION_FAILED' && trace.finalValue === null;

    reports.push({
      testId: 'TEST 31',
      testName: 'Precondition Rejection on Non-Obtuse Sum (Θ = 360°)',
      input,
      target: 'recovered_obtuse_angle',
      candidatePaths: [['DP-SUM-TO-OBTUSE-MAGNITUDE']],
      preconditionResults: [{ path: ['DP-SUM-TO-OBTUSE-MAGNITUDE'], status: trace.status, reason: trace.message }],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED (acute/right triangles do not possess an obtuse angle)',
      observed: trace.status,
      pass,
      notes: 'Ensures inverse obtuse recovery formula cannot be misapplied to non-obtuse geometries.',
    });
  }

  // =========================================================================
  // TEST 32 — S6: Equilateral Triangle Perimeter & Circumference Fraction
  // 60/60/60, R=5 => a=b=c=5√3 ≈ 8.66025 => P = 15√3 ≈ 25.98076
  // Θ_P = 3√3 ≈ 5.196152 rad, Q = 3√3 / (2π) ≈ 0.826993 (~82.7%)
  // =========================================================================
  {
    const side = 5 * Math.sqrt(3);
    const input: FactMap = { side_a: side, side_b: side, side_c: side, R: 5 };
    const traceP = nav.solve(input, 'perimeter');
    const pVal = Number(traceP.finalValue);

    const inputP: FactMap = { perimeter: pVal, R: 5 };
    const traceThetaP = nav.solve(inputP, 'equivalent_arc_angle');
    const traceQ = nav.solve(inputP, 'circumference_fraction');

    const expectedP = 15 * Math.sqrt(3);
    const expectedThetaP = 3 * Math.sqrt(3);
    const expectedQ = (3 * Math.sqrt(3)) / (2 * Math.PI);

    const pass =
      traceP.status === 'SUCCESS' &&
      Math.abs(pVal - expectedP) < 1e-4 &&
      traceThetaP.status === 'SUCCESS' &&
      Math.abs(Number(traceThetaP.finalValue) - expectedThetaP) < 1e-4 &&
      traceQ.status === 'SUCCESS' &&
      Math.abs(Number(traceQ.finalValue) - expectedQ) < 1e-4;

    reports.push({
      testId: 'TEST 32',
      testName: 'Equilateral Triangle Perimeter & Circumference Fraction (Q ≈ 0.827)',
      input,
      target: 'perimeter, equivalent_arc_angle, circumference_fraction',
      candidatePaths: [traceP.selectedPathIds, traceThetaP.selectedPathIds, traceQ.selectedPathIds],
      preconditionResults: [
        { path: ['DP-TRIANGLE-PERIMETER'], status: traceP.status },
        { path: ['DP-PERIMETER-TO-EQUIVALENT-ARC-ANGLE'], status: traceThetaP.status },
        { path: ['DP-PERIMETER-TO-CIRCUMFERENCE-FRACTION'], status: traceQ.status },
      ],
      selectedPath: [...traceP.selectedPathIds, ...traceThetaP.selectedPathIds, ...traceQ.selectedPathIds],
      executionResult: { P: pVal, Theta_P: traceThetaP.finalValue, Q: traceQ.finalValue },
      expected: { P: expectedP, Theta_P: expectedThetaP, Q: expectedQ },
      observed: { P: pVal, Theta_P: traceThetaP.finalValue, Q: traceQ.finalValue },
      pass,
      notes: 'Maximal perimeter efficiency of an inscribed polygon spans ~82.7% of circumcircle circumference.',
    });
  }

  // =========================================================================
  // TEST 33 — S6: Right Scalene Triangle Perimeter & Circumference Fraction
  // 30/60/90, R=5 => a=5, b=5√3, c=10 => P = 15 + 5√3 ≈ 23.66025
  // Θ_P ≈ 4.73205 rad, Q ≈ 0.75313 (~75.3%)
  // =========================================================================
  {
    const input: FactMap = { side_a: 5, side_b: 5 * Math.sqrt(3), side_c: 10, R: 5 };
    const traceP = nav.solve(input, 'perimeter');
    const pVal = Number(traceP.finalValue);

    const inputP: FactMap = { perimeter: pVal, R: 5 };
    const traceThetaP = nav.solve(inputP, 'equivalent_arc_angle');
    const traceQ = nav.solve(inputP, 'circumference_fraction');

    const expectedP = 15 + 5 * Math.sqrt(3);
    const expectedThetaP = (15 + 5 * Math.sqrt(3)) / 5;
    const expectedQ = (15 + 5 * Math.sqrt(3)) / (10 * Math.PI);

    const pass =
      traceP.status === 'SUCCESS' &&
      Math.abs(pVal - expectedP) < 1e-4 &&
      traceThetaP.status === 'SUCCESS' &&
      Math.abs(Number(traceThetaP.finalValue) - expectedThetaP) < 1e-4 &&
      traceQ.status === 'SUCCESS' &&
      Math.abs(Number(traceQ.finalValue) - expectedQ) < 1e-4;

    reports.push({
      testId: 'TEST 33',
      testName: 'Right Scalene Triangle Perimeter & Circumference Fraction (Q ≈ 0.753)',
      input,
      target: 'perimeter, equivalent_arc_angle, circumference_fraction',
      candidatePaths: [traceP.selectedPathIds, traceThetaP.selectedPathIds, traceQ.selectedPathIds],
      preconditionResults: [
        { path: ['DP-TRIANGLE-PERIMETER'], status: traceP.status },
        { path: ['DP-PERIMETER-TO-EQUIVALENT-ARC-ANGLE'], status: traceThetaP.status },
        { path: ['DP-PERIMETER-TO-CIRCUMFERENCE-FRACTION'], status: traceQ.status },
      ],
      selectedPath: [...traceP.selectedPathIds, ...traceThetaP.selectedPathIds, ...traceQ.selectedPathIds],
      executionResult: { P: pVal, Theta_P: traceThetaP.finalValue, Q: traceQ.finalValue },
      expected: { P: expectedP, Theta_P: expectedThetaP, Q: expectedQ },
      observed: { P: pVal, Theta_P: traceThetaP.finalValue, Q: traceQ.finalValue },
      pass,
      notes: 'Right triangle perimeter wraps ~75.3% of circumference.',
    });
  }

  // =========================================================================
  // TEST 34 — S6: Scale Invariance of Circumference Fraction & Equivalent Arc
  // R = 1, R = 5, R = 100 for equilateral configuration yields strictly constant Q and Θ_P
  // =========================================================================
  {
    const r1 = 1;
    const p1 = 3 * Math.sqrt(3) * r1;
    const traceQ1 = nav.solve({ perimeter: p1, R: r1 }, 'circumference_fraction');
    const traceTheta1 = nav.solve({ perimeter: p1, R: r1 }, 'equivalent_arc_angle');

    const r100 = 100;
    const p100 = 3 * Math.sqrt(3) * r100;
    const traceQ100 = nav.solve({ perimeter: p100, R: r100 }, 'circumference_fraction');
    const traceTheta100 = nav.solve({ perimeter: p100, R: r100 }, 'equivalent_arc_angle');

    const pass =
      traceQ1.status === 'SUCCESS' &&
      traceQ100.status === 'SUCCESS' &&
      Math.abs(Number(traceQ1.finalValue) - Number(traceQ100.finalValue)) < 1e-6 &&
      traceTheta1.status === 'SUCCESS' &&
      traceTheta100.status === 'SUCCESS' &&
      Math.abs(Number(traceTheta1.finalValue) - Number(traceTheta100.finalValue)) < 1e-6;

    reports.push({
      testId: 'TEST 34',
      testName: 'Scale Invariance of Circumference Fraction & Equivalent Arc (R=1 vs R=100)',
      input: { R_1: r1, R_100: r100 },
      target: 'circumference_fraction & equivalent_arc_angle',
      candidatePaths: [traceQ1.selectedPathIds, traceQ100.selectedPathIds],
      preconditionResults: [
        { path: ['R=1'], status: traceQ1.status },
        { path: ['R=100'], status: traceQ100.status },
      ],
      selectedPath: traceQ1.selectedPathIds,
      executionResult: { Q_R1: traceQ1.finalValue, Q_R100: traceQ100.finalValue },
      expected: 'Identical scale-invariant ratios across scales',
      observed: `Q(R=1)=${traceQ1.finalValue}, Q(R=100)=${traceQ100.finalValue}`,
      pass,
      notes: 'Confirms that Q = P/(2πR) is an intrinsic scale-invariant shape metric.',
    });
  }

  // =========================================================================
  // TEST 35 — S6: Adversarial Perimeter Exceeding Maximal Bound (P > 3√3 R)
  // P = 35 for R = 5 (Max P = 15√3 ≈ 25.98) triggers PRECONDITION_FAILED
  // =========================================================================
  {
    const input: FactMap = { perimeter: 35, R: 5 };
    const traceQ = nav.solve(input, 'circumference_fraction');
    const traceTheta = nav.solve(input, 'equivalent_arc_angle');

    const pass =
      traceQ.status === 'PRECONDITION_FAILED' &&
      traceTheta.status === 'PRECONDITION_FAILED' &&
      traceQ.finalValue === null &&
      traceTheta.finalValue === null;

    reports.push({
      testId: 'TEST 35',
      testName: 'Adversarial Rejection: Perimeter Exceeding Maximum (P > 3√3 R)',
      input,
      target: 'circumference_fraction, equivalent_arc_angle',
      candidatePaths: [['DP-PERIMETER-TO-CIRCUMFERENCE-FRACTION']],
      preconditionResults: [
        { path: ['DP-PERIMETER-TO-CIRCUMFERENCE-FRACTION'], status: traceQ.status },
        { path: ['DP-PERIMETER-TO-EQUIVALENT-ARC-ANGLE'], status: traceTheta.status },
      ],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED (impossible inscribed triangle perimeter)',
      observed: `Q: ${traceQ.status}, Θ_P: ${traceTheta.status}`,
      pass,
      notes: 'Blocks hallucinated claims that straight inscribed perimeter can exceed 3√3 R or circle circumference.',
    });
  }

  // =========================================================================
  // TEST 36 — S6: Triangle Inequality Violation Rejection (a >= b + c)
  // a = 10, b = 3, c = 4 (10 > 3+4) triggers PRECONDITION_FAILED
  // =========================================================================
  {
    const input: FactMap = { side_a: 10, side_b: 3, side_c: 4 };
    const trace = nav.solve(input, 'perimeter');
    const pass = trace.status === 'PRECONDITION_FAILED' && trace.finalValue === null;

    reports.push({
      testId: 'TEST 36',
      testName: 'Triangle Inequality Violation Rejection (a >= b + c)',
      input,
      target: 'perimeter',
      candidatePaths: [['DP-TRIANGLE-PERIMETER']],
      preconditionResults: [{ path: ['DP-TRIANGLE-PERIMETER'], status: trace.status, reason: trace.message }],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED (triangle inequality violated)',
      observed: trace.status,
      pass,
      notes: 'Guarantees that degenerate or impossible triangle sides are rejected at the perimeter boundary.',
    });
  }

  // =========================================================================
  // TEST 37 — S7: Equilateral Triangle Area & Normalized Area Fraction
  // 60/60/60, R=5 => K = (3√3 / 4) * 25 ≈ 32.475953
  // F = 3√3 / (4π) ≈ 0.413497 (~41.35% of circumcircle area)
  // =========================================================================
  {
    const input: FactMap = { angle_A: 60, angle_B: 60, angle_C: 60, R: 5 };
    const traceArea = nav.solve(input, 'triangle_area');
    const kVal = Number(traceArea.finalValue);

    const inputNorm: FactMap = { triangle_area: kVal, R: 5 };
    const traceF = nav.solve(inputNorm, 'normalized_area_fraction');

    const expectedK = ((3 * Math.sqrt(3)) / 4) * 25;
    const expectedF = (3 * Math.sqrt(3)) / (4 * Math.PI);

    const pass =
      traceArea.status === 'SUCCESS' &&
      Math.abs(kVal - expectedK) < 1e-4 &&
      traceF.status === 'SUCCESS' &&
      Math.abs(Number(traceF.finalValue) - expectedF) < 1e-4;

    reports.push({
      testId: 'TEST 37',
      testName: 'Equilateral Triangle Area & Normalized Area Fraction (F ≈ 0.413)',
      input,
      target: 'triangle_area, normalized_area_fraction',
      candidatePaths: [traceArea.selectedPathIds, traceF.selectedPathIds],
      preconditionResults: [
        { path: ['DP-TRIANGLE-AREA-ANGLES-R'], status: traceArea.status },
        { path: ['DP-NORMALIZED-AREA'], status: traceF.status },
      ],
      selectedPath: [...traceArea.selectedPathIds, ...traceF.selectedPathIds],
      executionResult: { K: kVal, F: traceF.finalValue },
      expected: { K: expectedK, F: expectedF },
      observed: { K: kVal, F: traceF.finalValue },
      pass,
      notes: 'Maximal area fraction of an inscribed triangle is exactly 3√3/(4π) ≈ 0.413497.',
    });
  }

  // =========================================================================
  // TEST 38 — S7: Right Scalene Triangle Area via Heron & via Angles Convergence
  // 30/60/90, R=5 => a=5, b=5√3, c=10 => K = 0.5 * 5 * 5√3 = 12.5√3 ≈ 21.650635
  // F = √3 / (2π) ≈ 0.275664
  // =========================================================================
  {
    const inputSides: FactMap = { side_a: 5, side_b: 5 * Math.sqrt(3), side_c: 10 };
    const traceHeron = nav.solve(inputSides, 'triangle_area');
    const kHeron = Number(traceHeron.finalValue);

    const inputAngles: FactMap = { angle_A: 30, angle_B: 60, angle_C: 90, R: 5 };
    const traceAngles = nav.solve(inputAngles, 'triangle_area');
    const kAngles = Number(traceAngles.finalValue);

    const traceF = nav.solve({ triangle_area: kHeron, R: 5 }, 'normalized_area_fraction');
    const expectedK = 12.5 * Math.sqrt(3);
    const expectedF = Math.sqrt(3) / (2 * Math.PI);

    const pass =
      traceHeron.status === 'SUCCESS' &&
      traceAngles.status === 'SUCCESS' &&
      Math.abs(kHeron - expectedK) < 1e-4 &&
      Math.abs(kAngles - expectedK) < 1e-4 &&
      traceF.status === 'SUCCESS' &&
      Math.abs(Number(traceF.finalValue) - expectedF) < 1e-4;

    reports.push({
      testId: 'TEST 38',
      testName: 'Right Scalene Triangle Area (Heron & Angles Route Convergence)',
      input: { side_a: 5, side_b: 5 * Math.sqrt(3), side_c: 10, angle_A: 30, angle_B: 60, angle_C: 90, R: 5 },
      target: 'triangle_area & normalized_area_fraction',
      candidatePaths: [traceHeron.selectedPathIds, traceAngles.selectedPathIds],
      preconditionResults: [
        { path: ['DP-TRIANGLE-AREA-HERON'], status: traceHeron.status },
        { path: ['DP-TRIANGLE-AREA-ANGLES-R'], status: traceAngles.status },
      ],
      selectedPath: traceHeron.selectedPathIds,
      executionResult: { K_Heron: kHeron, K_Angles: kAngles, F: traceF.finalValue },
      expected: { K: expectedK, F: expectedF },
      observed: { K_Heron: kHeron, K_Angles: kAngles, F: traceF.finalValue },
      pass,
      notes: 'Confirms route convergence between Heron formula and trigonometric circumradius formula.',
    });
  }

  // =========================================================================
  // TEST 39 — S7: Scale Invariance of Normalized Area Fraction (R=1 vs R=100)
  // F = K / (π * R²) is strictly invariant under scaling
  // =========================================================================
  {
    const r1 = 1;
    const k1 = ((3 * Math.sqrt(3)) / 4) * r1 * r1;
    const traceF1 = nav.solve({ triangle_area: k1, R: r1 }, 'normalized_area_fraction');

    const r100 = 100;
    const k100 = ((3 * Math.sqrt(3)) / 4) * r100 * r100;
    const traceF100 = nav.solve({ triangle_area: k100, R: r100 }, 'normalized_area_fraction');

    const pass =
      traceF1.status === 'SUCCESS' &&
      traceF100.status === 'SUCCESS' &&
      Math.abs(Number(traceF1.finalValue) - Number(traceF100.finalValue)) < 1e-6;

    reports.push({
      testId: 'TEST 39',
      testName: 'Scale Invariance of Normalized Area Fraction (R=1 vs R=100)',
      input: { R_1: r1, R_100: r100 },
      target: 'normalized_area_fraction',
      candidatePaths: [traceF1.selectedPathIds, traceF100.selectedPathIds],
      preconditionResults: [
        { path: ['R=1'], status: traceF1.status },
        { path: ['R=100'], status: traceF100.status },
      ],
      selectedPath: traceF1.selectedPathIds,
      executionResult: { F_R1: traceF1.finalValue, F_R100: traceF100.finalValue },
      expected: 'Identical scale-invariant ratio F ≈ 0.413497',
      observed: `F(R=1)=${traceF1.finalValue}, F(R=100)=${traceF100.finalValue}`,
      pass,
      notes: 'Guarantees that normalized area fraction F is strictly scale-invariant.',
    });
  }

  // =========================================================================
  // TEST 40 — S7: Adversarial Area Rejection (K > (3√3 / 4) * R²)
  // Claiming K = 35 for R = 5 (max K ≈ 32.476) triggers PRECONDITION_FAILED
  // =========================================================================
  {
    const input: FactMap = { triangle_area: 35, R: 5 };
    const trace = nav.solve(input, 'normalized_area_fraction');
    const pass = trace.status === 'PRECONDITION_FAILED' && trace.finalValue === null;

    reports.push({
      testId: 'TEST 40',
      testName: 'Adversarial Rejection: Area Exceeding Maximum (K > K_max)',
      input,
      target: 'normalized_area_fraction',
      candidatePaths: [['DP-NORMALIZED-AREA']],
      preconditionResults: [{ path: ['DP-NORMALIZED-AREA'], status: trace.status, reason: trace.message }],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED (impossible inscribed triangle area)',
      observed: trace.status,
      pass,
      notes: 'Blocks hallucinated claims that inscribed triangle area can exceed maximal circumscribed bound.',
    });
  }

  // =========================================================================
  // TEST 41 — S7: Obtuse Triangle Area Calculation
  // 120/30/30, R=5 => K = 2 * 25 * (√3/2) * (1/2) * (1/2) = 10.8253175
  // F = √3 / (4π) ≈ 0.137832
  // =========================================================================
  {
    const input: FactMap = { angle_A: 120, angle_B: 30, angle_C: 30, R: 5 };
    const traceArea = nav.solve(input, 'triangle_area');
    const kVal = Number(traceArea.finalValue);

    const traceF = nav.solve({ triangle_area: kVal, R: 5 }, 'normalized_area_fraction');
    const expectedK = 2 * 25 * (Math.sqrt(3) / 2) * 0.5 * 0.5;
    const expectedF = Math.sqrt(3) / (4 * Math.PI);

    const pass =
      traceArea.status === 'SUCCESS' &&
      Math.abs(kVal - expectedK) < 1e-4 &&
      traceF.status === 'SUCCESS' &&
      Math.abs(Number(traceF.finalValue) - expectedF) < 1e-4;

    reports.push({
      testId: 'TEST 41',
      testName: 'Obtuse Triangle Area & Fraction (120/30/30 => F ≈ 0.138)',
      input,
      target: 'triangle_area, normalized_area_fraction',
      candidatePaths: [traceArea.selectedPathIds, traceF.selectedPathIds],
      preconditionResults: [
        { path: ['DP-TRIANGLE-AREA-ANGLES-R'], status: traceArea.status },
        { path: ['DP-NORMALIZED-AREA'], status: traceF.status },
      ],
      selectedPath: [...traceArea.selectedPathIds, ...traceF.selectedPathIds],
      executionResult: { K: kVal, F: traceF.finalValue },
      expected: { K: expectedK, F: expectedF },
      observed: { K: kVal, F: traceF.finalValue },
      pass,
      notes: 'Validates area evaluation across obtuse geometry boundary.',
    });
  }

  // =========================================================================
  // TEST 42 — S7: Invalid Circumradius and Non-Physical Angle Rejection
  // R <= 0 or non-physical angle (angle_A <= 0 or angle sum invalid) triggers PRECONDITION_FAILED
  // =========================================================================
  {
    const inputZeroR: FactMap = { angle_A: 60, angle_B: 60, angle_C: 60, R: 0 };
    const traceZeroR = nav.solve(inputZeroR, 'triangle_area');

    const inputNegAngle: FactMap = { angle_A: -10, angle_B: 100, angle_C: 90, R: 5 };
    const traceNegAngle = nav.solve(inputNegAngle, 'triangle_area');

    const pass =
      traceZeroR.status === 'PRECONDITION_FAILED' &&
      traceNegAngle.status === 'PRECONDITION_FAILED' &&
      traceZeroR.finalValue === null &&
      traceNegAngle.finalValue === null;

    reports.push({
      testId: 'TEST 42',
      testName: 'Invalid Circumradius and Non-Physical Angle Rejection',
      input: { R_zero: 0, angle_A_neg: -10, R: 5 },
      target: 'triangle_area',
      candidatePaths: [['DP-TRIANGLE-AREA-ANGLES-R']],
      preconditionResults: [
        { path: ['R=0'], status: traceZeroR.status },
        { path: ['angle_A=-10'], status: traceNegAngle.status },
      ],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED for non-physical parameters',
      observed: `R=0: ${traceZeroR.status}, angle_A=-10: ${traceNegAngle.status}`,
      pass,
      notes: 'Guarantees physical safety boundaries on triangle area parameters.',
    });
  }

  // =========================================================================
  // TEST 43 — S8: Radial Triplet Reconstruction to Sides Triplet
  // d_a = 2.5, d_b = 2.5, d_c = 2.5 with R = 5 (Equilateral Triangle)
  // Reconstructs side_a = side_b = side_c = 2√(25 - 6.25) = 5√3 ≈ 8.660254
  // =========================================================================
  {
    const input: FactMap = {
      radial_distance_a: 2.5,
      radial_distance_b: 2.5,
      radial_distance_c: 2.5,
      R: 5,
    };
    const trace = nav.solve(input, 'sides_triplet');
    const triplet = trace.finalValue as { side_a: number; side_b: number; side_c: number } | null;
    const expectedSide = 5 * Math.sqrt(3);

    const pass =
      trace.status === 'SUCCESS' &&
      triplet !== null &&
      Math.abs(triplet.side_a - expectedSide) < 1e-4 &&
      Math.abs(triplet.side_b - expectedSide) < 1e-4 &&
      Math.abs(triplet.side_c - expectedSide) < 1e-4;

    reports.push({
      testId: 'TEST 43',
      testName: 'Radial Triplet Reconstruction to Sides Triplet (Equilateral 5√3)',
      input,
      target: 'sides_triplet',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: ['DP-RADIAL-TRIPLET-TO-SIDES'], status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: triplet,
      expected: { side_a: expectedSide, side_b: expectedSide, side_c: expectedSide },
      observed: triplet,
      pass,
      notes: 'Deterministically recovers triangle side lengths from orthogonal radial distance triplet.',
    });
  }

  // =========================================================================
  // TEST 44 — S8: Acute Inradius Derivation via Radial Sum (r = ∑d_i - R)
  // Equilateral: d_a=d_b=d_c=2.5, R=5 => r = 7.5 - 5 = 2.5 (= R/2)
  // Scalene Acute (45/60/75, R=10): d_a=10cos45, d_b=10cos60, d_c=10cos75 => r ≈ 4.659258
  // =========================================================================
  {
    const inputEq: FactMap = {
      radial_distance_a: 2.5,
      radial_distance_b: 2.5,
      radial_distance_c: 2.5,
      R: 5,
      is_acute: true,
    };
    const traceEq = nav.solve(inputEq, 'inradius');
    const rEq = Number(traceEq.finalValue);

    const daScalene = 10 * Math.cos((45 * Math.PI) / 180);
    const dbScalene = 10 * Math.cos((60 * Math.PI) / 180);
    const dcScalene = 10 * Math.cos((75 * Math.PI) / 180);
    const inputScalene: FactMap = {
      radial_distance_a: daScalene,
      radial_distance_b: dbScalene,
      radial_distance_c: dcScalene,
      R: 10,
      is_acute: true,
    };
    const traceScalene = nav.solve(inputScalene, 'inradius');
    const rScalene = Number(traceScalene.finalValue);
    const expectedScalene = daScalene + dbScalene + dcScalene - 10;

    const pass =
      traceEq.status === 'SUCCESS' &&
      Math.abs(rEq - 2.5) < 1e-4 &&
      traceScalene.status === 'SUCCESS' &&
      Math.abs(rScalene - expectedScalene) < 1e-4;

    reports.push({
      testId: 'TEST 44',
      testName: 'Acute Inradius Derivation via Radial Sum (r = ∑d_i - R)',
      input: inputScalene,
      target: 'inradius',
      candidatePaths: [traceEq.selectedPathIds, traceScalene.selectedPathIds],
      preconditionResults: [
        { path: ['Equilateral'], status: traceEq.status },
        { path: ['Scalene Acute'], status: traceScalene.status },
      ],
      selectedPath: traceEq.selectedPathIds,
      executionResult: { r_eq: rEq, r_scalene: rScalene },
      expected: { r_eq: 2.5, r_scalene: expectedScalene },
      observed: { r_eq: rEq, r_scalene: rScalene },
      pass,
      notes: 'Validates classical Carnot identity r = d_a + d_b + d_c - R for acute triangles.',
    });
  }

  // =========================================================================
  // TEST 45 — S8: Adversarial AI-Agent Cross-Check Rejection (Section 14 Scenario)
  // Agent claims R = 5, right triangle 6-8-10 with hypotenuse c = 10, and claims d_c = 2.5.
  // Stand computes true d_c = √(5² - (10/2)²) = 0.
  // Agent claim fails cross-verification check.
  // =========================================================================
  {
    const inputStand: FactMap = { chord_length: 10, R: 5 };
    const traceStand = nav.solve(inputStand, 'radial_distance');
    const trueDc = Number(traceStand.finalValue);

    const claimedDc = 2.5;
    const isConsistent = Math.abs(trueDc - claimedDc) < 1e-4;
    const pass = traceStand.status === 'SUCCESS' && trueDc === 0 && !isConsistent;

    reports.push({
      testId: 'TEST 45',
      testName: 'Adversarial AI-Agent Cross-Check: Conflicting Radial Distance Claim',
      input: { claimed_side_c: 10, claimed_d_c: 2.5, R: 5 },
      target: 'radial_distance',
      candidatePaths: [traceStand.selectedPathIds],
      preconditionResults: [{ path: ['DP-CHORD-TO-RADIAL-DIST'], status: traceStand.status }],
      selectedPath: traceStand.selectedPathIds,
      executionResult: { true_d_c: trueDc, claimed_d_c: claimedDc, consistent: isConsistent },
      expected: 'Detected conflict: true d_c = 0 vs claimed d_c = 2.5',
      observed: `True d_c = ${trueDc}, Claimed d_c = ${claimedDc} (Mismatch detected: agent rejected)`,
      pass,
      notes: 'Proves stand catches subtle geometric hallucination where perimeter/area alone might overlook the error.',
    });
  }

  // =========================================================================
  // TEST 46 — S8: Adversarial Rejection on Radial Triplet (d > R & Triangle Inequality)
  // 1. d_a = 6 > R=5 => PRECONDITION_FAILED
  // 2. d_a = 0, d_b = 4.99, d_c = 4.99 (a=10, b≈0.63, c≈0.63 => b+c < a) => PRECONDITION_FAILED
  // =========================================================================
  {
    const inputOverR: FactMap = { radial_distance_a: 6, radial_distance_b: 2.5, radial_distance_c: 2.5, R: 5 };
    const traceOverR = nav.solve(inputOverR, 'sides_triplet');

    const inputImpossibleTriangle: FactMap = {
      radial_distance_a: 0,
      radial_distance_b: 4.99,
      radial_distance_c: 4.99,
      R: 5,
    };
    const traceImpossible = nav.solve(inputImpossibleTriangle, 'sides_triplet');

    const pass =
      traceOverR.status === 'PRECONDITION_FAILED' &&
      traceImpossible.status === 'PRECONDITION_FAILED' &&
      traceOverR.finalValue === null &&
      traceImpossible.finalValue === null;

    reports.push({
      testId: 'TEST 46',
      testName: 'Adversarial Rejection: Radial Distance > R and Triangle Inequality Violation',
      input: { d_a_over_R: 6, d_a_zero: 0, d_b_close: 4.99, d_c_close: 4.99, R: 5 },
      target: 'sides_triplet',
      candidatePaths: [['DP-RADIAL-TRIPLET-TO-SIDES']],
      preconditionResults: [
        { path: ['d_a=6 > R=5'], status: traceOverR.status },
        { path: ['reconstructed sides violate inequality'], status: traceImpossible.status },
      ],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED on both illegal distance and illegal topology',
      observed: `d>R: ${traceOverR.status}, Inequality violation: ${traceImpossible.status}`,
      pass,
      notes: 'Guarantees boundary protection on radial distance triplet geometry.',
    });
  }

  // =========================================================================
  // TEST 47 — S8: Non-Acute Inradius Rejection (is_acute === false / missing)
  // Unsigned radial sum fails for obtuse/non-acute triangles without signed context.
  // =========================================================================
  {
    const inputNonAcute: FactMap = {
      radial_distance_a: 2.5,
      radial_distance_b: 2.5,
      radial_distance_c: 2.5,
      R: 5,
      is_acute: false,
    };
    const trace = nav.solve(inputNonAcute, 'inradius');
    const pass = trace.status === 'PRECONDITION_FAILED' && trace.finalValue === null;

    reports.push({
      testId: 'TEST 47',
      testName: 'Non-Acute Inradius Rejection (is_acute=false enforces Carnot domain boundary)',
      input: inputNonAcute,
      target: 'inradius',
      candidatePaths: [['DP-RADIAL-SUM-TO-INRADIUS']],
      preconditionResults: [{ path: ['DP-RADIAL-SUM-TO-INRADIUS'], status: trace.status }],
      selectedPath: [],
      executionResult: null,
      expected: 'PRECONDITION_FAILED when acute context is not satisfied',
      observed: trace.status,
      pass,
      notes: 'Enforces epistemic isolation preventing invalid Carnot sum on non-acute configurations.',
    });
  }

  // =========================================================================
  // TEST 48 — S9 (T1): Cross-Representation Consistency Engine: Valid Consistent State
  // Trusted: R=5, A=30, B=60, C=90
  // Asserted: a=5, d_a=4.330127, c=10, d_c=0, triangle_area=21.650635
  // Expected: overallStatus = 'CONSISTENT', all assertions verified with witnesses
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 5, angle_A: 30, angle_B: 60, angle_C: 90 };
    const asserted: FactMap = {
      side_a: 5,
      radial_distance_a: Math.sqrt(25 - 6.25), // 4.330127
      side_c: 10,
      radial_distance_c: 0,
      triangle_area: 21.650635094610966,
    };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const pass =
      report.overallStatus === 'CONSISTENT' &&
      report.contradictedFacts.length === 0 &&
      report.verifiedFacts.length >= 4 &&
      report.witnesses.every((w) => w.status === 'VERIFIED');

    reports.push({
      testId: 'TEST 48',
      testName: 'Cross-Representation Consistency: Valid Consistent Right Scalene State',
      input: { trusted, asserted },
      target: 'overall_consistency',
      candidatePaths: [['ConsistencyEngine.verify']],
      preconditionResults: [{ path: ['ConsistencyEngine.verify'], status: 'SUCCESS' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: report,
      expected: { overallStatus: 'CONSISTENT', contradicted: 0 },
      observed: { overallStatus: report.overallStatus, contradicted: report.contradictedFacts.length },
      pass,
      notes: 'Confirms that valid cross-representation assertions are all proven consistent with witnesses.',
    });
  }

  // =========================================================================
  // TEST 49 — S9 (T2): Contradiction Detection: Wrong Side Assertion (claimed a=8 vs derived 5)
  // Trusted: R=5, A=30
  // Asserted: side_a = 8
  // Expected: overallStatus = 'INCONSISTENT', ContradictionWitness generated
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 5, angle_A: 30 };
    const asserted: FactMap = { side_a: 8 };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const sideWitness = report.witnesses.find((w) => w.fact === 'side_a');

    const pass =
      report.overallStatus === 'INCONSISTENT' &&
      report.contradictedFacts.includes('side_a') &&
      sideWitness !== undefined &&
      sideWitness.status === 'CONTRADICTED' &&
      sideWitness.claimed === 8 &&
      Math.abs(Number(sideWitness.expected) - 5) < 1e-4;

    reports.push({
      testId: 'TEST 49',
      testName: 'Contradiction Localization: Wrong Side Assertion (a=8 vs expected 5)',
      input: { trusted, asserted },
      target: 'side_a_consistency',
      candidatePaths: [['ConsistencyEngine.verify']],
      preconditionResults: [{ path: ['DP-CHORD-TRIG'], status: 'CONTRADICTED' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: sideWitness,
      expected: { status: 'CONTRADICTED', claimed: 8, expected: 5 },
      observed: {
        status: sideWitness?.status,
        claimed: sideWitness?.claimed,
        expected: sideWitness?.expected,
      },
      pass,
      notes: 'Pinpoints precise algebraic contradiction witness for false side claim.',
    });
  }

  // =========================================================================
  // TEST 50 — S9 (T3): Contradiction Detection: Pythagorean Invariant Failure (d_a=2.5 vs expected 4)
  // Trusted: R=5, side_a = 6
  // Asserted: radial_distance_a = 2.5
  // Expected: overallStatus = 'INCONSISTENT', d_a contradicted (expected √(25 - 9) = 4)
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 5, side_a: 6 };
    const asserted: FactMap = { radial_distance_a: 2.5 };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const radWitness = report.witnesses.find((w) => w.fact === 'radial_distance_a');

    const pass =
      report.overallStatus === 'INCONSISTENT' &&
      report.contradictedFacts.includes('radial_distance_a') &&
      radWitness !== undefined &&
      radWitness.status === 'CONTRADICTED' &&
      radWitness.claimed === 2.5 &&
      Math.abs(Number(radWitness.expected) - 4) < 1e-4;

    reports.push({
      testId: 'TEST 50',
      testName: 'Contradiction Localization: Pythagorean Invariant Violation (d_a=2.5 vs expected 4)',
      input: { trusted, asserted },
      target: 'radial_distance_a_consistency',
      candidatePaths: [['ConsistencyEngine.verify']],
      preconditionResults: [{ path: ['DP-CHORD-TO-RADIAL-DIST'], status: 'CONTRADICTED' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: radWitness,
      expected: { status: 'CONTRADICTED', claimed: 2.5, expected: 4 },
      observed: {
        status: radWitness?.status,
        claimed: radWitness?.claimed,
        expected: radWitness?.expected,
      },
      pass,
      notes: 'Detects orthogonal Pythagorean inconsistency between chord length and radial distance.',
    });
  }

  // =========================================================================
  // TEST 51 — S9 (T4): Multi-Path Area Divergence & Contradicted Area Assertion
  // Trusted: R=5, angle_A=30, angle_B=60, angle_C=90, side_a=5, side_b=5√3, side_c=10
  // Asserted: triangle_area = 40 (true K ≈ 21.650635)
  // Expected: overallStatus = 'INCONSISTENT', area contradicted with route evidence
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = {
      R: 5,
      angle_A: 30,
      angle_B: 60,
      angle_C: 90,
      side_a: 5,
      side_b: 5 * Math.sqrt(3),
      side_c: 10,
    };
    const asserted: FactMap = { triangle_area: 40 };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const areaWitness = report.witnesses.find((w) => w.fact === 'triangle_area');

    const pass =
      report.overallStatus === 'INCONSISTENT' &&
      report.contradictedFacts.includes('triangle_area') &&
      areaWitness !== undefined &&
      areaWitness.status === 'CONTRADICTED' &&
      areaWitness.claimed === 40;

    reports.push({
      testId: 'TEST 51',
      testName: 'Multi-Path Area Verification: False Area Assertion (claimed K=40 vs derived ~21.65)',
      input: { trusted, asserted },
      target: 'triangle_area_consistency',
      candidatePaths: [['ConsistencyEngine.verify']],
      preconditionResults: [{ path: ['Multi-Path Area Check'], status: 'CONTRADICTED' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: areaWitness,
      expected: { status: 'CONTRADICTED', claimed: 40, expected: 21.650635094610966 },
      observed: {
        status: areaWitness?.status,
        claimed: areaWitness?.claimed,
        expected: areaWitness?.expected,
      },
      pass,
      notes: 'Validates independent multi-route area convergence against asserted hallucinated value.',
    });
  }

  // =========================================================================
  // TEST 52 — S9 (T7): Underdetermined Assertion (insufficient premises to prove or disprove)
  // Trusted: R=5
  // Asserted: triangle_area = 21.65 (without any side or angle specification)
  // Expected: overallStatus = 'UNDERDETERMINED', no false positive verification or contradiction
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 5 };
    const asserted: FactMap = { triangle_area: 21.65 };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const areaWitness = report.witnesses.find((w) => w.fact === 'triangle_area');

    const pass =
      report.overallStatus === 'UNDERDETERMINED' &&
      report.underdeterminedFacts.includes('triangle_area') &&
      report.contradictedFacts.length === 0 &&
      areaWitness?.status === 'UNDERDETERMINED';

    reports.push({
      testId: 'TEST 52',
      testName: 'Epistemic Underdetermination: Area Assertion with Insufficient Premises',
      input: { trusted, asserted },
      target: 'underdetermined_check',
      candidatePaths: [['ConsistencyEngine.verify']],
      preconditionResults: [{ path: ['None'], status: 'UNDERDETERMINED' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: report,
      expected: { overallStatus: 'UNDERDETERMINED', underdeterminedCount: 1 },
      observed: {
        overallStatus: report.overallStatus,
        underdeterminedCount: report.underdeterminedFacts.length,
      },
      pass,
      notes: 'Ensures system never creates false positives or false negatives under insufficient information.',
    });
  }

  // =========================================================================
  // TEST 53 — S9 (T10): Domain Boundary & Physical Precondition Rejection (side > 2R)
  // Trusted: R=5
  // Asserted: side_a = 12 (exceeds diameter 2R = 10)
  // Expected: overallStatus = 'PRECONDITION_FAILED'
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 5 };
    const asserted: FactMap = { side_a: 12 };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const sideWitness = report.witnesses.find((w) => w.fact === 'side_a');

    const pass =
      report.overallStatus === 'PRECONDITION_FAILED' &&
      sideWitness?.status === 'PRECONDITION_FAILED';

    reports.push({
      testId: 'TEST 53',
      testName: 'Physical Boundary Rejection: Side Length Exceeding Circumdiameter (s > 2R)',
      input: { trusted, asserted },
      target: 'domain_boundary_check',
      candidatePaths: [['ConsistencyEngine.verify']],
      preconditionResults: [{ path: ['Diameter Upper Bound'], status: 'PRECONDITION_FAILED' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: report,
      expected: { overallStatus: 'PRECONDITION_FAILED' },
      observed: { overallStatus: report.overallStatus },
      pass,
      notes: 'Blocks physically impossible assertions exceeding geometric diameter upper bound.',
    });
  }

  // =========================================================================
  // TEST 54 — S10 (Attack M): Trust Boundary Collision (Agent attempts to overwrite R)
  // Trusted: R=5
  // Asserted: R=10
  // Expected: overallStatus = 'INCONSISTENT', ContradictionWitness generated for R
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 5 };
    const asserted: FactMap = { R: 10 };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const rWitness = report.witnesses.find((w) => w.fact === 'R');

    const pass =
      report.overallStatus === 'INCONSISTENT' &&
      report.contradictedFacts.includes('R') &&
      rWitness !== undefined &&
      rWitness.status === 'CONTRADICTED' &&
      rWitness.claimed === 10 &&
      rWitness.expected === 5;

    reports.push({
      testId: 'TEST 54',
      testName: 'Trust Boundary Collision: Agent Overwrite Rejection (R=10 vs immutable R=5)',
      input: { trusted, asserted },
      target: 'trust_boundary_R',
      candidatePaths: [['ConsistencyEngine.checkTrustBoundaryCollisions']],
      preconditionResults: [{ path: ['Trust Boundary Immutable Collision'], status: 'CONTRADICTED' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: rWitness,
      expected: { status: 'CONTRADICTED', claimed: 10, expected: 5 },
      observed: { status: rWitness?.status, claimed: rWitness?.claimed, expected: rWitness?.expected },
      pass,
      notes: 'Enforces immutable trust boundary preventing agent assertions from polluting baseline ground-truth.',
    });
  }

  // =========================================================================
  // TEST 55 — S10 (Attack M): Trust Boundary Collision (Agent attempts to overwrite trusted side)
  // Trusted: R=5, side_a = 5
  // Asserted: side_a = 8
  // Expected: overallStatus = 'INCONSISTENT', ContradictionWitness generated for side_a
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 5, side_a: 5 };
    const asserted: FactMap = { side_a: 8 };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const sideWitness = report.witnesses.find((w) => w.fact === 'side_a');

    const pass =
      report.overallStatus === 'INCONSISTENT' &&
      report.contradictedFacts.includes('side_a') &&
      sideWitness !== undefined &&
      sideWitness.status === 'CONTRADICTED' &&
      sideWitness.claimed === 8 &&
      sideWitness.expected === 5;

    reports.push({
      testId: 'TEST 55',
      testName: 'Trust Boundary Collision: Overwrite Rejection of Trusted Side (side_a=8 vs trusted 5)',
      input: { trusted, asserted },
      target: 'trust_boundary_side',
      candidatePaths: [['ConsistencyEngine.checkTrustBoundaryCollisions']],
      preconditionResults: [{ path: ['Trust Boundary Immutable Collision'], status: 'CONTRADICTED' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: sideWitness,
      expected: { status: 'CONTRADICTED', claimed: 8, expected: 5 },
      observed: { status: sideWitness?.status, claimed: sideWitness?.claimed, expected: sideWitness?.expected },
      pass,
      notes: 'Ensures ground-truth side parameters cannot be mutated by adversarial agent payloads.',
    });
  }

  // =========================================================================
  // TEST 56 — S10 (Attack B/N): Circular Self-Validating Cluster Rejection
  // Trusted: R=5, angle_A=30 (true side_a = 5, true d_a = √18.75 ≈ 4.330127)
  // Asserted: side_a = 8, radial_distance_a = 3 (Note: 3² + 4² = 25, self-consistent cluster derived from false premise a=8)
  // Expected: overallStatus = 'INCONSISTENT', BOTH side_a and radial_distance_a CONTRADICTED against ground truth!
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 5, angle_A: 30 };
    const asserted: FactMap = { side_a: 8, radial_distance_a: 3 };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const sideWitness = report.witnesses.find((w) => w.fact === 'side_a');
    const radWitness = report.witnesses.find((w) => w.fact === 'radial_distance_a');

    const pass =
      report.overallStatus === 'INCONSISTENT' &&
      report.contradictedFacts.includes('side_a') &&
      report.contradictedFacts.includes('radial_distance_a') &&
      sideWitness?.status === 'CONTRADICTED' &&
      radWitness?.status === 'CONTRADICTED' &&
      Math.abs(Number(radWitness?.expected) - Math.sqrt(25 - 6.25)) < 1e-4;

    reports.push({
      testId: 'TEST 56',
      testName: 'Anti-Circular Routing: Rejection of Self-Consistent False Cluster (a=8, d_a=3 vs true a=5, d_a=4.33)',
      input: { trusted, asserted },
      target: 'anti_circular_cluster',
      candidatePaths: [['ConsistencyEngine.checkSideAngleRelations', 'ConsistencyEngine.checkRadialDistanceInvariants']],
      preconditionResults: [{ path: ['Ground-truth Provenance Anchor'], status: 'CONTRADICTED' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: report,
      expected: { overallStatus: 'INCONSISTENT', contradicted: ['side_a', 'radial_distance_a'] },
      observed: { overallStatus: report.overallStatus, contradicted: report.contradictedFacts },
      pass,
      notes: 'Blocks circular self-validation where agent fabricates an internally consistent false cluster.',
    });
  }

  // =========================================================================
  // TEST 57 — S10 (Attack K): Non-Finite / NaN Adversarial Input Rejection
  // Trusted: R=5
  // Asserted: side_a = NaN, radial_distance_a = Infinity
  // Expected: overallStatus = 'PRECONDITION_FAILED'
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 5 };
    const asserted: FactMap = { side_a: NaN, radial_distance_a: Infinity };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const pass =
      report.overallStatus === 'PRECONDITION_FAILED' &&
      report.witnesses.some((w) => w.status === 'PRECONDITION_FAILED' && w.fact === 'side_a') &&
      report.witnesses.some((w) => w.status === 'PRECONDITION_FAILED' && w.fact === 'radial_distance_a');

    reports.push({
      testId: 'TEST 57',
      testName: 'Adversarial Sanity: Non-Finite / NaN Injection Rejection',
      input: { trusted, asserted },
      target: 'non_finite_sanity',
      candidatePaths: [['ConsistencyEngine.checkDomainAndSanity']],
      preconditionResults: [{ path: ['Numerical Sanity Check'], status: 'PRECONDITION_FAILED' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: report,
      expected: { overallStatus: 'PRECONDITION_FAILED' },
      observed: { overallStatus: report.overallStatus },
      pass,
      notes: 'Safely traps non-finite numbers and NaN payloads before algebraic evaluation.',
    });
  }

  // =========================================================================
  // TEST 58 — S10 (Attack J): Macro-Scale Relative Tolerance Invariance
  // Trusted: R=10000, angle_A=30
  // Asserted: side_a = 10000 (true value 2 * 10000 * sin(30°) = 10000)
  // Expected: overallStatus = 'CONSISTENT', proven verified with scale-aware tolerance
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 10000, angle_A: 30 };
    const asserted: FactMap = { side_a: 10000 };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const sideWitness = report.witnesses.find((w) => w.fact === 'side_a');

    const pass =
      report.overallStatus === 'CONSISTENT' &&
      report.contradictedFacts.length === 0 &&
      sideWitness?.status === 'VERIFIED';

    reports.push({
      testId: 'TEST 58',
      testName: 'Scale Invariance: Macro-Scale Geometric Assertion (R=10000, side_a=10000)',
      input: { trusted, asserted },
      target: 'macro_scale_invariance',
      candidatePaths: [['ConsistencyEngine.verify']],
      preconditionResults: [{ path: ['DP-CHORD-TRIG'], status: 'SUCCESS' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: sideWitness,
      expected: { overallStatus: 'CONSISTENT', side_a: 'VERIFIED' },
      observed: { overallStatus: report.overallStatus, side_a: sideWitness?.status },
      pass,
      notes: 'Confirms that macro-scale configurations maintain robust verification without scale drift.',
    });
  }

  // =========================================================================
  // TEST 59 — S12 (Route A1): Inscribed Angle -> Chord -> Side A
  // Input: R=5, angle_A=30
  // Target: side_a
  // Expected: side_a = 5.0 via DP-INSC-TO-CENT -> DP-CHORD-TRIG -> DP-MAP-CHORD-BC-TO-SIDE-A
  // =========================================================================
  {
    const input: FactMap = { R: 5, angle_A: 30 };
    const trace = nav.solve(input, 'side_a');
    const pass =
      trace.status === 'SUCCESS' &&
      typeof trace.finalValue === 'number' &&
      Math.abs(trace.finalValue - 5.0) < 1e-4 &&
      trace.selectedPathIds.includes('DP-INSC-TO-CENT') &&
      trace.selectedPathIds.includes('DP-CHORD-TRIG') &&
      trace.selectedPathIds.includes('DP-MAP-CHORD-BC-TO-SIDE-A');

    reports.push({
      testId: 'TEST 59',
      testName: 'Route A1: Inscribed Angle A -> Central Angle -> Chord BC -> Side A',
      input,
      target: 'side_a',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'SUCCESS', side_a: 5.0 },
      observed: { status: trace.status, side_a: trace.finalValue },
      pass,
      notes: 'Unifies angle_A and side_a via circumscribed chord BC role mapping.',
    });
  }

  // =========================================================================
  // TEST 60 — S12 (Route A2): Symmetric Inscribed Angle B -> Chord CA -> Side B
  // Input: R=5, angle_B=60
  // Target: side_b
  // Expected: side_b = 5 * sqrt(3) ~= 8.660254
  // =========================================================================
  {
    const input: FactMap = { R: 5, angle_B: 60 };
    const trace = nav.solve(input, 'side_b');
    const expectedVal = 5 * Math.sqrt(3);
    const pass =
      trace.status === 'SUCCESS' &&
      typeof trace.finalValue === 'number' &&
      Math.abs(trace.finalValue - expectedVal) < 1e-4 &&
      trace.selectedPathIds.includes('DP-INSC-TO-CENT-B') &&
      trace.selectedPathIds.includes('DP-CHORD-TRIG-CA') &&
      trace.selectedPathIds.includes('DP-MAP-CHORD-CA-TO-SIDE-B');

    reports.push({
      testId: 'TEST 60',
      testName: 'Route A2: Symmetric Inscribed Angle B -> Chord CA -> Side B',
      input,
      target: 'side_b',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'SUCCESS', side_b: expectedVal },
      observed: { status: trace.status, side_b: trace.finalValue },
      pass,
      notes: 'Confirms symmetric derivation pipeline for vertex B.',
    });
  }

  // =========================================================================
  // TEST 61 — S12 (Route A3): Multi-Angle Circumscribed Triangle -> Triangle Area
  // Input: R=5, angle_A=30, angle_B=60, angle_C=90
  // Target: triangle_area
  // Expected: Area = 21.650635 (12.5 * sqrt(3))
  // =========================================================================
  {
    const input: FactMap = { R: 5, angle_A: 30, angle_B: 60, angle_C: 90 };
    const trace = nav.solve(input, 'triangle_area');
    const expectedArea = 12.5 * Math.sqrt(3);
    const pass =
      trace.status === 'SUCCESS' &&
      typeof trace.finalValue === 'number' &&
      Math.abs(trace.finalValue - expectedArea) < 1e-3;

    reports.push({
      testId: 'TEST 61',
      testName: 'Route A3: Angle Inputs to Circumscribed Triangle Area',
      input,
      target: 'triangle_area',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'SUCCESS', triangle_area: expectedArea },
      observed: { status: trace.status, triangle_area: trace.finalValue },
      pass,
      notes: 'Demonstrates multi-step convergence from pure angle inputs to area.',
    });
  }

  // =========================================================================
  // TEST 62 — S12 (Route B1): Composite Fact Destructuring -> Perimeter
  // Input: sides_triplet: { side_a: 5, side_b: 6, side_c: 7 }
  // Target: perimeter
  // Expected: 18.0
  // =========================================================================
  {
    const input: FactMap = { sides_triplet: { side_a: 5, side_b: 6, side_c: 7 } };
    const trace = nav.solve(input, 'perimeter');
    const pass =
      trace.status === 'SUCCESS' &&
      trace.finalValue === 18.0 &&
      trace.selectedPathIds.includes('DP-DECOMPOSE-SIDES-TRIPLET-A') &&
      trace.selectedPathIds.includes('DP-DECOMPOSE-SIDES-TRIPLET-B') &&
      trace.selectedPathIds.includes('DP-DECOMPOSE-SIDES-TRIPLET-C') &&
      trace.selectedPathIds.includes('DP-TRIANGLE-PERIMETER');

    reports.push({
      testId: 'TEST 62',
      testName: 'Route B1: Composite Fact Decomposition -> Perimeter',
      input,
      target: 'perimeter',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'SUCCESS', perimeter: 18.0 },
      observed: { status: trace.status, perimeter: trace.finalValue },
      pass,
      notes: 'Transparently unpacks composite sides_triplet to satisfy perimeter dependencies.',
    });
  }

  // =========================================================================
  // TEST 63 — S12 (Route B2): Composite Fact Destructuring -> Heron Area
  // Input: sides_triplet: { side_a: 3, side_b: 4, side_c: 5 }
  // Target: triangle_area
  // Expected: 6.0
  // =========================================================================
  {
    const input: FactMap = { sides_triplet: { side_a: 3, side_b: 4, side_c: 5 } };
    const trace = nav.solve(input, 'triangle_area');
    const pass =
      trace.status === 'SUCCESS' &&
      typeof trace.finalValue === 'number' &&
      Math.abs(trace.finalValue - 6.0) < 1e-4 &&
      trace.selectedPathIds.includes('DP-TRIANGLE-AREA-HERON');

    reports.push({
      testId: 'TEST 63',
      testName: 'Route B2: Composite Fact Decomposition -> Heron Area',
      input,
      target: 'triangle_area',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'SUCCESS', triangle_area: 6.0 },
      observed: { status: trace.status, triangle_area: trace.finalValue },
      pass,
      notes: 'Decomposes 3-4-5 sides_triplet directly to Heron area calculation.',
    });
  }

  // =========================================================================
  // TEST 64 — S12 (Route B3): Malformed Composite Fact Rejection
  // Input: sides_triplet: { side_a: 5, side_b: -2, side_c: 7 }
  // Target: perimeter
  // Expected: PRECONDITION_FAILED (negative side length invalidates composite schema)
  // =========================================================================
  {
    const input: FactMap = { sides_triplet: { side_a: 5, side_b: -2, side_c: 7 } };
    const trace = nav.solve(input, 'perimeter');
    const pass = trace.status !== 'SUCCESS' && trace.finalValue === null;

    reports.push({
      testId: 'TEST 64',
      testName: 'Route B3: Malformed Composite Fact Precondition Rejection',
      input,
      target: 'perimeter',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'FAIL', finalValue: null },
      observed: { status: trace.status, finalValue: trace.finalValue },
      pass,
      notes: 'Prevents decomposition of invalid or corrupt composite structures.',
    });
  }

  // =========================================================================
  // TEST 65 — S12 (Route C1): Transferred Angle Theta_A Bridge
  // Input: side_a: 5, R: 5
  // Target: theta_a
  // Expected: 60.0 degrees (2 * asin(5/10) = 2 * 30° = 60°)
  // =========================================================================
  {
    const input: FactMap = { side_a: 5, R: 5 };
    const trace = nav.solve(input, 'theta_a');
    const pass =
      trace.status === 'SUCCESS' &&
      typeof trace.finalValue === 'number' &&
      Math.abs(trace.finalValue - 60.0) < 1e-4 &&
      trace.selectedPathIds.includes('DP-SIDE-A-TO-TRANSFERRED-ANGLE');

    reports.push({
      testId: 'TEST 65',
      testName: 'Route C1: Transferred Angle Theta_A Bridge',
      input,
      target: 'theta_a',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'SUCCESS', theta_a: 60.0 },
      observed: { status: trace.status, theta_a: trace.finalValue },
      pass,
      notes: 'Bridges side_a to minor central angle theta_a via arcsin derivation.',
    });
  }

  // =========================================================================
  // TEST 66 — S12 (Route C2): Transferred Angle Triplet -> Sum -> Obtuse Diagnostic
  // Input: side_a: 6, side_b: 8, side_c: 10, R: 5
  // Target: transferred_angle_sum and diagnostic_triangle_class
  // Expected: sum = 360.0, diagnostic = 'ACUTE_RIGHT'
  // =========================================================================
  {
    const input: FactMap = { side_a: 6, side_b: 8, side_c: 10, R: 5 };
    const traceSum = nav.solve(input, 'transferred_angle_sum');
    const traceDiag = nav.solve(input, 'diagnostic_triangle_class');

    const pass =
      traceSum.status === 'SUCCESS' &&
      typeof traceSum.finalValue === 'number' &&
      Math.abs(traceSum.finalValue - 360.0) < 1e-3 &&
      traceDiag.status === 'SUCCESS' &&
      traceDiag.finalValue === 'ACUTE_RIGHT';

    reports.push({
      testId: 'TEST 66',
      testName: 'Route C2: Transferred Angles -> Sum -> Obtuse Diagnostic',
      input,
      target: 'diagnostic_triangle_class',
      candidatePaths: [traceDiag.selectedPathIds],
      preconditionResults: [{ path: traceDiag.selectedPathIds, status: traceDiag.status }],
      selectedPath: traceDiag.selectedPathIds,
      executionResult: { sum: traceSum.finalValue, diagnostic: traceDiag.finalValue },
      expected: { sum: 360.0, diagnostic: 'ACUTE_RIGHT' },
      observed: { sum: traceSum.finalValue, diagnostic: traceDiag.finalValue },
      pass,
      notes: 'Verifies global closure connecting side lengths to obtuse angle diagnostic.',
    });
  }

  // =========================================================================
  // TEST 67 — S12 (Route D1): Generic Chord Mapping with Explicit Focus Context
  // Input: chord_BC: 8, focus_chord: 'BC', R: 5
  // Target: radial_distance
  // Expected: 3.0 (sqrt(25 - 16))
  // =========================================================================
  {
    const input: FactMap = { chord_BC: 8, focus_chord: 'BC', R: 5 };
    const trace = nav.solve(input, 'radial_distance');
    const pass =
      trace.status === 'SUCCESS' &&
      trace.finalValue === 3.0 &&
      trace.selectedPathIds.includes('DP-MAP-CHORD-BC-TO-CHORD-LENGTH') &&
      trace.selectedPathIds.includes('DP-CHORD-TO-RADIAL-DIST');

    reports.push({
      testId: 'TEST 67',
      testName: 'Route D1: Generic Chord Mapping with Explicit Focus Context',
      input,
      target: 'radial_distance',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'SUCCESS', radial_distance: 3.0 },
      observed: { status: trace.status, radial_distance: trace.finalValue },
      pass,
      notes: 'Permits generic chord calculation when focus context matches named chord.',
    });
  }

  // =========================================================================
  // TEST 68 — S12 (Route D2): Focus Chord Mismatch Prevents Ambiguous Mapping
  // Input: chord_BC: 8, focus_chord: 'CA', R: 5
  // Target: radial_distance
  // Expected: FAIL (precondition fails because focus_chord !== 'BC')
  // =========================================================================
  {
    const input: FactMap = { chord_BC: 8, focus_chord: 'CA', R: 5 };
    const trace = nav.solve(input, 'radial_distance');
    const pass = trace.status !== 'SUCCESS' && trace.finalValue === null;

    reports.push({
      testId: 'TEST 68',
      testName: 'Route D2: Context Mismatch Prevents Ambiguous Generic Mapping',
      input,
      target: 'radial_distance',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'FAIL', finalValue: null },
      observed: { status: trace.status, finalValue: trace.finalValue },
      pass,
      notes: 'Blocks generic mapping when focus context contradicts specified chord name.',
    });
  }

  // =========================================================================
  // TEST 69 — S12 (Route E1): Graph Order Independence - Permuted Fact Inputs
  // Permutation 1: { angle_C: 90, R: 5, angle_A: 30, angle_B: 60 }
  // Target: perimeter
  // Expected: Perimeter = 5 + 5*sqrt(3) + 10 ~= 23.660254
  // =========================================================================
  {
    const inputPerm1: FactMap = { angle_C: 90, R: 5, angle_A: 30, angle_B: 60 };
    const tracePerm1 = nav.solve(inputPerm1, 'perimeter');
    const expectedPerim = 5 + 5 * Math.sqrt(3) + 10;
    const pass =
      tracePerm1.status === 'SUCCESS' &&
      typeof tracePerm1.finalValue === 'number' &&
      Math.abs(tracePerm1.finalValue - expectedPerim) < 1e-4;

    reports.push({
      testId: 'TEST 69',
      testName: 'Route E1: Graph Order Independence (Permutation 1)',
      input: inputPerm1,
      target: 'perimeter',
      candidatePaths: [tracePerm1.selectedPathIds],
      preconditionResults: [{ path: tracePerm1.selectedPathIds, status: tracePerm1.status }],
      selectedPath: tracePerm1.selectedPathIds,
      executionResult: tracePerm1.finalValue,
      expected: { status: 'SUCCESS', perimeter: expectedPerim },
      observed: { status: tracePerm1.status, perimeter: tracePerm1.finalValue },
      pass,
      notes: 'Derives correct perimeter regardless of input key order.',
    });
  }

  // =========================================================================
  // TEST 70 — S12 (Route E2): Commutativity & Deterministic Trace Invariance
  // Compare Permutation 2: { R: 5, angle_A: 30, angle_B: 60, angle_C: 90 } with Permutation 1
  // Expected: Identical numerical result and identical deterministic trace
  // =========================================================================
  {
    const inputPerm1: FactMap = { angle_C: 90, R: 5, angle_A: 30, angle_B: 60 };
    const inputPerm2: FactMap = { R: 5, angle_A: 30, angle_B: 60, angle_C: 90 };
    const tracePerm1 = nav.solve(inputPerm1, 'perimeter');
    const tracePerm2 = nav.solve(inputPerm2, 'perimeter');

    const pass =
      tracePerm1.status === 'SUCCESS' &&
      tracePerm2.status === 'SUCCESS' &&
      tracePerm1.finalValue === tracePerm2.finalValue &&
      JSON.stringify(tracePerm1.selectedPathIds) === JSON.stringify(tracePerm2.selectedPathIds);

    reports.push({
      testId: 'TEST 70',
      testName: 'Route E2: Commutative Invariance Across Input Permutations',
      input: { perm1: inputPerm1, perm2: inputPerm2 },
      target: 'perimeter',
      candidatePaths: [tracePerm2.selectedPathIds],
      preconditionResults: [{ path: tracePerm2.selectedPathIds, status: tracePerm2.status }],
      selectedPath: tracePerm2.selectedPathIds,
      executionResult: { val1: tracePerm1.finalValue, val2: tracePerm2.finalValue },
      expected: 'Permutations produce identical value and path trace',
      observed: `val1=${tracePerm1.finalValue}, val2=${tracePerm2.finalValue}`,
      pass,
      notes: 'Guarantees strict commutativity and order-independent derivation.',
    });
  }

  // =========================================================================
  // TEST 71 — S12 (Route F1): Trust Boundary Semantic Collision Rejection
  // Trusted: R=5, side_a=5
  // Asserted: chord_BC=8 (semantic alias for side_a)
  // Expected: ConsistencyEngine flags CONTRADICTED on semantic correspondence
  // =========================================================================
  {
    const consistencyEngine = new ConsistencyEngine();
    const trusted: FactMap = { R: 5, side_a: 5 };
    const asserted: FactMap = { chord_BC: 8 };

    const report = consistencyEngine.verify({ trustedFacts: trusted, agentAssertions: asserted });
    const witness = report.witnesses.find((w) => w.fact === 'chord_BC');

    const pass =
      report.overallStatus === 'INCONSISTENT' &&
      report.contradictedFacts.includes('chord_BC') &&
      witness?.status === 'CONTRADICTED' &&
      witness?.route === 'Trust Boundary Semantic Collision';

    reports.push({
      testId: 'TEST 71',
      testName: 'Route F1: Semantic Alias Trust Boundary Collision Rejection',
      input: { trusted, asserted },
      target: 'chord_BC_semantic_alias',
      candidatePaths: [['ConsistencyEngine.checkTrustBoundaryCollisions']],
      preconditionResults: [{ path: ['Trust Boundary Semantic Collision'], status: 'CONTRADICTED' }],
      selectedPath: ['ConsistencyEngine.verify'],
      executionResult: witness,
      expected: { overallStatus: 'INCONSISTENT', chord_BC: 'CONTRADICTED' },
      observed: { overallStatus: report.overallStatus, chord_BC: witness?.status },
      pass,
      notes: 'Prevents adversarial bypass of trusted fact via semantic role alias.',
    });
  }

  // =========================================================================
  // TEST 72 — S12 (Route F2): Incompatible Convention Precondition Blocks Alias
  // Input: chord_BC: 5, triangle_convention: 'incompatible'
  // Target: side_a
  // Expected: FAIL (precondition fails)
  // =========================================================================
  {
    const input: FactMap = { chord_BC: 5, triangle_convention: 'incompatible' };
    const trace = nav.solve(input, 'side_a');
    const pass = trace.status !== 'SUCCESS' && trace.finalValue === null;

    reports.push({
      testId: 'TEST 72',
      testName: 'Route F2: Incompatible Convention Precondition Blocks Alias',
      input,
      target: 'side_a',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'FAIL', finalValue: null },
      observed: { status: trace.status, finalValue: trace.finalValue },
      pass,
      notes: 'Blocks triangle convention mappings when context indicates incompatible convention.',
    });
  }

  // =========================================================================
  // TEST 73 — S12 (Route F3): Physical Boundary Rejection in Semantic Bridge
  // Input: chord_BC: 12, R: 5 (chord length exceeds circumdiameter 10)
  // Target: side_a
  // Expected: FAIL (precondition fails because chord_BC > 2R)
  // =========================================================================
  {
    const input: FactMap = { chord_BC: 12, R: 5 };
    const trace = nav.solve(input, 'side_a');
    const pass = trace.status !== 'SUCCESS' && trace.finalValue === null;

    reports.push({
      testId: 'TEST 73',
      testName: 'Route F3: Physical Boundary Rejection in Semantic Bridge (chord > 2R)',
      input,
      target: 'side_a',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'FAIL', finalValue: null },
      observed: { status: trace.status, finalValue: trace.finalValue },
      pass,
      notes: 'Rejects semantic mapping when physical geometric bound chord <= 2R is violated.',
    });
  }

  // =========================================================================
  // TEST 74 — S12 (Route F4): Inscribed-to-Inradius Global Carnot Convergence
  // Acute equilateral triangle with R=5, side_a=side_b=side_c = 5*sqrt(3), is_acute=true
  // d_a = d_b = d_c = sqrt(25 - 18.75) = 2.5
  // inradius r = 2.5 + 2.5 + 2.5 - 5 = 2.5
  // =========================================================================
  {
    const s = 5 * Math.sqrt(3);
    const input: FactMap = { R: 5, side_a: s, side_b: s, side_c: s, is_acute: true };
    const trace = nav.solve(input, 'inradius');
    const pass =
      trace.status === 'SUCCESS' &&
      typeof trace.finalValue === 'number' &&
      Math.abs(trace.finalValue - 2.5) < 1e-4 &&
      trace.selectedPathIds.includes('DP-RADIAL-SUM-TO-INRADIUS');

    reports.push({
      testId: 'TEST 74',
      testName: 'Route F4: Global Trans-Cluster Inradius Carnot Convergence',
      input,
      target: 'inradius',
      candidatePaths: [trace.selectedPathIds],
      preconditionResults: [{ path: trace.selectedPathIds, status: trace.status }],
      selectedPath: trace.selectedPathIds,
      executionResult: trace.finalValue,
      expected: { status: 'SUCCESS', inradius: 2.5 },
      observed: { status: trace.status, inradius: trace.finalValue },
      pass,
      notes: 'Proves complete graph closure linking sides, radial distances, and inradius.',
    });
  }

  return reports;
}
