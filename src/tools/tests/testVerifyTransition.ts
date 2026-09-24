// src/tools/tests/testVerifyTransition.ts
// Test suite for the public VERIFY_TRANSITION tool endpoint

import { verifyTransition } from '../verifyTransition';

console.log('================================================================');
console.log('TESTING PUBLIC TOOL: VERIFY_TRANSITION (tool call -> Stand -> response)');
console.log('================================================================\n');

let allPassed = true;

// TEST 1: Valid Transition
{
  const res = verifyTransition({
    given: { angle_A: 30, angle_B: 60 },
    claim: { angle_C: 90 },
  });
  const pass = res.status === 'VALID' && res.evidence.expected === 90;
  if (!pass) allPassed = false;
  console.log(`TEST 1 (Valid Angle Sum): ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Response: ${JSON.stringify(res)}\n`);
}

// TEST 2: Numerical Mismatch
{
  const res = verifyTransition({
    given: { angle_A: 30, angle_B: 60 },
    claim: { angle_C: 100 },
  });
  const pass = res.status === 'INVALID' && res.evidence.expected === 90 && res.evidence.actual === 100;
  if (!pass) allPassed = false;
  console.log(`TEST 2 (Numerical Mismatch): ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Response: ${JSON.stringify(res)}\n`);
}

// TEST 3: Precondition Violation
{
  const res = verifyTransition({
    given: { leg_a: 3, leg_b: 4, angle_C: 80 },
    claim: { hypotenuse_c: 5 },
  });
  const pass = res.status === 'PRECONDITION_FAILED';
  if (!pass) allPassed = false;
  console.log(`TEST 3 (Precondition Violation): ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Response: ${JSON.stringify(res)}\n`);
}

// TEST 4: Unknown / Out-of-Scope Target
{
  const res = verifyTransition({
    given: { side_a: 5, side_b: 5 },
    claim: { area: 12.5 },
  });
  const pass = res.status === 'UNKNOWN';
  if (!pass) allPassed = false;
  console.log(`TEST 4 (Unknown Target): ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Response: ${JSON.stringify(res)}\n`);
}

// TEST 5: Missing Inputs
{
  const res = verifyTransition({
    given: { angle_A: 30 },
    claim: { angle_C: 90 },
  });
  const pass = res.status === 'MISSING_INPUT';
  if (!pass) allPassed = false;
  console.log(`TEST 5 (Missing Inputs): ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Response: ${JSON.stringify(res)}\n`);
}

// TEST 6: Two-Turn Self-Correction Loop (T05 Correction Scenario)
{
  // Step 1: Agent asserts incorrect claim (chord_BC = 8 instead of 5)
  const initialRes = verifyTransition({
    given: { angle_A: 30, R: 5 },
    claim: { chord_BC: 8 },
  });
  const step1Pass = initialRes.status === 'INVALID' && initialRes.evidence.expected === 4.999999999999999 && initialRes.evidence.actual === 8;
  
  // Step 2: Agent revises claim to correct calculation (chord_BC = 5)
  const revisedRes = verifyTransition({
    given: { angle_A: 30, R: 5 },
    claim: { chord_BC: 5 },
  });
  const step2Pass = revisedRes.status === 'VALID';
  const pass = step1Pass && step2Pass;
  if (!pass) allPassed = false;

  console.log(`TEST 6 (Two-Turn Correction Loop): ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Initial Response: ${JSON.stringify(initialRes)}`);
  console.log(`  Revised Response: ${JSON.stringify(revisedRes)}\n`);
}

console.log('================================================================');
if (allPassed) {
  console.log('STATUS: TOOL_READY (All 6/6 boundary verification tests passed)');
} else {
  console.log('STATUS: TOOL_BLOCKED');
  process.exit(1);
}
console.log('================================================================\n');
