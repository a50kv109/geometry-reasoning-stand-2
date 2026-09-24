# Training & Evaluation Scenarios (T01–T10)

This document catalogs the 10 reference reasoning scenarios executable on the **Geometry Reasoning Stand**.

---

### Scenario T01: Basic Angle Sum
- **Initial State**: `angle_A = 30°`, `angle_B = 60°`
- **Target**: `angle_C`
- **Goal**: Apply Euclidean angle sum theorem $\angle C = 180^\circ - \angle A - \angle B$.
- **Expected Route**: `['DP-ANG-SUM-C']`
- **Canonical Result**: `90.0°`

---

### Scenario T02: Inscribed to Central Angle
- **Initial State**: `angle_A = 30°`, `R = 5`
- **Target**: `central_angle_BC`
- **Goal**: Apply inscribed angle theorem $\angle BOC = 2 \cdot \angle BAC$.
- **Expected Route**: `['DP-INSC-TO-CENT']`
- **Canonical Result**: `60.0°`

---

### Scenario T03: Multi-Step Chord Length
- **Initial State**: `angle_A = 30°`, `R = 5`
- **Target**: `chord_BC`
- **Goal**: Perform 2-step deduction: Inscribed angle $\to$ Central angle $\to$ Chord length via $2R \sin(\alpha/2)$.
- **Expected Route**: `['DP-INSC-TO-CENT', 'DP-CHORD-TRIG']`
- **Canonical Result**: `5.00`

---

### Scenario T04: Thales Right Triangle Confirmation
- **Initial State**: `coord_A = (0, -5)`, `coord_C = (0, 5)`, `R = 5` (chord $AC = 10 = 2R$)
- **Target**: `triangle_class`
- **Goal**: Recognize that $AC$ is a diameter and apply Thales' Theorem.
- **Expected Route**: `['DP-THALES-CLASS']`
- **Canonical Result**: `'right'`

---

### Scenario T05: Competing Paths / Precondition Falsification
- **Initial State**: `coord_A = (0, 5)`, `coord_B = (4.33, -2.5)`, `coord_C = (-4.33, -2.5)`, `R = 5` (Equilateral)
- **Target**: `triangle_class`
- **Goal**: Reject `DP-THALES-CLASS` because chord $AC \approx 8.66 \neq 2R$; fallback to coordinate classification.
- **Expected Route**: `['DP-COORD-CLASS']`
- **Canonical Result**: `'acute'`

---

### Scenario T06: Dynamic Value Propagation
- **Initial State**: `angle_A = 30°`, `angle_B = 60°`, `leg_a = 3`, `leg_b = 4`
- **Target**: `hypotenuse_c`
- **Goal**: Dynamically derive $\angle C = 90^\circ$ first, unlocking the Pythagorean theorem precondition.
- **Expected Route**: `['DP-ANG-SUM-C', 'DP-PYTH-HYP']`
- **Canonical Result**: `5.00`

---

### Scenario T07: Epistemic Isolation Sandbox
- **Initial State**: `leg_a = 3`, `leg_b = 4`, `angle_C = 90°`
- **Target**: Experimental hypothesis $S = 0.5 \cdot a \cdot b$
- **Goal**: Validate hypothesis in exploration sandbox without contaminating canonical graph.
- **Expected Outcome**: Verified in sandbox, canonical solver returns `NO_VALID_PATH`.

---

### Scenario T08: Trace Integrity & Introspection
- **Initial State**: `angle_A = 30°`, `angle_B = 60°`, `leg_a = 3`, `leg_b = 4`
- **Target**: `hypotenuse_c`
- **Goal**: Verify structured derivation trace output (`initialFacts`, `selectedPathIds`, `steps`, `finalValue`).
- **Expected Outcome**: Full structured trace with 2 executed steps.

---

### Scenario T09: Numerical Hallucination Rejection
- **Initial State**: `angle_A = 30°`, `R = 5`
- **Action**: Agent submits incorrect calculation `chord_BC = 4.7`.
- **Expected Outcome**: Stand returns `status: MISMATCH`, `difference: 0.3000`, `canonicalValue: 5.0000`.

---

### Scenario T10: Observation Boundary Enforcement
- **Initial State**: `angle_A = 30°`, `R = 5`
- **Mode**: `AGENT`
- **Goal**: Agent queries `observe()`.
- **Expected Outcome**: Underived target facts (`chord_BC`, `central_angle_BC`) are strictly omitted from `knownFacts`.
