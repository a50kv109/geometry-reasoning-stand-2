// src/engines/research/tests/testResearchGraphPacket6.ts
// Verification Test Suite for Packet #6: Invariant Discovery & Research Graph

import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  FullGeometryState,
} from '../../constructionCore';
import {
  createChordArcExperimentConfig,
  captureExperimentStep,
  buildExperimentResult,
} from '../dynamicExperiment';
import {
  extractEvidenceFromExperiment,
  synthesizeHypothesesFromEvidence,
} from '../crossExperimentAnalyzer';
import {
  verifyHypothesis,
  buildResearchGraph,
} from '../researchGraph';
import {
  findCanonicalRuleById,
  findCanonicalRuleBySignature,
  RULE_INSCRIBED_ANGLE,
  RULE_CYCLIC_CHORD_LAW,
  RULE_THALES_DIAMETER,
  RULE_ARC_COMPLEMENT_SUM,
} from '../canonicalRules';
import { createResearchSnapshot } from '../researchSnapshot';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runResearchGraphPacket6Tests() {
  console.log('======================================================================');
  console.log('RUNNING PACKET #6 RESEARCH GRAPH & INVARIANT DISCOVERY TESTS');
  console.log('======================================================================');

  const baseState = createDefaultGeometryState({ A: 0.12, B: 0.45, C: 0.78 }, 100);
  const snapshot = createResearchSnapshot(baseState, 1.0);

  // Set up 2 distinct chord experiments (AB and BC)
  const configAB = createChordArcExperimentConfig('AB', 'A', 'B');
  const configBC = createChordArcExperimentConfig('BC', 'B', 'C');

  // Experiment 1 (Chord AB, 3 steps)
  const exp1_step0 = captureExperimentStep(baseState, 0, configAB, 1.0);
  const stateAB_1 = dispatchGeometryCommand(baseState, {
    type: 'SYNC_BASE_POINTS',
    pointsU: { A: 0.12, B: 0.52, C: 0.78 },
    R: 100,
  });
  const exp1_step1 = captureExperimentStep(stateAB_1, 1, configAB, 1.0);
  const stateAB_2 = dispatchGeometryCommand(baseState, {
    type: 'SYNC_BASE_POINTS',
    pointsU: { A: 0.12, B: 0.62, C: 0.78 },
    R: 100,
  });
  const exp1_step2 = captureExperimentStep(stateAB_2, 2, configAB, 1.0);
  const resultAB = buildExperimentResult(configAB, [exp1_step0, exp1_step1, exp1_step2]);

  // Experiment 2 (Chord BC, 2 steps)
  const exp2_step0 = captureExperimentStep(baseState, 0, configBC, 1.0);
  const stateBC_1 = dispatchGeometryCommand(baseState, {
    type: 'SYNC_BASE_POINTS',
    pointsU: { A: 0.12, B: 0.45, C: 0.85 },
    R: 100,
  });
  const exp2_step1 = captureExperimentStep(stateBC_1, 1, configBC, 1.0);
  const resultBC = buildExperimentResult(configBC, [exp2_step0, exp2_step1]);

  // -------------------------------------------------------------------
  // EPISTEMIC-01: Ban on auto-promotion via empirical evidence alone
  // -------------------------------------------------------------------
  console.log('\n--- TEST EPISTEMIC-01: Strict Ban on Empirical Auto-Promotion ---');
  // Extract evidence from 1000 simulated repeated steps/experiments
  const simulatedManyEvidence = [];
  for (let i = 0; i < 1000; i++) {
    simulatedManyEvidence.push({
      id: `EVID-SIM-${i}`,
      experimentId: `sim_exp_${i}`,
      targetEntity: 'chord_AB',
      signature: 'CYCLIC_CHORD_METRIC_LAW' as const,
      title: `Эмпирическое свидетельство #${i}`,
      sampleCount: 10,
      observedMetricSummary: 'c = 2R*sin(theta/2) holds',
      preservedInvariants: ['radius'],
      varyingParameters: ['chordLength'],
      parameterRange: { min: 50, max: 150, unit: 'mm' },
    });
  }

  const synthesized = synthesizeHypothesesFromEvidence(simulatedManyEvidence);
  const chordHypothesis = synthesized.find((h) => h.signature === 'CYCLIC_CHORD_METRIC_LAW');
  assert(chordHypothesis !== undefined, 'EPISTEMIC-01: Synthesized chord metric law hypothesis');
  assert(
    chordHypothesis?.epistemicStage === 'KNOWN_RELATION_MATCH',
    'EPISTEMIC-01: Even with 1000 pieces of empirical evidence, hypothesis is KNOWN_RELATION_MATCH (NOT VERIFIED_INVARIANT)'
  );
  assert(
    chordHypothesis?.candidateStatus === 'MATCHED_CANONICAL_PATTERN',
    'EPISTEMIC-01: Candidate status is MATCHED_CANONICAL_PATTERN (NOT VERIFIED_THEOREM)'
  );

  // -------------------------------------------------------------------
  // PRECOND-01: Broken / falsified preconditions fail formal verification
  // -------------------------------------------------------------------
  console.log('\n--- TEST PRECOND-01: Precondition Failure Detection ---');
  // Perturb state so vertex C is NOT on the circle (dist = 150 px while R = 100 px)
  const perturbedState: FullGeometryState = {
    ...baseState,
    points: {
      ...baseState.points,
      pt_C: {
        ...baseState.points.pt_C,
        x: 150,
        y: 0,
        onCircle: false,
      },
    },
  };

  const inscribedHypothesis = synthesized.find((h) => h.signature === 'INSCRIBED_CENTRAL_ANGLE_RATIO')!;
  const failedInscribedVerif = verifyHypothesis(inscribedHypothesis, perturbedState, snapshot.constructionTrace);
  assert(
    failedInscribedVerif.verificationNode !== undefined,
    'PRECOND-01: VerificationNode created for failed check'
  );
  assert(
    failedInscribedVerif.verificationNode?.allPreconditionsSatisfied === false,
    'PRECOND-01: allPreconditionsSatisfied is FALSE when vertex C is not on circle'
  );
  assert(
    failedInscribedVerif.verificationNode?.isProven === false,
    'PRECOND-01: isProven is FALSE when preconditions fail'
  );
  assert(
    failedInscribedVerif.theoremNode === undefined,
    'PRECOND-01: TheoremNode is strictly UNDEFINED when verification fails'
  );
  assert(
    failedInscribedVerif.updatedHypothesis.candidateStatus === 'REJECTED',
    'PRECOND-01: Hypothesis candidateStatus marked REJECTED'
  );

  // -------------------------------------------------------------------
  // EXP-INSCRIBED-01: Verified Inscribed Angle Theorem on Valid State
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-INSCRIBED-01: Inscribed Angle Theorem Proof Pipeline ---');
  const validInscribedVerif = verifyHypothesis(inscribedHypothesis, baseState, snapshot.constructionTrace);
  assert(
    validInscribedVerif.verificationNode?.allPreconditionsSatisfied === true,
    'EXP-INSCRIBED-01: All preconditions satisfied on valid circumcircle state'
  );
  assert(
    validInscribedVerif.verificationNode?.isProven === true,
    'EXP-INSCRIBED-01: isProven is TRUE'
  );
  assert(
    validInscribedVerif.theoremNode !== undefined,
    'EXP-INSCRIBED-01: TheoremNode successfully generated'
  );
  assert(
    validInscribedVerif.theoremNode?.qED === true,
    'EXP-INSCRIBED-01: TheoremNode has qED: true'
  );
  assert(
    validInscribedVerif.updatedHypothesis.epistemicStage === 'VERIFIED_INVARIANT',
    'EXP-INSCRIBED-01: Hypothesis stage promoted to VERIFIED_INVARIANT'
  );

  // -------------------------------------------------------------------
  // EXP-CHORD-01: Cyclic Chord Metric Law Pipeline
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-CHORD-01: Cyclic Chord Metric Law Pipeline ---');
  const chordVerif = verifyHypothesis(chordHypothesis!, baseState, snapshot.constructionTrace);
  assert(
    chordVerif.verificationNode?.allPreconditionsSatisfied === true,
    'EXP-CHORD-01: Preconditions for chord law verified'
  );
  assert(
    chordVerif.theoremNode?.canonicalRuleId === 'RULE-CYCLIC-CHORD-LAW',
    'EXP-CHORD-01: Theorem generated for RULE-CYCLIC-CHORD-LAW'
  );

  // -------------------------------------------------------------------
  // EXP-THALES-01: Thales Theorem Preconditions Pipeline
  // -------------------------------------------------------------------
  console.log('\n--- TEST EXP-THALES-01: Thales Theorem Preconditions Pipeline ---');
  const thalesHypothesis = synthesized.find((h) => h.signature === 'THALES_DIAMETER_RIGHT_ANGLE');
  assert(thalesHypothesis !== undefined, 'EXP-THALES-01: Thales hypothesis exists');

  // Case A: Non-diameter baseState (uA=0.12, uB=0.45 => theta != 180 deg)
  const nonDiameterVerif = verifyHypothesis(thalesHypothesis!, baseState, snapshot.constructionTrace);
  assert(
    nonDiameterVerif.verificationNode?.allPreconditionsSatisfied === false,
    'EXP-THALES-01: Non-diameter configuration fails Thales diameter precondition'
  );
  assert(
    nonDiameterVerif.theoremNode === undefined,
    'EXP-THALES-01: No theorem generated for non-diameter state'
  );

  // Case B: Thales state (uA=0.0, uB=0.5 => theta=180 deg)
  const thalesState = dispatchGeometryCommand(baseState, {
    type: 'SYNC_BASE_POINTS',
    pointsU: { A: 0.0, B: 0.5, C: 0.78 },
    R: 100,
  });
  const thalesVerif = verifyHypothesis(thalesHypothesis!, thalesState, snapshot.constructionTrace);
  assert(
    thalesVerif.verificationNode?.allPreconditionsSatisfied === true,
    'EXP-THALES-01: Thales state satisfies all diameter preconditions'
  );
  assert(
    thalesVerif.theoremNode?.name === 'Теорема Фалеса об угле, опирающемся на диаметр',
    'EXP-THALES-01: Thales theorem successfully verified and proven (Q.E.D.)'
  );

  // -------------------------------------------------------------------
  // GRAPH-01: DAG Construction, Acyclicity, and Determinism
  // -------------------------------------------------------------------
  console.log('\n--- TEST GRAPH-01: Research Graph DAG Determinism ---');
  const graph1 = buildResearchGraph([resultAB, resultBC], baseState, snapshot.constructionTrace);
  const graph2 = buildResearchGraph([resultAB, resultBC], baseState, snapshot.constructionTrace);

  assert(
    JSON.stringify(graph1) === JSON.stringify(graph2),
    'GRAPH-01: Repeated buildResearchGraph produces 100% byte-for-byte identical JSON serialization'
  );
  assert(graph1.nodes.evidence.length >= 4, 'GRAPH-01: Evidence nodes populated from multiple experiments');
  assert(graph1.nodes.hypotheses.length >= 3, 'GRAPH-01: Hypotheses synthesized');
  assert(graph1.nodes.verifications.length >= 3, 'GRAPH-01: Verification nodes evaluated');
  assert(graph1.nodes.theorems.length >= 2, 'GRAPH-01: Theorem nodes generated');
  assert(graph1.edges.length >= 6, 'GRAPH-01: DAG edges correctly formed');

  // Verify DAG acyclicity: sources and targets belong to distinct topological layers
  // Layer 0: Evidence -> Layer 1: Hypotheses -> Layer 2: Verifications -> Layer 3: Theorems
  const nodeLayerMap = new Map<string, number>();
  graph1.nodes.evidence.forEach((n) => nodeLayerMap.set(n.id, 0));
  graph1.nodes.hypotheses.forEach((n) => nodeLayerMap.set(n.id, 1));
  graph1.nodes.verifications.forEach((n) => nodeLayerMap.set(n.id, 2));
  graph1.nodes.theorems.forEach((n) => nodeLayerMap.set(n.id, 3));

  let isStrictDAG = true;
  for (const edge of graph1.edges) {
    const srcLayer = nodeLayerMap.get(edge.sourceNodeId);
    const tgtLayer = nodeLayerMap.get(edge.targetNodeId);
    if (srcLayer === undefined || tgtLayer === undefined || srcLayer >= tgtLayer) {
      isStrictDAG = false;
      break;
    }
  }
  assert(isStrictDAG, 'GRAPH-01: Graph edges strictly point forward across layers (Strict Directed Acyclic Graph / DAG)');

  // -------------------------------------------------------------------
  // READ-ONLY-01: Read-Only GeometryState Invariance
  // -------------------------------------------------------------------
  console.log('\n--- TEST READ-ONLY-01: GeometryState Immutability ---');
  const stateCopy = JSON.parse(JSON.stringify(baseState));
  buildResearchGraph([resultAB, resultBC], baseState, snapshot.constructionTrace);
  assert(
    JSON.stringify(baseState) === JSON.stringify(stateCopy),
    'READ-ONLY-01: GeometryState is 100% byte-for-byte unmodified after Research Graph execution'
  );

  console.log('\n======================================================================');
  console.log('ALL PACKET #6 RESEARCH GRAPH & INVARIANT DISCOVERY TESTS PASSED (100% SUCCESS)');
  console.log('======================================================================\n');
}

// Auto-run if executed directly via tsx
runResearchGraphPacket6Tests();
