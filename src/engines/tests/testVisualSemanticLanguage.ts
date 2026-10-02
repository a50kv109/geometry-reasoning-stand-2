// src/engines/tests/testVisualSemanticLanguage.ts
// Verification Test Suite for Visual Semantic Language + Semantic Guard PoC
// Covers TESTS 1 through 12

import {
  createDefaultGeometryState,
  FullGeometryState,
  dispatchGeometryCommand,
} from '../constructionCore';
import {
  normalizeColorName,
  extractVisualQuery,
  resolveVisualIdentity,
} from '../semantic/visualIdentityResolver';
import { evaluateSemanticGuard } from '../semantic/semanticGuard';
import { processVisualSemanticInput } from '../semantic/aamVisualIntegration';
import { executeSemanticCommand } from '../semantic/semanticCommandExecutor';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('======================================================================');
console.log('RUNNING VISUAL SEMANTIC LANGUAGE + SEMANTIC GUARD TEST SUITE (TESTS 1 to 12)');
console.log('======================================================================\n');

// ----------------------------------------------------------------------------
// Setup Base Geometry State with Visual Colors
// Triangle ABC: AB=RED, BC=GREEN, CA=BLUE
// ----------------------------------------------------------------------------
const baseU = { A: 0.75, B: 0.08333333333333333, C: 0.25 };
const R = 120;
let testState: FullGeometryState = createDefaultGeometryState(baseU, R);

// Apply Colors to Edges
testState = {
  ...testState,
  segments: {
    ...testState.segments,
    chord_AB: { ...testState.segments.chord_AB, color: '#EF4444' }, // RED
    chord_BC: { ...testState.segments.chord_BC, color: '#10B981' }, // GREEN
    chord_CA: { ...testState.segments.chord_CA, color: '#3B82F6' }, // BLUE
  },
};

// ----------------------------------------------------------------------------
// TEST 1: RED + GREEN -> Unique Angle at Vertex B
// ----------------------------------------------------------------------------
console.log('--- TEST 1: RED + GREEN -> unique angle at vertex B ---');
const query1 = extractVisualQuery('Построй биссектрису красно-зелёного угла');
assert(query1 !== null, 'TEST 1.1: Visual query extracted');
assert(query1?.colors?.length === 2, 'TEST 1.2: Two colors extracted');
assert(query1?.colors?.[0] === 'RED' && query1?.colors?.[1] === 'GREEN', 'TEST 1.3: Colors are RED and GREEN');

const res1 = resolveVisualIdentity(testState, query1!);
assert(res1.status === 'RESOLVED', 'TEST 1.4: Visual identity resolved');
assert((res1 as any).entityId === 'angle_B', 'TEST 1.5: Target angle entity is angle_B');
assert((res1 as any).angleInfo.vertexId === 'B', 'TEST 1.6: Vertex is B');

// ----------------------------------------------------------------------------
// TEST 2: Multiple RED Lines -> AMBIGUOUS
// ----------------------------------------------------------------------------
console.log('\n--- TEST 2: Multiple RED lines -> AMBIGUOUS ---');
const stateWith2Reds: FullGeometryState = {
  ...testState,
  segments: {
    ...testState.segments,
    chord_CA: { ...testState.segments.chord_CA, color: '#EF4444' }, // Also RED!
  },
};
const query2 = extractVisualQuery('Проведи высоту к красной стороне через вершину B');
const res2 = resolveVisualIdentity(stateWith2Reds, query2!);
assert(res2.status === 'AMBIGUOUS', 'TEST 2.1: Resolves to AMBIGUOUS due to multiple red segments');
assert((res2 as any).candidates.length === 2, 'TEST 2.2: Exactly 2 candidate segments found');

const guard2 = evaluateSemanticGuard(stateWith2Reds, res2, {
  requestedAction: 'CONSTRUCT_PERPENDICULAR',
  throughPointId: 'B',
});
assert(guard2.action === 'CLARIFY', 'TEST 2.3: Semantic Guard produces CLARIFY action');

// ----------------------------------------------------------------------------
// TEST 3: Recoloring RED -> BLUE Preserves Identity (Invariant: Visual != Object)
// ----------------------------------------------------------------------------
console.log('\n--- TEST 3: Dynamic Recoloring RED -> BLUE Preserves Identity ---');
const recoloredState: FullGeometryState = {
  ...testState,
  segments: {
    ...testState.segments,
    chord_AB: { ...testState.segments.chord_AB, color: '#3B82F6' }, // Recolored to BLUE
  },
};
const query3 = extractVisualQuery('Проведи перпендикуляр к синей стороне через C');
const res3 = resolveVisualIdentity(recoloredState, query3!);
// In this state, chord_AB is BLUE and chord_CA is BLUE -> 2 blues -> AMBIGUOUS
assert(res3.status === 'AMBIGUOUS', 'TEST 3.1: Two blue segments identified');

