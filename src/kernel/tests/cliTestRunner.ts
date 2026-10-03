// src/kernel/tests/cliTestRunner.ts
// CLI script to execute autonomous kernel tests directly via tsx and print detailed results

import { runAllKernelTests } from './runKernelTests';
import { runPhase1GeometryCoreTests } from './geometryGraphCore.test';
import { runPhase2ResearchTests } from './researchPipeline.test';
import { runBlindE2EResearchExperiment } from './blindE2EResearchExperiment';
import { runPhase3AResearchFindingStoreTests } from './researchFindingStore.test';
import { runPhase3BResearchAttentionTests } from './researchAttention.test';
import { runPhase3CResearchSurfaceTests } from './researchSurface.test';

async function runAll() {
  console.log('================================================================');
  console.log('STARTING AUTONOMOUS KERNEL VERIFICATION TEST RUN');
  console.log('================================================================\n');

  // Run Phase 1 Core tests
  runPhase1GeometryCoreTests();

  // Run Phase 2 Research tests
  runPhase2ResearchTests();

  // Run Phase 2.1 Blind E2E Research Experiment
  runBlindE2EResearchExperiment();

  // Run Phase 3A Persistence Core tests
  await runPhase3AResearchFindingStoreTests();

  // Run Phase 3B Attention Window tests
  runPhase3BResearchAttentionTests();

  // Run Phase 3C Research Surface tests
  await runPhase3CResearchSurfaceTests();

  console.log('\n================================================================');
  console.log('RUNNING STANDARD KERNEL TESTS');
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
}

runAll().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
