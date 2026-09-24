// src/engines/research/researchGraph.ts
// Pure, deterministic Research Graph & Epistemic Verification Pipeline for Packet #6.
// Invariants:
// 1. "The agent may be wrong. The stand must not be."
// 2. Mathematical truth is deterministic and provable via verified preconditions and canonical axioms.
// 3. Topology and provenance provide evidence for verification; proof requires a verified rule/axiom whose preconditions are deterministically satisfied.
// 4. 100% deterministic: Zero timestamps, zero Math.random(), zero external side-effects.

import { FullGeometryState } from '../constructionCore';
import { ConstructionTrace } from './researchTypes';
import { ResearchExperimentResult } from './experimentTypes';
import {
  EvidenceNode,
  HypothesisNode,
  VerificationNode,
  TheoremNode,
  ResearchGraphEdge,
  ResearchGraph,
  EpistemicStage,
} from './researchGraphTypes';
import {
  findCanonicalRuleById,
  findCanonicalRuleBySignature,
  CanonicalRuleDefinition,
} from './canonicalRules';
import {
  extractEvidenceFromExperiment,
  synthesizeHypothesesFromEvidence,
} from './crossExperimentAnalyzer';

/**
 * Deterministically verifies a single hypothesis against the canonical rule suite and geometry state.
 * Pure function: No mutations to GeometryState or hypothesis.
 */
export function verifyHypothesis(
  hypothesis: HypothesisNode,
  state: FullGeometryState,
  trace?: ConstructionTrace
): {
  verificationNode?: VerificationNode;
  theoremNode?: TheoremNode;
  updatedHypothesis: HypothesisNode;
} {
  const rule: CanonicalRuleDefinition | undefined =
    (hypothesis.matchedRuleId ? findCanonicalRuleById(hypothesis.matchedRuleId) : undefined) ||
    findCanonicalRuleBySignature(hypothesis.signature);

  if (!rule) {
    // No canonical rule exists for this hypothesis
    return {
      updatedHypothesis: {
        ...hypothesis,
        confidenceNote: `${hypothesis.confidenceNote} [ВЕРИФИКАЦИЯ НЕВОЗМОЖНА: Правило не зарегистрировано в ядре].`,
      },
    };
  }

  // Evaluate all preconditions deterministically in the geometry state
  const evalResult = rule.evaluatePreconditions(state, 'AB', trace);
  const isProven = evalResult.allSatisfied;

  const verifId = `VERIF-${hypothesis.id}-${rule.id}`;
  const verificationNode: VerificationNode = {
    id: verifId,
    hypothesisId: hypothesis.id,
    canonicalRuleId: rule.id,
    ruleName: rule.name,
    preconditionsChecked: evalResult.records,
    allPreconditionsSatisfied: isProven,
    provenanceAssistance: evalResult.provenanceAssistance,
    mathematicalBasis: rule.formalStatement,
    isProven,
  };

  if (isProven) {
    const thmId = `THM-${rule.id}`;
    const theoremNode: TheoremNode = {
      id: thmId,
      hypothesisId: hypothesis.id,
      verificationNodeId: verifId,
      canonicalRuleId: rule.id,
      name: rule.name,
      formalStatement: rule.formalStatement,
      mathematicalDomain: rule.mathematicalDomain,
      qED: true,
    };

    const updatedHypothesis: HypothesisNode = {
      ...hypothesis,
      epistemicStage: 'VERIFIED_INVARIANT',
      candidateStatus: 'VERIFIED_THEOREM',
      confidenceNote: `ТЕОРЕМА ДОКАЗАНА (Q.E.D.): Все ${evalResult.records.length} прекондиций математического правила ${rule.id} строго выполнены в текущем GeometryState.`,
    };

    return { verificationNode, theoremNode, updatedHypothesis };
  } else {
    const failedPreconditions = evalResult.records
      .filter((r) => !r.satisfied)
      .map((r) => r.preconditionId);

    const updatedHypothesis: HypothesisNode = {
      ...hypothesis,
      epistemicStage: 'VERIFIED_PRECONDITIONS',
      candidateStatus: 'REJECTED',
      confidenceNote: `ФОРМАЛЬНАЯ ВЕРИФИКАЦИЯ ПРОВАЛЕНА: Нарушены прекондиции [${failedPreconditions.join(
        ', '
      )}]. Гипотеза остаётся на стадии проверки.`,
    };

    return { verificationNode, theoremNode: undefined, updatedHypothesis };
  }
}

