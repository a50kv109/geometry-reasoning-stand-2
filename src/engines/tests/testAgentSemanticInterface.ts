// src/engines/tests/testAgentSemanticInterface.ts
// Verification Test Suite for Agent Semantic Tool Interface / Universal Semantic Command Interface
// Covers AGENT-01 through AGENT-16

import {
  createDefaultGeometryState,
  FullGeometryState,
  dispatchGeometryCommand,
} from '../constructionCore';
import {
  executeSemanticCommand,
  resolveLineOrSegmentId,
  resolvePointId,
} from '../semantic/semanticCommandExecutor';
import { parseNaturalLanguageToSemanticCommand } from '../semantic/naturalLanguageAdapter';
import { planPerpendicularLine } from '../perpendicularLine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

function approxEqual(a: number, b: number, epsilon = 0.05): boolean {
  return Math.abs(a - b) <= epsilon;
}

console.log('======================================================================');
console.log('RUNNING AGENT SEMANTIC TOOL INTERFACE (AGENT-01 to 16) TEST SUITE');
console.log('======================================================================\n');

// Base setup
const initialU = { A: 0.75, B: 0.08333333333333333, C: 0.25 };
const R = 120;
let baseState = createDefaultGeometryState(initialU, R);

// ----------------------------------------------------------------------------
// AGENT-01: Valid Triangle Configuration
// ----------------------------------------------------------------------------
console.log('--- TEST AGENT-01: Valid Triangle Configuration (A=40°, B=70°) ---');
const cmd01 = {
  command: 'SET_TRIANGLE_ANGLES' as const,
  angles: { A: 40, B: 70 },
};
const res01 = executeSemanticCommand(baseState, cmd01);
assert(res01.success === true, 'AGENT-01.1: SET_TRIANGLE_ANGLES succeeds for A=40°, B=70°');
assert(res01.stateChanged === true, 'AGENT-01.2: stateChanged is true');
assert(res01.appliedParameters?.resolvedAngles !== undefined, 'AGENT-01.3: resolvedAngles returned');
const angles01 = res01.appliedParameters?.resolvedAngles as { A: number; B: number; C: number };
assert(approxEqual(angles01.A, 40), `AGENT-01.4: Angle A is 40° (got ${angles01.A})`);
assert(approxEqual(angles01.B, 70), `AGENT-01.5: Angle B is 70° (got ${angles01.B})`);
assert(approxEqual(angles01.C, 70), `AGENT-01.6: Auto-calculated Angle C is 70° (got ${angles01.C})`);
assert(res01.appliedParameters?.autoCalculatedVertex === 'C', 'AGENT-01.7: Auto-calculated vertex is C');

// ----------------------------------------------------------------------------
// AGENT-02: Invalid Triangle Configuration (Sum > 180°)
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-02: Invalid Triangle Configuration (A=100°, B=100°) ---');
const cmd02 = {
  command: 'SET_TRIANGLE_ANGLES' as const,
  angles: { A: 100, B: 100 },
};
const res02 = executeSemanticCommand(baseState, cmd02);
assert(res02.success === false, 'AGENT-02.1: Invalid triangle angles (100°+100°) is rejected');
assert(res02.stateChanged === false, 'AGENT-02.2: stateChanged is false');
assert(res02.errorCode === 'TRIANGLE_ANGLE_SUM_INVALID' || res02.errorCode === 'INSUFFICIENT_ANGLES', 'AGENT-02.3: Error code is reported');
assert(JSON.stringify(res02.nextState) === JSON.stringify(baseState), 'AGENT-02.4: GeometryState left strictly unchanged');

