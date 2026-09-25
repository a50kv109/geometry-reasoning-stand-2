// src/engines/tests/testAAMNegativeBenchmark.ts
// Benchmark: Negative, Incomplete, Ambiguous, and Conflict Scenarios for AAM Gateway v0.1
// Covers NEG-01 through NEG-20:
// 1. Missing / incomplete entities and arguments
// 2. Ambiguous query vs construction differentiation
// 3. False geometric hypotheses (refutation without crash)
// 4. Non-existent entities verification
// 5. Point on line restriction for parallel construction
// 6. Non-deterministic approximation rejection
// 7. Angle sum and parameter bounds violations
// 8. Base object immutability protection
// 9. Read-only epistemic isolation guarantee

import {
  createDefaultGeometryState,
  FullGeometryState,
  dispatchGeometryCommand,
} from '../constructionCore';
import {
  normalizeAAMIntent,
  executeAAMGateway,
} from '../semantic/aamGateway';
import { executeSemanticCommand } from '../semantic/semanticCommandExecutor';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('======================================================================');
console.log('RUNNING AAM GATEWAY NEGATIVE & SEMANTIC FAILURE BENCHMARK (NEG-01 to 20)');
console.log('======================================================================\n');

// Standard right triangle baseline with diameter AB
// A = 0.75 (-120, 0), B = 0.25 (120, 0), C = 0.0 (0, 120) on circle R = 120
const baseState = createDefaultGeometryState({ A: 0.75, B: 0.25, C: 0.0 }, 120);

// Equilateral triangle where no chord is diameter and no angles are 90°
const equilateralState = createDefaultGeometryState(
  { A: 0.0, B: 0.3333333333333333, C: 0.6666666666666666 },
  120
);

// ----------------------------------------------------------------------------
// NEG-01: Incomplete Command: Missing Reference Line
// «Проведи через A параллельную» -> Missing reference line!
// ----------------------------------------------------------------------------
console.log('--- TEST NEG-01: Missing Reference Line ---');
const q01 = 'Проведи через A параллельную';
const exec01 = executeAAMGateway(baseState, q01);
assert(exec01.structuredSummary.construction === 'rejected', 'NEG-01.1: Stand rejects parallel line with missing reference');
assert(exec01.toolCallResult.stateChanged === false, 'NEG-01.2: GeometryState left unchanged');
assert(exec01.toolCallResult.errorCode === 'ENTITY_NOT_FOUND', 'NEG-01.3: Error code is ENTITY_NOT_FOUND');

// ----------------------------------------------------------------------------
// NEG-02: Incomplete Command: Missing Through Point
// «Проведи параллель к BC» -> Missing through point!
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-02: Missing Through Point ---');
const q02 = 'Проведи параллель к BC';
const exec02 = executeAAMGateway(baseState, q02);
assert(exec02.structuredSummary.construction === 'rejected', 'NEG-02.1: Stand rejects parallel line with missing through point');
assert(exec02.toolCallResult.stateChanged === false, 'NEG-02.2: GeometryState left unchanged');
assert(exec02.toolCallResult.errorCode === 'ENTITY_NOT_FOUND', 'NEG-02.3: Error code is ENTITY_NOT_FOUND');

// ----------------------------------------------------------------------------
// NEG-03: Incomplete Command: Missing Angle/Vertex for Bisector
// «Построй биссектрису» -> Missing angle or vertex!
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-03: Missing Angle / Vertex for Bisector ---');
const q03 = 'Построй биссектрису';
const exec03 = executeAAMGateway(baseState, q03);
assert(exec03.structuredSummary.construction === 'rejected', 'NEG-03.1: Stand rejects bisector with missing vertex');
assert(exec03.toolCallResult.stateChanged === false, 'NEG-03.2: GeometryState left unchanged');

