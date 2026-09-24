# PACKAGE 02: STRUCTURAL RELATIONS — RESEARCH & TRANSFER SPECIFICATION

**Package ID:** `PKG-02-STRUCTURAL-RELATIONS`  
**Package Name:** Structural Relations Topology  
**Version:** 1.0.0  
**Domain:** Geometry Reasoning Stand / Educational Extension  
**Dependencies:** `PKG-01-GEOMETRIC-VOCABULARY`  
**Epistemic Status:** `[FACT]` / `[INFERENCE]`  
**Operational Status:** DECLARATIVE METADATA ONLY (Zero code mutation, no graph derivation edges)

---

## 1. Executive Summary & Epistemic Boundaries

Пакет 02 определяет статические топологические и структурные отношения между сущностями геометрического словаря (Level 1, Package 01). Он формулирует, чем геометрическая конструкция **является** и как соединены её части, исключая численные расчёты, метрики и правила вывода.

### Незыблемые принципы разделения
1. **$\text{OBJECT} \neq \text{RELATION} \neq \text{PROPERTY} \neq \text{RULE}$:**
   - Факт прохождения диаметра через центр — это **структурное отношение** (`passesThrough`).
   - Соотношение $D = 2R$ — это **метрическое свойство** (Package 03).
   - Вывод о том, что вписанный угол $90^\circ$ опирается на диаметр — это **правило вывода** (Package 04).
2. **Недеривационность (Non-Derivational):**
   Структурные связи не выполняют роль рёбер вычислительного графа. Они не переводят факты друг в друга.
3. **Защита от комбинаторного взрыва (Anti-Explosion Policy):**
   Автоматическая генерация явных обратных рёбер (`CircleBoundary contains BoundaryPoint` на основе `BoundaryPoint liesOn CircleBoundary`) **категорически запрещена** в среде исполнения. Обратные запросы решаются декларативными предикатами (Queries), а не статическими рёбрами в графе поиска.

---

## 2. Каталог структурных отношений (11 базовых связей)

### A. Отношения инцидентности (Incidence Relations)
- **REL_01: `Center` $\to$ `isCenterOf` $\to$ `CircleBoundary` | `Disk`**
  - Устанавливает точку как геометрический центр/фокус окружности и круга (1:1).
- **REL_02: `BoundaryPoint` $\to$ `liesOn` $\to$ `CircleBoundary`**
  - Принадлежность точки замкнутому одномерному контуру границы (N:1).
- **REL_03: `Diameter` $\to$ `passesThrough` $\to$ `Center`**
  - Центр принадлежит отрезку диаметра как внутренняя точка (1:1).
- **REL_04: `TangentLine` $\to$ `touches` $\to$ `CircleBoundary`**
  - Касательная прямая имеет с границей ровно одну общую точку касания.

### B. Отношения связности (Connection Relations)
- **REL_05: `Radius` $\to$ `connects` $\to$ (`Center`, `BoundaryPoint`)**
  - Отрезок радиуса структурно соединяет центр окружности с точкой границы.
- **REL_06: `Chord` $\to$ `connects` $\to$ (`BoundaryPoint` A, `BoundaryPoint` B)**
  - Отрезок хорды соединяет две различные точки на границе ($A \neq B$).

### C. Отношения специализации (Specialization Relations)
- **REL_07: `Diameter` $\to$ `isSpecialCaseOf` $\to$ `Chord`**
  - Диаметр наследует все топологические свойства хорды, добавляя условие инцидентности центру (`passesThrough Center`).

### D. Отношения часть-целое (Part-Whole Relations / Мереология)
- **REL_08: `Arc` $\to$ `isPartOf` $\to$ `CircleBoundary`**
  - Дуга является связным одномерным подмножеством границы окружности.

### E. Отношения ограничения областей (Boundary Relations)
- **REL_09: `CircleBoundary` $\to$ `bounds` $\to$ `Disk`**
  - Одномерная замкнутая кривая ограничивает двумерную область круга.
- **REL_10: `Sector` $\to$ `boundedBy` $\to$ (`Arc`, `Radius` A, `Radius` B)**
  - Двумерная область кругового сектора собирается из дуги и двух граничных радиусов.
- **REL_11: `SegmentArea` $\to$ `boundedBy` $\to$ (`Arc`, `Chord`)**
  - Двумерная область кругового сегмента собирается из дуги и стягивающей её хорды.

---

## 3. Контекстный маппинг: Сторона треугольника $\leftrightarrow$ Хорда

**Запрет глобального псевдонима:** Утверждение `Triangle Side == Chord` в общем виде неверно (сторона произвольного треугольника не является хордой).

