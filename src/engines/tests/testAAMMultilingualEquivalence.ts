// src/engines/tests/testAAMMultilingualEquivalence.ts
// Benchmark: RU / UK / EN Semantic Equivalence for AAM Gateway v0.1
// Verifies that for 10 identical engineering intents across Russian, Ukrainian, and English,
// AAM Gateway produces mathematically and structurally equivalent Semantic Commands.

import { normalizeAAMIntent, AAMNormalizedIntent } from '../semantic/aamGateway';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

/**
 * Structural equivalence comparator.
 * Compares:
 * 1. Intent type
 * 2. Tool call command
 * 3. Normalized parameters (entities, reference, through, angles)
 * 4. Operation sequence / follow-up verification structure
 * 5. Mutation vs read-only semantics
 */
function assertSemanticEquivalence(
  testId: string,
  ruIntent: AAMNormalizedIntent,
  ukIntent: AAMNormalizedIntent,
  enIntent: AAMNormalizedIntent,
  options: {
    expectedIntent: string;
    expectedCommand: string;
    isMutation: boolean;
    hasFollowUpVerification?: boolean;
    paramKeys: string[];
  }
) {
  // 1. Intent parity
  assert(
    ruIntent.intent === options.expectedIntent &&
    ukIntent.intent === options.expectedIntent &&
    enIntent.intent === options.expectedIntent,
    `${testId}.1: Intent matches across RU, UK, EN (${options.expectedIntent})`
  );

  // 2. Command parity
  assert(
    ruIntent.toolCall.command === options.expectedCommand &&
    ukIntent.toolCall.command === options.expectedCommand &&
    enIntent.toolCall.command === options.expectedCommand,
    `${testId}.2: Tool call command matches (${options.expectedCommand})`
  );

  // 3. Parameters parity
  for (const key of options.paramKeys) {
    const ruVal = String(ruIntent.parameters[key] ?? '');
    const ukVal = String(ukIntent.parameters[key] ?? '');
    const enVal = String(enIntent.parameters[key] ?? '');
    assert(
      ruVal === ukVal && ukVal === enVal,
      `${testId}.3: Parameter "${key}" is identical: RU="${ruVal}", UK="${ukVal}", EN="${enVal}"`
    );
  }

  // 4. Follow-up verification parity
  if (options.hasFollowUpVerification) {
    assert(
      ruIntent.followUpVerification !== undefined &&
      ukIntent.followUpVerification !== undefined &&
      enIntent.followUpVerification !== undefined,
      `${testId}.4: Follow-up verification present on all 3 languages`
    );
    assert(
      ruIntent.followUpVerification?.relation === ukIntent.followUpVerification?.relation &&
      ukIntent.followUpVerification?.relation === enIntent.followUpVerification?.relation,
      `${testId}.5: Follow-up relation matches (${ruIntent.followUpVerification?.relation})`
    );
  } else {
    assert(
      ruIntent.followUpVerification === undefined &&
      ukIntent.followUpVerification === undefined &&
      enIntent.followUpVerification === undefined,
      `${testId}.4: Follow-up verification consistently absent`
    );
  }

  // 5. Mutation semantics parity
  const ruIsMut = !options.expectedCommand.startsWith('GET_') && !options.expectedCommand.startsWith('VERIFY_');
  assert(ruIsMut === options.isMutation, `${testId}.6: Mutation semantic classification is correct (${options.isMutation ? 'MUTATION' : 'READ_ONLY'})`);
}

console.log('======================================================================');
console.log('RUNNING RU / UK / EN CROSS-LANGUAGE EQUIVALENCE BENCHMARK (EQ-01 to 10)');
console.log('======================================================================\n');

