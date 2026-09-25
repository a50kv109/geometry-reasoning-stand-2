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

## 4. How to Run the Verification Benchmark

```bash
# Run AAM Gateway 20-scenario benchmark suite
npm run test:aam

# Run all test suites
npm run test:all
```
