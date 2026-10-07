# Epistemic Verification & Canonical Rules (VERIFICATION.md)

## 1. Epistemic Hierarchy

The Stand rejects binary "true/false" flags. Geometric assertions are classified into strict epistemic tiers:

```
               ┌────────────────────────────────────────────────────────┐
               │              VERIFIED (Formal Proof)                   │
               │   All preconditions of a canonical rule are satisfied │
               └───────────────────────────▲────────────────────────────┘
                                           │ Precondition evaluation
               ┌───────────────────────────┴────────────────────────────┐
               │              DERIVED (Analytical Relation)             │
               │  Computed on the fly from current coordinates/metric   │
               └───────────────────────────▲────────────────────────────┘
                                           │ Analytic extraction
               ┌───────────────────────────┴────────────────────────────┐
               │           CONSTRUCTED (Explicit Action)                │
               │  User or agent created entity via tool / command       │
               └────────────────────────────────────────────────────────┘
```

- **`CONSTRUCTED`:** Entity exists because of an explicit construction step (e.g., drawing a segment or dropping a perpendicular).
- **`DERIVED`:** Relation observed analytically from current state coordinates (e.g., points $A$ and $B$ happen to lie on circle $O$).
- **`VERIFIED`:** Formally grounded in a canonical mathematical theorem whose explicit preconditions have been verified with analytical certainty.
- **`OBSERVATION` / `HYPOTHESIS`:** Sandboxed claims generated during exploratory agent runs, held pending formal verification.

---

## 2. Fundamental Principle: Provenance $\neq$ Proof

> **"Topology and provenance provide evidence for verification;  
> Proof requires a verified rule whose preconditions are deterministically satisfied."**

Just because a line was created with the "Perpendicular" tool does not make it a verified perpendicular bisector. A verified relation requires:
1. Identifying the relevant canonical rule.
2. Checking that every analytical precondition evaluates to true within numerical tolerances.
3. Confirming invariance under dynamic perturbations.

---

## 3. The Vanishing Property (Свойство Исчезновения)

Semantic relations do not persist as static labels. They are **epistemic states** evaluated dynamically:
- When vertex $C$ is on the semicircle of diameter $AB$, the relation `THALES_RIGHT_ANGLE` is active and `VERIFIED`.
- If vertex $C$ is dragged even $0.001\text{ px}$ off the circle, the relation **instantly vanishes** from the configuration passport.
- If the circle radius or line slope is perturbed such that $\text{dist}(O, l) \neq R$, `TANGENT_TO` evaporates completely.

---

## 4. Implemented Canonical Rules (`src/engines/research/canonicalRules.ts`)

| Rule ID | Mathematical Statement | Analytical Preconditions Checked |
| :--- | :--- | :--- |
| `RULE_INSCRIBED_ANGLE` | $\alpha = \theta / 2$ | Center $O$, vertices on circle boundary, arc orientation, vertex strictly opposite to arc. |
| `RULE_CYCLIC_CHORD_LAW` | $L = 2R\sin(\theta/2)$ | Vertices on circle, metric length check against trigonometric formula. |
| `RULE_THALES_DIAMETER` | $\angle C = 90^\circ \iff AB\text{ is diameter}$ | Center $O \in AB$, vertex $C$ on circle, dot product $\vec{CA} \cdot \vec{CB} = 0$. |
| `RULE_ARC_COMPLEMENT_SUM` | $\sum \theta_i = 360^\circ$ | Sum of central angles around origin in cyclic polygon equals full turn. |
| `RULE_PERPENDICULAR_BISECTOR` | $l \perp AB \land M \in l \land \|PA\|=\|PB\|$ | Line passes through midpoint $M$, orthogonal to vector $\vec{AB}$, equidistant points. |
| `RULE_ANGLE_BISECTOR` | $\angle AVL = \angle BVL = \frac{1}{2}\angle AVB$ | Line passes through vertex $V$, unit direction vector equals normalized angle bisector. |
| `RULE_TANGENT_RADIUS_ORTHOGONALITY` | $l \perp OT \land \text{dist}(O, l) = R$ | Orthogonal distance from center equals $R$, radius vector $\vec{OT}$ orthogonal to line. |

---

## 5. Independent Verification of Live Incircle (`verifyIncircle`)

To guarantee mathematical truth without self-fulfilling provenance assumptions (PAT-28), the Stand executes independent algebraic and geometric verification on any constructed or deformed incircle:

1. **Incenter Interior Position:** Center $I = (x_I, y_I)$ must strictly lie within the oriented half-planes defined by all three sides of $\triangle ABC$.
2. **Equidistant Radius Invariant:** The orthogonal Euclidean distances from incenter $I$ to the three infinite lines supporting $AB$, $BC$, and $CA$ must equal radius $r$ within tolerance:
   $$\max\left(|\text{dist}(I, AB) - r|, |\text{dist}(I, BC) - r|, |\text{dist}(I, CA) - r|\right) \le 10^{-4}$$
3. **Dynamic Invariance:** When vertices $A$, $B$, or $C$ are displaced along the circumcircle via «Перестроение △» (`SYNC_BASE_POINTS`), the DAG recomputes $I$, $r$, and the three tangency points $T_A, T_B, T_C$. The verification suite confirms that tangency and radius equality hold continuously across all non-degenerate positions.
4. **Degeneracy & Self-Healing:** In collinear or coincident configurations, radius collapses cleanly to 0 without numerical instability (`NaN`), restoring instantly upon return to a non-degenerate state.