// ----------------------------------------------------------------------------
// EQ-01: Construct Parallel Line
// ----------------------------------------------------------------------------
console.log('--- TEST EQ-01: Construct Parallel Line (RU / UK / EN) ---');
const ru01 = normalizeAAMIntent('Проведи через точку A прямую, параллельную BC');
const uk01 = normalizeAAMIntent('Проведи через точку A пряму, паралельну BC');
const en01 = normalizeAAMIntent('Construct line through point A parallel to BC');
assertSemanticEquivalence('EQ-01', ru01, uk01, en01, {
  expectedIntent: 'CONSTRUCT_PARALLEL',
  expectedCommand: 'CONSTRUCT_PARALLEL',
  isMutation: true,
  paramKeys: ['through', 'reference'],
});

// ----------------------------------------------------------------------------
// EQ-02: Construct Perpendicular Line
// ----------------------------------------------------------------------------
console.log('\n--- TEST EQ-02: Construct Perpendicular Line (RU / UK / EN) ---');
const ru02 = normalizeAAMIntent('Проведи через точку A перпендикуляр к отрезку BC');
const uk02 = normalizeAAMIntent('Проведи через точку A перпендикуляр до відрізка BC');
const en02 = normalizeAAMIntent('Construct perpendicular from point A to segment BC');
assertSemanticEquivalence('EQ-02', ru02, uk02, en02, {
  expectedIntent: 'CONSTRUCT_PERPENDICULAR',
  expectedCommand: 'CONSTRUCT_PERPENDICULAR',
  isMutation: true,
  paramKeys: ['through', 'reference'],
});

// ----------------------------------------------------------------------------
// EQ-03: Construct Angle Bisector
// ----------------------------------------------------------------------------
console.log('\n--- TEST EQ-03: Construct Angle Bisector (RU / UK / EN) ---');
const ru03 = normalizeAAMIntent('Построй биссектрису угла ABC');
const uk03 = normalizeAAMIntent('Побудуй бісектрису кута ABC');
const en03 = normalizeAAMIntent('Construct angle bisector of angle ABC');
assertSemanticEquivalence('EQ-03', ru03, uk03, en03, {
  expectedIntent: 'CONSTRUCT_ANGLE_BISECTOR',
  expectedCommand: 'CONSTRUCT_ANGLE_BISECTOR',
  isMutation: true,
  paramKeys: ['vertex', 'pAId', 'pBId'],
});

// ----------------------------------------------------------------------------
// EQ-04: Construct Perpendicular Bisector
// ----------------------------------------------------------------------------
console.log('\n--- TEST EQ-04: Construct Perpendicular Bisector (RU / UK / EN) ---');
const ru04 = normalizeAAMIntent('Построй серединный перпендикуляр к отрезку AB');
const uk04 = normalizeAAMIntent('Побудуй серединний перпендикуляр до відрізка AB');
const en04 = normalizeAAMIntent('Construct perpendicular bisector of segment AB');
assertSemanticEquivalence('EQ-04', ru04, uk04, en04, {
  expectedIntent: 'CONSTRUCT_PERPENDICULAR_BISECTOR',
  expectedCommand: 'CONSTRUCT_PERPENDICULAR_BISECTOR',
  isMutation: true,
  paramKeys: ['reference'],
});

// ----------------------------------------------------------------------------
// EQ-05: Set Triangle Angles
// ----------------------------------------------------------------------------
console.log('\n--- TEST EQ-05: Set Triangle Angles (RU / UK / EN) ---');
const ru05 = normalizeAAMIntent('Задай углы треугольника A=40, B=70');
const uk05 = normalizeAAMIntent('Задай кути трикутника A=40, B=70');
const en05 = normalizeAAMIntent('Set triangle angles A=40, B=70');
assertSemanticEquivalence('EQ-05', ru05, uk05, en05, {
  expectedIntent: 'SET_TRIANGLE_ANGLES',
  expectedCommand: 'SET_TRIANGLE_ANGLES',
  isMutation: true,
  paramKeys: ['A', 'B'],
});

