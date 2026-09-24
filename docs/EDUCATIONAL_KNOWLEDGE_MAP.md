# EDUCATIONAL KNOWLEDGE MAP — CANONICAL SEMANTIC SPECIFICATION
**Harmonized Knowledge Packages 01–03 & Educational Layer**

**Document ID:** `MAP-EDU-01-03-HARMONIZED`  
**Version:** 1.0.0  
**Domain:** Geometry Reasoning Stand / Educational Layer  
**Epistemic Baseline:** `PKG-01-GEOMETRIC-VOCABULARY`, `PKG-02-STRUCTURAL-RELATIONS`, `PKG-03-GEOMETRIC-PROPERTIES`  
**Status:** CANONICAL DECLARATIVE CONTRACT (Zero code changes, zero kernel mutation, single source of truth)

---

## 00. Архитектурные принципы (Architectural Principles)

1. **One Geometry, One Mathematical Kernel (Единство истины):**
   - Математическое ядро (`src/kernel/`, `src/environment/`) является единственным источником геометрической истины.
   - Образовательный слой (`src/components/InteractiveTextbook.tsx`, `LearningGuide.tsx`, `ArcChordTable.tsx` и др.) является дружественным визуально-педагогическим клиентом к этой истине.
   - **Запрет дублирования:** Запрещено создание параллельного рантайм-движка понятий, второго `FactMap` или альтернативных математических формул.

2. **Эпистемический 4-уровневый контракт (Epistemic Separation):**
   $$\textbf{OBJECT (L1)} \neq \textbf{RELATION (L2)} \neq \textbf{PROPERTY (L3)} \neq \textbf{RULE (L4)}$$
   - **Level 1 — Vocabulary:** «Что существует?» (онтология пространственных примитивов).
   - **Level 2 — Structural Relations:** «Как объекты топологически связаны?» (инцидентность, часть-целое, границы).
   - **Level 3 — Properties:** «Что математически верно об этих объектах?» (метрические скаляры, формулы, домены, инварианты).
   - **Level 4 — School Rules:** «Как вывести новое знание из известного?» (теоремы, дедуктивные переходы — зарезервировано для Package 04).

3. **Контекстность против глобального отождествления (Contextuality Invariant):**
   - Отрезок стороны треугольника $AB$ **не является** хордой глобально.
   - Он принимает структурную роль и метрические свойства `Chord` **исключительно в контексте**, когда обе его вершины $A, B$ инцидентны единой окружности `CircleBoundary`.

4. **Явная фиксация потери информации (Explicit Information Loss):**
   - Скалярный радиус $R$ теряет координаты центра $O$.
   - Длина хорды $L$ теряет угловую ориентацию и положение на окружности.
   - Беззнаковое радиальное расстояние $d$ теряет векторное направление.
   - Доля площади треугольника `normalized_area_fraction` ($F$) не восстанавливает форму треугольника без дополнительных параметров.

---

## 01. Уровень 1: Канонический геометрический словарь (Vocabulary)

Все образовательные компоненты обязаны соотноситься с 14 каноническими сущностями Package 01:

| Entity ID | Каноническое имя | Студенческий / UI термин | Описание и размерность |
|---|---|---|---|
| `ENT_POINT` | **Point** | Точка | 0D-примитив положения на евклидовой плоскости. |
| `ENT_BOUNDARY_POINT` | **BoundaryPoint** | Точка на окружности (вершина) | 0D-точка, инцидентная границе `CircleBoundary` (вершины $A, B, C$). |
| `ENT_CENTER` | **Center** | Центр окружности ($O$) | 0D-фокусная точка, равноудаленная от всех точек границы; не лежит на 1D-границе. |
| `ENT_LINE` | **Line** | Прямая линия | 1D бесконечная непрерывная совокупность точек. |
| `ENT_SEGMENT` | **Segment** | Отрезок | 1D часть прямой между двумя точками (длина $L$). |
| `ENT_RADIUS` | **Radius** | Радиус (отрезок $OA$) | 1D отрезок, соединяющий `Center` и `BoundaryPoint`. |
| `ENT_CHORD` | **Chord** | Хорда (сторона $AB$) | 1D отрезок, соединяющий две различные `BoundaryPoint`. |
| `ENT_DIAMETER` | **Diameter** | Диаметр ($D = 2R$) | 1D хорда, проходящая через `Center` (максимальная хорда). |
| `ENT_CIRCLE_BOUNDARY` | **CircleBoundary** | Окружность (линия контура) | 1D замкнутая плоская кривая постоянного расстояния $R$ от центра. |
| `ENT_DISK` | **Disk** | Круг (диск, фигура) | 2D сплошная область плоскости, ограниченная `CircleBoundary`. |
| `ENT_ARC` | **Arc** | Дуга окружности | 1D связная часть границы `CircleBoundary`. |
| `ENT_TANGENT_LINE` | **TangentLine** | Касательная прямая | 1D прямая, имеющая ровно одну общую точку с `CircleBoundary`. |
| `ENT_SECTOR` | **Sector** | Круговой сектор | 2D область круга между двумя радиусами и дугой. |
| `ENT_SEGMENT_AREA` | **SegmentArea** | Круговой сегмент | 2D область круга между хордой и стягиваемой дугой. |

