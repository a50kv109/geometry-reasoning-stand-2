# PACKAGE 04: SCHOOL RULES — RESEARCH & TRANSFER SPECIFICATION

**Package ID:** `PKG-04-SCHOOL-RULES`  
**Package Name:** Educational Graph Operators (School Rules)  
**Version:** 1.0.0  
**Domain:** Geometry Reasoning Stand / Educational Extension  
**Dependencies:** `PKG-01-GEOMETRIC-VOCABULARY`, `PKG-02-STRUCTURAL-RELATIONS`, `PKG-03-GEOMETRIC-PROPERTIES`  
**Epistemic Status:** `[FACT]` / `[INFERENCE]`  
**Operational Status:** DECLARATIVE SPECIFICATION ONLY (Zero runtime mutation, no executable derivation edges)

---

## 1. Executive Summary & Epistemic Boundaries

Пакет 04 переводит классические школьные геометрические теоремы в строгие графовые операторы вывода (Knowledge State Transition Operators).

### Фундаментальный принцип: Правило вывода (Rule)
$$\text{RULE} \neq \text{PROPERTY} \neq \text{RELATION} \neq \text{OBJECT}$$

- **Property (Package 03):** Констатирует количественную или качественную характеристику ($L = 2R$; все радиусы равны).
- **Rule (Package 04):** Оператор перехода эпистемического состояния:
  $$\text{Rule}: (\text{Premise Facts}, \text{Preconditions}) \xrightarrow{\text{Inference Operator}} \text{New Facts}$$
- **Атомарность и разделение прямых и обратных правил:** Прямое правило ($A \implies B$) и обратное правило ($B \implies A$) являются двумя отдельными атомарными операторами с собственными предусловиями.
- **Запрет немедленной компиляции в ядро:** Настоящая спецификация является декларативным уровнем описания знаний. Внедрение в `canonicalPaths.ts` и `DeterministicNavigator` требует отдельной процедуры компиляции с контролем циклов.

---

## 2. Rule Catalog: Теорема Фалеса и критерии прямоугольного треугольника

### RULE 01: Inscribed Angle $90^\circ$ to Diameter (Теорема Фалеса — прямое правило)
- **ID:** `RULE-THALES-01-FWD`
- **Name:** Inscribed Angle $90^\circ$ to Diameter
- **GIVEN:** Measure of `InscribedAngle` $= 90^\circ$.
- **STRUCTURAL PRECONDITIONS (P02):**
  - Угол является `InscribedAngle` (вершина $C$ удовлетворяет `liesOn(CircleBoundary)`).
  - Угол опирается на концы хорды $AB$ (`subtends Chord AB`).
- **PROPERTY BASIS (P03):** Вписанный угол равен половине угловой меры противоположной дуги ($\theta = 2 \cdot 90^\circ = 180^\circ$).
- **TRANSFORMATION:** `inscribed_angle_90` $\to$ `intercepted_chord_is_diameter`
- **DERIVED:** Хорда $AB$ принимает роль `Diameter` (и $O \in AB$).
- **CONVERSE:** `RULE-THALES-02-REV`.
- **DOMAIN:** Геометрия окружности.
- **INVALID WHEN:** Вершина угла не лежит на границе окружности (угол не вписанный).
- **INFORMATION_GAIN:** **High.** Снимает 1 степень свободы: фиксирует положение центра $O$ на отрезке $AB$.
- **EDUCATIONAL_EXPLANATION:** «Если вписанный угол равен ровно 90 градусам, то отрезок (хорда), на который он опирается, обязательно проходит через центр и является диаметром окружности».
- **LOSS / LIMITATIONS:** Не вычисляет числовую длину диаметра без знания радиуса $R$.

---

### RULE 02: Diameter to Inscribed Angle $90^\circ$ (Теорема Фалеса — обратное правило)
- **ID:** `RULE-THALES-02-REV`
- **Name:** Diameter to Inscribed Angle $90^\circ$
- **GIVEN:** `Chord` $AB$ классифицирована как `Diameter`.
- **STRUCTURAL PRECONDITIONS (P02):**
  - Точка $C$ удовлетворяет `liesOn(CircleBoundary)`.
  - Точки не вырождены: $C \neq A$ и $C \neq B$ (P01 constraint).
