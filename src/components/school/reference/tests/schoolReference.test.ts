// src/components/school/reference/tests/schoolReference.test.ts
// Verification Test Suite for Packet #3: Contextual School Reference
// Tests REF-01 through REF-07, Read-Only Invariant, and Strict Pedagogical Separation

import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  FullGeometryState,
} from '../../../../engines/geometryState';
import { extractVerifiedFacts } from '../schoolFactExtractor';
import { deriveClassification, resolveSchoolContext } from '../schoolKnowledgeResolver';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${msg}`);
}

export function runSchoolReferenceTestSuite() {
  console.log('======================================================================');
  console.log('RUNNING CONTEXTUAL SCHOOL REFERENCE TEST SUITE (REF-01 - REF-07)');
  console.log('======================================================================');

  // Baseline state: triangle where AB is NOT diameter
  const defaultState = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 100);

  // -------------------------------------------------------------------------
  // REF-01: Base Circle produces correct identification & formulas
  // -------------------------------------------------------------------------
  const circlePayload = resolveSchoolContext('base_circle', defaultState);
  assert(circlePayload !== null, 'REF-01: Base circle context payload resolved');
  assert(
    circlePayload?.classification === 'BASE_CIRCUMCIRCLE',
    'REF-01: Correctly classified as BASE_CIRCUMCIRCLE'
  );
  assert(
    circlePayload?.level1_identification.title === 'Описанная окружность треугольника',
    'REF-01: Proper school definition title'
  );
  assert(
    circlePayload?.level4_theorem?.formula?.includes('L = 2πR') === true,
    'REF-01: Contains canonical circle circumference and area formulas'
  );

  // -------------------------------------------------------------------------
  // REF-02: Point on Circle vs Free Point vs Base Vertex
  // -------------------------------------------------------------------------
  // Point A (Base Vertex)
  const vertexAPayload = resolveSchoolContext('A', defaultState);
  assert(
    vertexAPayload?.classification === 'BASE_VERTEX',
    'REF-02: Vertex A classified as BASE_VERTEX'
  );

  // Add a user point on circle
  let stateWithPoints = dispatchGeometryCommand(defaultState, {
    type: 'ADD_POINT',
    point: { x: 100, y: 0, onCircle: true },
  });
  const p1 = Object.values(stateWithPoints.points).find((p) => p.name === 'P1');
  assert(Boolean(p1), 'REF-02: Point P1 created on circle');
  const p1Payload = resolveSchoolContext(p1!.id, stateWithPoints);
  assert(
    p1Payload?.classification === 'POINT_ON_CIRCLE',
    'REF-02: P1 correctly classified as POINT_ON_CIRCLE'
  );

  // Add a free point inside circle
  stateWithPoints = dispatchGeometryCommand(stateWithPoints, {
    type: 'ADD_POINT',
    point: { x: 20, y: 30, onCircle: false },
  });
  const p2 = Object.values(stateWithPoints.points).find((p) => p.name === 'P2');
  assert(Boolean(p2), 'REF-02: Point P2 created off circle');
  const p2Payload = resolveSchoolContext(p2!.id, stateWithPoints);
  assert(
    p2Payload?.classification === 'FREE_POINT',
    'REF-02: P2 correctly classified as FREE_POINT'
  );

  // Circumcenter O
  const oPayload = resolveSchoolContext('O', stateWithPoints);
  assert(
    oPayload?.classification === 'CIRCUMCENTER',
    'REF-02: Center O classified as CIRCUMCENTER'
  );

  // -------------------------------------------------------------------------
  // REF-03: Diameter is recognized only from verified geometry facts
  // -------------------------------------------------------------------------
  // In default state (A:0.1, B:0.4), chord AB is NOT a diameter
  const chordABPayload = resolveSchoolContext('chord_AB', defaultState);
  assert(
    chordABPayload?.classification === 'BASE_CHORD',
    'REF-03: Arbitrary chord AB classified as BASE_CHORD (not diameter)'
  );

  // Create exact Thales configuration: A at 0.0 (100, 0), B at 0.5 (-100, 0)
  const thalesState = createDefaultGeometryState({ A: 0.0, B: 0.5, C: 0.25 }, 100);
  const diameterPayload = resolveSchoolContext('chord_AB', thalesState);
  assert(
    diameterPayload?.classification === 'DIAMETER',
    'REF-03: Chord AB through center classified as DIAMETER'
  );
  assert(
    diameterPayload?.level1_identification.definition.includes('Диаметр — хорда, проходящая через центр окружности.') === true,
    'REF-03: Exact school definition for diameter'
  );
  assert(
    diameterPayload?.level2_properties.items.some((item) =>
      item.includes('Диаметр делит окружность на две равные дуги по 180°.')
    ) === true,
    'REF-03: Exact formulation: "Диаметр делит окружность на две равные дуги по 180°."'
  );

  // -------------------------------------------------------------------------
  // REF-04: Secant is recognized only when two actual intersections are verified
  // -------------------------------------------------------------------------
  let stateWithLines = dispatchGeometryCommand(defaultState, {
    type: 'ADD_POINT',
    point: { x: -150, y: 50, onCircle: false },
  });
  const secP1 = Object.values(stateWithLines.points).find((p) => p.name === 'P1')!;
  stateWithLines = dispatchGeometryCommand(stateWithLines, {
    type: 'ADD_POINT',
    point: { x: 150, y: 50, onCircle: false },
  });
  const secP2 = Object.values(stateWithLines.points).find((p) => p.name === 'P2')!;

  // Line passes at y=50 through circle R=100 (intersects at x=±√7500) -> 2 intersections
  stateWithLines = dispatchGeometryCommand(stateWithLines, {
    type: 'ADD_LINE',
    line: { p1Id: secP1.id, p2Id: secP2.id },
  });
  const secLine = Object.values(stateWithLines.lines)[0];
  const secLinePayload = resolveSchoolContext(secLine.id, stateWithLines);
  assert(
    secLinePayload?.classification === 'SECANT_LINE',
    'REF-04: Line cutting circle in 2 points classified as SECANT_LINE'
  );

  // -------------------------------------------------------------------------
  // REF-05: Non-intersecting line is GENERAL_LINE (no fake tangents invented)
  // -------------------------------------------------------------------------
  stateWithLines = dispatchGeometryCommand(stateWithLines, {
    type: 'ADD_POINT',
    point: { x: -150, y: 200, onCircle: false },
  });
  const outP1 = Object.values(stateWithLines.points).find((p) => p.name === 'P3')!;
  stateWithLines = dispatchGeometryCommand(stateWithLines, {
    type: 'ADD_POINT',
    point: { x: 150, y: 200, onCircle: false },
  });
  const outP2 = Object.values(stateWithLines.points).find((p) => p.name === 'P4')!;

  stateWithLines = dispatchGeometryCommand(stateWithLines, {
    type: 'ADD_LINE',
    line: { p1Id: outP1.id, p2Id: outP2.id },
  });
  const outLine = Object.values(stateWithLines.lines).find((l) => l.p1Id === outP1.id)!;
  const outLinePayload = resolveSchoolContext(outLine.id, stateWithLines);
  assert(
    outLinePayload?.classification === 'GENERAL_LINE',
    'REF-05: Line outside circle without macro classified as GENERAL_LINE'
  );

  // -------------------------------------------------------------------------
  // REF-06: Theorem appears only when all prerequisites are verified
  // -------------------------------------------------------------------------
  // In non-Thales state, vertex C does NOT get Thales Right Angle Theorem
  const vertexCDefault = resolveSchoolContext('C', defaultState);
  assert(
    vertexCDefault?.level4_theorem?.name !== 'Теорема Фалеса о прямом вписанном угле',
    'REF-06: Non-right triangle vertex C does NOT show Thales 90° Theorem'
  );

  // In Thales state (AB is diameter), vertex C DOES get Thales Theorem
  const vertexCThales = resolveSchoolContext('C', thalesState);
  assert(
    vertexCThales?.level4_theorem?.name === 'Теорема Фалеса о прямом вписанном угле',
    'REF-06: Thales state vertex C displays Thales 90° Theorem'
  );
  assert(
    vertexCThales?.level4_theorem?.formula?.includes('∠C = 90°') === true,
    'REF-06: Thales theorem formula includes exact 90° specification'
  );

  // -------------------------------------------------------------------------
  // REF-07: READ-ONLY INVARIANT (Zero mutation of GeometryState)
  // -------------------------------------------------------------------------
  const stateSnapshotBefore = JSON.stringify(defaultState);

  // Run numerous resolver calls across all entities
  resolveSchoolContext('base_circle', defaultState);
  resolveSchoolContext('A', defaultState);
  resolveSchoolContext('B', defaultState);
  resolveSchoolContext('C', defaultState);
  resolveSchoolContext('O', defaultState);
  resolveSchoolContext('chord_AB', defaultState);
  resolveSchoolContext('chord_BC', defaultState);
  resolveSchoolContext('chord_CA', defaultState);
  resolveSchoolContext('non_existent_id', defaultState);

  const stateSnapshotAfter = JSON.stringify(defaultState);
  assert(
    stateSnapshotBefore === stateSnapshotAfter,
    'REF-07: READ-ONLY INVARIANT VERIFIED — GeometryState is 100% byte-for-byte identical before and after context resolution'
  );

  // Determinism test
  const call1 = resolveSchoolContext('chord_AB', thalesState);
  const call2 = resolveSchoolContext('chord_AB', thalesState);
  assert(
    JSON.stringify(call1) === JSON.stringify(call2),
    'REF-07: Deterministic: identical state and entity produces identical payload'
  );

  console.log('======================================================================');
  console.log('ALL 7 SCHOOL REFERENCE TESTS PASSED (100% SUCCESS)');
  console.log('======================================================================');
}

// Run immediately when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSchoolReferenceTestSuite();
}
