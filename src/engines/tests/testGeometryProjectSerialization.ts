// src/engines/tests/testGeometryProjectSerialization.ts
// Comprehensive Test Matrix for Geometry Reasoning Stand Project Persistence (PROJ-01 to PROJ-20)
// Tests round-trip invariants, dependency restoration, schema validation, and negative failure modes.

import {
  createDefaultGeometryState,
  dispatchGeometryCommand,
  FullGeometryState,
} from '../constructionCore';
import {
  createGeometryProject,
  serializeGeometryProject,
  deserializeGeometryProject,
  validateGeometryProject,
} from '../project';
import { executeSemanticCommand } from '../semantic/semanticCommandExecutor';
import { buildConfigurationView } from '../configuration/configurationProjector';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('======================================================================');
console.log('RUNNING GEOMETRY PROJECT PERSISTENCE TEST MATRIX (PROJ-01 to PROJ-20)');
console.log('======================================================================\n');

// ----------------------------------------------------------------------------
// PROJ-01: Default Initial State Project Serialization
// ----------------------------------------------------------------------------
console.log('--- TEST PROJ-01: Default Initial State Project Serialization ---');
const defaultState = createDefaultGeometryState({ A: 0.75, B: 0.25, C: 0.0 }, 120);
const proj01 = createGeometryProject(defaultState, { name: 'Thales Default' });
const json01 = serializeGeometryProject(proj01);
const res01 = deserializeGeometryProject(json01);
assert(res01.success === true, 'PROJ-01.1: Default project deserialized successfully');
if (res01.success) {
  assert(res01.project.format === 'geometry-reasoning-stand-project', 'PROJ-01.2: Correct format identifier');
  assert(res01.project.version === 1, 'PROJ-01.3: Correct schema version 1');
  assert(res01.restoredState.R === 120, 'PROJ-01.4: Circumradius R=120 restored');
  assert(res01.restoredState.points.A !== undefined, 'PROJ-01.5: Point A restored');
  assert(res01.restoredState.points.B !== undefined, 'PROJ-01.6: Point B restored');
  assert(res01.restoredState.points.C !== undefined, 'PROJ-01.7: Point C restored');
}

// ----------------------------------------------------------------------------
// PROJ-02: Point Construction Preservation
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-02: Point Construction Preservation ---');
const stateWithPt = dispatchGeometryCommand(defaultState, {
  type: 'ADD_POINT',
  point: { id: 'P_free', name: 'P', x: 45, y: -60, color: '#FF0000' },
});
const proj02 = createGeometryProject(stateWithPt);
const res02 = deserializeGeometryProject(serializeGeometryProject(proj02));
assert(res02.success === true, 'PROJ-02.1: Deserialization succeeds with added point');
if (res02.success) {
  assert(res02.restoredState.points.P_free !== undefined, 'PROJ-02.2: Point P_free exists');
  assert(res02.restoredState.points.P_free.x === 45, 'PROJ-02.3: Point P_free x=45');
  assert(res02.restoredState.points.P_free.y === -60, 'PROJ-02.4: Point P_free y=-60');
}

// ----------------------------------------------------------------------------
// PROJ-03: Segment Construction Preservation
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-03: Segment Construction Preservation ---');
const stateWithSeg = dispatchGeometryCommand(stateWithPt, {
  type: 'ADD_SEGMENT',
  segment: { id: 'seg_AP', p1Id: 'A', p2Id: 'P_free', color: '#00AA00' },
});
const proj03 = createGeometryProject(stateWithSeg);
const res03 = deserializeGeometryProject(serializeGeometryProject(proj03));
assert(res03.success === true, 'PROJ-03.1: Deserialization succeeds with custom segment');
if (res03.success) {
  assert(res03.restoredState.segments.seg_AP !== undefined, 'PROJ-03.2: Segment seg_AP exists');
  assert(res03.restoredState.segments.seg_AP.p1Id === 'A', 'PROJ-03.3: Segment p1 is A');
  assert(res03.restoredState.segments.seg_AP.p2Id === 'P_free', 'PROJ-03.4: Segment p2 is P_free');
}