// ----------------------------------------------------------------------------
// EQ-06: Verify Perpendicular Relation
// ----------------------------------------------------------------------------
console.log('\n--- TEST EQ-06: Verify Perpendicular Relation (RU / UK / EN) ---');
const ru06 = normalizeAAMIntent('Проверь, действительно ли AB перпендикулярна CD');
const uk06 = normalizeAAMIntent('Перевір, чи дійсно AB перпендикулярна до CD');
const en06 = normalizeAAMIntent('Verify whether AB is perpendicular to CD');
assertSemanticEquivalence('EQ-06', ru06, uk06, en06, {
  expectedIntent: 'VERIFY_RELATION',
  expectedCommand: 'VERIFY_RELATION',
  isMutation: false,
  paramKeys: ['relation', 'subject', 'reference'],
});

// ----------------------------------------------------------------------------
// EQ-07: Verify Diameter Relation
// ----------------------------------------------------------------------------
console.log('\n--- TEST EQ-07: Verify Diameter Relation (RU / UK / EN) ---');
const ru07 = normalizeAAMIntent('Является ли AB диаметром этой окружности?');
const uk07 = normalizeAAMIntent('Чи є AB діаметром цього кола?');
const en07 = normalizeAAMIntent('Is AB a diameter of this circle?');
assertSemanticEquivalence('EQ-07', ru07, uk07, en07, {
  expectedIntent: 'VERIFY_RELATION',
  expectedCommand: 'VERIFY_RELATION',
  isMutation: false,
  paramKeys: ['relation', 'subject'],
});

// ----------------------------------------------------------------------------
// EQ-08: Verify Thales Theorem
// ----------------------------------------------------------------------------
console.log('\n--- TEST EQ-08: Verify Thales Theorem (RU / UK / EN) ---');
const ru08 = normalizeAAMIntent('Проверь теорему Фалеса для треугольника ABC');
const uk08 = normalizeAAMIntent('Перевір теорему Фалеса для трикутника ABC');
const en08 = normalizeAAMIntent('Verify Thales theorem for triangle ABC');
assertSemanticEquivalence('EQ-08', ru08, uk08, en08, {
  expectedIntent: 'VERIFY_RELATION',
  expectedCommand: 'VERIFY_RELATION',
  isMutation: false,
  paramKeys: ['relation'],
});

// ----------------------------------------------------------------------------
// EQ-09: Show Configuration Passport (Read-only)
// ----------------------------------------------------------------------------
console.log('\n--- TEST EQ-09: Show Configuration Passport (RU / UK / EN) ---');
const ru09 = normalizeAAMIntent('Покажи паспорт конфигурации');
const uk09 = normalizeAAMIntent('Покажи паспорт конфігурації');
const en09 = normalizeAAMIntent('Show configuration passport');
assertSemanticEquivalence('EQ-09', ru09, uk09, en09, {
  expectedIntent: 'QUERY_CONFIGURATION',
  expectedCommand: 'GET_CONFIGURATION',
  isMutation: false,
  paramKeys: [],
});

// ----------------------------------------------------------------------------
// EQ-10: Composite Pipeline: Parallel Construction + Verification
// ----------------------------------------------------------------------------
console.log('\n--- TEST EQ-10: Composite Pipeline Parallel + Verify (RU / UK / EN) ---');
const ru10 = normalizeAAMIntent('Проведи через точку A прямую, параллельную BC, и проверь, действительно ли она параллельна BC');
const uk10 = normalizeAAMIntent('Проведи через точку A пряму, паралельну BC, і перевір, чи дійсно вона паралельна BC');
const en10 = normalizeAAMIntent('Construct line through point A parallel to BC and verify if it is parallel to BC');
assertSemanticEquivalence('EQ-10', ru10, uk10, en10, {
  expectedIntent: 'CONSTRUCT_PARALLEL',
  expectedCommand: 'CONSTRUCT_PARALLEL',
  isMutation: true,
  hasFollowUpVerification: true,
  paramKeys: ['through', 'reference'],
});

console.log('\n======================================================================');
console.log('✓ ALL 10 RU / UK / EN CROSS-LANGUAGE EQUIVALENCE TESTS PASSED PERFECTLY!');
console.log('======================================================================');