---

## 02. Уровень 2: Структурные отношения (Structural Relations)

Топологические связи описывают взаимное расположение и структуру объектов без вычислений:

1. **`isCenterOf`:** `Center` $O \to$ `isCenterOf` $\to$ `CircleBoundary` / `Disk`.
2. **`liesOn`:** `BoundaryPoint` $\{A, B, C\} \to$ `liesOn` $\to$ `CircleBoundary`.
3. **`passesThrough`:** `Diameter` $\to$ `passesThrough` $\to$ `Center`.
4. **`touches`:** `TangentLine` $\to$ `touches` $\to$ `CircleBoundary` (в единственной точке касания).
5. **`connects` (Radius):** `Radius` $\to$ `connects` $\to$ (`Center`, `BoundaryPoint`).
6. **`connects` (Chord):** `Chord` $\to$ `connects` $\to$ (`BoundaryPoint` $A$, `BoundaryPoint` $B$).
7. **`isSpecialCaseOf`:** `Diameter` $\to$ `isSpecialCaseOf` $\to$ `Chord` (при условии инцидентности центру).
8. **`isPartOf`:** `Arc` $\to$ `isPartOf` $\to$ `CircleBoundary`.
9. **`bounds`:** `CircleBoundary` $\to$ `bounds` $\to$ `Disk`.
10. **`boundedBy` (Sector):** `Sector` $\to$ `boundedBy` $\to$ (`Arc`, `Radius` 1, `Radius` 2).
11. **`boundedBy` (SegmentArea):** `SegmentArea` $\to$ `boundedBy` $\to$ (`Arc`, `Chord`).

---

## 03. Уровень 3: Геометрические свойства (Geometric Properties)

Количественные характеристики, метрические соотношения и математические домены:

1. **Радиус (PROP_RAD_LEN, PROP_RAD_DOM):**
   - Длина отрезка $OA = OB = OC = R$.
   - Домен: $R > 0$.
2. **Диаметр (PROP_DIA_LEN):**
   - Длина $D = 2R$. Радиальное расстояние до центра $d = 0$.
3. **Хорда (PROP_CHD_BND, PROP_CHD_RAD):**
   - Домен длины: $0 < L \le 2R$.
   - Радиальное расстояние: $d^2 + (L/2)^2 = R^2 \implies d = \sqrt{R^2 - L^2/4}$.
4. **Касательная (PROP_TGT_ORT):**
   - Перпендикулярна радиусу в точке касания: $\angle(\text{Tangent}, \text{Radius}) = 90^\circ$.
5. **Дуга (PROP_ARC_BND, PROP_ARC_LEN):**
   - Домен угловой меры: $0 < \theta \le 360^\circ$ (доли цикла $0 < d \le 1.0$).
   - Длина дуги: $S = R \cdot \theta_{\text{rad}} = 2\pi R \cdot d$.
6. **Круг и фигуры (PROP_DSK_ARA, PROP_SEC_ARA):**
   - Площадь круга: $S_{\text{диск}} = \pi R^2$.
   - Площадь сектора: $S_{\text{сектор}} = d \cdot \pi R^2$.
   - Площадь сегмента: $S_{\text{сегмент}} = S_{\text{сектор}} - S_{\Delta}(O, A, B)$.
7. **Контекстное свойство вписанного треугольника (PROP_CTX_01):**
   - Если $A, B \in \text{CircleBoundary}$, то $L(\text{Side}_{AB}) = L(\text{Chord}_{AB}) = 2R \sin(\theta_{AB}/2)$.

---

## 04. Уровень 4: Школьные правила вывода (School Rules — Package 04)
*(Интегрировано декларативно: PKG-04-SCHOOL-RULES. Не компилируется напрямую в runtime без отдельной команды).*

Канонический набор атомарных правил теоремы Фалеса и топологических критериев прямоугольного треугольника:

1. **`RULE-THALES-01-FWD` (Вписанный угол $90^\circ \to$ Диаметр):**
   - *Given:* Вписанный угол $\angle ACB = 90^\circ$.
   - *Preconditions (P02):* Точки $A, B, C \in \text{CircleBoundary}$, угол опирается на хорду $AB$.
   - *Property Basis (P03):* Вписанный угол равен половине угловой меры дуги ($\theta = 180^\circ$).
   - *Derived:* Хорда $AB$ является диаметром (`Diameter`), центр $O \in AB$.
   - *Information Gain:* Высокий (фиксирует центр $O$ на отрезке $AB$).
   - *Converse:* `RULE-THALES-02-REV`.

2. **`RULE-THALES-02-REV` (Диаметр $\to$ Вписанный угол $90^\circ$):**
   - *Given:* Хорда $AB$ классифицирована как `Diameter`.
   - *Preconditions (P02):* Точка $C \in \text{CircleBoundary}$, $C \neq A, C \neq B$.
   - *Property Basis (P03):* Диаметр отсекает полуокружность $180^\circ$.
   - *Derived:* $\angle ACB = 90^\circ$.
   - *Information Gain:* Высокий (жестко определяет угол без тригонометрических вычислений).
   - *Converse:* `RULE-THALES-01-FWD`.

3. **`RULE-TRI-CIRCUMCENTER-FWD` (Прямоугольный треугольник $\to$ Центр на середине гипотенузы):**
   - *Given:* Класс треугольника $ABC = \text{RightTriangle}$.
   - *Preconditions (P02):* Треугольник вписан в $\text{CircleBoundary}$.
   - *Property Basis (P03):* Гипотенуза совпадает с диаметром.
   - *Derived:* Центр $O$ лежит строго на середине гипотенузы $c$.
   - *Information Gain:* Средний (локализует конструктивную точку $O$ на отрезке).
   - *Converse:* `RULE-TRI-CIRCUMCENTER-REV`.

4. **`RULE-TRI-CIRCUMCENTER-REV` (Центр на стороне $\to$ Прямоугольный треугольник):**
   - *Given:* Центр $O$ лежит на стороне $AB$ вписанного треугольника $ABC$.
   - *Preconditions (P02):* $A, B, C \in \text{CircleBoundary}$.
   - *Property Basis (P03):* Хорда, содержащая центр, является диаметром ($2R$).
   - *Derived:*
     1. Сторона $AB$ является гипотенузой и диаметром.
     2. Класс треугольника $= \text{RightTriangle}$.
     3. Противолежащий угол $\angle C = 90^\circ$.
   - *Information Gain:* Очень высокий (из 1 топологического факта восстанавливаются класс фигуры, диаметр и точный угол).
   - *Converse:* `RULE-TRI-CIRCUMCENTER-FWD`.

---

## 05. Предусловия и ограничения (Preconditions & Constraints)
*(Зарезервировано для Package 05).*
- Невырожденность треугольника ($A \neq B \neq C$).
- Положительность метрик ($R > 0, L > 0$).
- Корректность циклического порядка обхода вершин.

---

## 06. Инварианты (System Invariants & Dynamic State Invariants)
*(Декларативные инварианты системы и семейств состояний. См. PKG_DYN_THALES_INVARIANT.md).*
- $\sum \theta_i = 360^\circ$ (сумма дуг замкнутой окружности равна полному циклу).
- $\sum \angle_i = 180^\circ$ (сумма внутренних углов евклидова треугольника).
- $d_{\text{max}} < 0.5 \iff$ остроугольный (центр $O$ строго внутри).
- $d_{\text{max}} = 0.5 \iff$ прямоугольный (центр $O$ на диаметре).
- $d_{\text{max}} > 0.5 \iff$ тупоугольный (центр $O$ снаружи).
- **Динамический инвариант семейства Фалеса (PKG-DYN-THALES-INVARIANT):** При фиксированном диаметре $AB$ и непрерывном перемещении вершины $C$ вдоль $\text{CircleBoundary}$ вписанный угол $\angle ACB = 90^\circ$ сохраняется строго инвариантным во всех невырожденных снимках. (Декларативная спецификация без рантайм-мутаций ядра).

---

## 07. Семантический маппинг компонентов образовательного слоя