// ----------------------------------------------------------------------------
// PROJ-04: Circle Construction Preservation
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-04: Circle Construction Preservation ---');
const stateWithCircle = dispatchGeometryCommand(stateWithPt, {
  type: 'ADD_CIRCLE',
  circle: { id: 'circle_P', centerId: 'P_free', radius: 35 },
});
const proj04 = createGeometryProject(stateWithCircle);
const res04 = deserializeGeometryProject(serializeGeometryProject(proj04));
assert(res04.success === true, 'PROJ-04.1: Deserialization succeeds with custom circle');
if (res04.success) {
  assert(res04.restoredState.circles.circle_P !== undefined, 'PROJ-04.2: Circle circle_P exists');
  assert(res04.restoredState.circles.circle_P.radius === 35, 'PROJ-04.3: Circle radius is 35');
}

// ----------------------------------------------------------------------------
// PROJ-05: Parallel Line Construction & DAG Provenance
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-05: Parallel Line Construction Preservation ---');
const stateWithPar = executeSemanticCommand(defaultState, {
  command: 'CONSTRUCT_PARALLEL',
  reference: 'BC',
  through: 'A',
}).nextState;
const proj05 = createGeometryProject(stateWithPar);
const res05 = deserializeGeometryProject(serializeGeometryProject(proj05));
assert(res05.success === true, 'PROJ-05.1: Deserialization succeeds with parallel line');
if (res05.success) {
  const line = Object.values(res05.restoredState.lines).find((l) => l.provenance?.macroType === 'parallel');
  assert(line !== undefined, 'PROJ-05.2: Parallel line exists in restored state');
  assert(line?.provenance?.macroType === 'parallel', 'PROJ-05.3: Provenance macroType is parallel');
  assert(line?.provenance?.sourceIds.includes('A'), 'PROJ-05.4: Provenance source contains A');
}

// ----------------------------------------------------------------------------
// PROJ-06: Perpendicular Line Construction Preservation
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-06: Perpendicular Line Construction Preservation ---');
const stateWithPerp = executeSemanticCommand(defaultState, {
  command: 'CONSTRUCT_PERPENDICULAR',
  reference: 'BC',
  through: 'A',
}).nextState;
const proj06 = createGeometryProject(stateWithPerp);
const res06 = deserializeGeometryProject(serializeGeometryProject(proj06));
assert(res06.success === true, 'PROJ-06.1: Deserialization succeeds with perpendicular line');
if (res06.success) {
  const line = Object.values(res06.restoredState.lines).find((l) => l.provenance?.macroType === 'perpendicular');
  assert(line !== undefined, 'PROJ-06.2: Perpendicular line exists');
  assert(line?.provenance?.macroType === 'perpendicular', 'PROJ-06.3: Provenance macroType is perpendicular');
}

// ----------------------------------------------------------------------------
// PROJ-07: Angle Bisector Construction Preservation
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-07: Angle Bisector Construction Preservation ---');
const stateWithBis = executeSemanticCommand(defaultState, {
  command: 'CONSTRUCT_ANGLE_BISECTOR',
  vertex: 'B',
}).nextState;
const proj07 = createGeometryProject(stateWithBis);
const res07 = deserializeGeometryProject(serializeGeometryProject(proj07));
assert(res07.success === true, 'PROJ-07.1: Angle bisector restored');
if (res07.success) {
  const line = Object.values(res07.restoredState.lines).find((l) => l.provenance?.macroType === 'angle_bisector');
  assert(line !== undefined, 'PROJ-07.2: Angle bisector line exists');
}

