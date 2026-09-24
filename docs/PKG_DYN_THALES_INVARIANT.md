# RESEARCH SPECIFICATION: DYNAMIC DIAMETER–RIGHT-ANGLE INVARIANT

**Package ID:** `PKG-DYN-THALES-INVARIANT`  
**Package Name:** Dynamic State Invariant: Fixed Diameter & Movable Vertex  
**Version:** 1.0.0  
**Epistemic Baseline:** `PKG-01-GEOMETRIC-VOCABULARY`, `PKG-02-STRUCTURAL-RELATIONS`, `PKG-03-GEOMETRIC-PROPERTIES`, `PKG-04-SCHOOL-RULES`  
**Domain:** Geometry Reasoning Stand / State Dynamics & Invariants  
**Epistemic Status:** `[FACT]` / `[RESULT]` / `[INFERENCE]` / `[UNKNOWN]`  
**Operational Boundary:** DECLARATIVE RESEARCH SPECIFICATION ONLY (Zero runtime mutation, no executable engine, no Navigator changes)

---

## 1. Canonical Geometric Configuration [RESULT]

Для сохранения строгой семантической консистентности со стендом и математическим ядром, конфигурация зафиксирована канонически:

- **CANONICAL TRIANGLE:** $\triangle ABC$
- **CANONICAL DIAMETER SIDE:** Сторона $AB$ (`Side AB` $\to$ `Chord AB` $\to$ `Diameter AB`).
- **CANONICAL MOVABLE VERTEX:** Вершина $C$ (`BoundaryPoint` на `CircleBoundary`).
- **CANONICAL OPPOSITE ANGLE:** Вписанный угол $\angle ACB$ ($\angle C$).

*Инвариант обозначений:* Любая симметричная конфигурация (например, с диаметром $BC$) трактуется как изоморфный случай, но каноническим шаблоном является исключительно $\triangle ABC$ с диаметром $AB$ и плавающей вершиной $C$.

---

## 2. Модель семейства состояний (State Model: Family of States) [FACT]

При непрерывной трансформации $\Delta(C)$, где вершина $C$ перемещается вдоль границы `CircleBoundary`:

| Семантическая ось | Элементы | Описание и математический статус |
|---|---|---|
| **FIXED** | Окружность $(O, R)$, сторона $AB$ | Положение центра $O$, радиус $R$, длина $AB = 2R$, роль $AB$ как диаметра. Не изменяются при $\Delta(C)$. |
| **VARIABLE (Independent)** | Положение точки $C$ | $1$ непрерывная степень свободы ($1\text{ DoF}$) вдоль дуги `CircleBoundary` ($C \in [0, 1)$ за вычетом $A, B$). |
| **DEPENDENT (Variable)** | Углы $\angle A, \angle B$, стороны $AC, BC$ | Непрерывно меняются как функции параметра положения точки $C$. |
| **INVARIANT** | $\angle ACB = 90^\circ$, класс $\text{RightTriangle}$ | Сохраняются во всех допустимых невырожденных снимках (Snapshots). |
| **CONSTRAINT** | $\angle A + \angle B = 90^\circ$, $AC^2 + BC^2 = AB^2$ | Взаимная зависимость переменных величин; сохраняется тождество Пифагора. |
| **BOUNDARY / DEGENERATE** | $C \to A$ или $C \to B$ | Предельные вырожденные состояния: треугольник схлопывается в отрезок $AB$. Логика вписанного угла в предельных точках теряет смысл. |

---

## 3. Разделение эпистемических слоёв: Статика vs Динамика [RESULT]

- **Статическая истина (P04):**
  $$\text{Chord } AB \text{ is Diameter} \land C \in \text{CircleBoundary} \implies \angle ACB = 90^\circ$$
- **Динамическая истина (State-Transition Invariant):**
  $$\text{Given } S_1 \in \mathcal{F}_{\text{Thales}}, \quad S_1 \xrightarrow{\Delta(C)} S_2 \implies \angle ACB \text{ remains } 90^\circ \text{ in } S_2$$

Это знание иного типа: оно описывает не отношение между фактами внутри одного снимка, а **закон сохранения истинности при переходе между состояниями семейства**.

---

## 4. Архитектурный анализ: Требуется ли отдельный слой P05? [INFERENCE]

> **КРИТИЧЕСКИЙ ВЫВОД:** Утверждение `NEW STATE/TRANSITION LAYER NEEDED` **НЕ** является установленным фактом. На текущем этапе это **[INFERENCE] / [HYPOTHESIS]**.

