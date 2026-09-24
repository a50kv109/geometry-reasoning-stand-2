// src/engines/configuration/tests/testSemanticQuantityS03.ts
// Verification Test Suite for Package S-03: Semantic Quantity.
// Verifies:
// 1. Deterministic extraction and byte-for-byte reproducibility.
// 2. Semantic type fidelity (INTERIOR_ANGLE, CENTRAL_ANGLE, INSCRIBED_ANGLE, CHORD_LENGTH, etc.).
// 3. Mathematical value consistency with Geometry Core.
// 4. Epistemic status preservation (FACT, MEASUREMENT, OBSERVATION, VERIFIED_INVARIANT).
// 5. Read-only immutability and zero mutation of GeometryState.

import { createDefaultGeometryState } from '../../constructionCore';
import { buildConfigurationView } from '../configurationProjector';
import {
  createSemanticQuantity,
  extractSemanticQuantities,
  findSemanticQuantitiesByEntity,
  SemanticQuantity,
} from '../semanticQuantity';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${msg}`);
}

console.log('======================================================================');
console.log('RUNNING SEMANTIC QUANTITY (PACKAGE S-03) TEST SUITE');
console.log('======================================================================\n');

// -------------------------------------------------------------------
// TEST S03-01: Direct Factory Creation & Immutability
// -------------------------------------------------------------------
console.log('--- TEST S03-01: Direct Factory Creation & Immutability ---');
const q1 = createSemanticQuantity({
  id: 'QTY-TEST-1',
  name: 'Прямой угол ∠ACB',
  value: 90.0,
  unit: 'DEGREE',
  semanticType: 'INTERIOR_ANGLE',
  context: { vertexId: 'C', arms: ['CA', 'CB'] },
  source: 'GeometryCore',
  epistemicStatus: 'VERIFIED_INVARIANT',
  isExact: true,
  bounds: { min: 0, max: 180 },
});

assert(q1.id === 'QTY-TEST-1', 'S03-01.1: ID matches');
assert(q1.value === 90.0, 'S03-01.2: Value matches');
assert(q1.unit === 'DEGREE', 'S03-01.3: Unit matches DEGREE');
assert(q1.semanticType === 'INTERIOR_ANGLE', 'S03-01.4: Semantic type matches INTERIOR_ANGLE');
assert(q1.formatted === '90.00°', 'S03-01.5: Automatic formatting produced 90.00°');
assert(q1.isExact === true, 'S03-01.6: isExact flag is true');
assert(Object.isFrozen(q1), 'S03-01.7: SemanticQuantity object is frozen');
assert(Object.isFrozen(q1.context), 'S03-01.8: Context object is frozen');

// -------------------------------------------------------------------
// TEST S03-02: State Extraction from Right Triangle (Thales Configuration)
// -------------------------------------------------------------------
console.log('\n--- TEST S03-02: State Extraction from Right Triangle ---');
// Right triangle with diameter AB (uA = 0, uB = 0.5, uC = 0.25)
const thalesState = createDefaultGeometryState({ A: 0.0, B: 0.5, C: 0.25 }, 100);
const thalesQuantities = extractSemanticQuantities(thalesState, 1.0);

assert(thalesQuantities.length > 0, `S03-02.1: Extracted ${thalesQuantities.length} quantities`);

// Verify Circumradius
const rQty = thalesQuantities.find((q) => q.semanticType === 'RADIUS');
assert(rQty !== undefined && rQty.value === 100, 'S03-02.2: Radius quantity is 100 mm');

// Verify Diameter
const dQty = thalesQuantities.find((q) => q.semanticType === 'DIAMETER');
assert(dQty !== undefined && dQty.value === 200, 'S03-02.3: Diameter quantity is 200 mm');

// Verify Diameter Chord AB
const chordABQty = thalesQuantities.find((q) => q.id === 'QTY-CHORD-LENGTH-chord_AB');
assert(chordABQty !== undefined && Math.abs(chordABQty.value - 200) < 1e-2, 'S03-02.4: Chord AB length is 200 mm');

// Verify Inscribed Right Angle over diameter AB
const inscribedAngleQty = thalesQuantities.find(
  (q) => q.semanticType === 'INSCRIBED_ANGLE' && q.context.chordLabel === 'AB'
);
assert(inscribedAngleQty !== undefined, 'S03-02.5: Inscribed angle over diameter AB found');
assert(
  inscribedAngleQty !== undefined && Math.abs(inscribedAngleQty.value - 90.0) < 1e-2,
  'S03-02.6: Inscribed angle value is exactly 90.0°'
);
assert(
  inscribedAngleQty !== undefined && inscribedAngleQty.epistemicStatus === 'VERIFIED_INVARIANT',
  'S03-02.7: Inscribed angle over diameter is VERIFIED_INVARIANT'
);

// Verify Central Angle for diameter AB
const centralAngleQty = thalesQuantities.find(
  (q) => q.semanticType === 'CENTRAL_ANGLE' && q.context.chordLabel === 'AB'
);
assert(centralAngleQty !== undefined && Math.abs(centralAngleQty.value - 180.0) < 1e-2, 'S03-02.8: Central angle is 180.0°');

// -------------------------------------------------------------------
// TEST S03-03: Entity Association & Filtering
// -------------------------------------------------------------------
console.log('\n--- TEST S03-03: Entity Association & Filtering ---');
const ptAQuantities = findSemanticQuantitiesByEntity(thalesQuantities, 'pt_A');
assert(ptAQuantities.length >= 4, `S03-03.1: Found ${ptAQuantities.length} quantities for pt_A (u, polar, x, y)`);

const uQtyA = ptAQuantities.find((q) => q.semanticType === 'COORDINATE_U');
assert(uQtyA !== undefined && uQtyA.value === 0.0, 'S03-03.2: u(A) = 0.0');

const xQtyA = ptAQuantities.find((q) => q.semanticType === 'COORDINATE_X');
assert(xQtyA !== undefined && xQtyA.value === 100.0, 'S03-03.3: x(A) = 100.0 mm (R * cos(0))');

const yQtyA = ptAQuantities.find((q) => q.semanticType === 'COORDINATE_Y');
assert(yQtyA !== undefined && Math.abs(yQtyA.value) < 1e-2, 'S03-03.4: y(A) = 0.0 mm (R * sin(0))');

// -------------------------------------------------------------------
// TEST S03-04: Integration in GeometryConfigurationView
// -------------------------------------------------------------------
console.log('\n--- TEST S03-04: Integration in GeometryConfigurationView ---');
const configView = buildConfigurationView(thalesState, { scale: 1.0 });

assert(configView.semanticQuantities.length > 0, 'S03-04.1: configView.semanticQuantities is populated');
assert(
  configView.summary.semanticQuantityCount === configView.semanticQuantities.length,
  'S03-04.2: summary.semanticQuantityCount matches array length'
);

const ptARecord = configView.records.find((r) => r.id === 'A');
assert(ptARecord !== undefined, 'S03-04.3: Point A record found');
assert(
  ptARecord?.semanticQuantities !== undefined && ptARecord.semanticQuantities.length >= 4,
  'S03-04.4: Point A record has attached semanticQuantities'
);

// -------------------------------------------------------------------
// TEST S03-05: Determinism & Non-Interference Invariant
// -------------------------------------------------------------------
console.log('\n--- TEST S03-05: Determinism & Non-Interference Invariant ---');
const view1 = buildConfigurationView(thalesState);
const view2 = buildConfigurationView(thalesState);

assert(
  JSON.stringify(view1.semanticQuantities) === JSON.stringify(view2.semanticQuantities),
  'S03-05.1: Successive extractions are byte-for-byte identical'
);

assert(thalesState.pointsU.A === 0.0, 'S03-05.2: thalesState.pointsU.A is unmodified');
assert(thalesState.pointsU.B === 0.5, 'S03-05.3: thalesState.pointsU.B is unmodified');
assert(thalesState.pointsU.C === 0.25, 'S03-05.4: thalesState.pointsU.C is unmodified');
assert(thalesState.R === 100, 'S03-05.5: thalesState.R is unmodified');

console.log('\n======================================================================');
console.log('✓ ALL SEMANTIC QUANTITY (PACKAGE S-03) TESTS PASSED PERFECTLY!');
console.log('======================================================================\n');
