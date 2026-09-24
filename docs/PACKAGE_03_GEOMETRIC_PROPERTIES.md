# PACKAGE 03: GEOMETRIC PROPERTIES — RESEARCH & TRANSFER SPECIFICATION

**Package ID:** `PKG-03-GEOMETRIC-PROPERTIES`  
**Package Name:** Geometric Properties & Quantitative Invariants  
**Version:** 1.0.0  
**Domain:** Geometry Reasoning Stand / Educational Extension  
**Dependencies:** `PKG-01-GEOMETRIC-VOCABULARY`, `PKG-02-STRUCTURAL-RELATIONS`  
**Epistemic Status:** `[FACT]` / `[INFERENCE]` / `[RESULT]`  
**Operational Status:** DECLARATIVE SPECIFICATION ONLY (Zero code mutation, no graph derivation edges)

---

## 1. Executive Summary & Epistemic Boundaries

Пакет 03 отвечает на фундаментальный вопрос третьего уровня онтологии:

$$\textbf{WHAT IS MATHEMATICALLY TRUE ABOUT THESE OBJECTS?}$$

Он определяет математические характеристики, метрики, ограничения допустимых значений (домены) и количественные соотношения для объектов из **Package 01**, связанных топологическими отношениями из **Package 02**.

### Ключевой разделительный принцип
$$\text{OBJECT} \neq \text{RELATION} \neq \text{PROPERTY} \neq \text{RULE}$$

- **Property (Свойство):** Констатирует количественную или качественную характеристику объекта или пары объектов ($L_{\text{diameter}} = 2R$; все радиусы равны; касательная перпендикулярна радиусу).
- **Rule (Правило вывода, Package 04):** Оператор перехода состояний знания ($\angle ACB = 90^\circ \implies AB \text{ — диаметр}$).
- **Запрет автоматической деривации:** Наличие формулы $L = 2R$ **не означает** автоматического создания ребра вывода в `CANONICAL_GRAPH` или `DeterministicNavigator`.

---

## 2. Классификация свойств (Property Taxonomy)

1. **METRIC PROPERTY (Метрические):** Скалярные величины (длина, расстояние, площадь).
2. **ANGULAR PROPERTY (Угловые):** Мера углов, ортогональность.
3. **DOMAIN PROPERTY (Ограничения существования):** Границы допустимых значений параметров (например, $0 < L \le 2R$).
4. **EQUALITY / SYMMETRY PROPERTY (Инварианты равенства):** Устойчивые тождества (например, равенство всех радиусов одной окружности).
5. **CONTEXTUAL PROPERTY (Контекстные свойства):** Свойства, возникающие только при соблюдении топологического контекста из Package 02.

---

## 3. Базовый каталог математических свойств

### Circle / CircleBoundary
- **PROP_01 (Equality):** Все точки `BoundaryPoint` на `CircleBoundary` находятся на строго одинаковом метрическом расстоянии $R$ от `Center`.
- **PROP_02 (Domain):** Радиус строго положителен: $R > 0$.
- **PROP_03 (Angular):** Полная угловая мера окружности составляет $360^\circ$ ($2\pi$ рад).

### Radius
- **PROP_04 (Metric / Equality):** Все отрезки `Radius`, соединённые с одним и тем же `Center`, имеют одинаковую длину $R$.

### Chord & Diameter
- **PROP_05 (Domain):** Длина любой хорды $L$ строго ограничена: $0 < L \le 2R$.
- **PROP_06 (Metric / Maximum):** Длина диаметра равна ровно $2R$ ($L_{\text{diameter}} = 2R$); диаметр является максимальной хордой.
- **PROP_07 (Metric / Projection):** Ортогональное радиальное расстояние $d$ от центра до хорды длины $L$ связано соотношением Пифагора:
  $$d^2 + \left(\frac{L}{2}\right)^2 = R^2 \iff d = \sqrt{R^2 - \frac{L^2}{4}}$$