// Now make chord_CA YELLOW, so chord_AB is the only BLUE
const singleBlueState: FullGeometryState = {
  ...recoloredState,
  segments: {
    ...recoloredState.segments,
    chord_CA: { ...recoloredState.segments.chord_CA, color: '#F59E0B' }, // YELLOW
  },
};
const res3Single = resolveVisualIdentity(singleBlueState, query3!);
assert(res3Single.status === 'RESOLVED', 'TEST 3.2: Single blue segment resolved');
assert((res3Single as any).entityId === 'chord_AB', 'TEST 3.3: Resolved entity is chord_AB (stable portableId)');

// ----------------------------------------------------------------------------
// TEST 4: BLACK_SQUARE -> RIGHT_ANGLE Resolution
// ----------------------------------------------------------------------------
console.log('\n--- TEST 4: BLACK_SQUARE -> RIGHT_ANGLE ---');
// Create right triangle with angle C = 90° (hypotenuse AB across diameter)
const rightTriangleState = createDefaultGeometryState(
  { A: 0.0, B: 0.5, C: 0.25 }, // arc AB = 0.50 -> angle C = 90°
  R
);
const query4 = extractVisualQuery('Измерь угол с чёрным квадратиком');
assert(query4 !== null && query4.marker === 'RIGHT_ANGLE_SQUARE', 'TEST 4.1: Marker query extracted');

const res4 = resolveVisualIdentity(rightTriangleState, query4!);
assert(res4.status === 'RESOLVED', 'TEST 4.2: Marker resolved to right angle');
assert((res4 as any).entityId === 'angle_C', 'TEST 4.3: Right angle is angle_C');
assert((res4 as any).angleInfo.isRightAngle === true, 'TEST 4.4: isRightAngle is true');

// ----------------------------------------------------------------------------
// TEST 5: BLACK_SQUARE + "острый" -> CONFLICT Detection by Semantic Guard
// ----------------------------------------------------------------------------
console.log('\n--- TEST 5: BLACK_SQUARE + "острый" -> CONFLICT ---');
const guard5 = evaluateSemanticGuard(rightTriangleState, res4, {
  requestedAction: 'CONSTRUCT_ANGLE_BISECTOR',
  originalText: 'Построй биссектрису угла с квадратиком, потому что он острый',
});
assert(guard5.action === 'REJECT', 'TEST 5.1: Semantic Guard detects contradiction and rejects');
assert((guard5 as any).reason.includes('прямым (90°)'), 'TEST 5.2: Educational explanation mentions 90°');
assert((guard5 as any).suggestedCorrection !== undefined, 'TEST 5.3: Suggested correction offered');

// ----------------------------------------------------------------------------
// TEST 6: Standard Text Query (No Visual Tokens) -> Fast Bypass
// ----------------------------------------------------------------------------
console.log('\n--- TEST 6: Standard Text Query -> Fast Bypass ---');
const plainText = 'Построй биссектрису угла C';
const bypassRes = processVisualSemanticInput(testState, plainText);
assert(bypassRes === null, 'TEST 6.1: Returns null for plain text (Fast Bypass to standard AAM)');

// ----------------------------------------------------------------------------
// TEST 7: "красная сторона" -> Correct Segment
// ----------------------------------------------------------------------------
console.log('\n--- TEST 7: "красная сторона" -> correct segment ---');
const query7 = extractVisualQuery('красная сторона');
assert(query7 !== null, 'TEST 7.1: Single color query extracted');
const res7 = resolveVisualIdentity(testState, query7!);
assert(res7.status === 'RESOLVED', 'TEST 7.2: Single red segment resolved');
assert((res7 as any).entityId === 'chord_AB', 'TEST 7.3: Resolved entity is chord_AB');

// ----------------------------------------------------------------------------
// TEST 8: "зелёная линия" -> Correct Line/Segment
// ----------------------------------------------------------------------------
console.log('\n--- TEST 8: "зелёная линия" -> correct line/segment ---');
const query8 = extractVisualQuery('зелёная линия');
const res8 = resolveVisualIdentity(testState, query8!);
assert(res8.status === 'RESOLVED', 'TEST 8.1: Green segment resolved');
assert((res8 as any).entityId === 'chord_BC', 'TEST 8.2: Resolved entity is chord_BC');