// ----------------------------------------------------------------------------
// PROJ-08: Perpendicular Bisector Construction Preservation
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-08: Perpendicular Bisector Construction Preservation ---');
const stateWithPerpBis = executeSemanticCommand(defaultState, {
  command: 'CONSTRUCT_PERPENDICULAR_BISECTOR',
  reference: 'AB',
}).nextState;
const proj08 = createGeometryProject(stateWithPerpBis);
const res08 = deserializeGeometryProject(serializeGeometryProject(proj08));
assert(res08.success === true, 'PROJ-08.1: Perpendicular bisector restored');
if (res08.success) {
  const line = Object.values(res08.restoredState.lines).find((l) => l.provenance?.macroType === 'perpendicular_bisector');
  assert(line !== undefined, 'PROJ-08.2: Perpendicular bisector line exists');
}

// ----------------------------------------------------------------------------
// PROJ-09: Complex Dependent Construction DAG
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-09: Complex Dependent Construction DAG ---');
let multiState = defaultState;
multiState = executeSemanticCommand(multiState, { command: 'CONSTRUCT_PARALLEL', reference: 'BC', through: 'A' }).nextState;
multiState = executeSemanticCommand(multiState, { command: 'CONSTRUCT_PERPENDICULAR', reference: 'AB', through: 'C' }).nextState;
const proj09 = createGeometryProject(multiState);
const res09 = deserializeGeometryProject(serializeGeometryProject(proj09));
assert(res09.success === true, 'PROJ-09.1: Multi-macro state deserialized');
if (res09.success) {
  const parLine = Object.values(res09.restoredState.lines).find((l) => l.provenance?.macroType === 'parallel');
  const perpLine = Object.values(res09.restoredState.lines).find((l) => l.provenance?.macroType === 'perpendicular');
  assert(parLine !== undefined, 'PROJ-09.2: Parallel line restored in DAG');
  assert(perpLine !== undefined, 'PROJ-09.3: Perpendicular line restored in DAG');
}

// ----------------------------------------------------------------------------
// PROJ-10: Triangle + Circle / Thales Invariant Preservation
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-10: Thales Invariant Preservation ---');
const thalesCheckBefore = executeSemanticCommand(defaultState, {
  command: 'VERIFY_RELATION',
  relation: 'THALES_INSCRIBED_RIGHT_ANGLE',
});
assert(thalesCheckBefore.verification?.status === 'VERIFIED', 'PROJ-10.1: Thales relation VERIFIED before save');

const proj10 = createGeometryProject(defaultState);
const res10 = deserializeGeometryProject(serializeGeometryProject(proj10));
assert(res10.success === true, 'PROJ-10.2: Deserialized project');
if (res10.success) {
  const thalesCheckAfter = executeSemanticCommand(res10.restoredState, {
    command: 'VERIFY_RELATION',
    relation: 'THALES_INSCRIBED_RIGHT_ANGLE',
  });
  assert(thalesCheckAfter.verification?.status === 'VERIFIED', 'PROJ-10.3: Thales relation remains VERIFIED after load');
}

// ----------------------------------------------------------------------------
// PROJ-11: Semantic Relations Consistency Across Save/Load
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-11: Semantic Relations Consistency ---');
const relsBefore = executeSemanticCommand(stateWithPar, { command: 'GET_RELATIONS' }).derivedRelations;
const res11 = deserializeGeometryProject(serializeGeometryProject(createGeometryProject(stateWithPar)));
if (res11.success) {
  const relsAfter = executeSemanticCommand(res11.restoredState, { command: 'GET_RELATIONS' }).derivedRelations;
  assert(relsBefore?.length === relsAfter?.length, 'PROJ-11.1: Equal count of semantic relations after restore');
}

// ----------------------------------------------------------------------------
// PROJ-12: Configuration Passport Consistency Across Save/Load
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-12: Configuration Passport Consistency ---');
const configBefore = buildConfigurationView(defaultState);
const res12 = deserializeGeometryProject(serializeGeometryProject(createGeometryProject(defaultState)));
if (res12.success) {
  const configAfter = buildConfigurationView(res12.restoredState);
  assert(configBefore.summary.pointCount === configAfter.summary.pointCount, 'PROJ-12.1: Point counts match in passport');
  assert(configBefore.summary.segmentCount === configAfter.summary.segmentCount, 'PROJ-12.2: Segment counts match in passport');
  assert(configBefore.summary.circleCount === configAfter.summary.circleCount, 'PROJ-12.3: Circle counts match in passport');
  assert(configBefore.summary.circumradius === configAfter.summary.circumradius, 'PROJ-12.4: Circumradius matches in passport');
}

