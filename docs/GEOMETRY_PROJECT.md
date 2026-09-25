# Geometry Project — Persistence & Serialization Specification

> **Principles:**  
> *"Save the mathematical construction, not the rendered pixels."*  
> *"The project is a living parametric model, not a static snapshot."*  
> *"The Stand may verify or refute, but the serialization boundary must never corrupt the state."*

---

## 1. Overview & Purpose

The **Geometry Project** (`geometry-reasoning-stand-project`) is the deterministic, versioned persistence format of the **Geometry Reasoning Stand V2**.

It enables students, teachers, researchers, and external AI reasoning agents to:
1. Save an ongoing geometry investigation as a standalone `.json` file.
2. Transfer geometry problems between human researchers and AI reasoning agents.
3. Reload a project at any time and immediately continue dynamic exploration (dragging vertices, executing theorem verifications, and constructing auxiliary lines).

---

## 2. Architecture & The Single Source of Truth (SSOT)

```
                       ┌────────────────────────────┐
                       │    Project JSON (.json)    │
                       └─────────────┬──────────────┘
                                     │
                                     ▼
                       ┌────────────────────────────┐
                       │  validateGeometryProject   │
                       └─────────────┬──────────────┘
                                     │
                                     ▼
                       ┌────────────────────────────┐
                       │       GeometryState        │ (SSOT)
                       └─────────────┬──────────────┘
                                     │
                        recomputeDependentGeometry
                                     │
                                     ▼
                       ┌────────────────────────────┐
                       │   Living Geometric Model   │
                       └──────┬──────────────┬──────┘
                              │              │
                              ▼              ▼
                    Derived Relations    Configuration Passport
                     (Thales, Angles)     (Verified Theorems)
```

### Invariant:
**Geometry Project is NOT a parallel source of truth.**  
Upon loading, the project deserializes into the canonical `GeometryState`, executes `recomputeDependentGeometry`, and lets all derived relations, passports, and verification engines recompute deterministically.

---

## 3. Data Classification: What is Saved vs What is Not

### ✅ A. Project Data (Saved in SSOT)
- **Geometry State (`FullGeometryState`)**:
  - Base circumradius $R$ and triangle parameters `pointsU: { A, B, C }`.
  - Geometric entities: `points`, `segments`, `lines`, `circles`.
  - Stable monotonic ID counters (`pointCounter`, `segmentCounter`, `lineCounter`, `circleCounter`).
  - Construction Provenance (`GeometryProvenance`): `macroType`, `sourceIds`, `groupId`.
- **Metadata**:
  - `name`, `description`, `author`, `createdAt`, `modifiedAt`, `tags`, `benchmarkId`.
- **Environmental Geometric Parameters**:
  - `rotationDeg` (base circular model rotation in degrees).
  - `scale` (measurement ratio px/mm).
  - `scaleMode` (`degrees`, `radians`, `fractions`).
  - `clientModeHint` (optional non-mathematical view layout hint: `'research' | 'school'`).

### ❌ B. Derived Data (Never Saved, Deterministically Recomputed)
- Dynamic intersections (`pt_par_*_int_*`, `pt_perp_*_int_*`, `pt_ab_*_int_*`).
- Computed segment lengths and dynamic angle measurements.
- Epistemic theorem verification statuses (`VERIFIED`, `REFUTED`, `UNVERIFIED`).
- Configuration Passport tables and Semantic Quantities (`SemanticQuantity[]`, `SemanticRelation[]`).
- Epistemic Fact Registry entries.

### ❌ C. Transient UI Data (Never Saved)
- Active tool selection (`select`, `segment`, `circle`, etc.).
- Active right panel tab (`stats`, `config`, `aam`, `school`).
- Canvas hover, drag, selection, and zoom/pan coordinates.
- Splitter percentage and animation frame cursors.
- Session Undo/Redo history stack (upon load, a clean history is initialized with the project state as `present`).

---

## 4. Schema & Versioning

### Format Identifier
`"format": "geometry-reasoning-stand-project"`

### Current Version
`"version": 1`

