# AI Agent Interaction Protocol

This document describes how an external reasoning model or AI agent interacts with the **Geometry Reasoning Stand** to verify calculations, test derivation steps, and validate geometric hypotheses.

---

## 1. Core Workflow

```
       1. OBSERVE (Environment State)
                    │
                    ▼
       2. REASON / FORMULATE PROPOSAL
          (Agent generates step / number / claim)
                    │
                    ▼
       3. SUBMIT TO STAND (verifyResult / step / verifyClaim)
                    │
                    ▼
       4. STAND EVALUATES DETERMINISTICALLY
                    │
                    ▼
       5. RECEIVE EVIDENCE & EPISTEMIC STATUS
```

---

## 2. Protocol Capabilities

### Capability A: Numerical Result Verification (`verifyResult`)
Use when the agent has calculated a numeric quantity and wants to verify if it matches canonical mathematical ground truth.

**Agent Query:**
```typescript
const report = env.verifyResult('chord_BC', 5.0, 0.001);
```

**Stand Response Structure:**
```json
{
  "target": "chord_BC",
  "proposedValue": 5.0,
  "status": "MATCH",
  "canonicalValue": 5.0,
  "difference": 0.0,
  "tolerance": 0.001,
  "evidence": "Value matches canonical calculation within tolerance 0.001"
}
```

---

### Capability B: Step-by-Step Derivation (`step`)
Use when the agent is constructing a multi-step geometric proof and wants each step validated against formal preconditions.

**Agent Action:**
```typescript
const stepResult = env.step("DP-INSC-TO-CENT");
```

**Stand Response Structure (Valid Step):**
```json
{
  "status": "VALID",
  "ruleId": "DP-INSC-TO-CENT",
  "producedFactName": "central_angle_BC",
  "producedValue": 60.0,
  "feedback": "Step verified and executed: Derived 'central_angle_BC' = 60.",
  "traceStepIndex": 0
}
```

**Stand Response Structure (Precondition Failure):**
```json
{
  "status": "PRECONDITION_FAILED",
  "ruleId": "DP-THALES-CLASS",
  "feedback": "Rule 'DP-THALES-CLASS' failed precondition check on current geometry facts."
}
```

---

### Capability C: Geometric Claim Verification (`verifyClaim`)
Use when the agent asserts a qualitative geometric claim (e.g., "The triangle is a right triangle because AC is a diameter").

**Agent Action:**
```typescript
const claimReport = env.verifyClaim("AC is a diameter", (facts) => {
  const distAC = Math.hypot(facts.coord_C.x - facts.coord_A.x, facts.coord_C.y - facts.coord_A.y);
  const isDiam = Math.abs(distAC - 2 * facts.R) < 1e-4;
  return {
    valid: isDiam,
    evidence: isDiam ? "AC length is 2R" : `AC length (${distAC}) != 2R (${2 * facts.R})`
  };
});
```

**Stand Response Structure:**
```json
{
  "claimDescription": "AC is a diameter",
  "status": "VALID",
  "evidence": "AC length is 2R",
  "evaluatedPredicates": [
    {
      "predicate": "AC is a diameter",
      "passed": true
    }
  ]
}
```