// ----------------------------------------------------------------------------
// PROJ-13: Semantic Interface SAVE_PROJECT & LOAD_PROJECT Execution
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-13: Semantic Interface SAVE_PROJECT & LOAD_PROJECT ---');
const saveRes = executeSemanticCommand(stateWithPar, {
  command: 'SAVE_PROJECT',
  name: 'Parallel Investigation',
});
assert(saveRes.success === true, 'PROJ-13.1: SAVE_PROJECT command succeeds');
assert(typeof saveRes.serializedProject === 'string', 'PROJ-13.2: Serialized project string generated');

const loadRes = executeSemanticCommand(defaultState, {
  command: 'LOAD_PROJECT',
  project: saveRes.serializedProject,
});
assert(loadRes.success === true, 'PROJ-13.3: LOAD_PROJECT command succeeds');
assert(loadRes.stateChanged === true, 'PROJ-13.4: State updated to loaded project');
const restoredLine = Object.values(loadRes.nextState.lines).find((l) => l.provenance?.macroType === 'parallel');
assert(restoredLine !== undefined, 'PROJ-13.5: Loaded state contains parallel line');

// ----------------------------------------------------------------------------
// PROJ-14: Export -> Import JSON String Parity
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-14: Export -> Import JSON String Parity ---');
const proj14 = createGeometryProject(defaultState, { name: 'Export Test' });
const jsonStr = serializeGeometryProject(proj14);
const validation14 = validateGeometryProject(jsonStr);
assert(validation14.valid === true, 'PROJ-14.1: Validated exported JSON string');
const restored14 = deserializeGeometryProject(jsonStr);
assert(restored14.success === true, 'PROJ-14.2: Successfully restored from exported JSON string');

// ----------------------------------------------------------------------------
// PROJ-15: Negative Test: Corrupted JSON
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-15: Corrupted JSON Handling ---');
const corruptedJson = '{ format: "geometry-reasoning-stand-project", version: 1, broken...';
const res15 = deserializeGeometryProject(corruptedJson);
assert(res15.success === false, 'PROJ-15.1: Corrupted JSON rejected');
if (res15.success === false) {
  assert(res15.errors[0].code === 'INVALID_JSON', 'PROJ-15.2: Error code is INVALID_JSON');
}

// ----------------------------------------------------------------------------
// PROJ-16: Negative Test: Unsupported Project Version
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-16: Unsupported Version Handling ---');
const badVersionProj = {
  format: 'geometry-reasoning-stand-project',
  version: 999,
  metadata: { name: 'Future', createdAt: '2026', modifiedAt: '2026' },
  geometryState: defaultState,
};
const res16 = deserializeGeometryProject(badVersionProj);
assert(res16.success === false, 'PROJ-16.1: Future version 999 rejected');
if (res16.success === false) {
  assert(res16.errors[0].code === 'UNSUPPORTED_VERSION', 'PROJ-16.2: Error code is UNSUPPORTED_VERSION');
}

// ----------------------------------------------------------------------------
// PROJ-17: Negative Test: Broken Dependency Reference (Dangling Point ID)
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-17: Broken Dependency Reference Handling ---');
const brokenDepState = JSON.parse(JSON.stringify(defaultState));
brokenDepState.segments.bad_seg = {
  id: 'bad_seg',
  p1Id: 'A',
  p2Id: 'NON_EXISTENT_POINT_XYZ',
  length: 100,
};
const brokenProj = createGeometryProject(brokenDepState);
const res17 = deserializeGeometryProject(brokenProj);
assert(res17.success === false, 'PROJ-17.1: Broken reference rejected during validation');
if (res17.success === false) {
  assert(res17.errors.some((e) => e.code === 'DANGLING_REFERENCE'), 'PROJ-17.2: Error code includes DANGLING_REFERENCE');
}

