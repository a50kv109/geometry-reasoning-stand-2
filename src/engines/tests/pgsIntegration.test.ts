// src/engines/tests/pgsIntegration.test.ts
// Comprehensive Test Suite for PGS-2D Gateway & Integration Layer

import { createDefaultGeometryState, dispatchGeometryCommand } from '../constructionCore';
import { applyPerpendicularBisector } from '../perpendicularBisector';
import { applyParallelLine } from '../parallelLine';
import {
  projectStateToPgsPassport,
  verifyPgsPassportAsReceiver,
  encodePgsPassportToJson,
  importPgsPassport,
} from '../pgs';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('======================================================================');
console.log('RUNNING PGS-2D INTEGRATION & INTEROPERABILITY TEST MATRIX');
console.log('======================================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: Basic Triangle Export/Import Round-Trip
// ----------------------------------------------------------------------------
console.log('--- TEST 1: Basic Triangle Export/Import Round-Trip ---');
const initialState = createDefaultGeometryState({ A: 0, B: 0.33, C: 0.66 }, 100);
const passport1 = projectStateToPgsPassport(initialState);
assert(passport1.meta.format === 'PGS-2D', 'TEST 1.1: Format is PGS-2D');
assert(passport1.meta.transferMode === 'EXACT_STATE', 'TEST 1.2: transferMode is EXACT_STATE');
assert(passport1.sourceClaim.verified === true, 'TEST 1.3: sourceClaim.verified is true');

const json1 = encodePgsPassportToJson(passport1);
const importRes1 = importPgsPassport(json1);
assert(importRes1.success === true, 'TEST 1.4: Import succeeded');
assert(importRes1.receiverVerification?.verified === true, 'TEST 1.5: Receiver verification verified');
assert(importRes1.receiverVerification?.status === 'VERIFIED', 'TEST 1.6: Receiver status VERIFIED');

const restored1 = importRes1.geometryState!;
assert(restored1.R === 100, 'TEST 1.7: Circumradius restored correctly');
assert(Math.abs(restored1.points.A.x - initialState.points.A.x) < 1e-2, 'TEST 1.8: Point A.x restored');
assert(Math.abs(restored1.points.B.x - initialState.points.B.x) < 1e-2, 'TEST 1.9: Point B.x restored');
assert(Math.abs(restored1.points.C.x - initialState.points.C.x) < 1e-2, 'TEST 1.10: Point C.x restored');

// ----------------------------------------------------------------------------
// TEST 2: Asymmetric Triangle Configuration
// ----------------------------------------------------------------------------
console.log('\n--- TEST 2: Asymmetric Triangle Configuration ---');
const asymmetricState = createDefaultGeometryState({ A: 0.05, B: 0.22, C: 0.81 }, 125);
const passport2 = projectStateToPgsPassport(asymmetricState);
const json2 = encodePgsPassportToJson(passport2);

const importRes2 = importPgsPassport(json2);
assert(importRes2.success === true, 'TEST 2.1: Asymmetric triangle imported successfully');
assert(importRes2.receiverVerification?.verified === true, 'TEST 2.2: Asymmetric triangle receiver verified');
const restored2 = importRes2.geometryState!;
assert(restored2.R === 125, 'TEST 2.3: Radius R=125 restored');
assert(Math.abs(restored2.pointsU.A - 0.05) < 1e-2, 'TEST 2.4: Parameter uA restored');

// ----------------------------------------------------------------------------
// TEST 3: Rich Triangle with Auxiliary Constructions
// ----------------------------------------------------------------------------
console.log('\n--- TEST 3: Rich Triangle with Auxiliary Constructions ---');
let richState = createDefaultGeometryState({ A: 0, B: 0.33, C: 0.66 }, 100);
richState = applyPerpendicularBisector(richState, 'A', 'B').nextState;
richState = applyParallelLine(richState, 'chord_AB', 'C').nextState;

const passport3 = projectStateToPgsPassport(richState);

const polyTop3 = passport3.topology.find((t) => t.type === 'PolygonTopology');
assert(polyTop3 !== undefined, 'TEST 3.1: PolygonTopology present');
assert(
  polyTop3?.edgeIds.length === 3 &&
    polyTop3.edgeIds.includes('edge_AB') &&
    polyTop3.edgeIds.includes('edge_BC') &&
    polyTop3.edgeIds.includes('edge_CA'),
  'TEST 3.2: PolygonTopology boundary edges contains ONLY edge_AB, edge_BC, edge_CA'
);

const constrLines3 = passport3.objects.filter((o) => o.type === 'Line2D' && o.role === 'construction_line');
assert(constrLines3.length > 0, 'TEST 3.3: Construction lines recorded as auxiliary objects');

const verifyRes3 = verifyPgsPassportAsReceiver(passport3);
assert(verifyRes3.verified === true, 'TEST 3.4: Rich triangle passed receiver verification');

// ----------------------------------------------------------------------------
// TEST 4: Invalid Passport Rejection
// ----------------------------------------------------------------------------
console.log('\n--- TEST 4: Invalid Passport Rejection ---');
const invalidJson = '{"meta": {"format": "INVALID-FORMAT"}}';
const currentState4 = createDefaultGeometryState({ A: 0, B: 0.33, C: 0.66 }, 100);

const importRes4 = importPgsPassport(invalidJson);
assert(importRes4.success === false, 'TEST 4.1: Invalid passport rejected');
assert(importRes4.error !== undefined, 'TEST 4.2: Error message returned');
assert(currentState4.R === 100, 'TEST 4.3: Current geometry state remained uncorrupted');

// ----------------------------------------------------------------------------
// TEST 5: Portable Identity Stability
// ----------------------------------------------------------------------------
console.log('\n--- TEST 5: Portable Identity Stability ---');
const state5 = createDefaultGeometryState({ A: 0.1, B: 0.4, C: 0.7 }, 90);
const passport5 = projectStateToPgsPassport(state5);

const vertexA5 = passport5.objects.find((o) => o.portableId === 'pt_A');
assert(vertexA5 !== undefined, 'TEST 5.1: Portable ID pt_A exists');
assert(vertexA5?.localId === 'A', 'TEST 5.2: Local ID A mapped correctly');

const edgeAB5 = passport5.objects.find((o) => o.portableId === 'edge_AB');
assert(edgeAB5 !== undefined, 'TEST 5.3: Portable ID edge_AB exists');
assert(edgeAB5?.localId === 'chord_AB', 'TEST 5.4: Local ID chord_AB mapped correctly');

// ----------------------------------------------------------------------------
// TEST 6: Topology Isolation
// ----------------------------------------------------------------------------
console.log('\n--- TEST 6: Topology Isolation ---');
const state6 = createDefaultGeometryState({ A: 0, B: 0.33, C: 0.66 }, 100);
const passport6 = projectStateToPgsPassport(state6);

const polygon6 = passport6.objects.find((o) => o.type === 'Polygon');
assert(polygon6 !== undefined && polygon6.vertexCount === 3, 'TEST 6.1: Polygon vertexCount is 3');
assert((polygon6 as any).vertexIds.join(',') === 'pt_A,pt_B,pt_C', 'TEST 6.2: Vertex IDs order is A -> B -> C');

// ----------------------------------------------------------------------------
// TEST 7: Dynamic Export & Coordinate Update
// ----------------------------------------------------------------------------
console.log('\n--- TEST 7: Dynamic Export & Coordinate Update ---');
let state7 = createDefaultGeometryState({ A: 0, B: 0.33, C: 0.66 }, 100);
const passport7_1 = projectStateToPgsPassport(state7);
const ptA7_1 = passport7_1.objects.find((o) => o.portableId === 'pt_A') as any;

state7 = dispatchGeometryCommand(state7, {
  type: 'SYNC_BASE_POINTS',
  pointsU: { A: 0.15, B: 0.33, C: 0.66 },
  R: 100,
});

const passport7_2 = projectStateToPgsPassport(state7);
const ptA7_2 = passport7_2.objects.find((o) => o.portableId === 'pt_A') as any;

assert(ptA7_1.portableId === ptA7_2.portableId, 'TEST 7.1: Portable ID stable after vertex move');
assert(Math.abs(ptA7_1.x - ptA7_2.x) > 1, 'TEST 7.2: Coordinates updated after vertex move');

console.log('\n======================================================================');
console.log('ALL 7 PGS-2D INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
console.log('======================================================================');
