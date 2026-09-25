// src/engines/tests/testAAMGatewayBenchmark.ts
// Test Suite: AAM Language Kernel -> Universal Semantic Tool Interface -> Geometry Reasoning Stand
// Verifies 20 Real Engineering-Geometric Benchmark Scenarios across RU, UK, and EN.
// Enforces:
// 1. AAM normalizes natural language intent without doing any geometry calculations.
// 2. Geometry Stand is the sole deterministic executor and verifier.
// 3. Epistemic correctness: true relations verified, false relations refuted.
// 4. Dynamic invariance testing across state changes.

import {
  createDefaultGeometryState,
  FullGeometryState,
  dispatchGeometryCommand,
} from '../constructionCore';
import {
  normalizeAAMIntent,
  executeAAMGateway,
  AAMNormalizedIntent,
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
console.log('RUNNING AAM LANGUAGE GATEWAY (AAM-01 to AAM-20) BENCHMARK TEST SUITE');
console.log('======================================================================\n');

// Standard right triangle baseline with diameter AB
// A = 0.75 (-120, 0), B = 0.25 (120, 0), C = 0.0 (0, 120) on circle R = 120
const initialU = { A: 0.75, B: 0.25, C: 0.0 };
const R = 120;
let baseState = createDefaultGeometryState(initialU, R);

// ----------------------------------------------------------------------------
// AAM-01: Parallel Line Construction (RU)
// «Проведи через точку A прямую, параллельную BC»
// ----------------------------------------------------------------------------
console.log('--- TEST AAM-01: Construct Parallel Line (RU) ---');
const q01 = 'Проведи через точку A прямую, параллельную BC';
const intent01 = normalizeAAMIntent(q01);
assert(intent01.intent === 'CONSTRUCT_PARALLEL', 'AAM-01.1: Intent normalized to CONSTRUCT_PARALLEL');
assert(intent01.toolCall.command === 'CONSTRUCT_PARALLEL', 'AAM-01.2: Tool call is CONSTRUCT_PARALLEL');
assert((intent01.toolCall as any).reference === 'BC', 'AAM-01.3: Reference is BC');
assert((intent01.toolCall as any).through === 'A', 'AAM-01.4: Through point is A');

const exec01 = executeAAMGateway(baseState, intent01);
assert(exec01.toolCallResult.success === true, 'AAM-01.5: Stand accepts construction');
assert(exec01.structuredSummary.construction === 'accepted', 'AAM-01.6: Summary construction is accepted');
assert(exec01.toolCallResult.createdEntities?.length === 1, 'AAM-01.7: 1 line entity created');
const parLineId = exec01.toolCallResult.createdEntities![0].id;
assert(exec01.nextState.lines[parLineId] !== undefined, 'AAM-01.8: Line exists in Stand state');

// ----------------------------------------------------------------------------
// AAM-02: Perpendicular Line Construction (RU)
// «Проведи через A перпендикуляр к BC»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-02: Construct Perpendicular Line (RU) ---');
const q02 = 'Проведи через A перпендикуляр к BC';
const intent02 = normalizeAAMIntent(q02);
assert(intent02.intent === 'CONSTRUCT_PERPENDICULAR', 'AAM-02.1: Intent is CONSTRUCT_PERPENDICULAR');
assert((intent02.toolCall as any).reference === 'BC', 'AAM-02.2: Reference is BC');
assert((intent02.toolCall as any).through === 'A', 'AAM-02.3: Through point is A');

const exec02 = executeAAMGateway(baseState, intent02);
assert(exec02.toolCallResult.success === true, 'AAM-02.4: Stand accepts perpendicular');
assert(exec02.structuredSummary.construction === 'accepted', 'AAM-02.5: Summary is accepted');

// ----------------------------------------------------------------------------
// AAM-03: Angle Bisector (RU)
// «Построй биссектрису угла ABC»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-03: Construct Angle Bisector (RU) ---');
const q03 = 'Построй биссектрису угла ABC';
const intent03 = normalizeAAMIntent(q03);
assert(intent03.intent === 'CONSTRUCT_ANGLE_BISECTOR', 'AAM-03.1: Intent is CONSTRUCT_ANGLE_BISECTOR');
assert((intent03.toolCall as any).vertex === 'B', 'AAM-03.2: Vertex B extracted from ABC');

const exec03 = executeAAMGateway(baseState, intent03);
assert(exec03.toolCallResult.success === true, 'AAM-03.3: Stand constructs angle bisector');

// ----------------------------------------------------------------------------
// AAM-04: Perpendicular Bisector (RU)
// «Построй серединный перпендикуляр к AB»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-04: Construct Perpendicular Bisector (RU) ---');
const q04 = 'Построй серединный перпендикуляр к AB';
const intent04 = normalizeAAMIntent(q04);
assert(intent04.intent === 'CONSTRUCT_PERPENDICULAR_BISECTOR', 'AAM-04.1: Intent is CONSTRUCT_PERPENDICULAR_BISECTOR');
assert((intent04.toolCall as any).reference === 'AB', 'AAM-04.2: Reference segment is AB');

const exec04 = executeAAMGateway(baseState, intent04);
assert(exec04.toolCallResult.success === true, 'AAM-04.3: Stand constructs perpendicular bisector');

// ----------------------------------------------------------------------------
// AAM-05: Circumcircle / Circle (EN)
// "Construct circle with center O and radius 100"
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-05: Construct Circle (EN) ---');
const q05 = 'Construct circle with center O and radius 100';
const intent05 = normalizeAAMIntent(q05);
assert(intent05.intent === 'DRAW_CIRCLE', 'AAM-05.1: Intent is DRAW_CIRCLE');
const exec05 = executeAAMGateway(baseState, intent05);
assert(exec05.toolCallResult.success === true, 'AAM-05.2: Stand constructs circle');

// ----------------------------------------------------------------------------
// AAM-06: Draw Segment / Chord (RU)
// «Построй хорду между A и B»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-06: Draw Chord / Segment (RU) ---');
const q06 = 'Построй хорду между A и B';
const intent06 = normalizeAAMIntent(q06);
assert(intent06.intent === 'DRAW_SEGMENT', 'AAM-06.1: Intent is DRAW_SEGMENT');
assert((intent06.toolCall as any).p1Id === 'A' && (intent06.toolCall as any).p2Id === 'B', 'AAM-06.2: Endpoints A and B');

// ----------------------------------------------------------------------------
// AAM-07: Draw Point with Coordinates (RU)
// «Построй точку P с координатами (30, 40)»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-07: Draw Point with Coordinates (RU) ---');
const q07 = 'Построй точку P с координатами (30, 40)';
const intent07 = normalizeAAMIntent(q07);
assert(intent07.intent === 'DRAW_POINT', 'AAM-07.1: Intent is DRAW_POINT');
assert((intent07.toolCall as any).name === 'P', 'AAM-07.2: Point name P');
assert((intent07.toolCall as any).x === 30 && (intent07.toolCall as any).y === 40, 'AAM-07.3: Coordinates (30, 40)');
const exec07 = executeAAMGateway(baseState, intent07);
assert(exec07.toolCallResult.success === true, 'AAM-07.4: Point P created in Stand');
assert(exec07.nextState.points['pt_P'] !== undefined || Object.values(exec07.nextState.points).some((p) => p.name === 'P'), 'AAM-07.5: Point in state');

// ----------------------------------------------------------------------------
// AAM-08: Set Triangle Angles (RU)
// «Задай углы треугольника A=40, B=70»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-08: Set Triangle Angles (RU) ---');
const q08 = 'Задай углы треугольника A=40, B=70';
const intent08 = normalizeAAMIntent(q08);
assert(intent08.intent === 'SET_TRIANGLE_ANGLES', 'AAM-08.1: Intent is SET_TRIANGLE_ANGLES');
const exec08 = executeAAMGateway(baseState, intent08);
assert(exec08.toolCallResult.success === true, 'AAM-08.2: Stand successfully solves angles');
assert(exec08.structuredSummary.construction === 'accepted', 'AAM-08.3: Construction accepted');

// ----------------------------------------------------------------------------
// AAM-09: Verify Perpendicularity - True & False (RU)
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-09: Verify Perpendicularity (RU) ---');
// Construct perpendicular to BC through A
const stateWithPerp = exec02.nextState;
const perpLine = exec02.toolCallResult.createdEntities![0].id;

// Check true relation
const q09True = `Проверь, действительно ли ${perpLine} перпендикулярна BC`;
const exec09True = executeAAMGateway(stateWithPerp, q09True);
assert(exec09True.toolCallResult.success === true, 'AAM-09.1: Query executed successfully');
assert(exec09True.structuredSummary.status === 'VERIFIED', 'AAM-09.2: Stand proves perpendicularity is VERIFIED');

// Check false relation (chord_AB is NOT perpendicular to chord_BC in this triangle)
const q09False = 'Проверь, действительно ли AB перпендикулярна BC';
const exec09False = executeAAMGateway(baseState, q09False);
assert(exec09False.structuredSummary.status === 'REFUTED', 'AAM-09.3: Stand refutes false perpendicularity (status: REFUTED)');

// ----------------------------------------------------------------------------
// AAM-10: Verify Diameter (RU)
// «Является ли AB диаметром этой окружности?»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-10: Verify Diameter (RU) ---');
const q10True = 'Является ли AB диаметром этой окружности?';
const exec10True = executeAAMGateway(baseState, q10True);
assert(exec10True.structuredSummary.status === 'VERIFIED', 'AAM-10.1: Stand verifies AB IS diameter (status: VERIFIED)');

const q10False = 'Является ли BC диаметром этой окружности?';
const exec10False = executeAAMGateway(baseState, q10False);
assert(exec10False.structuredSummary.status === 'REFUTED', 'AAM-10.2: Stand refutes BC as diameter (status: REFUTED)');

// ----------------------------------------------------------------------------
// AAM-11: Verify Thales Theorem (RU)
// «Проверь теорему Фалеса для треугольника ABC»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-11: Verify Thales Theorem (RU) ---');
const q11 = 'Проверь теорему Фалеса для треугольника ABC';
const exec11 = executeAAMGateway(baseState, q11);
assert(exec11.structuredSummary.status === 'VERIFIED', 'AAM-11.1: Thales theorem verified on diameter triangle');

// On an equilateral triangle (no diameter)
const equilateralState = createDefaultGeometryState({ A: 0.0, B: 0.3333333333333333, C: 0.6666666666666666 }, 120);
const exec11Refuted = executeAAMGateway(equilateralState, q11);
assert(exec11Refuted.structuredSummary.status === 'REFUTED', 'AAM-11.2: Thales theorem refuted when no chord is diameter');

// ----------------------------------------------------------------------------
// AAM-12: Verify Point On Circle (RU)
// «Проверь, лежит ли точка C на окружности»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-12: Verify Point On Circle (RU) ---');
const q12True = 'Проверь, лежит ли точка C на окружности';
const exec12True = executeAAMGateway(baseState, q12True);
assert(exec12True.structuredSummary.status === 'VERIFIED', 'AAM-12.1: Point C lies on circle (VERIFIED)');

// Add point inside circle (0, 0)
const stateWithInternalPt = dispatchGeometryCommand(baseState, {
  type: 'ADD_POINT',
  point: { id: 'P_inside', name: 'P', x: 10, y: 10 },
});
const q12False = 'Проверь, лежит ли точка P на окружности';
const exec12False = executeAAMGateway(stateWithInternalPt, q12False);
assert(exec12False.structuredSummary.status === 'REFUTED', 'AAM-12.2: Point inside circle refuted (REFUTED)');

// ----------------------------------------------------------------------------
// AAM-13: Verify Parallel Relation (RU)
// «Проверь параллельность линии L и отрезка BC»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-13: Verify Parallel Relation (RU) ---');
const stateWithPar = exec01.nextState;
const q13 = `Проверь параллельность линии ${parLineId} и отрезка BC`;
const exec13 = executeAAMGateway(stateWithPar, q13);
assert(exec13.structuredSummary.status === 'VERIFIED', 'AAM-13.1: Parallelism of constructed line verified');

// ----------------------------------------------------------------------------
// AAM-14: Dynamic Invariance Testing Across Vertex Movement
// «После перемещения точки A проверь, сохранилось ли условие параллельности»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-14: Dynamic Invariance Testing Across Vertex Movement ---');
// We have stateWithPar where parLineId is parallel to BC through A
// Move vertex A to new position u=0.8
const movedState = dispatchGeometryCommand(stateWithPar, {
  type: 'MOVE_POINT',
  pointId: 'A',
  x: Math.cos(0.8 * 2 * Math.PI) * R,
  y: Math.sin(0.8 * 2 * Math.PI) * R,
  u: 0.8,
});
// Execute verification of parallel relation on the moved state
const exec14 = executeAAMGateway(movedState, q13);
assert(exec14.structuredSummary.status === 'VERIFIED', 'AAM-14.1: Stand dynamically proves parallel invariant holds after vertex move');

// ----------------------------------------------------------------------------
// AAM-15: Query Configuration Passport (RU)
// «Паспорт конфигурации»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-15: Query Configuration Passport (RU) ---');
const q15 = 'Паспорт конфигурации';
const intent15 = normalizeAAMIntent(q15);
assert(intent15.intent === 'QUERY_CONFIGURATION', 'AAM-15.1: Intent is QUERY_CONFIGURATION');
const exec15 = executeAAMGateway(baseState, intent15);
assert(exec15.toolCallResult.configurationSummary !== undefined, 'AAM-15.2: Configuration summary returned');
assert(exec15.toolCallResult.stateChanged === false, 'AAM-15.3: Read-only query leaves state unchanged');

// ----------------------------------------------------------------------------
// AAM-16: Query Verified Facts (RU)
// «Покажи доказанные факты»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-16: Query Verified Facts (RU) ---');
const q16 = 'Покажи доказанные факты';
const exec16 = executeAAMGateway(baseState, q16);
assert(exec16.toolCallResult.verifiedFacts !== undefined, 'AAM-16.1: Verified facts returned');
assert(exec16.toolCallResult.verifiedFacts!.length > 0, 'AAM-16.2: Facts count > 0');

// ----------------------------------------------------------------------------
// AAM-17: Measure Angle (RU)
// «Измерь угол при вершине C»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-17: Measure Angle (RU) ---');
const q17 = 'Измерь угол при вершине C';
const exec17 = executeAAMGateway(baseState, q17);
assert(exec17.toolCallResult.measurements !== undefined, 'AAM-17.1: Measurements returned');
const angleC = exec17.toolCallResult.measurements?.find((m) => m.name.includes('C'));
assert(angleC !== undefined, 'AAM-17.2: Angle C found in measurements');

// ----------------------------------------------------------------------------
// AAM-18: Erase Object (RU)
// «Удали прямую line_1»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-18: Erase Object (RU) ---');
const q18 = `Удали прямую ${parLineId}`;
const exec18 = executeAAMGateway(stateWithPar, q18);
assert(exec18.toolCallResult.success === true, 'AAM-18.1: Erase object succeeds');
assert(exec18.nextState.lines[parLineId] === undefined, 'AAM-18.2: Line erased from state');

// ----------------------------------------------------------------------------
// AAM-19: Reset Geometry (RU)
// «Сбрось геометрию в исходное состояние»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-19: Reset Geometry (RU) ---');
const q19 = 'Сбрось геометрию в исходное состояние';
const exec19 = executeAAMGateway(stateWithPar, q19);
assert(exec19.toolCallResult.success === true, 'AAM-19.1: Reset geometry succeeds');
assert(Object.keys(exec19.nextState.lines).length === 0, 'AAM-19.2: User lines cleared');

// ----------------------------------------------------------------------------
// AAM-20: Composite Pipeline: Construct + Verify in Single Turn
// RU: «Проведи через вершину A прямую, параллельную BC, и проверь, действительно ли она параллельна BC»
// UK: «Проведи через точку A пряму, паралельну BC, і перевір, чи вона паралельна BC»
// EN: «Construct line through A parallel to BC and verify if it is parallel to BC»
// ----------------------------------------------------------------------------
console.log('\n--- TEST AAM-20: Composite Construction + Verification Pipeline (RU, UK, EN) ---');

// Russian
const q20RU = 'Проведи через точку A прямую, параллельную BC, и проверь, действительно ли она параллельна BC';
const intent20RU = normalizeAAMIntent(q20RU);
assert(intent20RU.intent === 'CONSTRUCT_PARALLEL', 'AAM-20.1: RU intent is CONSTRUCT_PARALLEL');
assert(intent20RU.followUpVerification !== undefined, 'AAM-20.2: RU follow-up verification created');
const exec20RU = executeAAMGateway(baseState, intent20RU);
assert(exec20RU.structuredSummary.construction === 'accepted', 'AAM-20.3: Construction accepted');
assert(exec20RU.structuredSummary.relation === 'PARALLEL', 'AAM-20.4: Relation is PARALLEL');
assert(exec20RU.structuredSummary.status === 'VERIFIED', 'AAM-20.5: Status is VERIFIED');

// Ukrainian
const q20UK = 'Проведи через точку A пряму, паралельну BC, і перевір, чи дійсно вона паралельна BC';
const intent20UK = normalizeAAMIntent(q20UK);
assert(intent20UK.intent === 'CONSTRUCT_PARALLEL', 'AAM-20.6: UK intent is CONSTRUCT_PARALLEL');
assert(intent20UK.language === 'uk', 'AAM-20.7: Language identified as UK');
const exec20UK = executeAAMGateway(baseState, intent20UK);
assert(exec20UK.structuredSummary.construction === 'accepted', 'AAM-20.8: UK construction accepted');
assert(exec20UK.structuredSummary.status === 'VERIFIED', 'AAM-20.9: UK status is VERIFIED');

// English
const q20EN = 'Construct line through A parallel to BC and verify whether it is parallel to BC';
const intent20EN = normalizeAAMIntent(q20EN);
assert(intent20EN.intent === 'CONSTRUCT_PARALLEL', 'AAM-20.10: EN intent is CONSTRUCT_PARALLEL');
assert(intent20EN.language === 'en', 'AAM-20.11: Language identified as EN');
const exec20EN = executeAAMGateway(baseState, intent20EN);
assert(exec20EN.structuredSummary.construction === 'accepted', 'AAM-20.12: EN construction accepted');
assert(exec20EN.structuredSummary.status === 'VERIFIED', 'AAM-20.13: EN status is VERIFIED');

console.log('\n======================================================================');
console.log('✓ ALL 20 AAM LANGUAGE GATEWAY BENCHMARK TESTS PASSED PERFECTLY!');
console.log('======================================================================');