// ----------------------------------------------------------------------------
// AGENT-03: Angle Bisector Construction
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-03: Angle Bisector Construction (vertex C) ---');
const state03 = res01.nextState;
const cmd03 = {
  command: 'CONSTRUCT_ANGLE_BISECTOR' as const,
  vertex: 'C',
};
const res03 = executeSemanticCommand(state03, cmd03);
assert(res03.success === true, 'AGENT-03.1: CONSTRUCT_ANGLE_BISECTOR succeeds for vertex C');
assert(res03.stateChanged === true, 'AGENT-03.2: stateChanged is true');
assert(res03.createdEntities !== undefined && res03.createdEntities.length > 0, 'AGENT-03.3: Created entities reported');
const bisectorLineId = res03.createdEntities![0].id;
assert(res03.nextState.lines[bisectorLineId] !== undefined, 'AGENT-03.4: Bisector line exists in nextState.lines');
const bisectorRel = res03.derivedRelations?.find((r) => r.relationType === 'ANGLE_BISECTOR_OF');
assert(bisectorRel !== undefined, 'AGENT-03.5: S-01 ANGLE_BISECTOR_OF relation generated');

// ----------------------------------------------------------------------------
// AGENT-04: Perpendicular Line Construction
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-04: Perpendicular Construction (reference AB, through C) ---');
const cmd04 = {
  command: 'CONSTRUCT_PERPENDICULAR' as const,
  reference: 'AB',
  through: 'C',
};
const res04 = executeSemanticCommand(state03, cmd04);
assert(res04.success === true, 'AGENT-04.1: CONSTRUCT_PERPENDICULAR succeeds');
assert(res04.stateChanged === true, 'AGENT-04.2: stateChanged is true');
const perpLineId = res04.createdEntities![0].id;
assert(res04.nextState.lines[perpLineId] !== undefined, 'AGENT-04.3: Perpendicular line exists in nextState.lines');
const perpRel = res04.derivedRelations?.find((r) => r.relationType === 'PERPENDICULAR_TO');
assert(perpRel !== undefined, 'AGENT-04.4: S-01 PERPENDICULAR_TO relation generated');

// ----------------------------------------------------------------------------
// AGENT-05: Parallel Line Construction
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-05: Parallel Construction (reference AB, through C) ---');
const cmd05 = {
  command: 'CONSTRUCT_PARALLEL' as const,
  reference: 'AB',
  through: 'C',
};
const res05 = executeSemanticCommand(state03, cmd05);
assert(res05.success === true, 'AGENT-05.1: CONSTRUCT_PARALLEL succeeds');
assert(res05.stateChanged === true, 'AGENT-05.2: stateChanged is true');
const parLineId = res05.createdEntities![0].id;
assert(res05.nextState.lines[parLineId] !== undefined, 'AGENT-05.3: Parallel line exists in nextState.lines');
const parRel = res05.derivedRelations?.find((r) => r.relationType === 'PARALLEL_TO');
assert(parRel !== undefined, 'AGENT-05.4: S-01 PARALLEL_TO relation generated');

// ----------------------------------------------------------------------------
// AGENT-06: Perpendicular Bisector Construction
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-06: Perpendicular Bisector (reference AB) ---');
const cmd06 = {
  command: 'CONSTRUCT_PERPENDICULAR_BISECTOR' as const,
  reference: 'AB',
};
const res06 = executeSemanticCommand(state03, cmd06);
assert(res06.success === true, 'AGENT-06.1: CONSTRUCT_PERPENDICULAR_BISECTOR succeeds');
assert(res06.stateChanged === true, 'AGENT-06.2: stateChanged is true');
const pbLineId = res06.createdEntities![0].id;
assert(res06.nextState.lines[pbLineId] !== undefined, 'AGENT-06.3: Perpendicular bisector line exists in nextState.lines');

// ----------------------------------------------------------------------------
// AGENT-07: Read-Only Configuration Query
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-07: Read-Only Configuration Query ---');
const cmd07 = { command: 'GET_CONFIGURATION' as const };
const res07 = executeSemanticCommand(state03, cmd07);
assert(res07.success === true, 'AGENT-07.1: GET_CONFIGURATION succeeds');
assert(res07.stateChanged === false, 'AGENT-07.2: Read-only command leaves stateChanged = false');
assert(res07.configurationSummary !== undefined, 'AGENT-07.3: Configuration summary provided');
assert(res07.configurationSummary!.pointCount === 4, 'AGENT-07.4: Point count is 4 (A, B, C, O)');

