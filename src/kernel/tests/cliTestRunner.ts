// src/kernel/tests/cliTestRunner.ts
// CLI script to execute autonomous kernel tests directly via tsx and print detailed results

import { runAllKernelTests } from './runKernelTests';

console.log('================================================================');
console.log('STARTING AUTONOMOUS KERNEL VERIFICATION TEST RUN');
console.log('================================================================\n');

const results = runAllKernelTests();

let allPassed = true;

results.forEach(r => {
  const statusIcon = r.pass ? '✅ PASS' : '❌ FAIL';
  if (!r.pass) allPassed = false;

  console.log(`----------------------------------------------------------------`);
  console.log(`${r.testId}: ${r.testName} -> ${statusIcon}`);
  console.log(`  INPUT:               ${JSON.stringify(r.input)}`);
  console.log(`  TARGET:              ${r.target}`);
  console.log(`  CANDIDATE PATHS:     ${JSON.stringify(r.candidatePaths)}`);
  console.log(`  PRECONDITIONS:       ${JSON.stringify(r.preconditionResults)}`);
  console.log(`  SELECTED PATH:       ${JSON.stringify(r.selectedPath)}`);
  console.log(`  EXECUTION RESULT:    ${JSON.stringify(r.executionResult)}`);
  console.log(`  EXPECTED:            ${JSON.stringify(r.expected)}`);
  console.log(`  OBSERVED:            ${JSON.stringify(r.observed)}`);
  if (r.notes) {
    console.log(`  NOTES:               ${r.notes}`);
  }
  console.log(`  STATUS:              ${statusIcon}`);
});

console.log('\n================================================================');
if (allPassed) {
  console.log(`ALL ${results.length} AUTONOMOUS KERNEL TESTS PASSED WITH 100% SUCCESS`);
} else {
  console.error('SOME KERNEL TESTS FAILED');
  process.exit(1);
}
console.log('================================================================\n');
