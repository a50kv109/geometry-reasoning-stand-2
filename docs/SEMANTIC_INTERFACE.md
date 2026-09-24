# Universal Semantic Tool Interface (SEMANTIC_INTERFACE.md)

## 1. Overview & Positioning

> **Core Invariant:** The Stand itself is **NOT an AI agent**.  
> The Stand is a **deterministic execution and verification environment** that provides a formal semantic interface. External clients (human users through the React UI, automated test harnesses, LLMs, or autonomous AI agents) interact with the Stand through this uniform API.

```
┌────────────────────────────────────────────────────────┐
│     External Client (AI Agent, Human UI, Script)       │
└───────────────────────────┬────────────────────────────┘
                            │ Structured Semantic Command (JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│         Validation & Precondition Gatekeeper           │
│       (src/engines/semantic/semanticCommandExecutor)   │
└───────────────────────────┬────────────────────────────┘
                            │ Validated Operation
                            ▼
┌────────────────────────────────────────────────────────┐
│       Geometry Core & Analytical Recomputer            │
│         (Mutates State OR Generates Query)             │
└───────────────────────────┬────────────────────────────┘
                            │ Pure Epistemic Result
                            ▼
┌────────────────────────────────────────────────────────┐
│             SemanticCommandResult (JSON)               │
│ (success, nextState, relations, verifiedFacts, errors) │
└───────────────────────────┘
```

---

## 2. 60-Second Agent Quickstart (Первый рабочий маршрут агента)

When an AI agent or automated script connects to the Stand, it should follow this standard 5-step sequence:

### Step 1: Read the current geometric state
```json
{
  "command": "GET_GEOMETRY_STATE"
}
```
*Returns:* Raw coordinates of points (`points: { A, B, C, O }`), segments, lines, and circles.

### Step 2: Read high-level configuration & summary
```json
{
  "command": "GET_CONFIGURATION"
}
```
*Returns:* The read-only `GeometryConfigurationView` (point count, angle measurements, bounding radius).

### Step 3: Execute a safe geometric action
Set the triangle to specific angles or construct an auxiliary element:
```json
{
  "command": "SET_TRIANGLE_ANGLES",
  "angles": { "A": 40, "B": 70 }
}
```
*Stand calculates:* Third angle $C = 70^\circ$, verifies $40 + 70 + 70 = 180^\circ$, updates vertices on circle.

Construct an angle bisector at vertex C:
```json
{
  "command": "CONSTRUCT_ANGLE_BISECTOR",
  "vertex": "C"
}
```

### Step 4: Query derived relations
```json
{
  "command": "GET_RELATIONS",
  "filter": { "type": "ANGLE_BISECTOR_OF" }
}
```
*Returns:* Array of extracted relations, e.g. `line_bisector_C` is `ANGLE_BISECTOR_OF` vertex $C$.

### Step 5: Query formally verified facts
```json
{
  "command": "GET_VERIFIED_FACTS"
}
```
*Returns:* Only the facts whose mathematical preconditions have been strictly satisfied against canonical Euclidean rules.

---

## 3. Real Request / Response Protocol (Фактический JSON из кода)

The following signatures correspond directly to `src/engines/semantic/types.ts` and `executeSemanticCommand`:

### A. Example Request: Constructing a Perpendicular
```json
{
  "command": "CONSTRUCT_PERPENDICULAR",
  "reference": "chord_AB",
  "through": "C"
}
```

### B. Real Response (`SemanticCommandResult`):
```json
{
  "success": true,
  "command": "CONSTRUCT_PERPENDICULAR",
  "stateChanged": true,
  "errorCode": undefined,
  "createdEntities": [
    {
      "id": "line_perp_chord_AB_C_172000000",
      "kind": "line",
      "name": "Line ⟂ AB",
      "role": "auxiliary"
    }
  ],
  "affectedEntities": ["line_perp_chord_AB_C_172000000"],
  "derivedRelations": [
    {
      "id": "rel_perp_1",
      "sourceEntityId": "line_perp_chord_AB_C_172000000",
      "relationType": "PERPENDICULAR_TO",
      "targetEntityIds": ["chord_AB"],
      "status": "VERIFIED",
      "description": "Прямая перпендикулярна хорде AB",
      "formalNotation": "line ⟂ AB",
      "theoremOrRuleId": "RULE-PERPENDICULAR"
    }
  ],
  "verifiedFacts": [
    {
      "id": "fact_thales_right_angle",
      "statement": "Угол при вершине C опирается на диаметр AB и равен 90°",
      "ruleId": "RULE-THALES-DIAMETER",
      "status": "VERIFIED"
    }
  ],
  "nextState": {
    "points": { "A": { "id": "A", "x": -120, "y": 0 }, "B": { "id": "B", "x": 120, "y": 0 }, "C": { "id": "C", "x": 0, "y": 120 } },
    "lines": {},
    "segments": {},
    "circles": {}
  },
  "previousState": { ... }
}
```

