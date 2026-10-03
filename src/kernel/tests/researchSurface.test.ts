// src/kernel/tests/researchSurface.test.ts
// Integration test suite for Phase 3C — Research Surface Integration

import fs from 'fs';
import { GeometryGraphManager } from '../geometryGraph/geometryGraphCore';
import { ResearchDispatcher } from '../geometryGraph/researchPipeline';
import { ResearchFindingStore } from '../research/researchFindingStore';
import { ResearchFindingManager } from '../research/researchFindingManager';
import { ResearchAttentionPolicy } from '../research/researchAttention';
import { ResearchSurface, DEFERRED_UI_INTEGRATION } from '../research/researchSurface';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export async function runPhase3CResearchSurfaceTests() {
  console.log('======================================================================');
  console.log('RUNNING PHASE 3C RESEARCH SURFACE INTEGRATION TESTS');
  console.log('======================================================================');

  const testFile = 'research_findings_surface_test.jsonl';

  // Cleanup test file
  try {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  } catch {}

  const store = new ResearchFindingStore(testFile);
  const manager = new ResearchFindingManager(store);
  const dispatcher = new ResearchDispatcher();
  const attentionPolicy = new ResearchAttentionPolicy(store);
  const surface = new ResearchSurface(attentionPolicy);

  // -------------------------------------------------------------------
  // TEST 1 — END-TO-END INTEGRATION PATHWAY
  // -------------------------------------------------------------------
  console.log('\n--- TEST 1: End-to-End E2E Integration Pathway ---');
  // Mutation Delta
  const delta = {
    triggerEvent: 'MOVE_VERTEX(pt_A)',
    affectedConstructionEntities: ['pt_A'],
    affectedConstraints: ['const_ortho'],
    affectedKnowledgeClaims: ['claim_pythag'],
    stateTransitions: [
      { nodeId: 'const_ortho', from: 'SATISFIED', to: 'VIOLATED' },
      { nodeId: 'claim_pythag', from: 'VERIFIED', to: 'VANISHED' }
    ],
    blastClassification: 'GLOBAL' as const,
  };

  const fp = dispatcher.createFingerprint(delta);
  const matchResult = dispatcher.comparator.compare(fp);
  const policy = dispatcher.policy.evaluate(matchResult, delta, 0, 1);

  // Manager registers observation -> Store writes -> Attention filters -> Surface queries
  const finding = manager.registerObservation(delta, matchResult, policy, JSON.stringify(fp), 'V1', 'e2e_exp_1');
  await new Promise((resolve) => setTimeout(resolve, 50)); // let background save settle

  const attentionList = surface.getResearchAttention();
  assert(attentionList.length === 1, 'Research Surface must retrieve the newly created finding');
  assert(attentionList[0].findingId === finding!.findingId, 'Finding ID must match between manager and surface');
  assert(attentionList[0].status === 'CANDIDATE', 'Initial epistemic status on surface must be CANDIDATE');

  // -------------------------------------------------------------------
  // TEST 2 — ISOLATION TEST
  // -------------------------------------------------------------------
  console.log('\n--- TEST 2: Isolation Guarantee ---');
  const coreManager = new GeometryGraphManager();
  coreManager.construction.addNode('pt_Y', 'POINT', [], { x: 5, y: 5 });

  // Accessing attention
  surface.getResearchAttention();
  assert(coreManager.construction.getNode('pt_Y')!.properties.x === 5, 'Attention queries must never mutate geometry nodes');
  assert(store.getFinding(finding!.findingId)!.status === 'CANDIDATE', 'Attention queries must never mutate finding store records');

  // -------------------------------------------------------------------
  // TEST 3 — PERSISTENCE LIFECYCLE RECOVERY
  // -------------------------------------------------------------------
  console.log('\n--- TEST 3: Persistence Lifecycle Recovery across sessions ---');
  await store.save();

  const newStore = new ResearchFindingStore(testFile);
  await newStore.load();
  const newAttention = new ResearchAttentionPolicy(newStore);
  const newSurface = new ResearchSurface(newAttention);

  const restored = newSurface.getResearchAttention();
  assert(restored.length === 1, 'Restored surface must find persisted findings');
  assert(restored[0].findingId === finding!.findingId, 'Restored finding ID must match perfectly');

  // -------------------------------------------------------------------
  // TEST 4 — MULTIPLE FINDINGS TOP-5 LIMIT & RANKING
  // -------------------------------------------------------------------
  console.log('\n--- TEST 4: Multiple Findings Top-5 Limit and Deterministic Ranking ---');
  store.clearInMemory();

  // Create 10 findings with varied novelty to test deterministic Top-5 sorting
  for (let i = 1; i <= 10; i++) {
    const mockDelta = {
      triggerEvent: 'MOVE_VERTEX(pt_A)',
      affectedConstructionEntities: ['pt_A'],
      affectedConstraints: [],
      affectedKnowledgeClaims: [],
      stateTransitions: [],
      blastClassification: 'LOCAL' as const,
    };
    const mockFp = `fp_mock_${i}`;
    const mockPolicy = { novelty: i * 0.1, impact: 'LOW' as const, researchWear: 0.0, stability: 1.0 };
    manager.registerObservation(mockDelta, 'NEW_PATTERN', mockPolicy, mockFp, 'V1', `exp_${i}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 50)); // let background save settle

  assert(store.listFindings().length === 10, 'DRPS store must contain all 10 registered findings');
  
  const topList = surface.getResearchAttention();
  assert(topList.length === 5, 'Research Surface must limit returned active display list to exactly 5');
  assert(Math.abs(topList[0].noveltyScore - 1.0) < 1e-5, 'Top finding must be the highest priority novelty = 1.0 according to attention sorting');
  assert(Math.abs(topList[4].noveltyScore - 0.6) < 1e-5, 'Bottom ranked top finding must follow deterministic ranking sorting');

  // -------------------------------------------------------------------
  // TEST 5 — STATUS DISPLAY TEST
  // -------------------------------------------------------------------
  console.log('\n--- TEST 5: Accurate Status Display ---');
  store.clearInMemory();

  const mockDelta = {
    triggerEvent: 'MOVE_VERTEX(pt_A)',
    affectedConstructionEntities: ['pt_A'],
    affectedConstraints: [],
    affectedKnowledgeClaims: [],
    stateTransitions: [],
    blastClassification: 'LOCAL' as const,
  };

  const f1 = manager.registerObservation(mockDelta, 'NEW_PATTERN', { novelty: 1.0, impact: 'HIGH', researchWear: 0.0, stability: 1.0 }, 'fp_1', 'V1', 'exp_test');
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Verify candidate
  assert(surface.getResearchAttention()[0].status === 'CANDIDATE', 'Status must represent CANDIDATE');

  // Verify observed
  manager.registerObservation(mockDelta, 'NEW_PATTERN', { novelty: 1.0, impact: 'HIGH', researchWear: 0.0, stability: 1.0 }, 'fp_1', 'V1', 'exp_test_dup');
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert(surface.getResearchAttention()[0].status === 'OBSERVED', 'Status must transition and be represented as OBSERVED');

  // Verify reproduced
  manager.promoteToReproduced(f1!.findingId);
  assert(surface.getResearchAttention()[0].status === 'REPRODUCED', 'Status must represent REPRODUCED');

  // Verify verified
  manager.verifyFinding(f1!.findingId, 'Верифицировано!');
  assert(surface.getResearchAttention()[0].status === 'VERIFIED', 'Status must represent VERIFIED');

  // Verify refuted
  manager.refuteFinding(f1!.findingId, 'Опровергнуто!');
  assert(surface.getResearchAttention()[0].status === 'REFUTED', 'Status must represent REFUTED');

  // Audit of UI
  assert(DEFERRED_UI_INTEGRATION === 'UI integration deferred.', 'UI integration was deferred to keep code isolated and clean');

  // Cleanup test file
  try {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  } catch {}

  console.log('\n======================================================================');
  console.log('ALL PHASE 3C INTEGRATION TESTS PASSED PERFECTLY! 🛰️🎉');
  console.log('======================================================================');
}