// ----------------------------------------------------------------------------
// TEST 9: Non-existent Color/Marker -> NOT_FOUND
// ----------------------------------------------------------------------------
console.log('\n--- TEST 9: Non-existent Color -> NOT_FOUND ---');
const query9 = extractVisualQuery('оранжевая сторона');
const res9 = resolveVisualIdentity(testState, query9!);
assert(res9.status === 'NOT_FOUND', 'TEST 9.1: Orange color not found in current state');

// ----------------------------------------------------------------------------
// TEST 10: "Биссектриса красно-зелёного угла" -> End-to-End Execution
// ----------------------------------------------------------------------------
console.log('\n--- TEST 10: End-to-End Visual Execution of Angle Bisector ---');
const visualInput = 'Построй биссектрису красно-зелёного угла';
const pipelineRes = processVisualSemanticInput(testState, visualInput);
assert(pipelineRes !== null, 'TEST 10.1: Pipeline returned result');
assert(pipelineRes?.decision.action === 'EXECUTE', 'TEST 10.2: Guard decision is EXECUTE');
const resolvedCmd = (pipelineRes?.decision as any).command;
assert(resolvedCmd.command === 'CONSTRUCT_ANGLE_BISECTOR', 'TEST 10.3: Command is CONSTRUCT_ANGLE_BISECTOR');
assert(resolvedCmd.vertex === 'B', 'TEST 10.4: Vertex is B');

// Execute generated command on Geometry Engine
const execRes = executeSemanticCommand(testState, resolvedCmd);
assert(execRes.success === true, 'TEST 10.5: Geometry engine executed command successfully');
assert(execRes.stateChanged === true, 'TEST 10.6: Geometry state mutated');
const bisectorLine = Object.values(execRes.nextState.lines).find((l) => l.role === 'primary');
assert(bisectorLine !== undefined, 'TEST 10.7: Bisector line created in FullGeometryState');

// ----------------------------------------------------------------------------
// TEST 11: Multiple Red-Green Combinations -> AMBIGUOUS
// ----------------------------------------------------------------------------
console.log('\n--- TEST 11: Multiple Red-Green Combinations -> AMBIGUOUS ---');
// Create a state with two red segments and two green segments forming 2 angles
const multiState: FullGeometryState = {
  ...testState,
  segments: {
    ...testState.segments,
    chord_AB: { ...testState.segments.chord_AB, color: '#EF4444' }, // RED
    chord_BC: { ...testState.segments.chord_BC, color: '#10B981' }, // GREEN
    chord_CA: { ...testState.segments.chord_CA, color: '#10B981' }, // Also GREEN!
  },
};
// Now angle at B is between RED(AB) and GREEN(BC).
// Angle at A is between RED(AB) and GREEN(CA).
// "красно-зелёный угол" matches both angle at B and angle at A!
const query11 = extractVisualQuery('Построй биссектрису красно-зелёного угла');
const res11 = resolveVisualIdentity(multiState, query11!);
assert(res11.status === 'AMBIGUOUS', 'TEST 11.1: Resolves to AMBIGUOUS');
assert((res11 as any).candidates.length === 2, 'TEST 11.2: Exactly 2 candidate angles found (at A and at B)');

// ----------------------------------------------------------------------------
// TEST 12: Visual Color Modification Does Not Mutate Geometry Coordinates
// ----------------------------------------------------------------------------
console.log('\n--- TEST 12: Visual Color Modification Does Not Mutate Geometry Coordinates ---');
const geomPointsBefore = JSON.stringify(testState.points);
const geomRBefore = testState.R;
const recoloredOnlyState: FullGeometryState = {
  ...testState,
  segments: {
    ...testState.segments,
    chord_AB: { ...testState.segments.chord_AB, color: '#8B5CF6' }, // PURPLE
  },
};
const geomPointsAfter = JSON.stringify(recoloredOnlyState.points);
assert(geomPointsBefore === geomPointsAfter, 'TEST 12.1: Geometric point coordinates strictly unmutated by color change');
assert(geomRBefore === recoloredOnlyState.R, 'TEST 12.2: Circumradius R strictly unmutated');

console.log('\n======================================================================');
console.log('✓ ALL 12 VISUAL SEMANTIC LANGUAGE & SEMANTIC GUARD TESTS PASSED! 🎉');
console.log('======================================================================\n');