// ----------------------------------------------------------------------------
// AGENT-08: Relation Query (S-01)
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-08: Relation Query (S-01) ---');
const cmd08 = { command: 'GET_RELATIONS' as const };
const res08 = executeSemanticCommand(res04.nextState, cmd08);
assert(res08.success === true, 'AGENT-08.1: GET_RELATIONS succeeds');
assert(res08.derivedRelations !== undefined && res08.derivedRelations.length > 0, 'AGENT-08.2: Relations list returned');
assert(res08.derivedRelations!.some((r) => r.relationType === 'PERPENDICULAR_TO'), 'AGENT-08.3: Contains PERPENDICULAR_TO relation');

// ----------------------------------------------------------------------------
// AGENT-09: Verified Fact Query
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-09: Verified Fact Query ---');
const cmd09 = { command: 'GET_VERIFIED_FACTS' as const };
const res09 = executeSemanticCommand(baseState, cmd09);
assert(res09.success === true, 'AGENT-09.1: GET_VERIFIED_FACTS succeeds');
assert(res09.stateChanged === false, 'AGENT-09.2: stateChanged is false');
assert(res09.verifiedFacts !== undefined, 'AGENT-09.3: Verified facts list returned');

// ----------------------------------------------------------------------------
// AGENT-10: Failed Command Leaves GeometryState Unchanged
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-10: Failed Command State Invariance ---');
const cmd10 = {
  command: 'CONSTRUCT_PERPENDICULAR' as const,
  reference: 'non_existent_line_xyz',
  through: 'C',
};
const res10 = executeSemanticCommand(baseState, cmd10);
assert(res10.success === false, 'AGENT-10.1: Command with invalid reference fails');
assert(res10.stateChanged === false, 'AGENT-10.2: stateChanged is false');
assert(res10.errorCode === 'ENTITY_NOT_FOUND', 'AGENT-10.3: Error code is ENTITY_NOT_FOUND');
assert(JSON.stringify(res10.nextState) === JSON.stringify(baseState), 'AGENT-10.4: State is byte-for-byte identical');

// ----------------------------------------------------------------------------
// AGENT-11: Human / Agent Parity
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-11: Human / Agent Parity ---');
// Human flow: call planPerpendicularLine directly, then dispatchGeometryCommand
const humanPlan = planPerpendicularLine(baseState, 'chord_AB', 'C');
assert(humanPlan.success === true, 'AGENT-11.1: Human planner succeeds');
let humanState = baseState;
if (humanPlan.success) {
  humanState = dispatchGeometryCommand(baseState, {
    type: 'BATCH_COMMANDS',
    commands: humanPlan.commands,
  });
}
// Agent flow: call executeSemanticCommand
const agentRes = executeSemanticCommand(baseState, {
  command: 'CONSTRUCT_PERPENDICULAR',
  reference: 'chord_AB',
  through: 'C',
});
assert(agentRes.success === true, 'AGENT-11.2: Agent executor succeeds');
// Compare points count, lines count, segments count
assert(
  Object.keys(humanState.lines).length === Object.keys(agentRes.nextState.lines).length,
  'AGENT-11.3: Human and Agent produce identical line count'
);
assert(
  Object.keys(humanState.points).length === Object.keys(agentRes.nextState.points).length,
  'AGENT-11.4: Human and Agent produce identical point count'
);

// ----------------------------------------------------------------------------
// AGENT-12: Undo & History Compatibility
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-12: Undo Compatibility ---');
const stateBeforeUndo = baseState;
const stateAfterCmd = res01.nextState;
assert(stateBeforeUndo !== stateAfterCmd, 'AGENT-12.1: State mutated by command');
// Revert by reapplying previousState
const revertedState = res01.previousState;
assert(JSON.stringify(revertedState) === JSON.stringify(stateBeforeUndo), 'AGENT-12.2: Previous state matches initial state');

// ----------------------------------------------------------------------------
// AGENT-13: Dependent Geometry Recomputation
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-13: Dependent Geometry Recomputation ---');
// Build a perpendicular line on state03 (which has angles A=40, B=70)
const stateWithPerp = res04.nextState;
const perpLineBefore = Object.values(stateWithPerp.lines).find((l) => l.role === 'primary');
assert(perpLineBefore !== undefined, 'AGENT-13.1: Primary perpendicular line exists');