// ----------------------------------------------------------------------------
// NEG-04: Incomplete Command: Missing Segment for Perpendicular Bisector
// «Построй серединный перпендикуляр» -> Missing segment!
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-04: Missing Segment for Perpendicular Bisector ---');
const q04 = 'Построй серединный перпендикуляр';
const exec04 = executeAAMGateway(baseState, q04);
assert(exec04.structuredSummary.construction === 'rejected', 'NEG-04.1: Stand rejects perpendicular bisector without segment');
assert(exec04.toolCallResult.stateChanged === false, 'NEG-04.2: GeometryState left unchanged');

// ----------------------------------------------------------------------------
// NEG-05: Non-Existent Entity Reference
// «Проведи через A прямую, параллельную non_existent_segment_xyz»
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-05: Non-Existent Entity Reference ---');
const q05 = 'Проведи через A прямую, параллельную non_existent_segment_xyz';
const exec05 = executeAAMGateway(baseState, q05);
assert(exec05.structuredSummary.construction === 'rejected', 'NEG-05.1: Construction referencing non-existent entity is rejected');
assert(exec05.toolCallResult.errorCode === 'ENTITY_NOT_FOUND', 'NEG-05.2: Error code is ENTITY_NOT_FOUND');
assert(exec05.toolCallResult.stateChanged === false, 'NEG-05.3: GeometryState left unchanged');

// ----------------------------------------------------------------------------
// NEG-06: Precondition Violation: Point Already On Line
// Parallel line through B to BC (B is an endpoint of BC)
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-06: Point Already On Line for Parallel Line ---');
const q06 = 'Проведи через точку B прямую, параллельную BC';
const exec06 = executeAAMGateway(baseState, q06);
assert(exec06.structuredSummary.construction === 'rejected', 'NEG-06.1: Parallel through point already on line is rejected');
assert(exec06.toolCallResult.errorCode === 'POINT_ON_LINE_NOT_ALLOWED', 'NEG-06.2: Error code is POINT_ON_LINE_NOT_ALLOWED');
assert(exec06.toolCallResult.stateChanged === false, 'NEG-06.3: State left unchanged');

// ----------------------------------------------------------------------------
// NEG-07: Query vs Construction Differentiation
// «AB перпендикулярна CD?» -> Query question, NOT construction!
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-07: Query vs Construction Differentiation ---');
const q07 = 'AB перпендикулярна CD?';
const intent07 = normalizeAAMIntent(q07);
assert(intent07.intent === 'VERIFY_RELATION', 'NEG-07.1: Intent recognized as VERIFY_RELATION, not construction');
assert(intent07.toolCall.command === 'VERIFY_RELATION', 'NEG-07.2: Tool call is VERIFY_RELATION');
const exec07 = executeAAMGateway(baseState, intent07);
assert(exec07.toolCallResult.stateChanged === false, 'NEG-07.3: Verification query never mutates state');

// ----------------------------------------------------------------------------
// NEG-08: Verification with Non-Existent Entity
// «Проверь, действительно ли AB перпендикулярна non_existent_line_xyz»
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-08: Verification with Non-Existent Entity ---');
const q08 = 'Проверь, действительно ли AB перпендикулярна non_existent_line_xyz';
const exec08 = executeAAMGateway(baseState, q08);
assert(exec08.structuredSummary.status === 'REFUTED', 'NEG-08.1: Unverifiable relation with missing object is REFUTED');
assert(exec08.toolCallResult.stateChanged === false, 'NEG-08.2: State unchanged');

// ----------------------------------------------------------------------------
// NEG-09: False Geometric Hypothesis: Perpendicularity in Non-Right Triangle
// In equilateral triangle, AB is NOT perpendicular to BC (angle is 60°)
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-09: False Perpendicularity Hypothesis ---');
const q09 = 'Проверь, действительно ли AB перпендикулярна BC';
const exec09 = executeAAMGateway(equilateralState, q09);
assert(exec09.structuredSummary.status === 'REFUTED', 'NEG-09.1: False perpendicularity hypothesis is REFUTED');
assert(exec09.toolCallResult.stateChanged === false, 'NEG-09.2: Epistemic refutation leaves state unchanged');