### Example Project Structure:
```json
{
  "format": "geometry-reasoning-stand-project",
  "version": 1,
  "metadata": {
    "name": "Теорема Фалеса и параллельная прямая",
    "description": "Построение прямой, параллельной основанию BC через вершину A, и проверка сохранения инварианта.",
    "author": "Student / AI Agent",
    "createdAt": "2026-09-25T01:30:00.000Z",
    "modifiedAt": "2026-09-25T01:35:00.000Z",
    "tags": ["thales", "parallel", "circle"],
    "benchmarkId": "THALES-PAR-01"
  },
  "geometryState": {
    "R": 120,
    "pointsU": { "A": 0.75, "B": 0.25, "C": 0.0 },
    "points": {
      "A": { "id": "A", "name": "A", "x": 0, "y": 120, "u": 0.75, "onCircle": true, "isBaseVertex": true },
      "B": { "id": "B", "name": "B", "x": 0, "y": -120, "u": 0.25, "onCircle": true, "isBaseVertex": true },
      "C": { "id": "C", "name": "C", "x": 120, "y": 0, "u": 0.0, "onCircle": true, "isBaseVertex": true }
    },
    "segments": {
      "chord_AB": { "id": "chord_AB", "p1Id": "A", "p2Id": "B", "length": 240, "isBaseChord": true },
      "chord_BC": { "id": "chord_BC", "p1Id": "B", "p2Id": "C", "length": 169.7, "isBaseChord": true },
      "chord_CA": { "id": "chord_CA", "p1Id": "C", "p2Id": "A", "length": 169.7, "isBaseChord": true }
    },
    "lines": {},
    "circles": {
      "base_circle": { "id": "base_circle", "centerId": "O", "radius": 120, "isBaseCircumcircle": true }
    },
    "pointCounter": 3,
    "segmentCounter": 3,
    "lineCounter": 0,
    "circleCounter": 1
  },
  "settings": {
    "rotationDeg": 0,
    "scale": 1.0,
    "scaleMode": "degrees",
    "clientModeHint": "research"
  }
}
```

---

## 5. Validation & Safety (Rejection Principle)

Every project is strictly validated before state deserialization:
```
INVALID PROJECT → NO STATE MUTATION
```

### Validation Error Codes:
- `INVALID_JSON` — JSON syntax or parsing failure.
- `INVALID_FORMAT_ID` — format string does not match `geometry-reasoning-stand-project`.
- `UNSUPPORTED_VERSION` — schema version is not supported (currently supports `1`).
- `MISSING_GEOMETRY_STATE` — missing root geometryState.
- `INVALID_GEOMETRY_STATE` — invalid radius $R$, negative ID counter, or non-finite coordinates.
- `SCHEMA_VIOLATION` — entity key does not match entity `id`.
- `DUPLICATE_ID` — duplicate ID detected across points, segments, lines, or circles.
- `DANGLING_REFERENCE` — segment, line, circle, or provenance references a non-existent entity.
- `CORRUPTED_ENTITY` — missing required entity properties, non-positive circle radius, or corrupted provenance macroType.

---

## 6. AI Agent Semantic Protocol (`SAVE_PROJECT` / `LOAD_PROJECT`)

External AI clients interact with project persistence via the Universal Semantic Tool Interface:

### Save Project
```json
{
  "command": "SAVE_PROJECT",
  "name": "Investigation Problem #42",
  "description": "Parametric perpendicular bisector proof"
}
```
**Response:** Returns `savedProject` object and formatted `serializedProject` JSON string.

### Load Project
```json
{
  "command": "LOAD_PROJECT",
  "project": "<JSON string or object>"
}
```
**Response:** Restores state, executes dependency recomputation, re-generates Configuration Passport, and returns `stateChanged: true`.

---

## 7. Verification Status Matrix

| Invariant / Feature | Status | Test Coverage |
|---|---|---|
| Pure SSOT Serialization | **VERIFIED** | `PROJ-01` to `PROJ-10` |
| Semantic Relations Preservation | **VERIFIED** | `PROJ-11` |
| Configuration Passport Preservation | **VERIFIED** | `PROJ-12` |
| Semantic Tool API (`SAVE_PROJECT`/`LOAD_PROJECT`) | **VERIFIED** | `PROJ-13`, `PROJ-30` |
| Export / Import Parity | **VERIFIED** | `PROJ-14` |
| Negative Rejection (Corrupted JSON) | **VERIFIED** | `PROJ-15` |
| Negative Rejection (Unsupported Version) | **VERIFIED** | `PROJ-16` |
| Negative Rejection (Dangling References) | **VERIFIED** | `PROJ-17`, `PROJ-27` |
| Negative Rejection (Invalid Format) | **VERIFIED** | `PROJ-18` |
| Editable Construction after Load | **VERIFIED** | `PROJ-19` |
| Dynamic Invariance Recomputation | **VERIFIED** | `PROJ-20`, `PROJ-30` |
| Integral Deep Semantic Round-Trip Invariant | **VERIFIED** | `PROJ-21` |
| Transaction Safety (No State Mutation on Error) | **VERIFIED** | `PROJ-22` |
| Duplicate ID Rejection (Segments, Lines, Circles) | **VERIFIED** | `PROJ-23` to `PROJ-25` |
| Provenance Structure Validation | **VERIFIED** | `PROJ-26`, `PROJ-27` |
| Counter & Numeric Bounds Validation | **VERIFIED** | `PROJ-28`, `PROJ-29` |
| Multi-Agent Handoff Workflow | **VERIFIED** | `PROJ-30` |