| Образовательный компонент | Студенческий концепт | Семантический уровень | Соответствие в P01–P03 | Фактическое представление в приложении | Статус гармонизации |
|---|---|---|---|---|---|
| `LearningGuide.tsx` | Точки на окружности | L1 / L2 | `BoundaryPoint`, `liesOn` | `vertices` (`A`, `B`, `C`, $u \in [0, 1)$) | **ALIGNED** |
| `LearningGuide.tsx` | Стороны — это хорды | L1 / L2 / L3 | `Chord`, `PROP_CTX_01` | Отрезки между вершинами (`chords.AB/BC/CA`) | **CONTEXTUAL** |
| `LearningGuide.tsx` | Три дуги окружности | L1 / L2 / L3 | `Arc`, `isPartOf`, `PROP_ARC_BND` | `arcs.AB/BC/CA` (доли цикла и градусы) | **ALIGNED** |
| `LearningGuide.tsx` | Центр $O$ и три радиуса | L1 / L2 / L3 | `Center`, `Radius`, `PROP_RAD_LEN` | Центр $O(0, 0)$, $OA=OB=OC=R$ | **ALIGNED** |
| `InteractiveTextbook.tsx` | Хорды и стороны | L1 / L3 | `Chord`, `Side`, `PROP_CHD_RAD` | `lenAB`, `lenBC`, `lenCA` в мм и px | **ALIGNED** |
| `InteractiveTextbook.tsx` | Вписанные углы | L3 / L4 | `Angle`, Inscribed Angle Theorem | `angles.A/B/C`, связь с противоположной дугой | **ALIGNED** |
| `InteractiveTextbook.tsx` | Радиус и диаметр | L1 / L3 | `Radius`, `Diameter`, $D=2R$ | `activeRadius`, `diameterFormat`, $C=2\pi R$ | **ALIGNED** |
| `InteractiveTextbook.tsx` | Площадь круга ($S_{\text{круг}}$) | L1 / L3 | `Disk`, `PROP_DSK_ARA` | `circleAreaFormat` ($\pi R^2$) | **ALIGNED** |
| `InteractiveTextbook.tsx` | Площадь треугольника | L3 | Triangle Area ($S$) | `areaFormat` (формулы синусов, $abc/4R$) | **ALIGNED** |
| `ArcChordTable.tsx` | Дуга $\leftrightarrow$ Хорда | L2 / L3 | `subtends`, $L = 2R\sin(\theta/2)$ | Таблица пар дуг и длин хорд | **ALIGNED** |
| `ArcChordTable.tsx` | Правило противоположностей | L2 / L4 | Inscribed Angle Relation | Маппинг вершины на противоположную дугу/сторону | **ALIGNED** |
| `TopologicalClassCard.tsx` | Топологический класс | L3 / L6 | Invariant $d_{\text{max}}$ | Классификация (acute, right, obtuse) без тригонометрии | **ALIGNED** |
| `RelationMap.tsx` | Карта взаимосвязей | L2 / L4 | Срезовый граф связности | Связка вершина $\leftrightarrow$ сторона $\leftrightarrow$ дуга | **ALIGNED** |

---

## 08. Языковая цепочка: от языка ученика к математическому выводу

Для каждого элемента в учебном интерфейсе зафиксирована строгая цепочка трансформации:

$$\begin{aligned}
\text{Student Language} &\longrightarrow \text{Canonical Geometric Concept (L1)} \\
&\longrightarrow \text{Structural Relation (L2)} \\
&\longrightarrow \text{Geometric Property (L3)} \\
&\longrightarrow \text{[Future School Rule (L4)]}
\end{aligned}$$

### Примеры цепочек:
1. **«Сторона $AB$ треугольника»:**
   - *Student Language:* Сторона треугольника $AB$.
   - *Canonical Concept:* Отрезок `Segment`, ограниченный точками $A$ и $B$.
   - *Structural Relation:* Контекстное отношение: поскольку $A, B \in \text{CircleBoundary}$, отрезок $AB$ играет роль `Chord`.
   - *Property:* Длина $L_{AB} = 2R \sin(\theta_{AB}/2) \le 2R$.
   - *Future Rule:* Теорема синусов / связь с противолежащим вписанным углом $\angle C$.

2. **«Центр $O$ лежит на стороне»:**
   - *Student Language:* Центр круга попал прямо на сторону треугольника.
   - *Canonical Concept:* Точка `Center` инцидентна хорде `Chord`.
   - *Structural Relation:* `passesThrough(Chord, Center) \implies` данная хорда есть `Diameter`.
   - *Property:* Длина хорды $L = 2R$; радиальное расстояние $d = 0$; стягиваемая дуга $\theta = 180^\circ$ ($d = 0.5$).
   - *Future Rule:* Теорема Фалеса $\implies$ противолежащий вписанный угол равен ровно $90^\circ$, треугольник прямоугольный.