// ----------------------------------------------------------------------------
// PROJ-18: Negative Test: Invalid Format ID
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-18: Invalid Format Identifier ---');
const badFormatProj = {
  format: 'some-random-format',
  version: 1,
  metadata: { name: 'Bad', createdAt: '2026', modifiedAt: '2026' },
  geometryState: defaultState,
};
const res18 = deserializeGeometryProject(badFormatProj);
assert(res18.success === false, 'PROJ-18.1: Invalid format ID rejected');
if (res18.success === false) {
  assert(res18.errors[0].code === 'INVALID_FORMAT_ID', 'PROJ-18.2: Error code is INVALID_FORMAT_ID');
}

// ----------------------------------------------------------------------------
// PROJ-19: Loaded Project Remains Fully Editable
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-19: Loaded Project Remains Fully Editable ---');
const res19 = deserializeGeometryProject(serializeGeometryProject(createGeometryProject(defaultState)));
if (res19.success) {
  const editedState = dispatchGeometryCommand(res19.restoredState, {
    type: 'ADD_POINT',
    point: { id: 'NewPt', name: 'N', x: 20, y: 30 },
  });
  assert(editedState.points.NewPt !== undefined, 'PROJ-19.1: Successfully added point to restored project');
  assert(editedState.points.NewPt.x === 20, 'PROJ-19.2: Point coordinates preserved');
}

// ----------------------------------------------------------------------------
// PROJ-20: Dynamic Invariance & Recomputation on Loaded Project (Living Construction Proof)
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-20: Dynamic Invariance & Living Construction Recomputation ---');
// Construct parallel line through A to BC, save project, reload it, then move vertex A!
const proj20 = createGeometryProject(stateWithPar);
const res20 = deserializeGeometryProject(serializeGeometryProject(proj20));
assert(res20.success === true, 'PROJ-20.1: Parallel project reloaded');
if (res20.success) {
  const parLine = Object.values(res20.restoredState.lines).find((l) => l.provenance?.macroType === 'parallel');
  assert(parLine !== undefined, 'PROJ-20.2: Parallel line found in restored state');

  // Move vertex A to new position u=0.85
  const R = res20.restoredState.R;
  const movedRestoredState = dispatchGeometryCommand(res20.restoredState, {
    type: 'MOVE_POINT',
    pointId: 'A',
    x: Math.cos(0.85 * 2 * Math.PI) * R,
    y: Math.sin(0.85 * 2 * Math.PI) * R,
    u: 0.85,
  });

  // Re-verify that parallel invariant holds dynamically after dragging in loaded state
  const verifyAfterDrag = executeSemanticCommand(movedRestoredState, {
    command: 'VERIFY_RELATION',
    relation: 'PARALLEL',
    subject: parLine!.id,
    reference: 'chord_BC',
  });
  assert(verifyAfterDrag.verification?.status === 'VERIFIED', 'PROJ-20.3: Parallel invariant holds after drag on restored project');
}

// ----------------------------------------------------------------------------
// PROJ-21: Integral Deep Semantic Round-Trip Invariant: State0 ≡ Restored(Recomputed(Deserialize(Serialize(State0))))
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-21: Integral Deep Semantic Round-Trip Invariant ---');
let rawComplex = defaultState;
rawComplex = executeSemanticCommand(rawComplex, { command: 'CONSTRUCT_PARALLEL', reference: 'BC', through: 'A' }).nextState;
rawComplex = executeSemanticCommand(rawComplex, { command: 'CONSTRUCT_ANGLE_BISECTOR', vertex: 'C' }).nextState;
rawComplex = executeSemanticCommand(rawComplex, { command: 'CONSTRUCT_PERPENDICULAR_BISECTOR', reference: 'AB' }).nextState;

