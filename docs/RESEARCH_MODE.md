# Research Mode & Dynamic Experiments (RESEARCH_MODE.md)

## 1. Purpose of Research Mode

While **School Mode** provides an intuitive drawing canvas and step-by-step textbook for curriculum geometry, **Research Mode** (`src/engines/research/`) is designed for empirical mathematical exploration and formal reasoning verification.

> **Scope Boundary:** Research Mode is not an unconstrained automated theorem prover. It is a **deterministic laboratory for parameter sweeps, invariant discovery, and hypothesis testing**.

---

## 2. Dynamic Experiments (`dynamicExperiment.ts`)

A dynamic experiment sweeps geometric parameters (e.g. angle $\theta$, vertex parameter $u$, or radius $R$) across a continuous range and observes invariant quantities:

1. **Parameter Variation:** Perturbs designated free variables along continuous trajectories.
2. **State Sampling:** At each sample step, recomputes the full construction DAG and measures quantities (lengths, angles, areas, cross-ratios).
3. **Invariant Detection:** Identifies properties that remain constant across all samples within tolerance $\varepsilon$.

---

## 3. Observation Model (`observationModel.ts`)

Observations represent empirical regularities observed during interaction:
- Metric constancy (e.g. "ratio $L / \sin\alpha$ is constant across all positions").
- Orthogonality preservation under deformation.
- Concurrence of multiple lines at a single point.

Each observation is recorded with:
- Target entities involved.
- Observed numerical variance ($\sigma < 10^{-5}$).
- Epistemic status: `OBSERVATION` (pending proof by a canonical rule).

---

## 4. Construction Trace (`constructionTrace.ts`)

The construction trace records the complete causal history of an experiment:
- Root entities (free points).
- Sequence of applied construction steps.
- Dependency depth map for every entity.
- Provenance assistance metadata supplied to verification rules.

---

## 5. Cross-Experiment Analyzer (`crossExperimentAnalyzer.ts`)

Compares multiple independent experimental runs to verify universality:
- Validates whether an observed invariant holds across distinct triangle classes (acute, right, obtuse).
- Identifies topological bifurcation points (e.g. when an inscribed angle flips across the center).

---

## 6. Advanced Research Findings, DRPS, and ACP Integration
Starting from Version 2.1.0, the Research Mode integrates the advanced, decoupled observation and persistent pipeline (Phase 3A..3C):
1. **Research Findings Store (DRPS):** observed anomalies and invariants are saved line-by-line in the `research_findings.jsonl` atomic database, complete with canonical deduplication.
2. **Deterministic Attention Policy:** ranks findings by epistemic status, novelty, impact, recurrence, and wear, returning a strict Top-5 focus window on the presentation layer.
3. **Research Surface Facade:** exposes read-only finding maps to UI/Agent consumers.
4. **Engineering Reflex (ACP):** coordinates trust metrics and outputs MAINTAIN, THROTTLE, DEGRADE_TRUST, or EMERGENCY_STOP signals through `ACPMock` (connected to upstream [acp-core](https://github.com/a50kv109/acp-core)).
5. **Interactive UI Entry Point:** Accessible via the **` Находки и статус ACP`** tab under the `🔬 Исследование` panel.
