// src/presentation/tests/testEducationalFoundationEV01.ts
// Test suite for EV-01 Educational Visualization Foundation.
// Tests:
// EV-01-01: Valid Thales configuration (AVAILABLE/ACTIVE, isProven: true, qED: true)
// EV-01-02: Verified fact integrity (references existing kernel rule, no independent proof)
// EV-01-03: Inquiry isolation (question not marked verified, no Q.E.D.)
// EV-01-04: Broken prerequisites (BROKEN state, isProven: false, verifiedFact undefined, invalidation reason present)
// EV-01-05: Read-only guarantee (GeometryState 100% unchanged before and after)
// EV-01-06: Presentation purity (zero coordinates, zero mutable geometry state)

import { FullGeometryState, createDefaultGeometryState } from '../../engines/constructionCore';
import { evaluateThalesCard, THALES_VISUALIZATION_TEMPLATE } from '../templates/thalesCardTemplate';
import { RULE_THALES_DIAMETER } from '../../engines/research/canonicalRules';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('================================================================');
console.log('  RUNNING EV-01 EDUCATIONAL VISUALIZATION FOUNDATION TESTS');
console.log('================================================================\n');

// Helper to create a valid Thales geometry state (AB is diameter: uA = 0.0, uB = 0.5; uC = 0.25; R = 150)
function createValidThalesState(): FullGeometryState {
  return createDefaultGeometryState({ A: 0.0, B: 0.5, C: 0.25 }, 150);
}

// ----------------------------------------------------------------
// TEST EV-01-01: Valid Thales Configuration
// ----------------------------------------------------------------
console.log('🧪 TEST EV-01-01: Valid Thales configuration activation...');
const validState = createValidThalesState();
const cardAvailable = evaluateThalesCard(validState, undefined, false);
const cardActive = evaluateThalesCard(validState, undefined, true);

assert(cardAvailable.state === 'AVAILABLE', 'Card should be AVAILABLE when not explicitly active');
assert(cardActive.state === 'ACTIVE', 'Card should be ACTIVE when active flag is set');
assert(cardAvailable.evidence.isProven === true, 'evidence.isProven must be true for valid Thales diameter');
assert(cardAvailable.verifiedFact !== undefined, 'verifiedFact must be defined when proven');
assert(cardAvailable.verifiedFact?.qED === true, 'verifiedFact must have qED === true');
console.log('✅ EV-01-01 PASSED: Valid Thales state produced AVAILABLE/ACTIVE card with Q.E.D.\n');

// ----------------------------------------------------------------
// TEST EV-01-02: Verified Fact Integrity
// ----------------------------------------------------------------
console.log('🧪 TEST EV-01-02: Verified fact integrity and kernel rule binding...');
assert(
  cardAvailable.evidence.ruleId === RULE_THALES_DIAMETER.id,
  `evidence.ruleId (${cardAvailable.evidence.ruleId}) must match RULE_THALES_DIAMETER.id`
);
assert(
  cardAvailable.verifiedFact?.statement === RULE_THALES_DIAMETER.formalStatement,
  'verifiedFact statement must originate from canonical rule definition'
);
assert(
  cardAvailable.template.targetRuleId === RULE_THALES_DIAMETER.id,
  'template.targetRuleId must match canonical rule'
);
console.log('✅ EV-01-02 PASSED: Verified fact is strictly bound to existing kernel rule.\n');

// ----------------------------------------------------------------
// TEST EV-01-03: Inquiry Isolation (Pedagogical inquiry != Proven fact)
// ----------------------------------------------------------------
console.log('🧪 TEST EV-01-03: Inquiry isolation (question is not marked verified)...');
assert(
  typeof cardAvailable.inquiry.question === 'string' && cardAvailable.inquiry.question.length > 10,
  'inquiry.question must be a meaningful educational question'
);
assert(
  !('qED' in cardAvailable.inquiry),
  'inquiry object must NEVER contain a qED property'
);
assert(
  !('isProven' in cardAvailable.inquiry),
  'inquiry object must NEVER contain an isProven property'
);
console.log('✅ EV-01-03 PASSED: Educational inquiry is cleanly isolated from formal proof.\n');

// ----------------------------------------------------------------
// TEST EV-01-04: Broken Prerequisites Reaction (Stale State prevention)
// ----------------------------------------------------------------
console.log('🧪 TEST EV-01-04: Reaction when geometry changes and prerequisites fail...');
// Perturb point B so AB is no longer a diameter (uA = 0.0, uB = 0.33 -> theta = 120 deg != 180 deg)
const brokenState: FullGeometryState = createDefaultGeometryState(
  { A: 0.0, B: 0.33, C: 0.25 },
  validState.R
);

const brokenCard = evaluateThalesCard(brokenState);

assert(brokenCard.state === 'BROKEN', `Expected card state 'BROKEN', got '${brokenCard.state}'`);
assert(brokenCard.evidence.isProven === false, 'evidence.isProven must be false for non-diameter AB');
assert(brokenCard.verifiedFact === undefined, 'verifiedFact MUST be undefined when prerequisites fail');
assert(
  brokenCard.evidence.failedPreconditions !== undefined && brokenCard.evidence.failedPreconditions.length > 0,
  'failedPreconditions must list the violated prerequisite'
);
console.log(`   Invalidation message: ${brokenCard.evidence.failedPreconditions?.[0]}`);
console.log('✅ EV-01-04 PASSED: Broken geometry immediately transitions card to BROKEN and hides verified fact.\n');

// ----------------------------------------------------------------
// TEST EV-01-05: Read-Only Guarantee (GeometryState is NOT mutated)
// ----------------------------------------------------------------
console.log('🧪 TEST EV-01-05: Read-only guarantee on GeometryState...');
const testState = createValidThalesState();
const serializedBefore = JSON.stringify(testState);

evaluateThalesCard(testState);
evaluateThalesCard(testState, undefined, true);

const serializedAfter = JSON.stringify(testState);
assert(serializedBefore === serializedAfter, 'GeometryState must remain 100% byte-for-byte identical after card evaluation');
console.log('✅ EV-01-05 PASSED: Strict read-only guarantee confirmed.\n');

// ----------------------------------------------------------------
// TEST EV-01-06: Presentation Purity (No coordinates in ViewModel or Template)
// ----------------------------------------------------------------
console.log('🧪 TEST EV-01-06: Presentation purity (no coordinates stored in template or ViewModel)...');
const templateJson = JSON.stringify(THALES_VISUALIZATION_TEMPLATE);
assert(!templateJson.includes('"x":'), 'VisualizationTemplate must not contain "x" coordinate');
assert(!templateJson.includes('"y":'), 'VisualizationTemplate must not contain "y" coordinate');

const viewModelJson = JSON.stringify(cardAvailable);
assert(!viewModelJson.includes('"coordinates"'), 'ViewModel must not contain raw coordinates');
assert(cardAvailable.template.highlightEntities.length === 3, 'Template must reference exactly 3 entity focus rules');
console.log('✅ EV-01-06 PASSED: Presentation layer contains zero raw coordinates.\n');

console.log('================================================================');
console.log('  ALL EV-01 TESTS PASSED SUCCESSFULLY (6/6)');
console.log('================================================================');