- **PROPERTY BASIS (P03):** Диаметр делит окружность на две полуокружности по $180^\circ$.
- **TRANSFORMATION:** `chord_is_diameter` $\to$ `inscribed_angle_90`
- **DERIVED:** Величина вписанного угла $\angle ACB = 90^\circ$.
- **CONVERSE:** `RULE-THALES-01-FWD`.
- **DOMAIN:** Геометрия окружности.
- **INVALID WHEN:** Точка $C$ совпадает с концами диаметра (треугольник вырождается в отрезок).
- **INFORMATION_GAIN:** **High.** Точно определяет числовую меру угла без измерений и тригонометрии.
- **EDUCATIONAL_EXPLANATION:** «Любой угол, вершина которого лежит на окружности, а стороны проходят через концы диаметра, всегда будет прямым (90 градусов)».
- **LOSS / LIMITATIONS:** Не фиксирует точное положение точки $C$ на дуге (сохраняется непрерывная степень свободы вдоль полуокружности).

---

### RULE 03: Right Triangle Circumcenter Position (Положение центра описанной окружности)
- **ID:** `RULE-TRI-CIRCUMCENTER-FWD`
- **Name:** Right Triangle Circumcenter Position
- **GIVEN:** Класс треугольника $ABC = \text{RightTriangle}$.
- **STRUCTURAL PRECONDITIONS (P02):**
  - Треугольник вписан в `CircleBoundary` (вершины $A, B, C$ удовлетворяют `liesOn`).
  - Прямоугольный треугольник имеет гипотенузу $c$.
- **PROPERTY BASIS (P03):** Гипотенуза совпадает с диаметром (следствие `RULE-THALES-01-FWD`).
- **TRANSFORMATION:** `right_triangle` $\to$ `circumcenter_on_hypotenuse`
- **DERIVED:** `Circumcenter` (центр $O$) лежит строго на середине гипотенузы $c$.
- **CONVERSE:** `RULE-TRI-CIRCUMCENTER-REV`.
- **DOMAIN:** Геометрия треугольника и окружности.
- **INVALID WHEN:** Треугольник не является прямоугольным (для остроугольного центр строго внутри, для тупоугольного — снаружи).
- **INFORMATION_GAIN:** Локализует невидимую конструктивную точку (центр $O$) на отрезке гипотенузы.
- **EDUCATIONAL_EXPLANATION:** «У прямоугольного треугольника центр описанной окружности всегда расположен ровно посередине самой длинной стороны (гипотенузы)».
- **LOSS / LIMITATIONS:** Не дает углов при гипотенузе.

---

### RULE 04: Circumcenter Position to Right Triangle Class (Топологический критерий прямоугольности)
- **ID:** `RULE-TRI-CIRCUMCENTER-REV`
- **Name:** Circumcenter Position to Right Triangle Class
- **GIVEN:** `Circumcenter` (центр $O$) лежит на `Side` $AB$ треугольника $ABC$.
- **STRUCTURAL PRECONDITIONS (P02):**
  - Вершины $A, B, C$ удовлетворяют `liesOn(CircleBoundary)`.
- **PROPERTY BASIS (P03):** Хорда, содержащая центр, по определению и свойству является диаметром.
- **TRANSFORMATION:** `circumcenter_on_side` $\to$ `side_is_diameter_and_triangle_is_right`
- **DERIVED:**
  1. Сторона $AB$ является гипотенузой и диаметром ($D = 2R$).
  2. Класс треугольника $= \text{RightTriangle}$.
  3. Противолежащий угол $\angle C = 90^\circ$.
