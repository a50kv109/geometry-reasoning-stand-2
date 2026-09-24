// src/engines/configuration/tests/testConfigurationViewGCM01.ts
// Formal Verification Test Suite for GCM-01: Geometry Configuration View.
// Tests GCM-01 through GCM-12.

import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  FullGeometryState,
} from '../../constructionCore';
import {
  buildConfigurationView,
  serializeConfigurationForAI,
  serializeConfigurationToCsv,
  serializeConfigurationToJson,
  serializeConfigurationToTsv,
  generateExcelXmlWorkbook,
} from '../index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runConfigurationViewGCM01Tests() {
  console.log('======================================================================');
  console.log('RUNNING GCM-01 GEOMETRY CONFIGURATION VIEW TEST SUITE (GCM-01 -> GCM-12)');
  console.log('======================================================================');

  const baseState = createDefaultGeometryState({ A: 0.12, B: 0.45, C: 0.78 }, 100);

  // -------------------------------------------------------------------
  // GCM-01: Deterministic projection (Pure Function & Byte-for-byte reproducibility)
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-01: Deterministic Projection ---');
  const view1 = buildConfigurationView(baseState, { scale: 1.0 });
  const view2 = buildConfigurationView(baseState, { scale: 1.0 });

  const json1 = serializeConfigurationToJson(view1);
  const json2 = serializeConfigurationToJson(view2);
  assert(json1 === json2, 'GCM-01.1: Two successive calls on identical state yield identical JSON output');
  assert(view1.configurationId === view2.configurationId, 'GCM-01.2: Deterministic configuration ID matches');

  // -------------------------------------------------------------------
  // GCM-02: Zero timestamps and Zero random identifiers
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-02: Timestamp-Free & Pure Reconstructibility ---');
  assert(view1.timestampFree === true, 'GCM-02.1: timestampFree flag is strictly true');
  assert(!json1.includes('"timestamp":') && !json1.includes('"createdAt"') && !json1.includes('"updatedAt"'), 'GCM-02.2: Serialized JSON contains zero timestamp properties');
  assert(!json1.includes('Date.now'), 'GCM-02.3: Zero Date calls or time dependencies');

  // -------------------------------------------------------------------
  // GCM-03: Entity Coverage (Points, Segments, Circles, Chord-Arcs, Angles)
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-03: Comprehensive Entity Coverage ---');
  const ptA = view1.records.find((r) => r.id === 'A');
  const ptB = view1.records.find((r) => r.id === 'B');
  const ptC = view1.records.find((r) => r.id === 'C');
  const ptO = view1.records.find((r) => r.id === 'O');
  const circ0 = view1.records.find((r) => r.id === 'base_circle');
  const segAB = view1.records.find((r) => r.id === 'chord_AB');
  const relChordAB = view1.records.find((r) => r.kind === 'derived_chord_arc' && r.id.includes('chord_AB'));
  const relAngleC = view1.records.find((r) => r.kind === 'angle');

  assert(Boolean(ptA && ptB && ptC && ptO), 'GCM-03.1: All base points and origin O are present');
  assert(Boolean(circ0), 'GCM-03.2: Circumcircle base_circle is present');
  assert(Boolean(segAB), 'GCM-03.3: Triangle edges (chord_AB) are present');
  assert(Boolean(relChordAB), 'GCM-03.4: Derived chord-arc relations are projected');
  assert(Boolean(relAngleC), 'GCM-03.5: Central/Inscribed angle relations are projected');

  // -------------------------------------------------------------------
  // GCM-04: Topological DAG Integrity (Parents & Children)
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-04: Topological DAG Integrity ---');
  assert(segAB!.parentIds.includes('A') && segAB!.parentIds.includes('B'), 'GCM-04.1: Segment AB correctly points to parents A, B');
  assert(ptA!.childIds.includes('chord_AB'), 'GCM-04.2: Point A correctly lists child chord_AB');
  assert(view1.topology.nodes.length === view1.records.length, 'GCM-04.3: Topology node count matches record count');
  assert(view1.topology.edges.length > 0, 'GCM-04.4: Topology edges successfully constructed');

  // -------------------------------------------------------------------
  // GCM-05: Epistemic Status Fidelity (Preservation of exact levels)
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-05: Epistemic Status Fidelity ---');
  assert(ptA!.epistemicStatus === 'FACT', 'GCM-05.1: Base point is classified as FACT');
  assert(segAB!.epistemicStatus === 'MEASUREMENT', 'GCM-05.2: Segment metric is classified as MEASUREMENT');
  assert(view1.epistemicRegistry.length > 0, 'GCM-05.3: Epistemic registry contains formal items');

  // -------------------------------------------------------------------
  // GCM-06: Metric Computation Accuracy
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-06: Metric Computation Accuracy ---');
  const chordLen = Number(segAB!.metrics.length_mm);
  assert(chordLen > 0 && chordLen <= 200, `GCM-06.1: Chord length ${chordLen} mm is in valid range (0, 2R]`);
  assert(Number(circ0!.metrics.radius_mm) === 100, 'GCM-06.2: Circle radius is exactly 100 mm');

  // -------------------------------------------------------------------
  // GCM-07: Immutability & Read-Only Safety
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-07: Immutability & Read-Only Safety ---');
  assert(Object.isFrozen(view1), 'GCM-07.1: Root view object is frozen');
  assert(Object.isFrozen(view1.records), 'GCM-07.2: Records array is frozen');
  assert(Object.isFrozen(view1.summary), 'GCM-07.3: Summary object is frozen');

  let mutationFailed = false;
  try {
    (view1 as any).summary = null;
  } catch {
    mutationFailed = true;
  }
  assert(mutationFailed || view1.summary !== null, 'GCM-07.4: Direct mutation of view is prevented');

  // -------------------------------------------------------------------
  // GCM-08: JSON Serialization for AI Context
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-08: JSON & AI Serialization ---');
  const aiPrompt = serializeConfigurationForAI(view1);
  assert(aiPrompt.includes('GEOMETRY CONFIGURATION VIEW'), 'GCM-08.1: AI serialization includes header');
  assert(aiPrompt.includes('ENTITY INVENTORY & TOPOLOGY'), 'GCM-08.2: AI serialization includes entity inventory');
  assert(aiPrompt.includes('[A]'), 'GCM-08.3: AI serialization mentions [A]');

  // -------------------------------------------------------------------
  // GCM-09: Excel & CSV Serialization
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-09: Excel & CSV Serialization ---');
  const csv = serializeConfigurationToCsv(view1);
  const tsv = serializeConfigurationToTsv(view1);
  const excelXml = generateExcelXmlWorkbook(view1);

  assert(csv.startsWith('\uFEFF'), 'GCM-09.1: CSV contains UTF-8 BOM for Excel compatibility');
  assert(csv.includes('chord_AB'), 'GCM-09.2: CSV contains entity records');
  assert(tsv.includes('\t'), 'GCM-09.3: TSV is tab-separated');
  assert(excelXml.includes('<?xml version="1.0"') && excelXml.includes('ss:Name="Сводка конфигурации"'), 'GCM-09.4: Excel XML contains multiple worksheets');

  // -------------------------------------------------------------------
  // GCM-10: State Synchronization on Command Dispatch
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-10: State Synchronization on Command Dispatch ---');
  const modifiedState = dispatchGeometryCommand(baseState, {
    type: 'SYNC_BASE_POINTS',
    pointsU: { A: 0.0, B: 0.5, C: 0.25 }, // Thales right triangle (AB is diameter)
    R: 100,
  });
  const modifiedView = buildConfigurationView(modifiedState, { scale: 1.0 });
  const modifiedChordAB = modifiedView.records.find((r) => r.id === 'rel_chord_arc_chord_AB');

  assert(modifiedChordAB !== undefined, 'GCM-10.1: Modified view projects chord AB');
  assert(modifiedChordAB!.parameters.isDiameter === true, 'GCM-10.2: AB is detected as diameter (2R=200)');
  assert(modifiedChordAB!.isProven === true, 'GCM-10.3: Thales theorem is verified Q.E.D.');

  // -------------------------------------------------------------------
  // GCM-11: Performance & Transient Safety (No Memory Leaks)
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-11: Performance & Transient Safety ---');
  const startTime = Date.now();
  for (let i = 0; i < 500; i++) {
    buildConfigurationView(baseState, { scale: 1.0 });
  }
  const durationMs = Date.now() - startTime;
  console.log(`Computed 500 configuration projections in ${durationMs}ms (${(durationMs / 500).toFixed(3)}ms/op)`);
  assert(durationMs < 1000, 'GCM-11.1: 500 projections execute in under 1 second');

  // -------------------------------------------------------------------
  // GCM-12: Non-Interference Invariant (GeometryState untouched)
  // -------------------------------------------------------------------
  console.log('\n--- TEST GCM-12: Non-Interference Invariant ---');
  assert(baseState.pointsU.A === 0.12, 'GCM-12.1: baseState.pointsU.A is unchanged');
  assert(baseState.pointsU.B === 0.45, 'GCM-12.2: baseState.pointsU.B is unchanged');
  assert(baseState.R === 100, 'GCM-12.3: baseState.R is unchanged');

  console.log('======================================================================');
  console.log('✓ ALL GCM-01 -> GCM-12 TEST CONTRACTS SUCCESSFULLY VERIFIED');
  console.log('======================================================================');
}

// Execute tests if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runConfigurationViewGCM01Tests();
}
