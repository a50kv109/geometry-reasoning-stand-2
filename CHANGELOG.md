# Changelog

All notable changes to **Geometry Reasoning Stand V2** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-09-25

### Added
- **Geometry Project Persistence (`GeometryProjectV1`)**:
  - Deterministic serialization/deserialization with versioned JSON format (`geometry-reasoning-stand-project`).
  - Strict validation layer with transaction safety (`INVALID PROJECT → NO STATE MUTATION`).
  - Dynamic Construction DAG restoration and complete dependency recomputation.
  - Browser UI menu for Save Project, Open Project, and New Project.
  - Semantic commands `SAVE_PROJECT` and `LOAD_PROJECT` for AI reasoning agents.
  - Expanded 30-test verification matrix (`npm run test:project`).
- **AAM Language Gateway v0.1**:
  - Natural language semantic intent extraction across Russian, Ukrainian, and English.
  - Dedicated interactive AAM workbench terminal with live two-layer trace (Language Kernel Intent $\to$ Stand Execution).
  - Extended deterministic relation verifier `VERIFY_RELATION` (parallel, perpendicular, diameter, Thales, point-on-circle).
  - Benchmark test suites: positive (20), negative (20), multilingual equivalence (10).
- **Multilingual Support (RU / UK / EN)**:
  - React Context localization (`src/i18n/`) with persistent language selection in localStorage.
  - UI language switcher placed in the top navigation header.

## [2.0.0] - 2026-09-24

### Initial Public V2 Release
*Version 2 represents an independent generation of the Stand featuring a frozen analytical kernel, strict epistemic separation, and a universal semantic interface. Version 1 was an earlier exploratory generation and is maintained separately.*

### Architecture & Paradigm
- **Frozen Baseline Mathematical Core:** Formally locked analytical geometry engine (`src/kernel/`, `src/engines/constructionCore.ts`) ensuring deterministic, repeatable calculations.
- **Epistemic Read-Only Presentation Layer:** Total separation between mathematical state (`GeometryState`) and the React UI. Components consume read-only passports and cannot compute or alter mathematical truth independently.
- **The Vanishing Property (Свойство Исчезновения):** Continuous dynamic evaluation of relations. When preconditions are broken by point movement, semantic relations instantly evaporate.
- **Universal Semantic Tool Interface:** Uniform machine-readable API (`src/engines/semantic/`) with exactly 20 commands for humans, automated scripts, and AI agents.

### Features & Capabilities
- **School Mode Canvas:** Dynamic 2D canvas with mouse dragging, snapping, and live dependency propagation.
- **School Constructions:** Points, segments, lines, circles, perpendicular bisectors, angle bisectors, orthogonal circle tangents, parallel lines, and heights.
- **Packet 1 (Triangle-Circle & Thales):** Inscribed triangles, chords, diameters, central-inscribed angle ratio ($2\alpha = \theta$), and Thales' right angle invariance.
- **Packet 2 (Fundamentals & Perpendiculars):** Analytical precondition checking for perpendicular bisectors, angle bisectors, and boundary/external circle tangents.
- **Configuration Passport (S-01, S-02, S-03):** Read-only projection extracting relations, construction steps, and LaTeX quantities without side effects.
- **Deterministic Natural Language Adapter:** Parsing common Russian and English geometric phrases into structured semantic commands.

### Test Baseline
- Complete suite of 21 test scripts in `package.json` (20 suites executed in `npm run test:all`) with 100% pass rate.
