// src/engines/research/tests/testResearchPacket4.ts
// Verification Test Suite for Packet #4: Research Layer, Derived Relations, Traces, and Epistemics

import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  FullGeometryState,
} from '../../constructionCore';
import { applyPerpendicularBisector } from '../../perpendicularBisector';
import { deriveChordArcRelations, deriveCentralInscribedRelations } from '../derivedRelations';
import { buildConstructionTrace } from '../constructionTrace';
import { evaluateResearchObservations } from '../observationModel';
import { createResearchSnapshot } from '../researchSnapshot';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failCount++;
  }
}

export function runResearchPacket4Tests(): boolean {
  console.log('======================================================================');
  console.log('RUNNING PACKET #4 RESEARCH LAYER TEST SUITE (R01 - R08)');
  console.log('======================================================================');

  const initialState = createDefaultGeometryState({ A: 0.12, B: 0.45, C: 0.78 }, 100);

  // -------------------------------------------------------------------
  // R01: Chord <-> Derived Minor/Major Arc Relations
  // -------------------------------------------------------------------
  console.log('\n--- TEST R01: Derived Chord-Arc Relations ---');
  const chordRelations = deriveChordArcRelations(initialState, 1.0);
  assert(chordRelations.length === 3, 'R01: Derived relations extracted for all 3 base chords');

  const relAB = chordRelations.find((r) => r.chordId === 'chord_AB' || r.chordId === 'seg_AB');
  assert(relAB !== undefined, 'R01: Chord AB relation present');
  if (relAB) {
    assert(relAB.minorArcDeg <= 180, 'R01: Minor arc angle <= 180°');
    assert(relAB.majorArcDeg >= 180, 'R01: Major arc angle >= 180°');
    assert(
      Math.abs(relAB.minorArcDeg + relAB.majorArcDeg - 360) < 1e-4,
      'R01: Minor arc + Major arc = 360°'
    );
    assert(
      relAB.chordLength <= 2 * initialState.R + 1e-4,
      'R01: Chord length c <= 2R holds unconditionally'
    );
    assert(
      Math.abs(relAB.chordLength - relAB.theoreticalChordLength) < 0.5,
      'R01: Observed chord length matches theoretical 2R*sin(theta/2)'
    );
  }

  // -------------------------------------------------------------------
  // R02: Central Angle vs Inscribed Angle Relations
  // -------------------------------------------------------------------
  console.log('\n--- TEST R02: Central vs Inscribed Angle Relations ---');
  const centralInscribed = deriveCentralInscribedRelations(initialState.pointsU, initialState.R);
  assert(centralInscribed.length === 3, 'R02: Central-inscribed relations present for 3 base arcs');

  for (const rel of centralInscribed) {
    assert(
      rel.relationVerified,
      `R02: Inscribed angle α equals θ/2 for ${rel.arcId} (verified = ${rel.relationVerified})`
    );
  }

  // -------------------------------------------------------------------
  // R03: ResearchSnapshot Determinism & Zero Timestamps
  // -------------------------------------------------------------------
  console.log('\n--- TEST R03: Deterministic ResearchSnapshot & Zero Timestamps ---');
  const snap1 = createResearchSnapshot(initialState, 1.0);
  const snap2 = createResearchSnapshot(initialState, 1.0);

  const json1 = JSON.stringify(snap1);
  const json2 = JSON.stringify(snap2);
  assert(json1 === json2, 'R03: Identical state produces 100% byte-for-byte identical ResearchSnapshot');

  // Check that no timestamp or random key exists in snapshot
  const allJson = JSON.stringify(snap1).toLowerCase();
  assert(!allJson.includes('"timestamp"'), 'R03: Snapshot contains zero "timestamp" fields');
  assert(!allJson.includes('"createdat"'), 'R03: Snapshot contains zero "createdAt" fields');
  assert(!allJson.includes('"time"'), 'R03: Snapshot contains zero "time" fields');
  assert(snap1.snapshotVersion === '1.0.0', 'R03: Snapshot version is 1.0.0');

  // -------------------------------------------------------------------
  // R04: Structural ConstructionTrace (Non-Historical Reconstruction)
  // -------------------------------------------------------------------
  console.log('\n--- TEST R04: Structural ConstructionTrace ---');
  const trace = buildConstructionTrace(initialState);
  assert(trace.isHistoricalLog === false, 'R04: ConstructionTrace explicitly marked isHistoricalLog = false');
  assert(trace.nodes.length >= 7, 'R04: Trace contains all base nodes (points, circle, segments)');
  assert(trace.maxTopologicalDepth >= 0, 'R04: Trace computes topological depth');

  // Base elements must have depth 0
  const basePointA = trace.nodes.find((n) => n.id === 'A' || n.id === 'pt_A');
  assert(basePointA !== undefined && basePointA.depth === 0, 'R04: Base vertex A has topological depth 0');

  // Add an auxiliary construction (perpendicular bisector) and check trace depth
  const ptAId = initialState.points['A'] ? 'A' : 'pt_A';
  const ptBId = initialState.points['B'] ? 'B' : 'pt_B';
  const pbRes = applyPerpendicularBisector(initialState, ptAId, ptBId);
  assert(pbRes.plan.success, 'R04: Perpendicular bisector executed cleanly');
  const stateWithPB = pbRes.nextState;
  const tracePB = buildConstructionTrace(stateWithPB);
  assert(tracePB.groups.length === 1, 'R04: Construction group recorded in trace');
  assert(tracePB.groups[0].macroType === 'perpendicular_bisector', 'R04: Group macroType correctly identified');
  assert(tracePB.maxTopologicalDepth >= 1, 'R04: Derived macro elements receive depth >= 1');

  // -------------------------------------------------------------------
  // R05: Epistemic Pipeline Separation (Match != Verified Invariant)
  // -------------------------------------------------------------------
  console.log('\n--- TEST R05: Epistemic Pipeline Separation ---');
  const observations = evaluateResearchObservations(initialState, chordRelations, 1.0);
  assert(observations.length > 0, 'R05: Epistemic observations evaluated');

  const levels = new Set(observations.map((o) => o.epistemicLevel));
  assert(levels.has('MEASUREMENT'), 'R05: Pipeline contains MEASUREMENT level');
  assert(levels.has('FACT'), 'R05: Pipeline contains FACT level');
  assert(levels.has('OBSERVATION'), 'R05: Pipeline contains OBSERVATION level');
  assert(levels.has('CANDIDATE_INVARIANT'), 'R05: Pipeline contains CANDIDATE_INVARIANT level');
  assert(levels.has('KNOWN_RELATION_MATCH'), 'R05: Pipeline contains KNOWN_RELATION_MATCH level');
  assert(levels.has('VERIFIED_INVARIANT'), 'R05: Pipeline contains VERIFIED_INVARIANT level');

  // Crucial test: Check that KNOWN_RELATION_MATCH does not claim isFormallyVerified = true
  const relationMatch = observations.find((o) => o.epistemicLevel === 'KNOWN_RELATION_MATCH');
  assert(relationMatch !== undefined, 'R05: Known relation match observation present');
  if (relationMatch) {
    assert(
      relationMatch.isFormallyVerified === false,
      'R05: STRICT INVARIANT: KNOWN_RELATION_MATCH is NOT automatically marked isFormallyVerified = true'
    );
  }

  // -------------------------------------------------------------------
  // R06: Read-Only Invariance with Respect to GeometryState
  // -------------------------------------------------------------------
  console.log('\n--- TEST R06: Read-Only State Invariance ---');
  const stateBefore = JSON.stringify(initialState);

  // Execute all research functions
  deriveChordArcRelations(initialState, 1.0);
  deriveCentralInscribedRelations(initialState.pointsU, initialState.R);
  buildConstructionTrace(initialState);
  evaluateResearchObservations(initialState, chordRelations, 1.0);
  createResearchSnapshot(initialState, 1.0);

  const stateAfter = JSON.stringify(initialState);
  assert(
    stateBefore === stateAfter,
    'R06: READ-ONLY INVARIANT: GeometryState is 100% byte-for-byte identical before and after Research Layer'
  );

  // -------------------------------------------------------------------
  // R07: Arc is NOT a Persistent GeometryState Primitive
  // -------------------------------------------------------------------
  console.log('\n--- TEST R07: Arc Primitive Invariance ---');
  const stateKeys = Object.keys(initialState);
  assert(!stateKeys.includes('arcs'), 'R07: FullGeometryState does NOT contain persistent "arcs" primitive');
  assert(
    stateKeys.includes('points') && stateKeys.includes('segments') && stateKeys.includes('lines') && stateKeys.includes('circles'),
    'R07: GeometryState contains only canonical primitives (points, segments, lines, circles)'
  );

  // -------------------------------------------------------------------
  // R08: Compatibility with Thales Configuration
  // -------------------------------------------------------------------
  console.log('\n--- TEST R08: Thales Diameter Configuration ---');
  const thalesState = dispatchGeometryCommand(initialState, {
    type: 'SYNC_BASE_POINTS',
    pointsU: { A: 0.0, B: 0.5, C: 0.25 },
    R: 100,
  });
  const thalesSnap = createResearchSnapshot(thalesState, 1.0);
  const thalesRelAB = thalesSnap.chordArcRelations.find(
    (r) => r.chordId === 'chord_AB' || r.chordId === 'seg_AB'
  );
  assert(thalesRelAB !== undefined && thalesRelAB.isDiameter, 'R08: Thales chord AB identified as diameter');
  assert(
    thalesRelAB !== undefined && Math.abs(thalesRelAB.chordLength - 200) < 1.0,
    'R08: Diameter chord length equals 2R = 200 mm'
  );

  console.log('======================================================================');
  console.log(`PACKET #4 TESTS FINISHED: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================================');

  return failCount === 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runResearchPacket4Tests();
  process.exit(success ? 0 : 1);
}
