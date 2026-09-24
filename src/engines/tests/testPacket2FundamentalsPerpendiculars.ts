// src/engines/tests/testPacket2FundamentalsPerpendiculars.ts
// Test Suite for Implementation Packet 2: FUNDAMENTALS & PERPENDICULARS (Sutton Figures 1-17)
// Verifies:
// P2-01: Perpendicular Bisector (RULE-PERPENDICULAR-BISECTOR, Equidistance, Orthogonality)
// P2-02: Angle Bisector (RULE-ANGLE-BISECTOR, Half-Angle Equality, Vertex Incidence)
// P2-03: Tangent to Circle at Boundary Point (RULE-TANGENT-RADIUS-ORTHOGONALITY)
// P2-04: Non-Tangent Line Rejection (Secant and Distant Lines)
// P2-05: Tangent from External Point & Thales Orthogonality (Sutton Fig. 15-17)
// P2-06: Dynamic Invariance & Vanishing Property (Perturbation Destroys Relations)
// P2-07: Universal Semantic Command Interface Integration

import { createDefaultGeometryState } from '../geometryState';
import { extractSemanticRelations } from '../configuration/semanticRelation';
import { executeSemanticCommand } from '../semantic/semanticCommandExecutor';
import { applyPerpendicularBisector } from '../perpendicularBisector';
import { applyAngleBisector } from '../angleBisector';
import {
  RULE_PERPENDICULAR_BISECTOR,
  RULE_ANGLE_BISECTOR,
  RULE_TANGENT_RADIUS_ORTHOGONALITY,
} from '../research/canonicalRules';
import { FullGeometryState } from '../constructionCore';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('======================================================================');
console.log('RUNNING PACKET 2: FUNDAMENTALS & PERPENDICULARS (SUTTON FIG. 1-17)');
console.log('======================================================================');

// Base equilateral state
const R = 100;
const baseState = createDefaultGeometryState({ A: 0.0, B: 1 / 3, C: 2 / 3 }, R);

// -------------------------------------------------------------------
// 1. PERPENDICULAR BISECTOR (RULE-PERPENDICULAR-BISECTOR, Sutton Fig. 9)
// -------------------------------------------------------------------
console.log('\n--- TEST P2-01: Perpendicular Bisector Verification ---');
const { nextState: stateWithPerpBis } = applyPerpendicularBisector(baseState, 'A', 'B');

// Check canonical rule evaluation
const rulePerpRes = RULE_PERPENDICULAR_BISECTOR.evaluatePreconditions(stateWithPerpBis);
assert(rulePerpRes.allSatisfied, 'P2-01.1: RULE-PERPENDICULAR-BISECTOR allPreconditions satisfied');
assert(
  rulePerpRes.records.some((r) => r.preconditionId === 'EQUIDISTANT_POINTS' && r.satisfied),
  'P2-01.2: Equidistance precondition (|PA| = |PB|) satisfied'
);
assert(
  rulePerpRes.records.some((r) => r.preconditionId === 'LINE_PASSES_THROUGH_MIDPOINT' && r.satisfied),
  'P2-01.3: Passes through midpoint precondition satisfied'
);

const relsPerp = extractSemanticRelations(stateWithPerpBis);
const verifiedPerpRel = relsPerp.find(
  (r) => r.relationType === 'PERPENDICULAR_BISECTOR_OF' && r.status === 'VERIFIED'
);
assert(verifiedPerpRel !== undefined, 'P2-01.4: Verified PERPENDICULAR_BISECTOR_OF relation extracted');
assert(
  verifiedPerpRel?.theoremOrRuleId === 'RULE-PERPENDICULAR-BISECTOR',
  'P2-01.5: Verified relation references RULE-PERPENDICULAR-BISECTOR'
);

// -------------------------------------------------------------------
// 2. ANGLE BISECTOR (RULE-ANGLE-BISECTOR, Sutton Fig. 3)
// -------------------------------------------------------------------
console.log('\n--- TEST P2-02: Angle Bisector Verification ---');
const { nextState: stateWithAngleBis } = applyAngleBisector(baseState, 'A', 'C', 'B');

const ruleAngleRes = RULE_ANGLE_BISECTOR.evaluatePreconditions(stateWithAngleBis);
assert(ruleAngleRes.allSatisfied, 'P2-02.1: RULE-ANGLE-BISECTOR allPreconditions satisfied');
assert(
  ruleAngleRes.records.some((r) => r.preconditionId === 'EQUAL_HALF_ANGLES' && r.satisfied),
  'P2-02.2: Equal half-angles precondition (α1 = α2 = θ/2) satisfied'
);