### Альтернатива A: Выразимость через существующие механизмы
Вся описанная динамика может быть полноценно выражена без введения нового рантайм-движка через цепочку:
$$\textbf{Snapshot } (t_1) \xrightarrow{\textbf{Transition } \Delta(C)} \textbf{Snapshot } (t_2) \xrightarrow{\textbf{Delta Evaluation}} \textbf{Trace}$$
1. В снимке $S_1$ истинность $\angle ACB = 90^\circ$ гарантирована `RULE-THALES-02-REV` (P04).
2. Действие `Move(C, \Delta u)` порождает снимок $S_2$.
3. Поскольку предикаты $A, B \in \text{Diameter}$ и $C \in \text{CircleBoundary}$ сохранены, детерминированный решатель ядра за $O(1)$ подтверждает $\angle ACB = 90^\circ$.
4. **Вывод:** Для чистой математической верификации стенду **не требуется** отдельный рантайм-движок темпоральных инвариантов.

### Альтернатива B: Специализированный слой для мета-рассуждений Агента
Выделение отдельного декларативного слоя мета-инвариантов полезно исключительно для:
- **Agentic Planning / Search Pruning:** агент может планировать перемещение точки $C$ для оптимизации других целевых параметров (например, подобрать $AC = R\sqrt{2}$), зная априори, что условие прямоугольности не будет нарушено.
- **Интерактивных педагогических объяснений:** объяснение ученику понятия «геометрическое место точек (Locus)».

---

## 5. Эпистемическая категоризация пакета

- **[FACT] (Математические инварианты):**
  - При фиксированном диаметре $AB$ и перемещении $C$ по окружности $\angle ACB = 90^\circ$ строго инвариантен.
  - Система имеет ровно $1$ непрерывную степень свободы ($1\text{ DoF}$).
  - Углы при диаметре удовлетворяют $\angle A + \angle B = 90^\circ$.
  - Стороны удовлетворяют $AC^2 + BC^2 = 4R^2$.
  - При $C \to A$ или $C \to B$ треугольник вырождается.

- **[RESULT] (Результаты проведённого анализа):**
  - Пакет оперирует исключительно сущностями P01 (`BoundaryPoint`, `Diameter`, `CircleBoundary`, `InscribedAngle`) и связями P02 (`liesOn`, `subtends`).
  - Пакет использует статические свойства P03 и школьное правило Фалеса P04 как свой базис.
  - Каноническая нотация строго зафиксирована: $\triangle ABC$, диаметр $AB$, плавающая вершина $C$.

- **[INFERENCE] (Архитектурные выводы):**
  - Инвариант перехода между состояниями (State-Transition Invariant) концептуально отличается от статического правила вывода (Rule).
  - Утверждение о необходимости отдельного слоя P05 является гипотезой. Выражение через `Snapshot → Transition → Delta → Trace` полностью закрывает потребности верификации без усложнения ядра.

- **[UNKNOWN] (Пока не проверенные вопросы):**
  - Оправдано ли добавление кеширования/пропуска пересчёта для Navigator ценой усложнения графа зависимостей?
  - Создаст ли темпоральное сохранение фактов риск «протаскивания» невалидных утверждений сквозь вырожденные состояния ($C \to A$)?
  - Как формализовать границу применимости инварианта при мульти-трансформациях (когда одновременно меняются и $C$, и радиус $R$)?

---

## 6. Минимальные эксперименты перед любой реализацией

1. **Эксперимент 1 (Snapshot Consistency Baseline):**
   Проверить в существующих контрактных тестах смену координаты точки $C$ на окружности при фиксированных $A, B$ на диаметре. Убедиться, что `DeterministicNavigator` и `ConsistencyEngine` в каждом снимке воспроизводимо и детерминировано дают $\angle C = 90^\circ$ без временных утечек состояния.
2. **Эксперимент 2 (Degeneracy Boundary Probe):**
   Зафиксировать поведение стенда при $u_C \to u_A$ (схлопывание хорды $AC$). Подтвердить, что система корректно отлавливает `PRECONDITION_FAILED` или `DEGENERATE_TRIANGLE` до вызова теоремы о вписанном угле.
3. **Эксперимент 3 (Declarative Trace Annotation):**
   Проверить, достаточно ли добавить в лог трассировки аннотацию `INVARIANT_PRESERVED` для шага перемещения вершины, не меняя структуру `FactMap`.

---

## 7. Operational Boundaries & Invariants Check

- `canonicalPaths.ts`: **НЕ ИЗМЕНЯЛСЯ** (Граф заморожен).
- `DeterministicNavigator`: **НЕ ИЗМЕНЯЛСЯ** (Алгоритм поиска заморожен).
- `FactMap`: **НЕ ИЗМЕНЯЛСЯ**.
- `GeometryEnvironment`: **НЕ ИЗМЕНЯЛСЯ**.
- Executable Derivation Paths: **НЕ ДОБАВЛЯЛИСЬ**.
- Runtime Temporal Engine: **НЕ СОЗДАВАЛСЯ**.
- Agentic Planning: **НЕ РЕАЛИЗОВАЛОСЬ**.