**Контекстное правило:**
- **Условие:** Если вершины треугольника $A, B, C$ удовлетворяют отношению `liesOn` к одной и той же `CircleBoundary`.
- **Маппинг:** Отрезок $AB$ (сторона треугольника $c$) **динамически принимает контекстную роль** `Chord` для данной окружности.
- **Сохранение информации:** Топологическая инцидентность сохраняется в контексте задачи.

---

## 4. Запреты для среды выполнения (Runtime Do Not Implement)

1. **Не превращать в `canonicalPaths.ts`:**
   Отношения `isSpecialCaseOf`, `connects`, `bounds` **НЕ ДОЛЖНЫ** становиться рёбрами вывода `DerivationPath`.
2. **Не засорять `FactMap`:**
   Структурные отношения не хранятся как численные переменные или скаляры в карте фактов.
3. **Только метаданные (Metadata Only):**
   Данный каталог служит декларативным базисом для валидаторов условий (Package 05) и интерактивных образовательных сценариев (Package 09).

---

## 5. Полный блок передачи (Transfer Package 02)

```text
===== TRANSFER PACKAGE 02 =====

PACKAGE_ID: PKG-02-STRUCTURAL-RELATIONS
PACKAGE_NAME: Structural Relations Topology
VERSION: 1.0.0
PURPOSE: Define topological and structural connections between objects from PKG-01 without introducing metrics, properties, or executable derivation rules.
DEPENDENCIES: PKG-01-GEOMETRIC-VOCABULARY
SCOPE: Semantic Graph / Knowledge Base (Declarative Layer)
EPISTEMIC_STATUS: [FACT]

-----------------------------------------------------------------
1. SEMANTIC PRINCIPLES
-----------------------------------------------------------------
- PRINCIPLE 1: RELATION != PROPERTY != RULE. (e.g., Diameter passing through Center is a RELATION; Diameter = 2R is a PROPERTY).
- PRINCIPLE 2: Structural relations are NON-DERIVATIONAL. They describe what a geometric construct IS, not how to calculate it.
- PRINCIPLE 3: ANTI-EXPLOSION POLICY. Do NOT automatically create inverse relation edges in any executable graph. Inverse mapping must remain implicit or query-based to prevent cyclic loops.

-----------------------------------------------------------------
2. STRUCTURAL RELATIONS CATALOG
-----------------------------------------------------------------
[INCIDENCE RELATIONS]
- REL_01: `Center` [isCenterOf] `CircleBoundary` | `Disk`
- REL_02: `BoundaryPoint` [liesOn] `CircleBoundary`
- REL_03: `Diameter` [passesThrough] `Center`
- REL_04: `TangentLine` [touches] `CircleBoundary` (at exactly 1 BoundaryPoint)

[CONNECTION RELATIONS]
- REL_05: `Radius` [connects] `Center` AND `BoundaryPoint`
- REL_06: `Chord` [connects] `BoundaryPoint` AND `BoundaryPoint`

[SPECIALIZATION RELATIONS]
- REL_07: `Diameter` [isSpecialCaseOf] `Chord`

[PART-WHOLE RELATIONS]
- REL_08: `Arc` [isPartOf] `CircleBoundary`

[BOUNDARY RELATIONS]
- REL_09: `CircleBoundary` [bounds] `Disk`
- REL_10: `Sector` [boundedBy] `Arc` AND `Radius` AND `Radius`
- REL_11: `SegmentArea` [boundedBy] `Arc` AND `Chord`

-----------------------------------------------------------------
3. CONTEXTUAL MAPPINGS (TRIANGLE SIDE <-> CHORD)
-----------------------------------------------------------------
WARNING: Do NOT create a global alias `Triangle Side == Chord`.
CONTEXTUAL RULE: 
IF Triangle vertices (A, B, C) have relation [liesOn] to the same `CircleBoundary`, 
THEN Triangle Side (e.g., segment AB) assumes the structural role of `Chord` for that circle.
INFO_PRESERVED: Topological incidence.
INFO_LOST: Standalone triangle metrics if circle context is removed.

-----------------------------------------------------------------
4. RUNTIME BOUNDARY & DO_NOT_IMPLEMENT
-----------------------------------------------------------------
- DO NOT convert these structural relations into `canonicalPaths.ts` derivation edges.
- DO NOT alter `FactMap` to store object relations as mathematical variables.
- RUNTIME IMPACT: METADATA ONLY. These relations serve as the declarative backbone for future Educational Scenarios (Package 09) and validation pre-checks (Package 05).

-----------------------------------------------------------------
5. ACCEPTANCE CRITERIA
-----------------------------------------------------------------
1. Relations are strictly topological/structural (no metrics, no degrees, no formulas).
2. Side <-> Chord is defined as context-dependent mapping, avoiding global aliasing.
3. No automatic bilateral/inverse edges are forced into the system architecture.
4. Extends PKG-01 seamlessly without duplicating entities.

===== END OF TRANSFER PACKAGE 02 =====
```