const relsAngle = extractSemanticRelations(stateWithAngleBis);
const verifiedAngleRel = relsAngle.find(
  (r) => r.relationType === 'ANGLE_BISECTOR_OF' && r.status === 'VERIFIED'
);
assert(verifiedAngleRel !== undefined, 'P2-02.3: Verified ANGLE_BISECTOR_OF relation extracted');
assert(
  verifiedAngleRel?.theoremOrRuleId === 'RULE-ANGLE-BISECTOR',
  'P2-02.4: Verified relation references RULE-ANGLE-BISECTOR'
);
// In equilateral triangle (A=0, B=1/3, C=2/3), vertex angle is 60°, half is 30°
const halfDeg = Number((verifiedAngleRel?.metadata as any)?.halfAngleDeg ?? 0);
assert(
  Math.abs(halfDeg - 30) < 1.0,
  `P2-02.5: Inscribed half-angle is 30° in equilateral triangle (got ${halfDeg}°)`
);

// -------------------------------------------------------------------
// 3. TANGENT AT A POINT ON CIRCLE (RULE-TANGENT-RADIUS-ORTHOGONALITY, Sutton Fig. 13-14)
// -------------------------------------------------------------------
console.log('\n--- TEST P2-03: Tangent to Circle at Boundary Point ---');
// Point A is at u=0 => (R, 0) = (100, 0)
// Tangent at A is vertical line x = 100, passing through (100, -50) and (100, 50)
const stateWithTangent: FullGeometryState = {
  ...baseState,
  points: {
    ...baseState.points,
    pt_tan1: {
      id: 'pt_tan1',
      name: 'T1',
      x: 100,
      y: -50,
      color: '#00ff00',
    },
    pt_tan2: {
      id: 'pt_tan2',
      name: 'T2',
      x: 100,
      y: 50,
      color: '#00ff00',
    },
  },
  lines: {
    ...baseState.lines,
    line_tangent_A: {
      id: 'line_tangent_A',
      p1Id: 'pt_tan1',
      p2Id: 'pt_tan2',
      color: '#00ff00',
      provenance: {
        macroType: 'perpendicular',
        sourceIds: ['A'],
        groupId: 'grp_tangent_A',
      },
    },
  },
};

const ruleTanRes = RULE_TANGENT_RADIUS_ORTHOGONALITY.evaluatePreconditions(
  stateWithTangent,
  'line_tangent_A'
);
assert(ruleTanRes.allSatisfied, 'P2-03.1: RULE-TANGENT-RADIUS-ORTHOGONALITY preconditions satisfied');
assert(
  ruleTanRes.records.some(
    (r) => r.preconditionId === 'DISTANCE_CENTER_TO_LINE_EQUALS_RADIUS' && r.satisfied
  ),
  'P2-03.2: Distance from center strictly equals R (dist = 100 px)'
);
assert(
  ruleTanRes.records.some((r) => r.preconditionId === 'RADIUS_ORTHOGONAL_TO_LINE' && r.satisfied),
  'P2-03.3: Radius OT orthogonal to tangent line'
);

const relsTan = extractSemanticRelations(stateWithTangent);
const tangentRel = relsTan.find((r) => r.relationType === 'TANGENT_TO');
assert(tangentRel !== undefined, 'P2-03.4: TANGENT_TO relation extracted for line_tangent_A');
assert(tangentRel?.status === 'VERIFIED', 'P2-03.5: TANGENT_TO relation has VERIFIED status');
assert(
  tangentRel?.theoremOrRuleId === 'RULE-TANGENT-RADIUS-ORTHOGONALITY',
  'P2-03.6: TANGENT_TO references RULE-TANGENT-RADIUS-ORTHOGONALITY'
);
assert(
  tangentRel?.targetEntityIds.includes('A'),
  'P2-03.7: Contact point A correctly identified in targetEntityIds'
);

// -------------------------------------------------------------------
// 4. NON-TANGENT LINE REJECTION (SECANT & DISTANT LINES)
// -------------------------------------------------------------------
console.log('\n--- TEST P2-04: Non-Tangent Line Rejection ---');
// 4a. Secant line x = 50 (dist = 50 < R=100)
const stateWithSecant: FullGeometryState = {
  ...baseState,
  points: {
    ...baseState.points,
    pt_sec1: { id: 'pt_sec1', name: 'S1', x: 50, y: -50 },
    pt_sec2: { id: 'pt_sec2', name: 'S2', x: 50, y: 50 },
  },
  lines: {
    ...baseState.lines,
    line_secant: {
      id: 'line_secant',
      p1Id: 'pt_sec1',
      p2Id: 'pt_sec2',
    },
  },
};
const relsSecant = extractSemanticRelations(stateWithSecant);
const tangentRelSecant = relsSecant.find(
  (r) => r.sourceEntityId === 'line_secant' && r.relationType === 'TANGENT_TO'
);
assert(tangentRelSecant === undefined, 'P2-04.1: Secant line (dist=50 < R) strictly NOT classified as TANGENT_TO');