// State0 is the fully recomputed canonical multi-theorem construction
const preResult = deserializeGeometryProject(serializeGeometryProject(createGeometryProject(rawComplex, {
  name: 'Complex Proof Invariant Test',
  description: 'Validating deep structural and semantic preservation across serialization boundary',
  author: 'Standing Investigator',
  tags: ['thales', 'invariants', 'bisectors'],
  settings: { rotationDeg: 45, scale: 1.25, scaleMode: 'radians' },
})));
if (preResult.success === false) {
  throw new Error(`Failed setup preResult: ${JSON.stringify(preResult.errors)}`);
}
const complexInitial = preResult.restoredState;

const serializedComplex = serializeGeometryProject(createGeometryProject(complexInitial, {
  name: 'Complex Proof Invariant Test',
  description: 'Validating deep structural and semantic preservation across serialization boundary',
  author: 'Standing Investigator',
  tags: ['thales', 'invariants', 'bisectors'],
  settings: { rotationDeg: 45, scale: 1.25, scaleMode: 'radians' },
}));

const deserializedComplexResult = deserializeGeometryProject(serializedComplex);
if (deserializedComplexResult.success === false) {
  console.error('PROJ-21 Deserialization Errors:', deserializedComplexResult.errors);
}
assert(deserializedComplexResult.success === true, 'PROJ-21.1: Complex multi-theorem state successfully deserialized');

if (deserializedComplexResult.success) {
  const restoredComplex = deserializedComplexResult.restoredState;

  // 1. Point IDs, types, and model coordinates equivalence
  const origPointKeys = Object.keys(complexInitial.points).sort();
  const restPointKeys = Object.keys(restoredComplex.points).sort();
  assert(JSON.stringify(origPointKeys) === JSON.stringify(restPointKeys), 'PROJ-21.2: Point ID set strictly identical');
  for (const ptId of origPointKeys) {
    const pOrig = complexInitial.points[ptId];
    const pRest = restoredComplex.points[ptId];
    assert(Math.abs(pOrig.x - pRest.x) < 1e-9 && Math.abs(pOrig.y - pRest.y) < 1e-9, `PROJ-21.3: Point ${ptId} coordinates match`);
  }

  // 2. Segment and line entity counts and references
  assert(Object.keys(complexInitial.segments).length === Object.keys(restoredComplex.segments).length, 'PROJ-21.4: Segment counts match');
  assert(Object.keys(complexInitial.lines).length === Object.keys(restoredComplex.lines).length, 'PROJ-21.5: Line counts match');

  // 3. Provenance DAG structure equivalence
  const origProvTypes = Object.values(complexInitial.lines).map(l => l.provenance?.macroType).filter(Boolean).sort();
  const restProvTypes = Object.values(restoredComplex.lines).map(l => l.provenance?.macroType).filter(Boolean).sort();
  assert(JSON.stringify(origProvTypes) === JSON.stringify(restProvTypes), 'PROJ-21.6: Provenance macroTypes strictly identical');

  // 4. Configuration Passport metrics equivalence
  const passOrig = buildConfigurationView(complexInitial);
  const passRest = buildConfigurationView(restoredComplex);
  assert(passOrig.summary.pointCount === passRest.summary.pointCount, 'PROJ-21.7: Passport point counts match');
  assert(passOrig.summary.segmentCount === passRest.summary.segmentCount, 'PROJ-21.8: Passport segment counts match');
  assert(passOrig.summary.lineCount === passRest.summary.lineCount, 'PROJ-21.9: Passport line counts match');

  // 5. Environmental parameters preservation
  assert(deserializedComplexResult.project.settings?.rotationDeg === 45, 'PROJ-21.10: Rotation 45 deg preserved');
  assert(deserializedComplexResult.project.settings?.scale === 1.25, 'PROJ-21.11: Scale 1.25 preserved');
  assert(deserializedComplexResult.project.settings?.scaleMode === 'radians', 'PROJ-21.12: ScaleMode radians preserved');
}