// ----------------------------------------------------------------------------
// NEG-10: False Geometric Hypothesis: Parallelism of Intersecting Chords
// AB and BC intersect at B, so they are not parallel
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-10: False Parallelism Hypothesis ---');
const q10 = 'Проверь, параллельна ли AB BC';
const exec10 = executeAAMGateway(baseState, q10);
assert(exec10.structuredSummary.status === 'REFUTED', 'NEG-10.1: Intersecting chords false parallel claim is REFUTED');
assert(exec10.toolCallResult.stateChanged === false, 'NEG-10.2: State unchanged');

// ----------------------------------------------------------------------------
// NEG-11: False Geometric Hypothesis: Non-Diameter Chord Claimed as Diameter
// In equilateral triangle, no chord is a diameter
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-11: False Diameter Hypothesis ---');
const q11 = 'Является ли BC диаметром этой окружности?';
const exec11 = executeAAMGateway(equilateralState, q11);
assert(exec11.structuredSummary.status === 'REFUTED', 'NEG-11.1: Non-diameter chord hypothesis is REFUTED');
assert(exec11.toolCallResult.stateChanged === false, 'NEG-11.2: State unchanged');

// ----------------------------------------------------------------------------
// NEG-12: False Geometric Hypothesis: Thales Theorem on Non-Diameter Triangle
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-12: Thales Theorem on Non-Diameter Triangle ---');
const q12 = 'Проверь теорему Фалеса для треугольника ABC';
const exec12 = executeAAMGateway(equilateralState, q12);
assert(exec12.structuredSummary.status === 'REFUTED', 'NEG-12.1: Thales theorem is REFUTED for non-right triangle');
assert(exec12.toolCallResult.stateChanged === false, 'NEG-12.2: State unchanged');

// ----------------------------------------------------------------------------
// NEG-13: False Geometric Hypothesis: Internal Point on Circle
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-13: Internal Point Claimed to Lie on Circle ---');
const stateWithOriginPt = dispatchGeometryCommand(baseState, {
  type: 'ADD_POINT',
  point: { id: 'P_center', name: 'P', x: 0, y: 0 },
});
const q13 = 'Проверь, лежит ли точка P на окружности';
const exec13 = executeAAMGateway(stateWithOriginPt, q13);
assert(exec13.structuredSummary.status === 'REFUTED', 'NEG-13.1: Point at center is REFUTED as lying on circle');
assert(exec13.toolCallResult.stateChanged === false, 'NEG-13.2: State unchanged');

// ----------------------------------------------------------------------------
// NEG-14: Approximation Rejection
// «Проведи через точку A линию, которая примерно параллельна BC»
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-14: Rejection of Non-Deterministic Approximation ---');
const q14 = 'Проведи через точку A линию, которая примерно параллельна BC';
const exec14 = executeAAMGateway(baseState, q14);
assert(exec14.structuredSummary.construction === 'rejected', 'NEG-14.1: Approximate construction is rejected by Stand');
assert(exec14.toolCallResult.errorCode === 'PRECONDITION_FAILED', 'NEG-14.2: Error code is PRECONDITION_FAILED');
assert(exec14.toolCallResult.stateChanged === false, 'NEG-14.3: State unchanged');

// ----------------------------------------------------------------------------
// NEG-15: Invalid Triangle Angle Sum (A=100°, B=100°, sum = 200° > 180°)
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-15: Invalid Triangle Angle Sum ---');
const q15 = 'Задай углы треугольника A=100, B=100';
const exec15 = executeAAMGateway(baseState, q15);
assert(exec15.structuredSummary.construction === 'rejected', 'NEG-15.1: Triangle angle sum > 180° is rejected');
assert(exec15.toolCallResult.errorCode === 'TRIANGLE_ANGLE_SUM_INVALID', 'NEG-15.2: Error code is TRIANGLE_ANGLE_SUM_INVALID');
assert(exec15.toolCallResult.stateChanged === false, 'NEG-15.3: State unchanged');