// 4b. Distant line x = 150 (dist = 150 > R=100)
const stateWithDistant: FullGeometryState = {
  ...baseState,
  points: {
    ...baseState.points,
    pt_dis1: { id: 'pt_dis1', name: 'D1', x: 150, y: -50 },
    pt_dis2: { id: 'pt_dis2', name: 'D2', x: 150, y: 50 },
  },
  lines: {
    ...baseState.lines,
    line_distant: {
      id: 'line_distant',
      p1Id: 'pt_dis1',
      p2Id: 'pt_dis2',
    },
  },
};
const relsDistant = extractSemanticRelations(stateWithDistant);
const tangentRelDistant = relsDistant.find(
  (r) => r.sourceEntityId === 'line_distant' && r.relationType === 'TANGENT_TO'
);
assert(tangentRelDistant === undefined, 'P2-04.2: Distant line (dist=150 > R) strictly NOT classified as TANGENT_TO');

// -------------------------------------------------------------------
// 5. TANGENT FROM EXTERNAL POINT (Sutton Fig. 15-17)
// -------------------------------------------------------------------
console.log('\n--- TEST P2-05: Tangent From External Point & Thales Triangle ---');
// Let external point P = (200, 0), dist(O, P) = 2R = 200
// Contact point T on circle (R=100) with cos(θ) = R / 200 = 0.5 => θ = 60° (u = 60/360 = 1/6)
// T = (100 * cos(60°), 100 * sin(60°)) = (50, 50 * sqrt(3)) ≈ (50, 86.6025)
const tx = 50;
const ty = 50 * Math.sqrt(3);
// Tangent line passes through P(200, 0) and T(50, 86.6025)
const stateWithExtTangent: FullGeometryState = {
  ...baseState,
  points: {
    ...baseState.points,
    pt_P: { id: 'pt_P', name: 'P_ext', x: 200, y: 0 },
    pt_T: { id: 'pt_T', name: 'T_contact', x: tx, y: ty, onCircle: true },
  },
  lines: {
    ...baseState.lines,
    line_ext_tangent: {
      id: 'line_ext_tangent',
      p1Id: 'pt_P',
      p2Id: 'pt_T',
      provenance: {
        macroType: 'perpendicular',
        sourceIds: ['pt_T'],
        groupId: 'grp_ext_tangent',
      },
    },
  },
};

const relsExtTan = extractSemanticRelations(stateWithExtTangent);
const extTanRel = relsExtTan.find(
  (r) => r.sourceEntityId === 'line_ext_tangent' && r.relationType === 'TANGENT_TO'
);
assert(extTanRel !== undefined, 'P2-05.1: External tangent line classified as TANGENT_TO');
assert(extTanRel?.status === 'VERIFIED', 'P2-05.2: External tangent has VERIFIED status');
assert(
  extTanRel?.targetEntityIds.includes('pt_T'),
  'P2-05.3: External tangent links to contact point pt_T'
);

// Verify Thales right angle: OT ⟂ PT -> angle OTP = 90°
const vecOT = { x: tx, y: ty };
const vecPT = { x: tx - 200, y: ty - 0 };
const dotOT_PT = vecOT.x * vecPT.x + vecOT.y * vecPT.y;
assert(
  Math.abs(dotOT_PT) < 1e-2,
  `P2-05.4: Radius OT is orthogonal to tangent PT (dot product = ${dotOT_PT.toFixed(4)} ≈ 0)`
);

// -------------------------------------------------------------------
// 6. DYNAMIC MUTATION & VANISHING PROPERTY
// -------------------------------------------------------------------
console.log('\n--- TEST P2-06: Dynamic Invariance & Vanishing Property ---');
// 6a. Perturb tangent line: shift x from 100 to 102
const perturbedTanState: FullGeometryState = {
  ...stateWithTangent,
  points: {
    ...stateWithTangent.points,
    pt_tan1: { ...stateWithTangent.points.pt_tan1, x: 102 },
    pt_tan2: { ...stateWithTangent.points.pt_tan2, x: 102 },
  },
};
const relsPerturbedTan = extractSemanticRelations(perturbedTanState);
const tanPerturbedRel = relsPerturbedTan.find(
  (r) => r.sourceEntityId === 'line_tangent_A' && r.relationType === 'TANGENT_TO'
);
assert(
  tanPerturbedRel === undefined,
  'P2-06.1: TANGENT_TO relation vanishes when line is perturbed off the circle'
);

