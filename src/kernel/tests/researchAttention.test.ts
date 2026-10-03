// src/kernel/tests/researchAttention.test.ts
// Test suite for Phase 3B Research Attention Window and Explanatory Ranking Policy

import { ResearchFindingStore } from '../research/researchFindingStore';
import { ResearchAttentionPolicy } from '../research/researchAttention';
import { ResearchFinding } from '../research/researchFinding';
import { GeometryGraphManager } from '../geometryGraph/geometryGraphCore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runPhase3BResearchAttentionTests() {
  console.log('======================================================================');
  console.log('RUNNING PHASE 3B RESEARCH ATTENTION WINDOW TESTS');
  console.log('======================================================================');

  const store = new ResearchFindingStore();
  const policy = new ResearchAttentionPolicy(store);

  // Helper factory for mock findings to control ranking scores deterministically
  const makeFinding = (
    findingId: string,
    status: ResearchFinding['status'],
    noveltyScore: number,
    impact: ResearchFinding['impact'],
    recurrenceCount: number,
    maxWearRecorded: number,
    lastObservedAt: string = '2026-10-01T12:00:00.000Z'
  ): ResearchFinding => {
    return {
      findingId,
      schemaVersion: '1.0.0',
      findingType: 'ANOMALY',
      status,
      patternId: `pat_${findingId}`,
      fingerprintSnapshot: `snapshot_${findingId}`,
      fingerprintVersion: 'V1',
      noveltyScore,
      impact,
      maxWearRecorded,
      recurrenceCount,
      firstObservedAt: '2026-10-01T12:00:00.000Z',
      lastObservedAt,
      sourceExperiments: ['test_exp'],
      involvedLayers: ['ConstructionGraph'],
      standVersion: '2.1.0',
    };
  };

  // -------------------------------------------------------------------
  // TEST A — EMPTY STORE
  // -------------------------------------------------------------------
  console.log('\n--- TEST A: Empty Store yields empty attention window ---');
  store.clearInMemory();
  assert(policy.getTopFindings().length === 0, 'Empty store must return empty top list');

  // -------------------------------------------------------------------
  // TEST B — 1 RESULT
  // -------------------------------------------------------------------
  console.log('\n--- TEST B: 1 Finding yields 1 result ---');
  const f1 = makeFinding('f1', 'CANDIDATE', 0.5, 'MEDIUM', 1, 0.0);
  store.addFinding(f1);
  const resB = policy.getTopFindings();
  assert(resB.length === 1, 'Store with 1 finding must return list of 1');
  assert(resB[0].findingId === 'f1', 'Returned finding must be f1');

  // -------------------------------------------------------------------
  // TEST C — EXACTLY 5 RESULTS
  // -------------------------------------------------------------------
  console.log('\n--- TEST C: 5 Findings yields exactly 5 ---');
  store.clearInMemory();
  for (let i = 1; i <= 5; i++) {
    store.addFinding(makeFinding(`f${i}`, 'CANDIDATE', 0.1 * i, 'LOW', 1, 0.0));
  }
  const resC = policy.getTopFindings();
  assert(resC.length === 5, 'Store with 5 findings must return exactly 5 results');

  // -------------------------------------------------------------------
  // TEST D — 10 RESULTS YIELDS EXACTLY 5
  // -------------------------------------------------------------------
  console.log('\n--- TEST D: 10 Findings yields capped list of exactly 5 ---');
  store.clearInMemory();
  for (let i = 1; i <= 10; i++) {
    store.addFinding(makeFinding(`f${i}`, 'CANDIDATE', 0.1 * i, 'LOW', 1, 0.0));
  }
  const resD = policy.getTopFindings();
  assert(resD.length === 5, 'Store with 10 findings must cap results list at exactly 5');

  // -------------------------------------------------------------------
  // TEST E & K — DETERMINISTIC ORDERING & REPEAT QUERIES
  // -------------------------------------------------------------------
  console.log('\n--- TEST E & K: Deterministic ordering across repeat queries ---');
  const order1 = policy.getTopFindings().map(f => f.findingId);
  const order2 = policy.getTopFindings().map(f => f.findingId);
  assert(JSON.stringify(order1) === JSON.stringify(order2), 'Subsequent queries on unchanged data must be 100% deterministic');

  // -------------------------------------------------------------------
  // TEST F — EXPLAINABLE RANKING POLICY
  // -------------------------------------------------------------------
  console.log('\n--- TEST F: Ranking follows explainable policy weights ---');
  store.clearInMemory();
  // We want to verify that a high novelty / high impact finding outranks low novelty / low impact
  const f_low = makeFinding('f_low', 'CANDIDATE', 0.0, 'LOW', 1, 0.0); // score = 5 + 0 + 1 + 1 + 0 = 7
  const f_high = makeFinding('f_high', 'VERIFIED', 1.0, 'HIGH', 10, 1.0); // score = 10 + 10 + 5 + 10 + 5 = 40
  store.addFinding(f_low);
  store.addFinding(f_high);

  const resF = policy.getTopFindings();
  assert(resF[0].findingId === 'f_high', 'High-priority finding must be ranked above low-priority');
  assert(policy.calculateScore(f_high) > policy.calculateScore(f_low), 'Calculated scores must reflect weight criteria');

  // -------------------------------------------------------------------
  // TEST G — ARCHIVED FINDINGS EXCLUDED
  // -------------------------------------------------------------------
  console.log('\n--- TEST G: Exclude ARCHIVED findings ---');
  store.clearInMemory();
  const f_arch = makeFinding('f_archived', 'ARCHIVED', 1.0, 'HIGH', 10, 1.0);
  store.addFinding(f_arch);
  assert(policy.getTopFindings().length === 0, 'ARCHIVED status must be completely excluded from Top-5 view');

  // -------------------------------------------------------------------
  // TEST H — REFUTED BEHAVIOR POLICY
  // -------------------------------------------------------------------
  console.log('\n--- TEST H: REFUTED findings preserved at bottom priority ---');
  store.clearInMemory();
  const f_ref = makeFinding('f_refuted', 'REFUTED', 1.0, 'HIGH', 1, 0.0); // status penalized (1)
  const f_cand = makeFinding('f_cand', 'CANDIDATE', 0.0, 'LOW', 1, 0.0); // status normal (5)
  store.addFinding(f_ref);
  store.addFinding(f_cand);

  const resH = policy.getTopFindings();
  assert(resH.length === 2, 'REFUTED findings must remain visible in list');
  assert(resH[1].findingId === 'f_refuted', 'REFUTED finding must sink to the bottom rank');

  // -------------------------------------------------------------------
  // TEST I — DRPS ISOLATION
  // -------------------------------------------------------------------
  console.log('\n--- TEST I: Read-only Attention Policy must not mutate DRPS ---');
  store.clearInMemory();
  const f_test = makeFinding('f_test', 'CANDIDATE', 0.5, 'LOW', 1, 0.0);
  store.addFinding(f_test);
  policy.getTopFindings(); // Trigger query
  assert(store.getFinding('f_test')!.status === 'CANDIDATE', 'Attention queries must never mutate lifecycle status');
  assert(store.getFinding('f_test')!.recurrenceCount === 1, 'Attention queries must never mutate observation count');

  // -------------------------------------------------------------------
  // TEST J — GEOMETRY CORE ISOLATION
  // -------------------------------------------------------------------
  console.log('\n--- TEST J: Attention Window does not mutate Geometry Core ---');
  const coreManager = new GeometryGraphManager();
  coreManager.construction.addNode('pt_X', 'POINT', [], { x: 100, y: 100 });
  policy.getTopFindings(); // Trigger query
  assert(coreManager.construction.getNode('pt_X')!.properties.x === 100, 'Attention queries must never affect core geometry coordinates');

  // -------------------------------------------------------------------
  // TEST L — DETERMINISTIC TIE-BREAKING
  // -------------------------------------------------------------------
  console.log('\n--- TEST L: Deterministic Tie-Breaking Rules ---');
  store.clearInMemory();
  // Create two findings with exact same metrics but different sighting recency
  const f_tied_older = makeFinding('f_tied_older', 'CANDIDATE', 0.5, 'LOW', 1, 0.0, '2026-10-01T12:00:00.000Z');
  const f_tied_newer = makeFinding('f_tied_newer', 'CANDIDATE', 0.5, 'LOW', 1, 0.0, '2026-10-03T12:00:00.000Z');
  store.addFinding(f_tied_older);
  store.addFinding(f_tied_newer);

  const resL = policy.getTopFindings();
  assert(resL[0].findingId === 'f_tied_newer', 'Newer sighting must outrank older sighting on metric ties');

  console.log('\n======================================================================');
  console.log('ALL PHASE 3B ATTENTION WINDOW TESTS PASSED PERFECTLY! 👁️🎉');
  console.log('======================================================================');
}
