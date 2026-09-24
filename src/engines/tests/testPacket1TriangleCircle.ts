// src/engines/tests/testPacket1TriangleCircle.ts
// Comprehensive Test Suite for Implementation Packet 1:
// Triangle–Circle / Chord–Arc–Thales
// Verifies:
// 1. INSCRIBED TRIANGLE (INSCRIBED_IN): Valid base state, dynamic mutation, vanishing when vertex leaves circle.
// 2. CHORD (CHORD_OF): Both endpoints on circle, non-chords rejected, vanishing when endpoint leaves circle.
// 3. DIAMETER (DIAMETER_OF): Verified when length=2R and passes through center O, vanishes when chord is not diameter.
// 4. ARC (SUBTENDS_ARC): Central angle theta computed, relation to chord length c = 2R*sin(theta/2).
// 5. INSCRIBED ANGLE (INSCRIBED_ANGLE_OF): Inscribed angle alpha = theta/2, dynamic invariance along arc.
// 6. THALES RIGHT ANGLE: Perpendicularity (90°) when chord is diameter and vertex on circle, dynamic preservation along semicircle, vanishing when preconditions fail.
// 7. SEMANTIC COMMAND INTEGRATION: Querying relations via executeSemanticCommand (GET_RELATIONS).

import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  FullGeometryState,
} from '../constructionCore';
import {
  extractSemanticRelations,
  extractSemanticConstructions,
} from '../configuration/semanticRelation';
import { buildConfigurationView } from '../configuration/configurationProjector';
import { executeSemanticCommand } from '../semantic/semanticCommandExecutor';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${msg}`);
}

console.log('======================================================================');
console.log('RUNNING PACKET 1: TRIANGLE–CIRCLE / CHORD–ARC–THALES TEST SUITE');
console.log('======================================================================\n');

// -------------------------------------------------------------------
// 1. INSCRIBED TRIANGLE (INSCRIBED_IN)
// -------------------------------------------------------------------
console.log('--- TEST P1-01: Inscribed Triangle Semantic Relation ---');
// Base state: A=0.0, B=0.5 (diameter), C=0.25 on circle with R=100
const baseState = createDefaultGeometryState({ A: 0.0, B: 0.5, C: 0.25 }, 100);
const rels0 = extractSemanticRelations(baseState);

const inscribedRel = rels0.find(
  (r) => r.relationType === 'INSCRIBED_IN' && r.sourceEntityId === 'triangle_ABC'
);
assert(inscribedRel !== undefined, 'P1-01.1: INSCRIBED_IN relation exists for triangle_ABC in base state');
assert(inscribedRel?.status === 'DERIVED', 'P1-01.2: INSCRIBED_IN relation has DERIVED status');
assert(inscribedRel?.targetEntityIds.includes('base_circle') === true, 'P1-01.3: Target is base_circle');
assert(inscribedRel?.theoremOrRuleId === 'RULE-INSCRIBED-TRIANGLE', 'P1-01.4: Rule is RULE-INSCRIBED-TRIANGLE');

// Move vertex C off the circle (inside to 50, 0)
const mutatedStateOffCircle: FullGeometryState = {
  ...baseState,
  points: {
    ...baseState.points,
    C: {
      ...baseState.points.C,
      x: 50,
      y: 0,
      onCircle: false,
    },
  },
};
const relsOff = extractSemanticRelations(mutatedStateOffCircle);
const inscribedRelOff = relsOff.find((r) => r.relationType === 'INSCRIBED_IN');
assert(inscribedRelOff === undefined, 'P1-01.5: INSCRIBED_IN vanishes when vertex C leaves the circle');

// Degenerate triangle: two vertices coincident (A and B at same position)
const degenerateState: FullGeometryState = {
  ...baseState,
  points: {
    ...baseState.points,
    B: {
      ...baseState.points.A,
      id: 'B',
      name: 'B',
    },
  },
};
const relsDegen = extractSemanticRelations(degenerateState);
const inscribedRelDegen = relsDegen.find((r) => r.relationType === 'INSCRIBED_IN');
assert(inscribedRelDegen === undefined, 'P1-01.6: INSCRIBED_IN vanishes when triangle is degenerate');

// -------------------------------------------------------------------
// 2. CHORD (CHORD_OF)
// -------------------------------------------------------------------
console.log('\n--- TEST P1-02: Chord Semantic Relation & Non-Chord Rejection ---');
const chordRels = rels0.filter((r) => r.relationType === 'CHORD_OF');
assert(chordRels.length >= 3, `P1-02.1: At least 3 chords found in base state (found ${chordRels.length})`);
assert(chordRels.some((r) => r.sourceEntityId === 'chord_AB'), 'P1-02.2: chord_AB is a chord');
assert(chordRels.some((r) => r.sourceEntityId === 'chord_BC'), 'P1-02.3: chord_BC is a chord');
assert(chordRels.some((r) => r.sourceEntityId === 'chord_CA'), 'P1-02.4: chord_CA is a chord');

// Add a point inside the circle and a segment to it (not a chord!)
const stateWithInteriorSegment: FullGeometryState = dispatchGeometryCommand(
  dispatchGeometryCommand(baseState, {
    type: 'ADD_POINT',
    point: { id: 'P_interior', name: 'P_int', x: 20, y: 30, onCircle: false },
  }),
  {
    type: 'ADD_SEGMENT',
    segment: { id: 'seg_non_chord', p1Id: 'A', p2Id: 'P_interior' },
  }
);
const relsInterior = extractSemanticRelations(stateWithInteriorSegment);
const nonChordRel = relsInterior.find(
  (r) => r.relationType === 'CHORD_OF' && r.sourceEntityId === 'seg_non_chord'
);
assert(nonChordRel === undefined, 'P1-02.5: Segment with interior endpoint is strictly NOT classified as chord');

// If an existing chord endpoint moves off the circle, its chord relation must vanish
const chordOffRels = relsOff.filter((r) => r.relationType === 'CHORD_OF');
assert(!chordOffRels.some((r) => r.sourceEntityId === 'chord_BC'), 'P1-02.6: chord_BC ceases to be a chord when C is moved off circle');
assert(!chordOffRels.some((r) => r.sourceEntityId === 'chord_CA'), 'P1-02.7: chord_CA ceases to be a chord when C is moved off circle');
assert(chordOffRels.some((r) => r.sourceEntityId === 'chord_AB'), 'P1-02.8: chord_AB remains a chord since A and B remain on circle');

// -------------------------------------------------------------------
// 3. DIAMETER (DIAMETER_OF)
// -------------------------------------------------------------------
console.log('\n--- TEST P1-03: Diameter Semantic Relation ---');
// In base state: A=0.0 (100, 0), B=0.5 (-100, 0) -> chord_AB is a diameter (length = 200 = 2R)
const diamAB = rels0.find(
  (r) => r.relationType === 'DIAMETER_OF' && r.sourceEntityId === 'chord_AB'
);
assert(diamAB !== undefined, 'P1-03.1: chord_AB is verified as DIAMETER_OF base_circle');
assert(diamAB?.status === 'VERIFIED', 'P1-03.2: Diameter relation status is VERIFIED');
assert(diamAB?.theoremOrRuleId === 'RULE-THALES-DIAMETER', 'P1-03.3: Diameter references RULE-THALES-DIAMETER');

// chord_BC and chord_CA are not diameters in this configuration
const diamBC = rels0.find(
  (r) => r.relationType === 'DIAMETER_OF' && r.sourceEntityId === 'chord_BC'
);
const diamCA = rels0.find(
  (r) => r.relationType === 'DIAMETER_OF' && r.sourceEntityId === 'chord_CA'
);
assert(diamBC === undefined, 'P1-03.4: chord_BC is not a diameter');
assert(diamCA === undefined, 'P1-03.5: chord_CA is not a diameter');

// Move vertices so that NO chord is a diameter (equilateral: A=0, B=1/3, C=2/3)
const equilateralState = createDefaultGeometryState(
  { A: 0.0, B: 1 / 3, C: 2 / 3 },
  100
);
const relsEquilateral = extractSemanticRelations(equilateralState);
const anyDiamEquilateral = relsEquilateral.find((r) => r.relationType === 'DIAMETER_OF');
assert(anyDiamEquilateral === undefined, 'P1-03.6: No chord is a diameter in equilateral configuration');

// Move vertices so that chord_BC becomes the diameter (B=0.2, C=0.7)
const bcDiamState = createDefaultGeometryState(
  { A: 0.0, B: 0.2, C: 0.7 },
  100
);
const relsBCDiam = extractSemanticRelations(bcDiamState);
const diamBCNew = relsBCDiam.find(
  (r) => r.relationType === 'DIAMETER_OF' && r.sourceEntityId === 'chord_BC'
);
assert(diamBCNew !== undefined, 'P1-03.7: chord_BC becomes DIAMETER_OF when B and C are antipodal');

// -------------------------------------------------------------------
// 4. ARC (SUBTENDS_ARC)
// -------------------------------------------------------------------
console.log('\n--- TEST P1-04: Subtended Arc & Central Angle Relations ---');
const arcRels = rels0.filter((r) => r.relationType === 'SUBTENDS_ARC');
assert(arcRels.length >= 3, `P1-04.1: At least 3 SUBTENDS_ARC relations found (found ${arcRels.length})`);

const arcAB = arcRels.find((r) => r.sourceEntityId === 'chord_AB');
assert(arcAB !== undefined, 'P1-04.2: SUBTENDS_ARC for chord_AB exists');
assert(arcAB?.metadata?.centralAngleDeg === 180, `P1-04.3: Central angle for diameter AB is 180° (got ${arcAB?.metadata?.centralAngleDeg})`);

// For chord_BC in base state: B=0.5, C=0.25 -> central angle is 90°
const arcBC = arcRels.find((r) => r.sourceEntityId === 'chord_BC');
assert(arcBC !== undefined, 'P1-04.4: SUBTENDS_ARC for chord_BC exists');
assert(arcBC?.metadata?.centralAngleDeg === 90, `P1-04.5: Central angle for chord_BC is 90° (got ${arcBC?.metadata?.centralAngleDeg})`);

// Verify numerical relation c = 2R * sin(theta/2)
const segBC = baseState.segments.chord_BC;
const thetaRad = ((Number((arcBC?.metadata as any)?.centralAngleDeg ?? 0)) * Math.PI) / 180;
const expectedChordLen = 2 * baseState.R * Math.sin(thetaRad / 2);
assert(
  Math.abs(segBC.length - expectedChordLen) < 1e-2,
  `P1-04.6: Chord length matches 2R*sin(theta/2): ${segBC.length.toFixed(2)} ≈ ${expectedChordLen.toFixed(2)}`
);

// -------------------------------------------------------------------
// 5. INSCRIBED ANGLE (INSCRIBED_ANGLE_OF)
// -------------------------------------------------------------------
console.log('\n--- TEST P1-05: Inscribed Angle Relations ---');
const inscribedAngleRels = rels0.filter((r) => r.relationType === 'INSCRIBED_ANGLE_OF');
assert(inscribedAngleRels.length > 0, `P1-05.1: Inscribed angles extracted (found ${inscribedAngleRels.length})`);

// In base state (A=0, B=0.5, C=0.25):
// Inscribed angle at C subtending AB (diameter, theta=180°) must be 90°
const angleAtC = inscribedAngleRels.find(
  (r) => r.sourceEntityId === 'C' && (r.metadata as any)?.chordId === 'chord_AB'
);
assert(angleAtC !== undefined, 'P1-05.2: Inscribed angle at C subtending chord_AB found');
assert(
  Math.abs(Number((angleAtC?.metadata as any)?.angleDeg ?? 0) - 90) < 0.5,
  `P1-05.3: Inscribed angle at C subtending diameter AB is 90° (got ${(angleAtC?.metadata as any)?.angleDeg}°)`
);

// Move vertex C continuously along the circle to C=0.35 (still subtending diameter AB)
const movedStateC = createDefaultGeometryState({ A: 0.0, B: 0.5, C: 0.35 }, 100);
const relsMovedC = extractSemanticRelations(movedStateC);
const angleAtCMoved = relsMovedC.find(
  (r) => r.relationType === 'INSCRIBED_ANGLE_OF' && r.sourceEntityId === 'C' && (r.metadata as any)?.chordId === 'chord_AB'
);
assert(angleAtCMoved !== undefined, 'P1-05.4: Inscribed angle at C preserved after moving along circle');
assert(
  Math.abs(Number((angleAtCMoved?.metadata as any)?.angleDeg ?? 0) - 90) < 0.5,
  `P1-05.5: Inscribed angle at C remains strictly 90° after moving C (got ${(angleAtCMoved?.metadata as any)?.angleDeg}°)`
);

// -------------------------------------------------------------------
// 6. THALES RIGHT ANGLE (PERPENDICULAR_TO via RULE-THALES-DIAMETER)
// -------------------------------------------------------------------
console.log('\n--- TEST P1-06: Thales Right Angle Verification & Epistemic Invariance ---');
// In base state: AB is diameter and C on circle -> AC ⟂ BC
const thalesPerp = rels0.find(
  (r) => r.relationType === 'PERPENDICULAR_TO' && r.theoremOrRuleId === 'RULE-THALES-DIAMETER'
);
assert(thalesPerp !== undefined, 'P1-06.1: Thales perpendicularity relation found in base state');
assert(thalesPerp?.status === 'VERIFIED', 'P1-06.2: Thales relation has VERIFIED epistemic status');

// Vertex level Thales relation
const thalesVertex = rels0.find(
  (r) => r.id === 'REL_THALES_RIGHT_ANGLE_C_ON_chord_AB'
);
assert(thalesVertex !== undefined, 'P1-06.3: Vertex-level Thales right angle found at C');
assert(thalesVertex?.metadata?.angleDeg === 90, 'P1-06.4: Thales right angle metadata states 90°');

// Dynamic preservation along semicircle: C moved to 0.35
const thalesPerpMoved = relsMovedC.find(
  (r) => r.relationType === 'PERPENDICULAR_TO' && r.theoremOrRuleId === 'RULE-THALES-DIAMETER'
);
assert(thalesPerpMoved !== undefined, 'P1-06.5: Thales right angle dynamically preserved when C moves along semicircle');

// Precondition failure 1: AB is NO LONGER a diameter
const thalesEquilateral = relsEquilateral.find(
  (r) => r.theoremOrRuleId === 'RULE-THALES-DIAMETER'
);
assert(thalesEquilateral === undefined, 'P1-06.6: Thales relation vanishes when no chord is a diameter');

// Precondition failure 2: C is NOT on the circle (moved inside)
const thalesOffCircle = relsOff.find(
  (r) => r.relationType === 'PERPENDICULAR_TO' && r.theoremOrRuleId === 'RULE-THALES-DIAMETER'
);
assert(thalesOffCircle === undefined, 'P1-06.7: Thales right angle relation vanishes when vertex C leaves the circle');

// -------------------------------------------------------------------
// 7. UNIVERSAL SEMANTIC TOOL INTERFACE (AGENT QUERY INTEGRATION)
// -------------------------------------------------------------------
console.log('\n--- TEST P1-07: Universal Semantic Command Interface Integration ---');
// Agent queries relations using GET_RELATIONS
const agentRelResult = executeSemanticCommand(baseState, {
  command: 'GET_RELATIONS',
  filter: { type: 'INSCRIBED_IN' },
});
assert(agentRelResult.success, 'P1-07.1: Agent GET_RELATIONS succeeds');
assert(
  agentRelResult.derivedRelations !== undefined && agentRelResult.derivedRelations.length === 1,
  'P1-07.2: Exactly 1 INSCRIBED_IN relation returned via agent query'
);

// Agent queries diameters using GET_RELATIONS
const agentDiamResult = executeSemanticCommand(baseState, {
  command: 'GET_RELATIONS',
  filter: { type: 'DIAMETER_OF' },
});
assert(agentDiamResult.success, 'P1-07.3: Agent queries DIAMETER_OF successfully');
assert(
  agentDiamResult.derivedRelations !== undefined && agentDiamResult.derivedRelations.length === 1,
  'P1-07.4: Exactly 1 DIAMETER_OF relation returned via agent query'
);

// Configuration Passport integration
const configPassport = buildConfigurationView(baseState);
assert(
  configPassport.semanticRelations.some((r) => r.relationType === 'INSCRIBED_IN'),
  'P1-07.5: Configuration Passport contains INSCRIBED_IN relation'
);
assert(
  configPassport.semanticRelations.some((r) => r.relationType === 'CHORD_OF'),
  'P1-07.6: Configuration Passport contains CHORD_OF relations'
);
assert(
  configPassport.semanticRelations.some((r) => r.relationType === 'DIAMETER_OF'),
  'P1-07.7: Configuration Passport contains DIAMETER_OF relations'
);
assert(
  configPassport.semanticRelations.some((r) => r.relationType === 'SUBTENDS_ARC'),
  'P1-07.8: Configuration Passport contains SUBTENDS_ARC relations'
);
assert(
  configPassport.semanticRelations.some((r) => r.relationType === 'INSCRIBED_ANGLE_OF'),
  'P1-07.9: Configuration Passport contains INSCRIBED_ANGLE_OF relations'
);

console.log('\n======================================================================');
console.log('✓ ALL PACKET 1 (TRIANGLE–CIRCLE / CHORD–ARC–THALES) TESTS PASSED!');
console.log('======================================================================\n');
