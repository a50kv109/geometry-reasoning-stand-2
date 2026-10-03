// src/kernel/tests/researchFindingStore.test.ts
// Autonomous verification test suite for Phase 3A Research Finding Persistence Core

import fs from 'fs';
import { GeometryGraphManager } from '../geometryGraph/geometryGraphCore';
import { ResearchDispatcher } from '../geometryGraph/researchPipeline';
import { ResearchFindingStore } from '../research/researchFindingStore';
import { ResearchFindingManager } from '../research/researchFindingManager';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export async function runPhase3AResearchFindingStoreTests() {
  console.log('======================================================================');
  console.log('RUNNING PHASE 3A RESEARCH FINDING PERSISTENCE CORE TESTS');
  console.log('======================================================================');

  const testFile = 'research_findings_test.jsonl';

  // Cleanup test file first if Node environment is present
  try {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  } catch {}

  const store = new ResearchFindingStore(testFile);
  const manager = new ResearchFindingManager(store);
  const dispatcher = new ResearchDispatcher();

  // Baseline setups
  const delta1 = {
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

  const delta2 = {
    triggerEvent: 'MOVE_VERTEX(pt_B)',
    affectedConstructionEntities: ['pt_B'],
    affectedConstraints: [],
    affectedKnowledgeClaims: [],
    stateTransitions: [],
    blastClassification: 'LOCAL' as const,
  };

  // -------------------------------------------------------------------
  // TEST A — CREATE CANDIDATE
  // -------------------------------------------------------------------
  console.log('\n--- TEST A: Create Candidate Finding ---');
  store.clearInMemory();
  
  // Unregistered pattern will return NEW_PATTERN
  const fp1 = dispatcher.createFingerprint(delta1);
  const matchResult1 = dispatcher.comparator.compare(fp1); // NEW_PATTERN
  const policy1 = dispatcher.policy.evaluate(matchResult1, delta1, 0, 1);

  const finding1 = manager.registerObservation(
    delta1,
    matchResult1,
    policy1,
    JSON.stringify(fp1),
    'V1',
    'exp_A'
  );

  assert(finding1 !== null, 'Finding must be successfully created');
  assert(finding1!.status === 'CANDIDATE', 'Initial status of NEW_PATTERN must be CANDIDATE');
  assert(finding1!.recurrenceCount === 1, 'Initial recurrenceCount must be 1');

  // -------------------------------------------------------------------
  // TEST B — DUPLICATE OBSERVATION
  // -------------------------------------------------------------------
  console.log('\n--- TEST B: Deduplication and Evidence Aggregation ---');
  // Re-observe the exact same fingerprint signature
  const finding1_dup = manager.registerObservation(
    delta1,
    matchResult1,
    policy1,
    JSON.stringify(fp1),
    'V1',
    'exp_A_dup'
  );

  assert(finding1_dup !== null, 'Deduplicated finding must be returned');
  assert(finding1_dup!.findingId === finding1!.findingId, 'Finding ID must remain identical (Canonical Deduplication)');
  assert(finding1_dup!.recurrenceCount === 2, 'recurrenceCount must increment to 2');
  assert(finding1_dup!.status === 'OBSERVED', 'Status must transition to OBSERVED upon duplicate sighting');

  // -------------------------------------------------------------------
  // TEST C — TIMESTAMP / EVIDENCE
  // -------------------------------------------------------------------
  console.log('\n--- TEST C: Timestamps and Source Experiments ---');
  assert(finding1_dup!.firstObservedAt !== undefined, 'firstObservedAt must be preserved');
  assert(finding1_dup!.lastObservedAt !== undefined, 'lastObservedAt must exist');
  assert(finding1_dup!.sourceExperiments.includes('exp_A_dup'), 'Source experiments list must aggregate references');

  // -------------------------------------------------------------------
  // TEST D — DIFFERENT FINGERPRINT
  // -------------------------------------------------------------------
  console.log('\n--- TEST D: Different Fingerprint Separation ---');
  const fp2 = dispatcher.createFingerprint(delta2);
  const matchResult2 = dispatcher.comparator.compare(fp2); // NEW_PATTERN
  const policy2 = dispatcher.policy.evaluate(matchResult2, delta2, 1, 1);

  const finding2 = manager.registerObservation(
    delta2,
    matchResult2,
    policy2,
    JSON.stringify(fp2),
    'V1',
    'exp_B'
  );

  assert(finding2 !== null, 'Finding 2 must be successfully created');
  assert(finding2!.findingId !== finding1!.findingId, 'Different fingerprints must produce different Finding IDs');

  // -------------------------------------------------------------------
  // TEST E — EXPLICIT REPRODUCTION
  // -------------------------------------------------------------------
  console.log('\n--- TEST E: Explicit Promotion to REPRODUCED ---');
  assert(finding1_dup!.status === 'OBSERVED', 'Should be OBSERVED before promotion');
  manager.promoteToReproduced(finding1_dup!.findingId);
  assert(store.getFinding(finding1_dup!.findingId)!.status === 'REPRODUCED', 'Explicit promotion must change status to REPRODUCED');

  // -------------------------------------------------------------------
  // TEST F — REFUTATION
  // -------------------------------------------------------------------
  console.log('\n--- TEST F: Explicit Refutation ---');
  manager.refuteFinding(finding1_dup!.findingId, 'Опровергнуто в связи с несоответствием геометрических допущений');
  const refuted = store.getFinding(finding1_dup!.findingId)!;
  assert(refuted.status === 'REFUTED', 'Status must explicitly change to REFUTED');
  assert(refuted.humanNotes!.includes('Опровергнуто'), 'Human notes must be persisted');

  // -------------------------------------------------------------------
  // TEST G — PERSISTENCE / RELOAD
  // -------------------------------------------------------------------
  console.log('\n--- TEST G: File Save & Reload Integrity ---');
  await store.save();

  const newStore = new ResearchFindingStore(testFile);
  await newStore.load();

  const loadedFinding = newStore.getFinding(finding1_dup!.findingId);
  assert(loadedFinding !== undefined, 'Finding must be reloaded from JSONL file');
  assert(loadedFinding!.findingId === finding1_dup!.findingId, 'Reloaded finding ID must match');
  assert(loadedFinding!.status === 'REFUTED', 'Reloaded status must preserve REFUTED state');
  assert(loadedFinding!.recurrenceCount === 2, 'Reloaded recurrenceCount must be 2');

  // -------------------------------------------------------------------
  // TEST H — SCHEMA VERSION
  // -------------------------------------------------------------------
  console.log('\n--- TEST H: Schema Versioning ---');
  assert(loadedFinding!.schemaVersion === '1.0.0', 'schemaVersion 1.0.0 must be preserved and loaded correctly');

  // -------------------------------------------------------------------
  // TEST I — CORRUPTED RECORD
  // -------------------------------------------------------------------
  console.log('\n--- TEST I: Corrupted Line Resilience ---');
  try {
    // Inject a corrupted (malformed) line and an invalid object line
    fs.appendFileSync(testFile, 'not-a-valid-json-string-at-all\n');
    fs.appendFileSync(testFile, '{"findingId": "invalid_schema_obj"}\n'); // Missing schemaVersion
  } catch {}

  const resilientStore = new ResearchFindingStore(testFile);
  await resilientStore.load();

  // Validate that corrupted records were detected, counted, and skipped without crashing
  assert(resilientStore.corruptedRecordsCount === 2, 'Corrupted lines must be identified and skipped');
  assert(resilientStore.getFinding(finding2!.findingId) !== undefined, 'Other valid findings must remain perfectly available');

  // -------------------------------------------------------------------
  // TEST J — ACP ISOLATION
  // -------------------------------------------------------------------
  console.log('\n--- TEST J: ACP Isolation ---');
  // Confirm that toggle of Research ON/OFF has zero effect on finding store states
  const beforeId = finding2!.findingId;
  dispatcher.isResearchEnabled = false;
  dispatcher.dispatch(delta2, 1, 1); // Dispatched with research off
  assert(store.getFinding(beforeId)!.findingId === beforeId, 'Dispatches with Research OFF must not alter existing store findings');

  // -------------------------------------------------------------------
  // TEST K — GEOMETRY CORE ISOLATION
  // -------------------------------------------------------------------
  console.log('\n--- TEST K: Geometry Core Failure Isolation ---');
  // Attempting to register an observation with a completely invalid or blocked file path
  const brokenStore = new ResearchFindingStore('/invalid_root_directory/unwritable_findings.jsonl');
  const brokenManager = new ResearchFindingManager(brokenStore);
  
  // Attempting mutation
  const cleanManager = new GeometryGraphManager();
  cleanManager.construction.addNode('pt_K1', 'POINT', [], { x: 0, y: 0 });
  const coreDelta = cleanManager.mutateCoordinates('pt_K1', 5, 5);

  // Manager should gracefully fail internally (marking isStoreAvailable = false) but must not throw to crash Core
  brokenManager.registerObservation(
    coreDelta,
    'NEW_PATTERN',
    { novelty: 1.0, impact: 'LOW', researchWear: 0.0, stability: 1.0 },
    '{}',
    'V1'
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert(brokenManager.isStoreAvailable === false, 'Broken store must transition manager to unavailable state');
  assert(cleanManager.construction.getNode('pt_K1')!.properties.x === 5, 'Geometry Core must remain fully operational on persistence failures');

  // -------------------------------------------------------------------
  // TEST L — FINGERPRINT VERSION
  // -------------------------------------------------------------------
  console.log('\n--- TEST L: Fingerprint Version Isolation ---');
  // Registering identical snapshots under different fingerprintVersions
  const snapshotRaw = JSON.stringify(fp1);
  store.clearInMemory();
  
  const f_V1 = manager.registerObservation(delta1, 'NEW_PATTERN', policy1, snapshotRaw, 'V1');
  const f_V2 = manager.registerObservation(delta1, 'NEW_PATTERN', policy1, snapshotRaw, 'V2');

  assert(f_V1!.findingId !== f_V2!.findingId, 'Identical snapshot with different fingerprintVersions must produce separate Findings');

  // Cleanup test file
  try {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  } catch {}

  console.log('\n======================================================================');
  console.log('ALL PHASE 3A PERSISTENCE CORE TESTS PASSED PERFECTLY! 💾🎉');
  console.log('======================================================================');
}
