// examples/agentQuickstart.ts
// Example: External AI Agent interacting with the Geometry Reasoning Stand

import { GeometryEnvironment } from '../src/environment/GeometryEnvironment';
import { FactMap } from '../src/kernel/types';

console.log('============================================================');
console.log('GEOMETRY REASONING VERIFICATION STAND — AI AGENT DEMO');
console.log('============================================================\n');

// 1. Initialize environment in AGENT mode (observation boundary enforced)
const env = new GeometryEnvironment(
  {
    R: 5,
    angle_A: 30,
    angle_B: 60,
    coord_A: { x: 0, y: -5 },
    coord_B: { x: 4.330127, y: 2.5 },
    coord_C: { x: 0, y: 5 },
  },
  'AGENT'
);

// 2. Observe initial geometry
const obs = env.observe();
console.log('[1] OBSERVATION BOUNDARY CHECK:');
console.log(`  - Agent Mode knownFacts count: ${Object.keys(obs.knownFacts).length} (Only primary configuration & coords)`);
env.setMode('DEBUG');
console.log(`  - Full/Debug Mode knownFacts count: ${Object.keys(env.observe().knownFacts).length}`);
env.setMode('AGENT');
console.log(`  - Target 'chord_BC' is concealed from agent before derivation: ${obs.knownFacts['chord_BC'] === undefined}\n`);

// 3. Capability 1: Numerical Result Verification
console.log('[2] CAPABILITY 1: NUMERICAL RESULT VERIFICATION');
console.log('  - Agent proposes: chord_BC = 4.7 (Hallucinated / incorrect)');
const report1 = env.verifyResult('chord_BC', 4.7);
console.log(`    -> Status: ${report1.status}`);
console.log(`    -> Difference: ${report1.difference?.toFixed(4)}`);
console.log(`    -> Canonical Ground Truth: ${report1.canonicalValue}`);
console.log(`    -> Evidence: ${report1.evidence}`);

console.log('  - Agent recalculates and proposes: chord_BC = 5.0');
const report2 = env.verifyResult('chord_BC', 5.0);
console.log(`    -> Status: ${report2.status}`);
console.log(`    -> Evidence: ${report2.evidence}\n`);

// 4. Capability 2: Derivation Step Verification & Reasoning
console.log('[3] CAPABILITY 2: DERIVATION STEP VERIFICATION & REASONING');
console.log("  - Agent proposes invalid rule 'DP-PYTH-HYP' without verified right angle:");
const step1 = env.step('DP-PYTH-HYP');
console.log(`    -> Status: ${step1.status}`);
console.log(`    -> Feedback: ${step1.feedback}`);

console.log("  - Agent proposes valid step 'DP-INSC-TO-CENT':");
const step2 = env.step('DP-INSC-TO-CENT');
console.log(`    -> Status: ${step2.status}`);
console.log(`    -> Produced Fact: '${step2.producedFactName}' = ${step2.producedValue}`);

console.log("  - Agent proposes second step 'DP-CHORD-TRIG':");
const step3 = env.step('DP-CHORD-TRIG');
console.log(`    -> Status: ${step3.status}`);
console.log(`    -> Produced Fact: '${step3.producedFactName}' = ${step3.producedValue}\n`);

// 5. Capability 3: Semantic / Geometric Claim Verification
console.log('[4] CAPABILITY 3: SEMANTIC / GEOMETRIC CLAIM VERIFICATION');
console.log('  - Agent claims: "In current state, AC is a diameter"');
const claimReport = env.verifyClaim('AC is a diameter', (facts: FactMap) => {
  const a = facts.coord_A as any;
  const c = facts.coord_C as any;
  const r = Number(facts.R);
  const dist = Math.hypot(c.x - a.x, c.y - a.y);
  const isDiam = Math.abs(dist - 2 * r) < 1e-4;
  return {
    valid: isDiam,
    evidence: isDiam
      ? `Claim confirmed: AC is a diameter (chord ${dist.toFixed(2)} == 2R ${(2 * r).toFixed(2)})`
      : `Claim falsified: AC chord (${dist.toFixed(2)}) does not equal 2R ${(2 * r).toFixed(2)}. AC is not a diameter.`,
    details: { dist, r2: 2 * r },
  };
});
console.log(`    -> Result Status: ${claimReport.status}`);
console.log(`    -> Evidence: ${claimReport.evidence}\n`);

// 6. Canonical Oracle Mode
console.log('[5] CANONICAL SOLVE (REFERENCE ORACLE):');
const oracleSolve = env.solve('chord_BC');
console.log(`  - Canonical solver route: [ ${oracleSolve.selectedPathIds.map(s => `'${s}'`).join(', ')} ]`);
console.log(`  - Final Value: ${Number(oracleSolve.finalValue).toFixed(2)}`);
console.log(`  - Trace steps executed: ${oracleSolve.steps.length}\n`);

console.log('============================================================');
console.log('ALL VERIFICATION WORKFLOWS COMPLETED CLEANLY');
console.log('============================================================');