- **PROP_08 (Special-Case Metric):** Для диаметра радиальное расстояние до центра равно нулю ($d = 0$).

### TangentLine
- **PROP_09 (Angular / Orthogonality):** Касательная прямая `TangentLine` строго ортогональна (образует угол $90^\circ$) радиусу, проведённому в общую точку касания.

### Arc
- **PROP_10 (Domain):** Угловая мера дуги $\theta$ ограничена: $0 < \theta \le 360^\circ$.
- **PROP_11 (Metric):** Линейная длина дуги связана с радиусом и угловой мерой: $S = R \cdot \theta_{\text{rad}} = \frac{\pi R \theta^\circ}{180^\circ}$.

### Disk / Sector / SegmentArea
- **PROP_12 (Metric):** Площадь круга `Disk` равна $\pi R^2$.
- **PROP_13 (Metric):** Площадь сектора `Sector` прямо пропорциональна угловой мере дуги: $A_{\text{sector}} = \frac{\theta^\circ}{360^\circ} \cdot \pi R^2$.
- **PROP_14 (Metric):** Площадь сегмента `SegmentArea` равна разности площадей сектора и треугольника, образованного центром и хордой: $A_{\text{seg}} = A_{\text{sec}} - A_{\Delta}$.

---

## 4. Контекстные свойства (Contextual Properties)

Разделение **GLOBAL PROPERTY** и **CONTEXTUAL PROPERTY** гарантирует отсутствие глобального семантического загрязнения:

- **PROP_CTX_01 (Triangle Side as Chord Length):**
  - *Context:* Вершины треугольника $A, B, C$ находятся в отношении `liesOn` к одной и той же `CircleBoundary`.
  - *Property:* Метрическая длина стороны треугольника тождественно равна метрической длине соответствующей хорды:
    $$L(\text{Side}_{AB}) = L(\text{Chord}_{AB})$$
  - *Эпистемический смысл:* Объекты `Side` и `Chord` не объявляются глобально тождественными; тождественны их метрические значения в рамках заданного топологического контекста.

---

## 5. Информационная ёмкость и границы потери информации

| Свойство / Величина | Что определяет (Determines) | Чего НЕ определяет (Does Not Determine) | Потеря информации (Information Loss) |
|---|---|---|---|
| **Радиус $R$** | Масштаб окружности, кривизну, максимальную длину хорды, площадь круга. | Координаты центра, ориентацию, положение на плоскости. | Полная потеря пространственной локализации. |
| **Длина хорды $L$ (+ $R$)** | Радиальное расстояние до центра $d$, модуль стягиваемой дуги. | Положение концов хорды на окружности, угол поворота. | Потеря ориентации (семейство касательных к окружности радиуса $d$). |
| **Угловая мера дуги $\theta$** | Долю окружности, форму сектора/сегмента. | Физическую длину дуги, метрический размер хорды (без знания $R$). | Потеря абсолютного масштаба. |
| **Диаметр $L = 2R$** | Длину отрезка, факт прохождения через центр. | Конкретную пространственную ориентацию диаметральной прямой. | Потеря угла наклона на плоскости. |

---

## 6. Маппинг на существующую структуру стенда (Stand Mapping)

| Semantic Property | Existing Stand Fact Key | Runtime Status | Mapping Type |
|---|---|---|---|
| Radius Length ($R$) | `R`, `radius` | ALREADY REPRESENTED | Identity |
| Contextual Chord Length ($L$) | `chord_BC`, `side_a`, `side_b`, `side_c` | ALREADY REPRESENTED | Contextual Mapping |
| Arc Angular Measure ($\theta$) | `equivalent_arc_angle`, `transferred_minor_angle` | ALREADY REPRESENTED | Identity |
| Radial Orthogonal Distance ($d$) | `radial_distance`, `radial_dist_a/b/c` | ALREADY REPRESENTED | Derived Metric |
| Disk Area Metric | Базовый знаменатель в `normalized_area_fraction` ($\pi R^2$) | ALREADY REPRESENTED | Reference Scale |
| Tangent Orthogonality | *None* | FUTURE CANDIDATE | Declarative Baseline |

