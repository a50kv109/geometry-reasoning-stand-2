# AAM Bridge / Engineering Semantic Gateway v0.1 (`AAM_GATEWAY.md`)

## 1. Executive Summary & Purpose

The **AAM Bridge / Engineering Semantic Gateway** connects natural language engineering thought with the deterministic execution and verification capabilities of the **Geometry Reasoning Stand**.

```
                   AAM Language Kernel
                            │
              Естественный язык (RU | UK | EN)
                            │
                     Semantic Intent
                            │
                            ▼
              ┌───────────────────────────┐
              │ Universal Semantic Tool   │
              │         Interface         │
              └─────────────┬─────────────┘
                            │
                            ▼
                 Geometry Reasoning Stand
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        Geometry Core                Verification
              │                           │
              └─────────────┬─────────────┘
                            ▼
                    Structured Result
      { construction: "accepted", relation: "PARALLEL", status: "VERIFIED" }
```

---

## 2. Core Architectural Invariant

> **"Language may be ambiguous. Engineering Core must not be."**  
> **"The agent may be wrong. The Stand must not be."**

1. **AAM Language Kernel is a GATEWAY, NOT an executor**:
   - Zero geometric calculations inside AAM (no slopes, no coordinates, no distances).
   - Only lexical analysis, grammar extraction, entity normalization, and translation into formal semantic tool calls.
2. **Deterministic Execution**:
   - Geometry Stand (`src/kernel/`, `src/engines/constructionCore.ts`, `src/engines/configuration/`) remains the **sole source of geometric truth**.
   - No parallel state, no `AgentGeometryEngine`, no second `GeometryState`.
3. **Strict Epistemic Isolation**:
   - Verification commands never mutate the geometric state (`stateChanged: false`).
   - True relations are proven and reported as `VERIFIED`.
   - Contradicted relations are detected analytically and reported as `REFUTED`.

---

## 3. The 20 Engineering Benchmark Scenarios

The gateway benchmark test suite (`src/engines/tests/testAAMGatewayBenchmark.ts`) validates 20 natural language engineering scenarios across Russian, Ukrainian, and English:

| ID | Natural Language Query (Example) | Normalized Intent | Tool Call | Stand Result |
|---|---|---|---|---|
| **AAM-01** | «Проведи через точку A прямую, параллельную BC» | `CONSTRUCT_PARALLEL` | `CONSTRUCT_PARALLEL(BC, A)` | `construction: accepted` |
| **AAM-02** | «Проведи через A перпендикуляр к BC» | `CONSTRUCT_PERPENDICULAR` | `CONSTRUCT_PERPENDICULAR(BC, A)` | `construction: accepted` |
| **AAM-03** | «Построй биссектрису угла ABC» | `CONSTRUCT_ANGLE_BISECTOR` | `CONSTRUCT_ANGLE_BISECTOR(B, A, C)` | `construction: accepted` |
| **AAM-04** | «Построй серединный перпендикуляр к AB» | `CONSTRUCT_PERPENDICULAR_BISECTOR` | `CONSTRUCT_PERPENDICULAR_BISECTOR(AB)` | `construction: accepted` |
| **AAM-05** | "Construct circle with center O and radius 100" | `DRAW_CIRCLE` | `DRAW_CIRCLE(O, 100)` | `construction: accepted` |
| **AAM-06** | «Построй хорду между A и B» | `DRAW_SEGMENT` | `DRAW_SEGMENT(A, B)` | `construction: accepted` |
| **AAM-07** | «Построй точку P с координатами (30, 40)» | `DRAW_POINT` | `DRAW_POINT(P, 30, 40)` | `construction: accepted` |
| **AAM-08** | «Задай углы треугольника A=40, B=70» | `SET_TRIANGLE_ANGLES` | `SET_TRIANGLE_ANGLES(A:40, B:70)` | `construction: accepted` |
| **AAM-09** | «Проверь, действительно ли AB перпендикулярна CD» | `VERIFY_RELATION` | `VERIFY_RELATION(PERPENDICULAR)` | `status: VERIFIED / REFUTED` |
| **AAM-10** | «Является ли AB диаметром этой окружности?» | `VERIFY_RELATION` | `VERIFY_RELATION(DIAMETER, AB)` | `status: VERIFIED / REFUTED` |
| **AAM-11** | «Проверь теорему Фалеса для треугольника ABC» | `VERIFY_RELATION` | `VERIFY_RELATION(THALES_INSCRIBED)`| `status: VERIFIED / REFUTED` |
| **AAM-12** | «Проверь, лежит ли точка P на окружности» | `VERIFY_RELATION` | `VERIFY_RELATION(POINT_ON_CIRCLE, P)`| `status: VERIFIED / REFUTED` |
| **AAM-13** | «Проверь параллельность линии L и отрезка BC» | `VERIFY_RELATION` | `VERIFY_RELATION(PARALLEL, L, BC)` | `status: VERIFIED / REFUTED` |
| **AAM-14** | Dynamic Invariance: move vertex, verify relation | `VERIFY_RELATION` | Recompute + `VERIFY_RELATION` | `status: VERIFIED` |
| **AAM-15** | «Паспорт конфигурации» | `QUERY_CONFIGURATION` | `GET_CONFIGURATION` | Read-only passport |
| **AAM-16** | «Покажи доказанные факты» | `QUERY_FACTS` | `GET_VERIFIED_FACTS` | Epistemic facts list |
| **AAM-17** | «Измерь угол при вершине C» | `QUERY_MEASUREMENTS` | `GET_MEASUREMENTS(target: C)` | Angular measurement |
| **AAM-18** | «Удали прямую line_1» | `ERASE_OBJECT` | `ERASE_OBJECT(line_1)` | `construction: accepted` |
| **AAM-19** | «Сбрось геометрию в исходное состояние» | `RESET_GEOMETRY` | `RESET_GEOMETRY` | Geometry reset |
| **AAM-20** | Composite: construct line + verify relation in pipeline | `CONSTRUCT_PARALLEL` + verify | Sequential execution | `{ construction: accepted, relation: PARALLEL, status: VERIFIED }` |

