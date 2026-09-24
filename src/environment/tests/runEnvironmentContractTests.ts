// src/environment/tests/runEnvironmentContractTests.ts
// Autonomous Test Suite for Geometry Verification Stand Contract (18 Tests)

import { GeometryEnvironment } from '../GeometryEnvironment';
import { FactMap } from '../../kernel/types';

export interface EnvTestResult {
  testId: number;
  description: string;
  pass: boolean;
  notes?: string;
}

export function runEnvironmentContractTests(): EnvTestResult[] {
  const results: EnvTestResult[] = [];

  // TEST 1: Solve chord_BC
  {
    const env = new GeometryEnvironment({ angle_A: 30, R: 5 });
    const trace = env.solve('chord_BC');
    const pass = trace.status === 'SUCCESS' && Math.abs(Number(trace.finalValue) - 5.0) < 1e-4;
    results.push({ testId: 1, description: 'Solve chord_BC = 5.0 (angle_A=30, R=5)', pass });
  }

  // TEST 2: Solve hypotenuse_c
  {
    const env = new GeometryEnvironment({ angle_A: 30, angle_B: 60, leg_a: 3, leg_b: 4 });
    const trace = env.solve('hypotenuse_c');
    const pass = trace.status === 'SUCCESS' && Math.abs(Number(trace.finalValue) - 5.0) < 1e-4;
    results.push({ testId: 2, description: 'Solve hypotenuse_c = 5.0 via intermediate angle_C = 90', pass });
  }

  // TEST 3: Thales Diameter state
  {
    const env = new GeometryEnvironment({
      coord_A: { x: 0, y: -5 },
      coord_C: { x: 0, y: 5 },
      R: 5,
    });
    const trace = env.solve('triangle_class');
    const pass = trace.status === 'SUCCESS' && trace.finalValue === 'right';
    results.push({ testId: 3, description: 'Diameter state: DP-THALES-CLASS is valid candidate, final value is right', pass });
  }

  // TEST 4: Non-diameter obtuse state
  {
    const env = new GeometryEnvironment({
      coord_A: { x: 0, y: 5 },
      coord_B: { x: 4.9, y: 1.0 },
      coord_C: { x: 4.0, y: -3.0 },
      R: 5,
    });
    const trace = env.solve('triangle_class');
    const pass = trace.status === 'SUCCESS' && trace.finalValue === 'obtuse';
    results.push({ testId: 4, description: 'Non-diameter obtuse state: DP-THALES-CLASS failed precondition, final value is obtuse', pass });
  }

  // TEST 5: Unknown target rejected
  {
    const env = new GeometryEnvironment();
    const trace = env.solve('unknown_foo');
    const pass = trace.status === 'NO_VALID_PATH';
    results.push({ testId: 5, description: "Unknown target 'unknown_foo' correctly rejected with NO_VALID_PATH", pass });
  }

  // TEST 6: Missing inputs rejected
  {
    const env = new GeometryEnvironment({});
    const trace = env.solve('chord_BC');
    const pass = trace.status === 'MISSING_INPUT';
    results.push({ testId: 6, description: "Missing inputs for 'chord_BC' correctly rejected with MISSING_INPUT", pass });
  }

  // TEST 7: Learner mode rejected invalid step
  {
    const env = new GeometryEnvironment({ angle_A: 30 });
    const stepRes = env.step('DP-PYTH-HYP');
    const pass = stepRes.status === 'MISSING_INPUT';
    results.push({ testId: 7, description: "Learner mode rejected invalid step 'DP-PYTH-HYP' with MISSING_INPUT", pass });
  }

  // TEST 8: Learner mode accepted valid step
  {
    const env = new GeometryEnvironment({ angle_A: 30, R: 5 });
    const stepRes = env.step('DP-INSC-TO-CENT');
    const pass = stepRes.status === 'VALID' && stepRes.producedValue === 60;
    results.push({ testId: 8, description: "Learner mode accepted valid step 'DP-INSC-TO-CENT', derived central_angle_BC = 60.0", pass });
  }

  // TEST 9: Reset restores state
  {
    const env = new GeometryEnvironment({ angle_A: 30, R: 5 });
    env.step('DP-INSC-TO-CENT');
    env.reset();
    const obs = env.observe();
    const pass = obs.knownFacts['central_angle_BC'] === undefined && obs.stepCount === 0;
    results.push({ testId: 9, description: 'Reset restored initial state and cleared custom facts', pass });
  }

  // TEST 10: Repeated observe() calls are deterministic
  {
    const env = new GeometryEnvironment({ angle_A: 30, R: 5 });
    const obs1 = JSON.stringify(env.observe());
    const obs2 = JSON.stringify(env.observe());
    const pass = obs1 === obs2;
    results.push({ testId: 10, description: 'Repeated observe() calls are strictly deterministic (deep equal)', pass });
  }

  // TEST 11: Canonical solver does not mutate state
  {
    const env = new GeometryEnvironment({ angle_A: 30, R: 5 });
    env.solve('chord_BC');
    const obs = env.observe();
    const pass = obs.stepCount === 0 && obs.appliedRulesHistory.length === 0;
    results.push({ testId: 11, description: 'Canonical solver never mutates interactive environment state', pass });
  }

  // TEST 12: Execution trace records steps
  {
    const env = new GeometryEnvironment({ angle_A: 30, R: 5 });
    const trace = env.solve('chord_BC');
    const pass = trace.steps.length === 2 && trace.selectedPathIds.length === 2;
    results.push({ testId: 12, description: 'Execution trace faithfully records all derivation steps and intermediate facts', pass });
  }

  // TEST 13: verifyResult correct claim MATCH
  {
    const env = new GeometryEnvironment({ angle_A: 30, R: 5 });
    const report = env.verifyResult('chord_BC', 5.0);
    const pass = report.status === 'MATCH';
    results.push({ testId: 13, description: 'verifyResult: correct numerical claim accepted with status MATCH', pass });
  }

  // TEST 14: verifyResult wrong claim MISMATCH
  {
    const env = new GeometryEnvironment({ angle_A: 30, R: 5 });
    const report = env.verifyResult('chord_BC', 4.7);
    const pass = report.status === 'MISMATCH' && Math.abs((report.difference || 0) - 0.3) < 1e-4;
    results.push({ testId: 14, description: 'verifyResult: wrong numerical claim rejected with status MISMATCH (diff: 0.3)', pass });
  }

  // TEST 15: verifyClaim valid predicate
  {
    const env = new GeometryEnvironment({
      coord_A: { x: 0, y: -5 },
      coord_C: { x: 0, y: 5 },
      R: 5,
    });
    const report = env.verifyClaim('AC is diameter', (facts: FactMap) => {
      const a = facts.coord_A as any;
      const c = facts.coord_C as any;
      const r = Number(facts.R);
      const dist = Math.hypot(c.x - a.x, c.y - a.y);
      const isDiam = Math.abs(dist - 2 * r) < 1e-4;
      return {
        valid: isDiam,
        evidence: isDiam ? 'AC length is exactly 2R' : 'AC length is not 2R',
        details: { dist, expected: 2 * r },
      };
    });
    const pass = report.status === 'VALID';
    results.push({ testId: 15, description: 'verifyClaim: diameter predicate true, claim is VALID', pass });
  }

  // TEST 16: verifyClaim falsified predicate
  {
    const env = new GeometryEnvironment({
      coord_A: { x: 0, y: -5 },
      coord_C: { x: 0, y: 4 },
      R: 5,
    });
    const report = env.verifyClaim('AC is diameter', (facts: FactMap) => {
      const a = facts.coord_A as any;
      const c = facts.coord_C as any;
      const r = Number(facts.R);
      const dist = Math.hypot(c.x - a.x, c.y - a.y);
      const isDiam = Math.abs(dist - 2 * r) < 1e-4;
      return {
        valid: isDiam,
        evidence: isDiam ? 'AC length is exactly 2R' : 'AC length is not 2R',
        details: { dist, expected: 2 * r },
      };
    });
    const pass = report.status === 'FALSIFIED';
    results.push({ testId: 16, description: 'verifyClaim: non-diameter predicate falsified, claim is FALSIFIED with evidence', pass });
  }

  // TEST 17: Epistemic Isolation - rejected steps do NOT mutate state
  {
    const env = new GeometryEnvironment({ angle_A: 30 });
    env.step('DP-PYTH-HYP');
    const obs = env.observe();
    const pass = obs.stepCount === 0 && obs.appliedRulesHistory.length === 0;
    results.push({ testId: 17, description: 'Epistemic Isolation: rejected proposals do NOT mutate canonical state', pass });
  }

  // TEST 18: Observation boundary conceals derived answers in AGENT mode
  {
    const env = new GeometryEnvironment({ angle_A: 30, R: 5 }, 'AGENT');
    const obs = env.observe();
    const pass = obs.knownFacts['chord_BC'] === undefined && obs.knownFacts['central_angle_BC'] === undefined;
    results.push({ testId: 18, description: 'Observation boundary: AGENT mode conceals unqueried derivative answers', pass });
  }

  return results;
}

// Direct CLI execution
console.log('======================================================================');
console.log('RUNNING GEOMETRY VERIFICATION STAND CONTRACT TEST SUITE (TESTS 1 - 18)');
console.log('======================================================================');

const testResults = runEnvironmentContractTests();
let allPass = true;

for (const res of testResults) {
  const icon = res.pass ? '✓' : '✗';
  console.log(`${icon} TEST ${res.testId}: ${res.pass ? 'PASS' : 'FAIL'} - ${res.description}`);
  if (!res.pass) allPass = false;
}

console.log('======================================================================');
if (allPass) {
  console.log('ALL 18/18 VERIFICATION STAND CONTRACT TESTS PASSED (100%)');
} else {
  console.error('SOME ENVIRONMENT CONTRACT TESTS FAILED');
  process.exit(1);
}
console.log('======================================================================\n');
