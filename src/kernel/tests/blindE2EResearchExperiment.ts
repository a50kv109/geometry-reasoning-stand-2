// src/kernel/tests/blindE2EResearchExperiment.ts
// Phase 2.1 — Blind End-to-End Research Experiment
// Executes 10 distinct, non-trivial scenarios to test detection capabilities of existing Phase 1 & Phase 2 modules.

import { GeometryGraphManager } from '../geometryGraph/geometryGraphCore';
import { ResearchDispatcher, StructuralFingerprint } from '../geometryGraph/researchPipeline';

export interface ExperimentRecord {
  scenario: string;
  event: string;
  blast: string;
  constraintTransitions: string[];
  knowledgeTransitions: string[];
  comparator: string;
  novelty: number;
  impact: string;
  wear: number;
  stability: number;
  acpSignal: string;
  coreStateMutated: boolean;
  researchMutatedCore: boolean;
}

export function runBlindE2EResearchExperiment() {
  console.log('======================================================================');
  console.log('STARTING PHASE 2.1 — BLIND END-TO-END RESEARCH EXPERIMENT');
  console.log('======================================================================\n');

  const manager = new GeometryGraphManager();
  const dispatcher = new ResearchDispatcher();

  // Setup basic geometry
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

  manager.registerClaim('claim_pythag', 'TRIANGLE_ANGLE_SUM', 'Pythagorean orthogonal condition', ['const_ortho']);

  // Pre-register patterns to represent "Known" base
  const normalFP = dispatcher.createFingerprint({
    triggerEvent: 'MOVE_VERTEX(pt_B)',
    affectedConstructionEntities: ['pt_B'],
    affectedConstraints: [],
    affectedKnowledgeClaims: [],
    stateTransitions: [],
    blastClassification: 'LOCAL',
  });
  dispatcher.comparator.registerPattern('normal_move', normalFP);

  const degenFP = dispatcher.createFingerprint({
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
  dispatcher.comparator.registerPattern('degeneration', degenFP);

  const recoveryFP = dispatcher.createFingerprint({
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
  dispatcher.comparator.registerPattern('recovery', recoveryFP);

  const records: ExperimentRecord[] = [];

  const checkCoreMutation = (beforeState: string, afterState: string): boolean => {
    return beforeState !== afterState;
  };

  // Helper helper to capture full telemetry and verify invariants
  const runScenario = (
    id: string,
    action: () => any,
    triggerDesc: string
  ): void => {
    const beforeStateStr = JSON.stringify(manager.construction.nodes.get('pt_A')!.properties);
    
    // Execute action
    const delta = action();

    const afterStateStr = JSON.stringify(manager.construction.nodes.get('pt_A')!.properties);

    // Ensure research dispatcher execution
    const res = dispatcher.dispatch(delta, 1, 1);

    const postResearchStateStr = JSON.stringify(manager.construction.nodes.get('pt_A')!.properties);

    const coreStateMutated = checkCoreMutation(beforeStateStr, afterStateStr);
    const researchMutatedCore = checkCoreMutation(afterStateStr, postResearchStateStr);

    records.push({
      scenario: id,
      event: triggerDesc,
      blast: delta.blastClassification,
      constraintTransitions: res.policy?.novelty !== undefined ? delta.stateTransitions.filter(t => t.nodeId.startsWith('const')).map(t => `${t.from} -> ${t.to}`) : [],
      knowledgeTransitions: res.policy?.novelty !== undefined ? delta.stateTransitions.filter(t => t.nodeId.startsWith('claim')).map(t => `${t.from} -> ${t.to}`) : [],
      comparator: res.policy ? dispatcher.comparator.compare(dispatcher.createFingerprint(delta)) : 'N/A',
      novelty: res.policy ? res.policy.novelty : 0.0,
      impact: res.policy ? res.policy.impact : 'LOW',
      wear: res.policy ? res.policy.researchWear : 0.0,
      stability: res.policy ? res.policy.stability : 1.0,
      acpSignal: res.signal,
      coreStateMutated,
      researchMutatedCore,
    });
  };

  // -------------------------------------------------------------------
  // SCENARIO 01 — NORMAL COORDINATE VARIATION
  // -------------------------------------------------------------------
  runScenario('SCENARIO-01', () => {
    return manager.mutateCoordinates('pt_B', 5, 0); // Shift coordinates without violation
  }, 'MOVE_VERTEX(pt_B) to (5,0)');

  // -------------------------------------------------------------------
  // SCENARIO 02 — SAME STRUCTURE, DIFFERENT SCALE
  // -------------------------------------------------------------------
  runScenario('SCENARIO-02', () => {
    return manager.mutateCoordinates('pt_B', 10, 0); // Scale change on same axis
  }, 'MOVE_VERTEX(pt_B) to (10,0)');

  // -------------------------------------------------------------------
  // SCENARIO 03 — KNOWN DEGENERATION
  // -------------------------------------------------------------------
  runScenario('SCENARIO-03', () => {
    return manager.mutateCoordinates('pt_A', 1, 1); // Violate orthogonal constraint
  }, 'MOVE_VERTEX(pt_A) to (1,1)');

  // -------------------------------------------------------------------
  // SCENARIO 04 — RECOVERY
  // -------------------------------------------------------------------
  runScenario('SCENARIO-04', () => {
    return manager.mutateCoordinates('pt_A', 0, 0); // Restore orthogonal constraint
  }, 'MOVE_VERTEX(pt_A) to (0,0)');

  // -------------------------------------------------------------------
  // SCENARIO 05 — GLOBAL SAFE
  // -------------------------------------------------------------------
  // Mutates pt_C (root node) deeper with zero constraint violations
  const globalSafeFP = dispatcher.createFingerprint({
    triggerEvent: 'MOVE_VERTEX(pt_C)',
    affectedConstructionEntities: ['pt_C', 'seg_CA'],
    affectedConstraints: [],
    affectedKnowledgeClaims: [],
    stateTransitions: [],
    blastClassification: 'GLOBAL',
  });
  dispatcher.comparator.registerPattern('global_safe', globalSafeFP);

  runScenario('SCENARIO-05', () => {
    return manager.mutateCoordinates('pt_C', 0, 8); // Scale height without violation
  }, 'MOVE_VERTEX(pt_C) to (0,8)');

  // -------------------------------------------------------------------
  // SCENARIO 06 — KNOWN STRUCTURAL VARIANT
  // -------------------------------------------------------------------
  // Partial overlap of transitions (e.g. only constraint violates, but claim is not impacted)
  runScenario('SCENARIO-06', () => {
    // Generate an artificial delta with only constraint violating
    return {
      triggerEvent: 'MOVE_VERTEX(pt_A)',
      affectedConstructionEntities: ['pt_A'],
      affectedConstraints: ['const_ortho'],
      affectedKnowledgeClaims: [],
      stateTransitions: [
        { nodeId: 'const_ortho', from: 'SATISFIED', to: 'VIOLATED' }
      ],
      blastClassification: 'PATH' as const,
    };
  }, 'Artificial Partial Mutation');

  // -------------------------------------------------------------------
  // SCENARIO 07 — NOVEL TRANSITION COMBINATION
  // -------------------------------------------------------------------
  // Unseen transition signature: claiming goes REFUTED which is totally new
  runScenario('SCENARIO-07', () => {
    return {
      triggerEvent: 'MOVE_VERTEX(pt_A)',
      affectedConstructionEntities: ['pt_A'],
      affectedConstraints: ['const_ortho'],
      affectedKnowledgeClaims: ['claim_pythag'],
      stateTransitions: [
        { nodeId: 'claim_pythag', from: 'VERIFIED', to: 'REFUTED' }
      ],
      blastClassification: 'GLOBAL' as const,
    };
  }, 'Artificial Refuted Mutation');

  // -------------------------------------------------------------------
  // SCENARIO 08 — REPEAT NOVEL PATTERN
  // -------------------------------------------------------------------
  // Repeating SCENARIO-07 after registering it should make it "Known" (EXACT_MATCH)
  const novelFP = dispatcher.createFingerprint({
    triggerEvent: 'MOVE_VERTEX(pt_A)',
    affectedConstructionEntities: ['pt_A'],
    affectedConstraints: ['const_ortho'],
    affectedKnowledgeClaims: ['claim_pythag'],
    stateTransitions: [
      { nodeId: 'claim_pythag', from: 'VERIFIED', to: 'REFUTED' }
    ],
    blastClassification: 'GLOBAL',
  });
  dispatcher.comparator.registerPattern('novel_anomaly', novelFP);

  runScenario('SCENARIO-08', () => {
    return {
      triggerEvent: 'MOVE_VERTEX(pt_A)',
      affectedConstructionEntities: ['pt_A'],
      affectedConstraints: ['const_ortho'],
      affectedKnowledgeClaims: ['claim_pythag'],
      stateTransitions: [
        { nodeId: 'claim_pythag', from: 'VERIFIED', to: 'REFUTED' }
      ],
      blastClassification: 'GLOBAL' as const,
    };
  }, 'Repeated Artificial Refuted Mutation');

  // -------------------------------------------------------------------
  // SCENARIO 09 — MULTI-STEP MUTATION
  // -------------------------------------------------------------------
  runScenario('SCENARIO-09', () => {
    // Pipeline has stateless GraphDelta; let's execute a single step and see what is seen
    return manager.mutateCoordinates('pt_B', 6, 0);
  }, 'MOVE_VERTEX(pt_B) to (6,0)');

  // -------------------------------------------------------------------
  // SCENARIO 10 — FULL RECOVERY CYCLE
  // -------------------------------------------------------------------
  runScenario('SCENARIO-10', () => {
    // A complex dynamic cycle step
    return manager.mutateCoordinates('pt_A', 0, 0); // Final check of resilience
  }, 'MOVE_VERTEX(pt_A) to (0,0) (Full recovery step)');

  // Print results
  console.log('\n======================================================================');
  console.log('BLIND RESULT TABLE');
  console.log('======================================================================');
  console.log('Scenario | Event | Blast | Const Trans | Know Trans | Comparator | Novelty | Impact | Wear | ACP Signal | Core Mut | Res Mut');
  console.log('----------------------------------------------------------------------');
  records.forEach((r) => {
    console.log(
      `${r.scenario} | ${r.event.padEnd(28)} | ${r.blast.padEnd(6)} | ${r.constraintTransitions.join(', ').padEnd(11)} | ${r.knowledgeTransitions.join(', ').padEnd(11)} | ${r.comparator.padEnd(18)} | ${r.novelty.toFixed(1)} | ${r.impact.padEnd(6)} | ${r.wear.toFixed(1)} | ${r.acpSignal.padEnd(13)} | ${r.coreStateMutated ? 'YES' : 'NO'} | ${r.researchMutatedCore ? 'YES' : 'NO'}`
    );
  });
  console.log('======================================================================\n');
}