---

## 7. Сводная таблица свойств (Property Definitions)

| PROPERTY_ID | ENTITY | PROPERTY | TYPE | FORMALIZATION | DOMAIN | CONTEXT |
|---|---|---|---|---|---|---|
| `PROP_RAD_LEN` | `Radius` | Length Equivalence | EQUALITY | $L(r_i) = R$ | $R > 0$ | GLOBAL |
| `PROP_DIA_LEN` | `Diameter` | Max Chord Length | METRIC | $L_{\text{dia}} = 2R$ | $R > 0$ | GLOBAL |
| `PROP_CHD_BND` | `Chord` | Length Boundary | DOMAIN | $0 < L_{\text{chd}} \le 2R$ | $R > 0$ | GLOBAL |
| `PROP_CHD_RAD` | `Chord` | Radial Distance Rel | METRIC | $d^2 + (L/2)^2 = R^2$ | $R > 0, 0 < L \le 2R$ | GLOBAL |
| `PROP_TGT_ORT` | `TangentLine` | Orthogonality | ANGULAR | $\angle(\text{Tangent}, \text{Radius}) = 90^\circ$ | N/A | At point of tangency |
| `PROP_ARC_BND` | `Arc` | Angular Boundary | DOMAIN | $0 < \theta \le 360^\circ$ | N/A | GLOBAL |
| `PROP_DSK_ARA` | `Disk` | Circle Area | METRIC | $\text{Area} = \pi R^2$ | $R > 0$ | GLOBAL |
| `PROP_SID_CHD` | `Side` | Length Identity | METRIC | $L_{\text{side}} = L_{\text{chd}}$ | $L > 0$ | Вписанный треугольник |

---

## 8. Чистый блок передачи (Transfer Package 03)