- **CONVERSE:** `RULE-TRI-CIRCUMCENTER-FWD`.
- **DOMAIN:** Вписанные треугольники.
- **INVALID WHEN:** Центр $O$ лежит на прямой, содержащей сторону, но строго вне отрезка $AB$.
- **INFORMATION_GAIN:** **Very High.** Из одного топологического факта инцидентности мгновенно восстанавливаются класс фигуры, статус стороны как диаметра и угол $90^\circ$.
- **EDUCATIONAL_EXPLANATION:** «Если центр описанной окружности лежит прямо на стороне треугольника, этот треугольник гарантированно прямоугольный, а эта сторона — гипотенуза и диаметр».
- **LOSS / LIMITATIONS:** Оставляет два острых угла треугольника неопределёнными (требуются дополнительные метрики).

---

## 3. Маппинг на существующие сущности и правила стенда

| Правило P04 | Родственное правило в `canonicalPaths.ts` | Статус связи | Примечание |
|---|---|---|---|
| `RULE-THALES-01-FWD` | Сходно с условием активации диаметра в `DP-THALES-CLASS` | **ALIGNED (Semantic)** | В ядре сейчас `DP-THALES-CLASS` вычисляет `triangle_class` при `is_diameter`. P04 формализует обратное направление вписанный угол $\to$ диаметр. |
| `RULE-THALES-02-REV` | Связано с `DP-INSC-TO-CENT` при $\theta = 180^\circ$ | **ALIGNED (Semantic)** | Ядро использует общую формулу $\angle = \frac{1}{2}\theta_{\text{cent}}$. P04 дает атомарный школьный shortcut без тригонометрии. |
| `RULE-TRI-CIRCUMCENTER-FWD` | Свойство положения центра в `TopologicalClassCard.tsx` | **ALIGNED (Educational)** | В интерфейсе отображается индикатор положения центра $O$ (внутри/на стороне/снаружи). |
| `RULE-TRI-CIRCUMCENTER-REV` | Критерий $d_{\text{max}} = 0.5$ в `TopologicalClassCard.tsx` | **ALIGNED (Semantic)** | В UI совпадение дуги с $0.5$ цикла переводит статус в «Прямоугольный». |

---

## 4. Чистый блок передачи (Transfer Package 04)