### C. Example Error Response (when reference is invalid):
```json
{
  "success": false,
  "command": "CONSTRUCT_PERPENDICULAR",
  "stateChanged": false,
  "errorCode": "ENTITY_NOT_FOUND",
  "errorMessage": "Reference entity non_existent_line does not exist in geometry state",
  "nextState": { ... },
  "previousState": { ... }
}
```
*Critical Guarantee:* When an operation fails, `stateChanged` is `false`, and `nextState` remains byte-for-byte identical to `previousState`.

---

## 4. Complete Table of All 20 Semantic Commands

The union type `SemanticCommandType` in `src/engines/semantic/types.ts` contains exactly **20 command types**:

| # | Command | Mutates Geometry | Preconditions / Input | Return Data / Effects |
| :- | :--- | :---: | :--- | :--- |
| 1 | `SET_TRIANGLE_ANGLES` | **Yes** | `angles: { A?, B?, C? }` (sum must be $\le 180^\circ$, max 2 given) | Reconfigures base triangle vertices on circle |
| 2 | `SET_VERTEX_POSITION` | **Yes** | `vertexId: string`, `u?` or `(x, y)` | Moves designated vertex |
| 3 | `MOVE_VERTEX` | **Yes** | Alias for `SET_VERTEX_POSITION` | Moves designated vertex |
| 4 | `RESET_GEOMETRY` | **Yes** | `pointsU?: { A, B, C }`, `R?: number` | Resets to default canonical configuration |
| 5 | `CLEAR_USER_CONSTRUCTIONS`| **Yes** | None | Deletes all user auxiliary lines/circles |
| 6 | `DRAW_POINT` | **Yes** | `x: number, y: number, name?, color?, onCircle?` | Places new free or constrained point |
| 7 | `DRAW_SEGMENT` | **Yes** | `p1Id: string, p2Id: string, color?` | Creates segment connecting two points |
| 8 | `DRAW_LINE` | **Yes** | `p1Id: string, p2Id: string, color?` | Constructs infinite Euclidean line |
| 9 | `DRAW_CIRCLE` | **Yes** | `centerId: string, radiusPointId? or radius?` | Constructs circle |
| 10 | `CONSTRUCT_ANGLE_BISECTOR`| **Yes** | `vertex: string, pAId?, pBId?, color?` | Constructs angle bisector ray |
| 11 | `CONSTRUCT_PERPENDICULAR` | **Yes** | `reference: string, through: string \| {x, y}` | Constructs perpendicular line |
| 12 | `CONSTRUCT_PARALLEL` | **Yes** | `reference: string, through: string \| {x, y}` | Constructs parallel line |
| 13 | `CONSTRUCT_PERPENDICULAR_BISECTOR` | **Yes** | `point1, point2` or `reference: string` | Constructs perpendicular bisector of segment |
| 14 | `ERASE_OBJECT` | **Yes** | `id: string, objectType?` | Cascades deletion through child DAG entities |
| 15 | `GET_GEOMETRY_STATE` | **No** | None | Raw `GeometryState` (points, segments, lines, circles) |
| 16 | `GET_CONFIGURATION` | **No** | None | Complete `GeometryConfigurationView` |
| 17 | `GET_RELATIONS` | **No** | `filter?: { entityId?, type?, status? }` | Array of active `SemanticRelation` |
| 18 | `GET_MEASUREMENTS` | **No** | `filter?: { target?, semanticType? }` | Array of `SemanticQuantity` (angles, lengths) |
| 19 | `GET_VERIFIED_FACTS` | **No** | None | Array of `ConfigurationEpistemicEntry` (VERIFIED) |
| 20 | `BATCH_SEMANTIC_COMMANDS`| **Atomic**| `commands: SemanticCommand[]` | Executes array of commands sequentially |

---

## 5. Natural Language Adapter Pipeline

In `src/engines/semantic/naturalLanguageAdapter.ts`, the Stand provides a deterministic parser:
- `"биссектриса угла C"` $\to$ `CONSTRUCT_ANGLE_BISECTOR` (vertex: "C")
- `"параллель к AB через C"` $\to$ `CONSTRUCT_PARALLEL` (reference: "chord_AB", through: "C")
- `"углы треугольника 30 60 90"` $\to$ `SET_TRIANGLE_ANGLES` (A: 30, B: 60, C: 90)
- `"какой угол при C?"` $\to$ `GET_MEASUREMENTS` (target: "angle_C")
