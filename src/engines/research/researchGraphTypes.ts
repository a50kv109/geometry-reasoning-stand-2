// src/engines/research/researchGraphTypes.ts
// Pure, deterministic type definitions for Packet #6: Invariant Discovery & Research Graph.
// Epistemic Hierarchy:
// 1. OBSERVATION: Single empirical fact in an experiment step
// 2. CANDIDATE_INVARIANT: Stable observation across parameter variation in an experiment
// 3. CROSS_EXPERIMENT_EVIDENCE: Confirmed across multiple topological configurations / experiments
// 4. KNOWN_RELATION_MATCH: Structural signature matches a known canonical rule/axiom
// 5. VERIFIED_PRECONDITIONS: Mathematical & topological preconditions deterministically verified in state
// 6. FORMAL_VERIFICATION: Canonical rule rigorously applied to verified preconditions
// 7. VERIFIED_INVARIANT: Formal Theorem (proven invariant)

export type EpistemicStage =
  | 'OBSERVATION'
  | 'CANDIDATE_INVARIANT'
  | 'CROSS_EXPERIMENT_EVIDENCE'
  | 'KNOWN_RELATION_MATCH'
  | 'VERIFIED_PRECONDITIONS'
  | 'FORMAL_VERIFICATION'
  | 'VERIFIED_INVARIANT';

/**
 * Structural signature of a geometric relation.
 */
export type RelationSignature =
  | 'INSCRIBED_CENTRAL_ANGLE_RATIO' // alpha = theta / 2
  | 'CYCLIC_CHORD_METRIC_LAW' // c = 2R * sin(theta / 2)
  | 'THALES_DIAMETER_RIGHT_ANGLE' // angle_C = 90 deg when AB is diameter
  | 'ARC_COMPLEMENT_PARTITION_360' // theta_min + theta_maj = 360 deg
  | 'CIRCUMCIRCLE_RADIUS_CONSTANT' // R = const during vertex dragging
  | 'PERPENDICULAR_BISECTOR_EQUIDISTANCE' // points on bisector equidistant from endpoints
  | 'ANGLE_BISECTOR_EQUALITY' // alpha1 = alpha2 = theta/2
  | 'TANGENT_RADIUS_ORTHOGONALITY' // line perp to radius at contact point, dist = R
  | 'CUSTOM_RELATION';

/**
 * Node in Research Graph: Empirical evidence collected from an experiment.
 */
export interface EvidenceNode {
  readonly id: string; // e.g. "EVID-chord_arc_dynamic-AB-01"
  readonly experimentId: string;
  readonly targetEntity: string;
  readonly signature: RelationSignature;
  readonly title: string;
  readonly sampleCount: number; // Number of steps evaluated
  readonly observedMetricSummary: string;
  readonly preservedInvariants: string[];
  readonly varyingParameters: string[];
  readonly parameterRange: {
    min: number;
    max: number;
    unit: string;
  };
}

/**
 * Node in Research Graph: Formulated candidate hypothesis derived from evidence.
 */
export interface HypothesisNode {
  readonly id: string; // e.g. "HYP-INSCRIBED_CENTRAL_ANGLE_RATIO"
  readonly signature: RelationSignature;
  readonly title: string;
  readonly description: string;
  readonly formula: string;
  readonly epistemicStage: EpistemicStage;
  readonly candidateStatus:
    | 'FORMULATED'
    | 'SUPPORTED_BY_MULTI_EXPERIMENT'
    | 'MATCHED_CANONICAL_PATTERN'
    | 'VERIFICATION_IN_PROGRESS'
    | 'VERIFIED_THEOREM'
    | 'REJECTED';
  readonly evidenceNodeIds: string[];
  readonly matchedRuleId?: string;
  readonly confidenceNote: string;
}

/**
 * Single precondition evaluation record.
 */
export interface PreconditionCheckRecord {
  readonly preconditionId: string;
  readonly description: string;
  readonly satisfied: boolean;
  readonly evidence: string;
  readonly measuredValue?: string | number;
  readonly requiredCondition?: string;
}

/**
 * Provenance assistance guidance.
 * Topology and provenance provide guidance for what preconditions to check,
 * but do NOT by themselves constitute proof.
 */
export interface ProvenanceAssistance {
  readonly entityId?: string;
  readonly macroType?: string;
  readonly topologicalRole?: string;
  readonly guidanceNote: string;
}

/**
 * Node in Research Graph: Deterministic record of verified mathematical preconditions.
 */
export interface VerificationNode {
  readonly id: string; // e.g. "VERIF-HYP-CYCLIC_CHORD_LAW-RULE-01"
  readonly hypothesisId: string;
  readonly canonicalRuleId: string;
  readonly ruleName: string;
  readonly preconditionsChecked: PreconditionCheckRecord[];
  readonly allPreconditionsSatisfied: boolean;
  readonly provenanceAssistance: ProvenanceAssistance;
  readonly mathematicalBasis: string;
  readonly isProven: boolean;
}

/**
 * Node in Research Graph: Proven Theorem (Verified Invariant).
 */
export interface TheoremNode {
  readonly id: string; // e.g. "THM-RULE-INSCRIBED-ANGLE"
  readonly hypothesisId: string;
  readonly verificationNodeId: string;
  readonly canonicalRuleId: string;
  readonly name: string;
  readonly formalStatement: string;
  readonly mathematicalDomain: string;
  readonly qED: true;
}

/**
 * Edge connecting nodes in the Directed Acyclic Research Graph (DAG).
 */
export interface ResearchGraphEdge {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly relation:
    | 'SUPPORTS_HYPOTHESIS'
    | 'MATCHES_RULE'
    | 'VERIFIES_PRECONDITIONS'
    | 'PROVES_THEOREM';
}

/**
 * Complete in-memory Directed Acyclic Research Graph (DAG).
 * 100% deterministic, timestamp-free, and JSON-serializable.
 */
export interface ResearchGraph {
  readonly graphVersion: '1.0.0';
  readonly nodes: {
    readonly evidence: EvidenceNode[];
    readonly hypotheses: HypothesisNode[];
    readonly verifications: VerificationNode[];
    readonly theorems: TheoremNode[];
  };
  readonly edges: ResearchGraphEdge[];
  readonly summary: {
    readonly totalEvidenceNodes: number;
    readonly totalHypotheses: number;
    readonly totalVerifications: number;
    readonly totalTheorems: number;
    readonly activeStage: EpistemicStage;
  };
}