```text
===== TRANSFER PACKAGE 04 =====

PACKAGE_ID: PKG-04-SCHOOL-RULES
PACKAGE_NAME: Educational Graph Operators (School Rules)
VERSION: 1.0.0
PURPOSE: Transform standard school geometry theorems into typed, atomic knowledge transition operators (Rules) that build upon P01-P03.
DEPENDENCIES: PKG-01 (Vocab), PKG-02 (Relations), PKG-03 (Properties)
SCOPE: Semantic Graph / Rule Definitions (Declarative Layer)
EPISTEMIC_STATUS: [FACT] / [INFERENCE]

-----------------------------------------------------------------
1. RULE ONTOLOGY PRINCIPLES
-----------------------------------------------------------------
- RULE != FORMULA. A formula (L=2R) is a Property. A Rule is a state transition (IF Angle=90 -> THEN Chord is Diameter).
- EXPLICIT CONVERSES. Forward and Backward rules are strictly separate atomic entities to prevent uncontrolled execution loops.
- RULE ATOMICITY. Rules must not chain multiple logical leaps. (e.g., "90° -> Diameter" and "Diameter -> Right Triangle" are separate rules).

-----------------------------------------------------------------
2. RULE CATALOG (THALES THEOREM SET)
-----------------------------------------------------------------

[RULE-THALES-01-FWD]
NAME: Inscribed Angle 90° to Diameter
GIVEN: Measure of Angle = 90°
STRUCTURAL PRECONDITIONS: Angle is `InscribedAngle` subtending a `Chord`.
PROPERTY BASIS: Inscribed angle measures half its intercepted arc.
TRANSFORMATION: inscribed_angle_90 -> intercepted_chord_is_diameter
DERIVED: The intercepted `Chord` is a `Diameter`.
CONVERSE: RULE-THALES-02-REV
DOMAIN: Circle Geometry
INVALID WHEN: Vertex does not lie on CircleBoundary.
INFORMATION_GAIN: High (Constrains center position to the chord).
EDUCATIONAL_EXPLANATION: "If an inscribed angle is exactly 90 degrees, the chord it looks at is always the diameter of the circle."
LOSS_LIMITATIONS: Does not compute the physical length of the diameter without R.

[RULE-THALES-02-REV]
NAME: Diameter to Inscribed Angle 90°
GIVEN: `Chord` is classified as `Diameter`.
STRUCTURAL PRECONDITIONS: Point C lies on CircleBoundary; C != A; C != B.
PROPERTY BASIS: Diameter splits circle into two 180° arcs.
TRANSFORMATION: chord_is_diameter -> inscribed_angle_90
DERIVED: Measure of `InscribedAngle` at Point C = 90°.
CONVERSE: RULE-THALES-01-FWD
DOMAIN: Circle Geometry
INVALID WHEN: Point C coincides with endpoints (degenerate triangle).
INFORMATION_GAIN: High (Determines exact angular measure without metrics).
EDUCATIONAL_EXPLANATION: "Any angle drawn from the diameter to the edge of the circle is always a right angle (90°)."
LOSS_LIMITATIONS: Does not fix the exact position of Point C on the arc (degree of freedom remains).

[RULE-TRI-CIRCUMCENTER-FWD]
NAME: Right Triangle Circumcenter Position
GIVEN: Triangle Class = `RightTriangle`
STRUCTURAL PRECONDITIONS: Triangle is inscribed in CircleBoundary.
PROPERTY BASIS: Hypotenuse aligns with Diameter (via RULE-THALES-01).
TRANSFORMATION: right_triangle -> circumcenter_on_hypotenuse
DERIVED: `Circumcenter` lies precisely on the midpoint of the `Hypotenuse`.
CONVERSE: RULE-TRI-CIRCUMCENTER-REV
DOMAIN: Triangle Geometry
INVALID WHEN: Triangle is acute or obtuse.
INFORMATION_GAIN: Localizes a topological point accurately based on shape class.
EDUCATIONAL_EXPLANATION: "The center of a circle drawn around a right triangle always sits exactly in the middle of its longest side (the hypotenuse)."

[RULE-TRI-CIRCUMCENTER-REV]
NAME: Circumcenter Position to Right Triangle Class
GIVEN: `Circumcenter` lies on a `Side` of the Triangle.
STRUCTURAL PRECONDITIONS: Triangle vertices lie on CircleBoundary.
PROPERTY BASIS: A chord containing the center is a diameter.
TRANSFORMATION: circumcenter_on_side -> side_is_diameter_and_triangle_is_right
DERIVED: 
  1. The Side is the `Hypotenuse` and `Diameter`.
  2. Triangle Class = `RightTriangle`.
  3. The opposite angle = 90°.
CONVERSE: RULE-TRI-CIRCUMCENTER-FWD
DOMAIN: Triangle Geometry
INVALID WHEN: Circumcenter lies on the supporting line but strictly outside the segment.
INFORMATION_GAIN: Very High (Converts 1 topological incidence fact into a full class deduction + 1 metric angle).
EDUCATIONAL_EXPLANATION: "If the center of the circle lands exactly on one of the triangle's sides, that triangle is guaranteed to be a right triangle, and that side is the diameter."
LOSS_LIMITATIONS: Leaves the other two acute angles undetermined.

-----------------------------------------------------------------
3. RUNTIME BOUNDARY & DO_NOT_IMPLEMENT
-----------------------------------------------------------------
- DO NOT inject these directly into `canonicalPaths.ts` immediately upon receipt.
- Treat this package as the mapping specification for the Educational Knowledge Map.
- Await a separate, explicit INTEGRATION command to compile these semantic rules into executable `DerivationPaths`.

-----------------------------------------------------------------
4. ACCEPTANCE CRITERIA
-----------------------------------------------------------------
1. Rules represent state transitions, not just formulas or properties.
2. Forward and Converse directions are split into separate atomic Rules.
3. Preconditions accurately prevent mathematically invalid application (e.g., C != A).
4. Educational explanations are clear, age-appropriate, and directly mapped to the rule logic.
5. Codebase logic (Navigator, Math Kernel) remains untouched during intake.

===== END OF TRANSFER PACKAGE 04 =====
```