/**
 * Builds the complete in-memory Directed Acyclic Research Graph (DAG).
 * Pure, deterministic reconstruction from experiment results, canonical rules, and current state.
 */
export function buildResearchGraph(
  experiments: ResearchExperimentResult[],
  state: FullGeometryState,
  trace?: ConstructionTrace
): ResearchGraph {
  const evidenceList: EvidenceNode[] = [];
  const edges: ResearchGraphEdge[] = [];

  // 1. Extract all evidence nodes from experiments
  for (const exp of experiments) {
    const nodes = extractEvidenceFromExperiment(exp);
    for (const node of nodes) {
      if (!evidenceList.some((e) => e.id === node.id)) {
        evidenceList.push(node);
      }
    }
  }

  // 2. Synthesize hypotheses from evidence
  const rawHypotheses = synthesizeHypothesesFromEvidence(evidenceList);

  const finalHypotheses: HypothesisNode[] = [];
  const verifications: VerificationNode[] = [];
  const theorems: TheoremNode[] = [];

  // 3. Connect Evidence -> Hypotheses
  for (const hyp of rawHypotheses) {
    for (const evidId of hyp.evidenceNodeIds) {
      edges.push({
        id: `EDGE-${evidId}-${hyp.id}`,
        sourceNodeId: evidId,
        targetNodeId: hyp.id,
        relation: 'SUPPORTS_HYPOTHESIS',
      });
    }

    // 4. Formally verify hypotheses against canonical rules & state
    const { verificationNode, theoremNode, updatedHypothesis } = verifyHypothesis(
      hyp,
      state,
      trace
    );

    finalHypotheses.push(updatedHypothesis);

    if (verificationNode) {
      verifications.push(verificationNode);
      edges.push({
        id: `EDGE-${hyp.id}-${verificationNode.id}`,
        sourceNodeId: hyp.id,
        targetNodeId: verificationNode.id,
        relation: 'VERIFIES_PRECONDITIONS',
      });

      if (theoremNode) {
        theorems.push(theoremNode);
        edges.push({
          id: `EDGE-${verificationNode.id}-${theoremNode.id}`,
          sourceNodeId: verificationNode.id,
          targetNodeId: theoremNode.id,
          relation: 'PROVES_THEOREM',
        });
      }
    }
  }

  // Determine highest active stage
  let highestStage: EpistemicStage = 'OBSERVATION';
  const stagesOrder: EpistemicStage[] = [
    'OBSERVATION',
    'CANDIDATE_INVARIANT',
    'CROSS_EXPERIMENT_EVIDENCE',
    'KNOWN_RELATION_MATCH',
    'VERIFIED_PRECONDITIONS',
    'FORMAL_VERIFICATION',
    'VERIFIED_INVARIANT',
  ];

  for (const h of finalHypotheses) {
    const idx = stagesOrder.indexOf(h.epistemicStage);
    const currIdx = stagesOrder.indexOf(highestStage);
    if (idx > currIdx) {
      highestStage = h.epistemicStage;
    }
  }

  return {
    graphVersion: '1.0.0',
    nodes: {
      evidence: evidenceList,
      hypotheses: finalHypotheses,
      verifications,
      theorems,
    },
    edges,
    summary: {
      totalEvidenceNodes: evidenceList.length,
      totalHypotheses: finalHypotheses.length,
      totalVerifications: verifications.length,
      totalTheorems: theorems.length,
      activeStage: highestStage,
    },
  };
}
