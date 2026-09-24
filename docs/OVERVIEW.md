# Project Overview — Geometry Reasoning Stand V2

## 1. What is the Stand?

The **Geometry Reasoning Stand V2** is an interactive, deterministic verification environment for Euclidean plane geometry.

It addresses a fundamental problem in modern educational software and AI reasoning benchmarks:
- Traditional dynamic geometry environments (DGEs) focus primarily on drawing and visual drag-and-drop, often lacking formal epistemic tracking.
- Large language models (LLMs) and automated agents frequently suffer from hallucinations, prompt-guessing, or approximate heuristic logic when solving geometry problems.

The Stand bridges this gap with an uncompromising philosophical foundation:
> **"The agent may be wrong. The stand must not be."**

---

## 2. Target Audiences

| Audience | Primary Value & Use Cases |
| :--- | :--- |
| **Students** | Direct, hands-on exploration of geometric theorems. Manipulating vertices dynamically while observing how angles, lengths, and relations behave in real time without hidden mathematical tricks. |
| **Teachers** | Digital blackboard and curriculum companion. Pre-configured theorem demonstrations (Thales' theorem, circle tangents, remarkable lines), interactive textbook guides, and strict invariant checking. |
| **AI Agents & Evaluators** | Deterministic gym and reasoning benchmark. An isolated, machine-readable API (`src/environment/`) where AI reasoners can test derivations, construct auxiliary lines, and verify theorems without hallucinating truth. |
| **Researchers & Developers** | A formal, modular codebase separating analytical calculations (`GeometryState`), graph navigation (`Navigator`), and semantic projections (`ConfigurationPassport`). |

---

## 3. Core Functional Pillars

1. **School Mode (`src/components/school/`):**
   - Construction tools: points, segments, lines, circles, angle bisectors, perpendicular bisectors, tangents, parallels.
   - Interactive canvas with vertex dragging and real-time dependency recomputation.
   - Live measurements of angles, arc lengths, chord lengths, and areas.

2. **Research Mode (`src/components/research/` & `src/engines/research/`):**
   - Parameter sweeps and dynamic experiments.
   - Analytical detection of geometric invariants and symmetries.
   - Cross-experiment analysis comparing state variations.

3. **Semantic Configuration Passport (`src/engines/configuration/`):**
   - Epistemic classification of every fact: `CONSTRUCTED`, `DERIVED`, or `VERIFIED`.
   - Formal mathematical notation and references to canonical Euclidean theorems.
   - Read-only projection guaranteeing no side effects on the underlying geometry.

4. **Universal Semantic Command Interface (`src/engines/semantic/`):**
   - 18+ structured commands executable by humans (via UI) and machines (via API).
   - Natural language adapter mapping common Russian and English geometry phrases into formal commands.