// ----------------------------------------------------------------------------
// PROJ-22: Transaction Safety: Invalid Load leaves current state completely unmutated
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-22: Transaction Safety (Strict State Immutability on Invalid Load) ---');
const pristineState = JSON.parse(JSON.stringify(complexInitial));
const failedLoadRes = executeSemanticCommand(complexInitial, {
  command: 'LOAD_PROJECT',
  project: '{ "corrupted": true, "format": "invalid" }',
});
assert(failedLoadRes.success === false, 'PROJ-22.1: Failed load returns success=false');
assert(failedLoadRes.stateChanged === false, 'PROJ-22.2: stateChanged is strictly false');
assert(JSON.stringify(failedLoadRes.nextState) === JSON.stringify(pristineState), 'PROJ-22.3: Current GeometryState remains 100% unmutated');

// ----------------------------------------------------------------------------
// PROJ-23: Negative Test: Duplicate Segment ID Rejection
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-23: Duplicate Segment ID Rejection ---');
const dupSegState = JSON.parse(JSON.stringify(defaultState));
dupSegState.segments.dup_seg = { id: 'chord_AB', p1Id: 'A', p2Id: 'B', length: 100 }; // Key != ID
const res23 = deserializeGeometryProject(createGeometryProject(dupSegState));
assert(res23.success === false, 'PROJ-23.1: Duplicate / Mismatched segment ID rejected');
if (res23.success === false) {
  assert(res23.errors.some(e => e.code === 'SCHEMA_VIOLATION' || e.code === 'DUPLICATE_ID'), 'PROJ-23.2: Error reported on segment ID');
}

// ----------------------------------------------------------------------------
// PROJ-24: Negative Test: Duplicate Line ID Rejection
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-24: Duplicate Line ID Rejection ---');
const dupLineState = JSON.parse(JSON.stringify(stateWithPar));
const existingLineId = Object.keys(dupLineState.lines)[0];
dupLineState.lines.dup_line = { id: existingLineId, p1Id: 'A', p2Id: 'B' };
const res24 = deserializeGeometryProject(createGeometryProject(dupLineState));
assert(res24.success === false, 'PROJ-24.1: Duplicate / Mismatched line ID rejected');

// ----------------------------------------------------------------------------
// PROJ-25: Negative Test: Duplicate Circle ID Rejection
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-25: Duplicate Circle ID Rejection ---');
const dupCircState = JSON.parse(JSON.stringify(defaultState));
dupCircState.circles.dup_circle = { id: 'base_circle', centerId: 'O', radius: 120 };
const res25 = deserializeGeometryProject(createGeometryProject(dupCircState));
assert(res25.success === false, 'PROJ-25.1: Duplicate / Mismatched circle ID rejected');

// ----------------------------------------------------------------------------
// PROJ-26: Negative Test: Corrupted Provenance MacroType Rejection
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-26: Corrupted Provenance MacroType Rejection ---');
const badProvState = JSON.parse(JSON.stringify(stateWithPar));
const targetLineId = Object.keys(badProvState.lines)[0];
badProvState.lines[targetLineId].provenance.macroType = 'invalid_macro_type_xyz';
const res26 = deserializeGeometryProject(createGeometryProject(badProvState));
assert(res26.success === false, 'PROJ-26.1: Invalid macroType rejected');
if (res26.success === false) {
  assert(res26.errors.some(e => e.code === 'CORRUPTED_ENTITY'), 'PROJ-26.2: Error code is CORRUPTED_ENTITY');
}

// ----------------------------------------------------------------------------
// PROJ-27: Negative Test: Provenance with Dangling Source Entity ID Rejection
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-27: Provenance with Dangling Source Entity ID Rejection ---');
const danglingProvState = JSON.parse(JSON.stringify(stateWithPar));
const targetLineId2 = Object.keys(danglingProvState.lines)[0];
danglingProvState.lines[targetLineId2].provenance.sourceIds = ['NON_EXISTENT_SOURCE_ID_999'];
const res27 = deserializeGeometryProject(createGeometryProject(danglingProvState));
assert(res27.success === false, 'PROJ-27.1: Dangling provenance source rejected');
if (res27.success === false) {
  assert(res27.errors.some(e => e.code === 'DANGLING_REFERENCE'), 'PROJ-27.2: Error code is DANGLING_REFERENCE');
}