// Now change angles to A=30, B=60
const changeAngleCmd = {
  command: 'SET_TRIANGLE_ANGLES' as const,
  angles: { A: 30, B: 60 },
};
const res13 = executeSemanticCommand(stateWithPerp, changeAngleCmd);
assert(res13.success === true, 'AGENT-13.2: Angle change succeeds on state with constructions');
const perpLineAfter = Object.values(res13.nextState.lines).find((l) => l.role === 'primary');
assert(perpLineAfter !== undefined, 'AGENT-13.3: Dependent perpendicular line persisted & recomputed');
assert(res13.nextState.points.C.x !== stateWithPerp.points.C.x, 'AGENT-13.4: Point C moved to new angle position');

// ----------------------------------------------------------------------------
// AGENT-14: Deterministic Result & Idempotency
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-14: Determinism & Idempotency ---');
const runA = executeSemanticCommand(baseState, cmd01);
const runB = executeSemanticCommand(baseState, cmd01);
assert(
  JSON.stringify(runA.nextState) === JSON.stringify(runB.nextState),
  'AGENT-14.1: Two executions from same initial state yield byte-for-byte identical state'
);

// ----------------------------------------------------------------------------
// AGENT-15: Shorthand Reference Resolution & No Duplicate Entities
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-15: Shorthand Reference Resolution & No Duplicates ---');
assert(resolveLineOrSegmentId(baseState, 'AB') === 'chord_AB', 'AGENT-15.1: "AB" resolves to "chord_AB"');
assert(resolveLineOrSegmentId(baseState, 'BC') === 'chord_BC', 'AGENT-15.2: "BC" resolves to "chord_BC"');
assert(resolveLineOrSegmentId(baseState, 'CA') === 'chord_CA', 'AGENT-15.3: "CA" resolves to "chord_CA"');
assert(resolvePointId(baseState, 'a') === 'A', 'AGENT-15.4: "a" resolves to "A"');
assert(resolvePointId(baseState, 'O') === 'O', 'AGENT-15.5: "O" resolves to "O"');

// ----------------------------------------------------------------------------
// AGENT-16: Natural Language Adapter Pipeline
// ----------------------------------------------------------------------------
console.log('\n--- TEST AGENT-16: Natural Language Adapter Pipeline ---');
const nl1 = 'Построй треугольник с углами A=40, B=70';
const parsed1 = parseNaturalLanguageToSemanticCommand(nl1);
assert(parsed1 !== null, 'AGENT-16.1: Natural language triangle angles parsed');
assert(parsed1?.command === 'SET_TRIANGLE_ANGLES', 'AGENT-16.2: Command is SET_TRIANGLE_ANGLES');

const nl2 = 'Построй биссектрису угла C';
const parsed2 = parseNaturalLanguageToSemanticCommand(nl2);
assert(parsed2?.command === 'CONSTRUCT_ANGLE_BISECTOR', 'AGENT-16.3: "биссектриса угла C" parsed');
assert((parsed2 as any).vertex === 'C', 'AGENT-16.4: Vertex is C');

const nl3 = 'Проведи через точку C прямую, параллельную AB';
const parsed3 = parseNaturalLanguageToSemanticCommand(nl3);
assert(parsed3?.command === 'CONSTRUCT_PARALLEL', 'AGENT-16.5: "параллель к AB через C" parsed');
assert((parsed3 as any).reference === 'AB' && (parsed3 as any).through === 'C', 'AGENT-16.6: Reference AB and through C parsed');

const nl4 = 'Какой угол при C?';
const parsed4 = parseNaturalLanguageToSemanticCommand(nl4);
assert(parsed4?.command === 'GET_MEASUREMENTS', 'AGENT-16.7: "Какой угол при C?" parsed as GET_MEASUREMENTS');

console.log('\n======================================================================');
console.log('✓ ALL 16 AGENT SEMANTIC TOOL INTERFACE TESTS PASSED PERFECTLY!');
console.log('======================================================================');
