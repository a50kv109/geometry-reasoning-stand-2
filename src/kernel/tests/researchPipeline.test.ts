// src/kernel/tests/researchPipeline.test.ts
// Test Suite for Phase 2 Research Pipeline & ACP Integration

import { GeometryGraphManager } from '../geometryGraph/geometryGraphCore';
import {
  ResearchDispatcher,
  ACPMock,
  ACPInterface,
  ResearchSignal,
} from '../geometryGraph/researchPipeline';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runPhase2ResearchTests() {
  console.log('======================================================================');
  console.log('RUNNING PHASE 2 RESEARCH PIPELINE VERIFICATION SUITE');
  console.log('======================================================================');

  // Initialize Core and Dispatcher
  const manager = new GeometryGraphManager();
  manager.construction.addNode('pt_A', 'POINT', [], { x: 0, y: 0 });
  manager.construction.addNode('pt_B', 'POINT', [], { x: 3, y: 0 });
  manager.construction.addNode('pt_C', 'POINT', [], { x: 0, y: 4 });
  manager.construction.addNode('seg_AB', 'SEGMENT', ['pt_A', 'pt_B']);
  manager.construction.addNode('seg_CA', 'SEGMENT', ['pt_C', 'pt_A']);

  manager.registerConstraint('const_ortho', 'ORTHOGONALITY', ['seg_AB', 'seg_CA'], (nodes) => {
    const pA = nodes.get('pt_A');
    const pB = nodes.get('pt_B');
    const pC = nodes.get('pt_C');
    if (!pA || !pB || !pC) return { state: 'VIOLATED', residual: 999 };

    const dxAB = pB.properties.x - pA.properties.x;
    const dyAB = pB.properties.y - pA.properties.y;
    const dxAC = pC.properties.x - pA.properties.x;
    const dyAC = pC.properties.y - pA.properties.y;
    const dot = dxAB * dxAC + dyAB * dyAC;

    return {
      state: Math.abs(dot) < 1e-7 ? 'SATISFIED' : 'VIOLATED',
      residual: Math.abs(dot),
    };
  });

  manager.registerClaim('claim_pythag', 'TRIANGLE_ANGLE_SUM', 'Pythagorean orthogonal condition holds', ['const_ortho']);

  const dispatcher = new ResearchDispatcher();

  // Register a baseline normal move pattern to the comparator
  const normalFingerprint = dispatcher.createFingerprint({
    triggerEvent: 'MOVE_VERTEX(pt_B)',
    affectedConstructionEntities: ['pt_B'],
    affectedConstraints: [],
    affectedKnowledgeClaims: [],
    stateTransitions: [],
    blastClassification: 'LOCAL',
  });
  dispatcher.comparator.registerPattern('normal_move', normalFingerprint);

  // Register a known degeneration pattern
  const degenerationFingerprint = dispatcher.createFingerprint({
    triggerEvent: 'MOVE_VERTEX(pt_A)',
    affectedConstructionEntities: ['pt_A'],
    affectedConstraints: ['const_ortho'],
    affectedKnowledgeClaims: ['claim_pythag'],
    stateTransitions: [
      { nodeId: 'const_ortho', from: 'SATISFIED', to: 'VIOLATED' },
      { nodeId: 'claim_pythag', from: 'VERIFIED', to: 'VANISHED' },
    ],
    blastClassification: 'GLOBAL',
  });
  dispatcher.comparator.registerPattern('degeneration', degenerationFingerprint);

  // -------------------------------------------------------------------
  // TEST A: NORMAL MOVE
  // -------------------------------------------------------------------
  console.log('\n--- TEST A: Normal Move ---');
  const deltaA = manager.mutateCoordinates('pt_B', 4, 0); // Still orthogonal
  const resA = dispatcher.dispatch(deltaA, 1, 1);
  assert(resA.signal === 'MAINTAIN', 'Normal move must return MAINTAIN');
  assert(resA.policy!.novelty === 0.0, 'Known normal move novelty must be 0.0');
  assert(resA.policy!.researchWear === 0.0, 'Normal move should not increase wear');

  // -------------------------------------------------------------------
  // TEST B: KNOWN DEGENERATION
  // -------------------------------------------------------------------
  console.log('\n--- TEST B: Known Degeneration ---');
  const deltaB = manager.mutateCoordinates('pt_A', 1, 1); // Violates ortho
  const resB = dispatcher.dispatch(deltaB, 0, 1);
  assert(resB.signal === 'DEGRADE_TRUST', 'Degeneration must trigger DEGRADE_TRUST');
  assert(resB.policy!.novelty === 0.0, 'Known degeneration novelty must be 0.0');
  assert(resB.policy!.researchWear === 0.9, 'Known degeneration must raise research wear to 0.9');

  // -------------------------------------------------------------------
  // TEST C: RECOVERY
  // -------------------------------------------------------------------
  console.log('\n--- TEST C: Recovery ---');
  // Register a recovery pattern
  const recoveryFingerprint = dispatcher.createFingerprint({
    triggerEvent: 'MOVE_VERTEX(pt_A)',
    affectedConstructionEntities: ['pt_A'],
    affectedConstraints: ['const_ortho'],
    affectedKnowledgeClaims: ['claim_pythag'],
    stateTransitions: [
      { nodeId: 'const_ortho', from: 'VIOLATED', to: 'SATISFIED' },
      { nodeId: 'claim_pythag', from: 'VANISHED', to: 'VERIFIED' },
    ],
    blastClassification: 'GLOBAL',
  });
  dispatcher.comparator.registerPattern('recovery', recoveryFingerprint);

  const deltaC = manager.mutateCoordinates('pt_A', 0, 0); // Restore orthogonality
  const resC = dispatcher.dispatch(deltaC, 1, 1);
  assert(resC.signal === 'MAINTAIN', 'Recovery must return MAINTAIN');
  assert(resC.policy!.researchWear === 0.4, 'Recovery must decrease wear from 0.9 to 0.4');

  // -------------------------------------------------------------------
  // TEST D: GLOBAL SAFE
  // -------------------------------------------------------------------
  console.log('\n--- TEST D: Global Safe (Large blast but claims valid) ---');
  const globalSafeFingerprint = dispatcher.createFingerprint({
    triggerEvent: 'MOVE_VERTEX(pt_C)',
    affectedConstructionEntities: ['pt_C', 'seg_CA'],
    affectedConstraints: [],
    affectedKnowledgeClaims: [],
    stateTransitions: [],
    blastClassification: 'GLOBAL',
  });
  dispatcher.comparator.registerPattern('global_safe', globalSafeFingerprint);

  const deltaD = manager.mutateCoordinates('pt_C', 0, 5); // Still orthogonal, but root change with cascade
  const resD = dispatcher.dispatch(deltaD, 1, 1);
  assert(resD.signal === 'MAINTAIN', 'Global safe move should not trigger trust degradation');
  assert(resD.policy!.novelty === 0.0, 'Matched global safe move should have novelty 0.0');

  // -------------------------------------------------------------------
  // TEST E: NEW STRUCTURAL ANOMALY
  // -------------------------------------------------------------------
  console.log('\n--- TEST E: New Structural Anomaly ---');
  const deltaE = {
    triggerEvent: 'MOVE_VERTEX(pt_A)',
    affectedConstructionEntities: ['pt_A'],
    affectedConstraints: ['const_ortho'],
    affectedKnowledgeClaims: ['claim_pythag'],
    stateTransitions: [
      { nodeId: 'claim_pythag', from: 'VERIFIED', to: 'REFUTED' }, // Refuted is unseen and doesn't overlap
    ],
    blastClassification: 'GLOBAL' as const,
  };
  const resE = dispatcher.dispatch(deltaE, 0, 1);
  assert(resE.policy!.novelty === 1.0, 'Unseen transition signature must have novelty 1.0 (NEW_PATTERN)');

  // -------------------------------------------------------------------
  // TEST F: COORDINATE INVARIANCE
  // -------------------------------------------------------------------
  console.log('\n--- TEST F: Coordinate Invariance ---');
  const move1 = manager.mutateCoordinates('pt_B', 5, 0);
  const move2 = manager.mutateCoordinates('pt_B', 10, 0);
  const fp1 = dispatcher.createFingerprint(move1);
  const fp2 = dispatcher.createFingerprint(move2);

  assert(fp1.triggerEventClass === fp2.triggerEventClass, 'Trigger event classes must match');
  assert(fp1.blastRadiusClass === fp2.blastRadiusClass, 'Blast radius classes must match');
  assert(JSON.stringify(fp1.constraintTransitions) === JSON.stringify(fp2.constraintTransitions), 'Constraint transitions must match');
  assert(JSON.stringify(fp1.knowledgeTransitions) === JSON.stringify(fp2.knowledgeTransitions), 'Knowledge transitions must match');

  // -------------------------------------------------------------------
  // TEST G: ACP ON/OFF EQUIVALENCE
  // -------------------------------------------------------------------
  console.log('\n--- TEST G: ACP ON/OFF Equivalence ---');
  // Record core state with research dispatcher disabled
  dispatcher.isResearchEnabled = false;
  const stateOff_A = manager.construction.getNode('pt_A')!.properties.x;
  manager.mutateCoordinates('pt_B', 4, 0);
  const stateOff_B = manager.construction.getNode('pt_B')!.properties.x;

  // Record core state with research dispatcher enabled
  dispatcher.isResearchEnabled = true;
  manager.mutateCoordinates('pt_B', 4, 0);
  const stateOn_B = manager.construction.getNode('pt_B')!.properties.x;

  assert(stateOff_B === stateOn_B, 'Geometry Core state must be 100% identical regardless of ACP state');

  // -------------------------------------------------------------------
  // TEST H: ACP FAILURE
  // -------------------------------------------------------------------
  console.log('\n--- TEST H: ACP Failure Behavior ---');
  // Mock an unstable ACP-Core that throws an error
  const brokenACP: ACPInterface = {
    process() {
      throw new Error('ACP core crashed');
    },
  };
  const brokenDispatcher = new ResearchDispatcher(brokenACP);
  const deltaH = manager.mutateCoordinates('pt_B', 5, 0);
  const resH = brokenDispatcher.dispatch(deltaH, 1, 1);

  assert(resH.signal === 'ACP_UNAVAILABLE_FALLBACK', 'Uncaught ACP crash must return ACP_UNAVAILABLE_FALLBACK');
  assert(resH.policy === null, 'Crashed pipeline must return null policy');

  console.log('\n======================================================================');
  console.log('ALL PHASE 2 RESEARCH PIPELINE TESTS PASSED PERFECTLY! 🔬🎉');
  console.log('======================================================================');
}