// ----------------------------------------------------------------------------
// NEG-16: Insufficient Triangle Angles (Only Angle A Provided)
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-16: Insufficient Triangle Angles ---');
const q16 = 'Задай углы треугольника A=50';
const exec16 = executeAAMGateway(baseState, q16);
assert(exec16.structuredSummary.construction === 'rejected', 'NEG-16.1: Single angle is rejected (insufficient data)');
assert(exec16.toolCallResult.errorCode === 'INSUFFICIENT_ANGLES', 'NEG-16.2: Error code is INSUFFICIENT_ANGLES');
assert(exec16.toolCallResult.stateChanged === false, 'NEG-16.3: State unchanged');

// ----------------------------------------------------------------------------
// NEG-17: Base Object Immutability Protection (Center O)
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-17: Base Object Immutability (Center O) ---');
const q17 = 'Удали объект O';
const exec17 = executeAAMGateway(baseState, q17);
assert(exec17.toolCallResult.success === false, 'NEG-17.1: Deletion of circumcenter O is strictly forbidden');
assert(exec17.toolCallResult.errorCode === 'BASE_OBJECT_IMMUTABLE', 'NEG-17.2: Error code is BASE_OBJECT_IMMUTABLE');
assert(baseState.points.O !== undefined, 'NEG-17.3: Center O remains in state');

// ----------------------------------------------------------------------------
// NEG-18: Base Object Immutability Protection (Base Chord BC)
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-18: Base Object Immutability (Base Chord BC) ---');
const q18 = 'Удали объект chord_BC';
const exec18 = executeAAMGateway(baseState, q18);
assert(exec18.toolCallResult.success === false, 'NEG-18.1: Deletion of base chord is strictly forbidden');
assert(exec18.toolCallResult.errorCode === 'BASE_OBJECT_IMMUTABLE', 'NEG-18.2: Error code is BASE_OBJECT_IMMUTABLE');
assert(baseState.segments.chord_BC !== undefined, 'NEG-18.3: chord_BC remains in state');

// ----------------------------------------------------------------------------
// NEG-19: Read-Only Verification Guarantee (Byte-for-byte State Invariance)
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-19: Read-Only Verification State Invariance ---');
const q19 = 'Проверь теорему Фалеса для треугольника ABC';
const stateBefore19 = JSON.stringify(baseState);
const exec19 = executeAAMGateway(baseState, q19);
const stateAfter19 = JSON.stringify(exec19.nextState);
assert(stateBefore19 === stateAfter19, 'NEG-19.1: State is byte-for-byte identical after verification query');
assert(exec19.toolCallResult.stateChanged === false, 'NEG-19.2: stateChanged is strictly false');

// ----------------------------------------------------------------------------
// NEG-20: Unrecognized / Ambiguous Query
// ----------------------------------------------------------------------------
console.log('\n--- TEST NEG-20: Unrecognized / Ambiguous Query ---');
const q20 = 'Сделай что-нибудь непонятное с треугольником';
const intent20 = normalizeAAMIntent(q20);
assert(intent20.intent === 'UNKNOWN_INTENT', 'NEG-20.1: Gibberish/unrecognized query normalized to UNKNOWN_INTENT');
assert(intent20.confidence <= 0.3, 'NEG-20.2: Confidence is low (<= 0.3)');
const exec20 = executeAAMGateway(baseState, intent20);
assert(exec20.toolCallResult.stateChanged === false, 'NEG-20.3: Unrecognized command does not alter state');

console.log('\n======================================================================');
console.log('✓ ALL 20 NEGATIVE / SEMANTIC FAILURE BENCHMARK TESTS PASSED PERFECTLY!');
console.log('======================================================================');