---

## 5. Visual Semantic Language & Semantic Guard (Experimental PoC)

### STATUS:
* **STATUS:** EXPERIMENTAL PoC
* **Implementation:** READY FOR EXPERIMENT
* **Not yet:** Final production semantic architecture

### 5.1. Overview & Purpose
**Visual Semantic Language** is a lightweight mechanism in Geometry Stand V1 that enables students and educational clients to address existing geometric objects through their **visual features** (colors and markers) rather than formal alphanumeric names (e.g., `∠ABC`).

Examples:
* *«красная сторона»* / *«синяя сторона»*
* *«красно-зелёный угол»* / *«угол между красной и зелёной сторонами»*
* *«угол с чёрным квадратиком»*

**Important Architectural Note:** This is **NOT Computer Vision, OCR, or AI image recognition**. The Geometry Stand natively knows the presentation metadata (`color`, `visualMarker`) of its own geometric primitives.

---

### 5.2. Four Levels of Identity & Invariant
To prevent visual presentation from corrupting mathematical truth, the architecture enforces four distinct identity levels:

```text
1. OBJECT IDENTITY
   portableId / localId (e.g. "edge_AB", "chord_BC")

2. SEMANTIC IDENTITY
   semanticType / semanticRole (e.g. SEGMENT, vertex, altitude)

3. VISUAL IDENTITY
   color / visualMarker (e.g. RED, GREEN, RIGHT_ANGLE_SQUARE)

4. LINGUISTIC IDENTITY
   natural-language tokens & descriptions
```

> **Core Invariant:** *Visual Identity is mutable; Semantic Identity is stable.*  
> *Example:* If segment `edge_AB` is initially **RED** and is subsequently recolored to **BLUE**, its `portableId` (`edge_AB`) and geometric coordinates remain rigorously unchanged. Only its Visual Identity is updated.

---

### 5.3. Architectural Pipeline & Responsibilities
When a visual query is submitted, it flows through an isolated experimental preprocessor before reaching the core engine:

```text
Natural Language
      │
      ▼
AAM Gateway
      │
      ▼
Visual Identity Resolver  ──► "Which object is the user pointing to?"
      │
      ▼
Canonical Semantic Intent
      │
      ▼
Semantic Guard            ──► "Can this intent be executed geometrically without contradiction?"
      │
      ├─► EXECUTE ──────────► Geometry Engine ("How to perform the construction?")
      ├─► CLARIFY
      └─► REJECT
```

* **Visual Resolver:** Resolves visual descriptions (colors, intersecting colored rays, square markers) into canonical `portableId`s.
* **Semantic Guard:** Validates geometric consistency, detects contradictions (e.g., claiming a right angle with a `RIGHT_ANGLE_SQUARE` is acute), and handles ambiguity without guessing.
* **Geometry Core:** Unchanged and isolated from visual/linguistic parsing.

---

### 5.4. End-to-End Simulation Example
```text
User Input: «Построй биссектрису красно-зелёного угла»
        │
        ▼
Visual Resolver identifies RED segment (AB) and GREEN segment (BC)
        │
        ▼
Common Vertex found: B
        │
        ▼
Resolved Entity: ANGLE(B, AB, BC)
        │
        ▼
Semantic Guard checks consistency ──► VALID
        │
        ▼
Canonical Command: CONSTRUCT_ANGLE_BISECTOR(vertex: 'B')
        │
        ▼
Geometry Engine executes construction & updates Constructive DAG
```

---

### 5.5. Handling Ambiguity & Right Angle Markers
* **Ambiguity Handling:** If multiple objects match a visual description (e.g., two red segments when a perpendicular is requested), the Visual Resolver returns `AMBIGUOUS`, and the Semantic Guard outputs `CLARIFY` (e.g., asking the user to specify which red line). The system never guesses.
* **Right Angle Marker (`RIGHT_ANGLE_SQUARE`):** Visual markers such as a black square indicate a right angle ($90^\circ$). If a student claims the marked angle is acute, the Semantic Guard detects a contradiction and outputs an educational explanation (`REJECT` with correction).

---

### 5.6. Test Coverage & Core Impact
* **Visual Semantic tests:** 12/12 PASS
* **Regression suites (all 26 test suites):** 26/26 PASS (`npm run test:all`)
* **TypeScript Lint:** PASS (`npm run lint`)
* **Production Build:** SUCCESS (`npm run build`)

#### Core Impact:
* **Geometry Core:** unchanged
* **PGS-2D schema:** unchanged
* **Existing AAM text path:** preserved (via Fast Bypass)
* **Visual Semantic Layer:** isolated experimental addition

---

## 6. How to Run the Visual Semantic Test Suite
```bash
# Run Visual Semantic Language & Guard test suite
npm run test:visual

# Run all 26 test suites
npm run test:all
```