// 6b. Perturb circle radius from 100 to 120
const perturbedCircleState: FullGeometryState = {
  ...stateWithTangent,
  R: 120,
};
const relsPerturbedCirc = extractSemanticRelations(perturbedCircleState);
const tanPerturbedCircRel = relsPerturbedCirc.find(
  (r) => r.sourceEntityId === 'line_tangent_A' && r.relationType === 'TANGENT_TO'
);
assert(
  tanPerturbedCircRel === undefined,
  'P2-06.2: TANGENT_TO relation vanishes when circle radius changes'
);

// 6c. Rotate tangent around circle: point B at 120° (u = 1/3)
// B = (-50, 50*sqrt(3)). Normal is (-0.5, sqrt(3)/2). Tangent dir is (-sqrt(3)/2, -0.5).
const bx = -50;
const by = 50 * Math.sqrt(3);
const dirBx = -Math.sqrt(3) / 2;
const dirBy = -0.5;
const rotatedTanState: FullGeometryState = {
  ...baseState,
  points: {
    ...baseState.points,
    pt_tanB1: { id: 'pt_tanB1', name: 'TB1', x: bx - 50 * dirBx, y: by - 50 * dirBy },
    pt_tanB2: { id: 'pt_tanB2', name: 'TB2', x: bx + 50 * dirBx, y: by + 50 * dirBy },
  },
  lines: {
    ...baseState.lines,
    line_tan_B: {
      id: 'line_tan_B',
      p1Id: 'pt_tanB1',
      p2Id: 'pt_tanB2',
    },
  },
};
const relsRotatedTan = extractSemanticRelations(rotatedTanState);
const tanBRel = relsRotatedTan.find(
  (r) => r.sourceEntityId === 'line_tan_B' && r.relationType === 'TANGENT_TO'
);
assert(
  tanBRel !== undefined,
  'P2-06.3: TANGENT_TO dynamically maintained when rotated to another circle point B'
);

// -------------------------------------------------------------------
// 7. UNIVERSAL SEMANTIC COMMAND INTERFACE INTEGRATION
// -------------------------------------------------------------------
console.log('\n--- TEST P2-07: Universal Semantic Command Interface Integration ---');
// Query GET_RELATIONS with filter on stateWithTangent
const queryTangentCmd = {
  command: 'GET_RELATIONS' as const,
  filter: { type: 'TANGENT_TO' as const },
};
const tanCmdRes = executeSemanticCommand(stateWithTangent, queryTangentCmd);
assert(tanCmdRes.success, 'P2-07.1: Agent GET_RELATIONS for TANGENT_TO succeeds');
assert(
  Array.isArray(tanCmdRes.derivedRelations) && tanCmdRes.derivedRelations.length === 1,
  'P2-07.2: Exactly 1 TANGENT_TO relation returned via agent query'
);

// Query GET_RELATIONS with filter on stateWithPerpBis
const queryPerpBisCmd = {
  command: 'GET_RELATIONS' as const,
  filter: { type: 'PERPENDICULAR_BISECTOR_OF' as const },
};
const perpBisCmdRes = executeSemanticCommand(stateWithPerpBis, queryPerpBisCmd);
assert(perpBisCmdRes.success, 'P2-07.3: Agent GET_RELATIONS for PERPENDICULAR_BISECTOR_OF succeeds');
assert(
  (perpBisCmdRes.derivedRelations?.length ?? 0) >= 1,
  'P2-07.4: At least 1 PERPENDICULAR_BISECTOR_OF relation returned via agent query'
);

// Query GET_CONFIGURATION on stateWithTangent
const queryConfigCmd = {
  command: 'GET_CONFIGURATION' as const,
};
const configCmdRes = executeSemanticCommand(stateWithTangent, queryConfigCmd);
assert(configCmdRes.success, 'P2-07.5: Agent GET_CONFIGURATION succeeds');
const tangentInPassport = configCmdRes.configurationView?.semanticRelations?.find(
  (r) => r.relationType === 'TANGENT_TO'
);
assert(tangentInPassport !== undefined, 'P2-07.6: Configuration Passport contains verified TANGENT_TO relation');

console.log('======================================================================');
console.log('✓ ALL PACKET 2 (FUNDAMENTALS & PERPENDICULARS) TESTS PASSED!');
console.log('======================================================================');