```text
===== TRANSFER PACKAGE 03 =====

PACKAGE_ID: PKG-03-GEOMETRIC-PROPERTIES
PACKAGE_NAME: Geometric Properties & Quantitative Invariants
VERSION: 1.0.0
PURPOSE: Define mathematical characteristics, metrics, and quantitative boundaries for objects from PKG-01 based on relations from PKG-02, without introducing executable derivation rules.
DEPENDENCIES: PKG-01-GEOMETRIC-VOCABULARY, PKG-02-STRUCTURAL-RELATIONS
SCOPE: Semantic Graph / Knowledge Base (Declarative Layer)
EPISTEMIC_STATUS: [FACT]

-----------------------------------------------------------------
1. PROPERTY TAXONOMY
-----------------------------------------------------------------
Properties are strictly classified into:
- METRIC: Scalar physical values (Length, Area).
- ANGULAR: Degrees/Radians and spatial alignments (Orthogonality).
- DOMAIN: Mathematical boundaries of existence.
- EQUALITY: Guaranteed uniformities (e.g., all radii are equal).

-----------------------------------------------------------------
2. PROPERTY DEFINITIONS & FORMALIZATIONS
-----------------------------------------------------------------
[CIRCLE / RADIUS PROPERTIES]
- PROP_01 (Equality): All `Radius` segments connected to the same `Center` have strictly equal length (R).
- PROP_02 (Domain): Radius length R is strictly > 0.

[CHORD / DIAMETER PROPERTIES]
- PROP_03 (Metric): The length of a `Diameter` is exactly 2R.
- PROP_04 (Domain): The length L of any `Chord` is bounded: 0 < L <= 2R.
- PROP_05 (Metric): The orthogonal distance (d) from `Center` to a `Chord` satisfies d^2 + (L/2)^2 = R^2.

[TANGENT PROPERTIES]
- PROP_06 (Angular): A `TangentLine` is orthogonal (90°) to the `Radius` at their shared `BoundaryPoint`.

[ARC PROPERTIES]
- PROP_07 (Domain): `Arc` angular measure (θ) is bounded: 0 < θ <= 360°.

[AREA PROPERTIES]
- PROP_08 (Metric): The area of a `Disk` is exactly πR^2.

-----------------------------------------------------------------
3. CONTEXTUAL PROPERTIES (CRITICAL BOUNDARY)
-----------------------------------------------------------------
WARNING: Do not assert global identity between Triangle Sides and Chords.
CONTEXTUAL PROPERTY:
- PROP_09: IF Triangle Side AB assumes the topological role of `Chord` (per PKG-02 mapping), THEN Side.Length mathematically equals Chord.Length.

-----------------------------------------------------------------
4. INFORMATION PRESERVATION / LOSS
-----------------------------------------------------------------
- INFO_LOSS_01: Knowing Radius Length (R) preserves metric scale but loses spatial translation (Center coordinates).
- INFO_LOSS_02: Knowing Chord Length (L) and R preserves distance to center (d) but loses rotational orientation.
These epistemic limits must be respected by the Consistency Engine.

-----------------------------------------------------------------
5. EXISTING-STAND MAPPINGS
-----------------------------------------------------------------
Semantic properties map transparently to existing `FactMap` keys:
- Radius Length -> `R`
- Contextual Chord Length -> `chord_BC`, `side_a`, etc.
- Arc Angular Measure -> `equivalent_arc_angle`
- Disk Area metric base -> Used in `normalized_area_fraction` (F)

-----------------------------------------------------------------
6. RUNTIME BOUNDARY & DO_NOT_IMPLEMENT
-----------------------------------------------------------------
- DO NOT convert formulas (e.g., L = 2R) automatically into executable `DerivationPaths`.
- DO NOT create Rules (e.g., "IF angle = 90 THEN diameter"). This is strictly reserved for PKG-04.
- DO NOT alter `Navigator` or `canonicalPaths.ts`.
- This package serves exclusively as the Math Truth baseline for validation engines and future derivation rules.

-----------------------------------------------------------------
7. ACCEPTANCE CRITERIA
-----------------------------------------------------------------
1. Properties are mathematical states/formulas, wholly separated from Rules.
2. Domain constraints (e.g., 0 < L <= 2R) are mathematically sound.
3. Information loss is explicitly documented for scalar properties.
4. No duplicate entries created for existing `FactMap` keys.
5. Codebase remains entirely unmodified (Pure declarative injection).

===== END OF TRANSFER PACKAGE 03 =====
```

---

## 9. Философский вывод: устойчивость последовательности Vocabulary $\to$ Relations $\to$ Properties $\to$ Rules

Последовательность:
$$\textbf{VOCABULARY} \longrightarrow \textbf{STRUCTURAL RELATIONS} \longrightarrow \textbf{PROPERTIES} \longrightarrow \textbf{RULES}$$
является **единственно математически и инженерно устойчивой**.

### Почему?
Правило вывода (`Rule`) представляет собой оператор изменения состояния эпистемической среды:
$$\text{Rule}: (\text{Premise Facts}, \text{Preconditions}) \xrightarrow{\text{Action/Formula}} \text{Derived Fact}$$

1. **Без Vocabulary:** Правило не знает, над какими примитивами оно оперирует (нет понятий "Хорда", "Точка", "Радиус").
2. **Без Relations:** Правило не способно проверить структурную конфигурацию (например, что угол является именно *вписанным*, опирающимся на концы хорды, а не произвольным углом на плоскости).
3. **Без Properties:** Правило не имеет количественных инвариантов и метрических равенств (например, что длина диаметра равна $2R$ или что расстояние от центра до хорды вычисляется по формуле Пифагора).

Попытка ввести правила вывода минуя этот трёхслойный базис неизбежно приводит к «свободно висящим» нелокализованным формулам, ложным срабатываниям и комбинаторному взрыву в поисковом графе.