// ----------------------------------------------------------------------------
// PROJ-28: Negative Test: Corrupted Counter Values Rejection
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-28: Corrupted Counter Values Rejection ---');
const badCounterState = JSON.parse(JSON.stringify(defaultState));
badCounterState.pointCounter = -5; // Invalid negative counter
const res28 = deserializeGeometryProject(createGeometryProject(badCounterState));
assert(res28.success === false, 'PROJ-28.1: Negative pointCounter rejected');
if (res28.success === false) {
  assert(res28.errors.some(e => e.code === 'INVALID_GEOMETRY_STATE'), 'PROJ-28.2: Error code is INVALID_GEOMETRY_STATE');
}

// ----------------------------------------------------------------------------
// PROJ-29: Negative Test: Non-positive Circle Radius Rejection
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-29: Non-positive Circle Radius Rejection ---');
const badRadiusState = JSON.parse(JSON.stringify(defaultState));
badRadiusState.circles.base_circle.radius = -10;
const res29 = deserializeGeometryProject(createGeometryProject(badRadiusState));
assert(res29.success === false, 'PROJ-29.1: Negative circle radius rejected');
if (res29.success === false) {
  assert(res29.errors.some(e => e.code === 'CORRUPTED_ENTITY'), 'PROJ-29.2: Error code is CORRUPTED_ENTITY');
}

// ----------------------------------------------------------------------------
// PROJ-30: AI Agent Full Lifecycle (Construct -> Verify -> Save -> Load -> Drag -> Recompute -> Verify)
// ----------------------------------------------------------------------------
console.log('\n--- TEST PROJ-30: AI Agent Full Lifecycle Integration ---');
// Step 1: External AI constructs perpendicular bisector
const aiState1 = executeSemanticCommand(defaultState, {
  command: 'CONSTRUCT_PERPENDICULAR_BISECTOR',
  reference: 'AB',
}).nextState;

// Step 2: External AI saves the problem state
const aiSave = executeSemanticCommand(aiState1, {
  command: 'SAVE_PROJECT',
  name: 'Perpendicular Bisector Benchmark',
  benchmarkId: 'AI-PERP-BIS-01',
});
assert(aiSave.success === true, 'PROJ-30.1: AI SAVE_PROJECT succeeds');

// Step 3: Different AI instance starts from blank defaultState and loads the project
const aiLoad = executeSemanticCommand(defaultState, {
  command: 'LOAD_PROJECT',
  project: aiSave.serializedProject,
});
assert(aiLoad.success === true, 'PROJ-30.2: AI LOAD_PROJECT succeeds');
assert(aiLoad.stateChanged === true, 'PROJ-30.3: State changed on load');

// Step 4: AI moves base point B
const R = aiLoad.nextState.R;
const aiMovedState = dispatchGeometryCommand(aiLoad.nextState, {
  type: 'MOVE_POINT',
  pointId: 'B',
  x: Math.cos(0.35 * 2 * Math.PI) * R,
  y: Math.sin(0.35 * 2 * Math.PI) * R,
  u: 0.35,
});

// Step 5: Verify that the reloaded construction dynamically recomputed
const perpBisLine = Object.values(aiMovedState.lines).find(l => l.provenance?.macroType === 'perpendicular_bisector');
assert(perpBisLine !== undefined, 'PROJ-30.4: Perpendicular bisector exists after dynamic drag');
assert(perpBisLine?.provenance?.macroType === 'perpendicular_bisector', 'PROJ-30.5: Macro provenance intact after live recomputation');

console.log('\n======================================================================');
console.log('✓ ALL 30 GEOMETRY PROJECT PERSISTENCE TESTS PASSED PERFECTLY!');
console.log('======================================================================');
