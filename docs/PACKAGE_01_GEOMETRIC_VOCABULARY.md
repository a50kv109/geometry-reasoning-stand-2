# PACKAGE 01: GEOMETRIC VOCABULARY — RESEARCH & TRANSFER SPECIFICATION

**Package ID:** `PKG-01-GEOMETRIC-VOCABULARY`  
**Package Name:** Geometric Vocabulary & Primitive Ontology Extension  
**Version:** 1.0.0  
**Domain:** Geometry Reasoning Stand / Educational Extension  
**Epistemic Status:** `[FACT]` / `[INFERENCE]`  
**Operational Status:** DECLARATIVE SPECIFICATION ONLY (No code changes, no kernel modifications)

---

## 1. Executive Summary & Epistemic Boundary

В рамках архитектурного расширения образовательного модуля *Geometry Reasoning Stand* сформирован изолированный понятийный аппарат геометрических объектов первого уровня (`Level 1: Object/Concept Vocabulary`).

### Фундаментальный разделительный инвариант
$$\text{OBJECT} \neq \text{RELATION} \neq \text{PROPERTY} \neq \text{RULE}$$

- **Entities (Сущности):** Заводят исключительно пространственные примитивы, их размерность и атрибуты.
- **Relations (Отношения):** Вынесены в `Package 02` (`connects`, `passes_through`, `boundary_of`, `bounded_by`).
- **Properties (Свойства):** Вынесены в `Package 03` (равенство радиусов, $D = 2R$, ортогональность касательной).
- **Rules (Правила вывода):** Вынесены в `Package 04` (теорема Фалеса, вписанный угол $90^\circ \leftrightarrow$ диаметр).
- **Derivations (Маршруты):** Вынесены в `Package 07`.

Строгий запрет: Никакие элементы данного пакета не изменяют исполняемый граф `CANONICAL_GRAPH`, `DeterministicNavigator`, `FactMap` или React UI.

---

## 2. Entity Audit (14 базовых понятий)

### 1. Point (Точка)
- **ID:** `ENT_POINT`
- **Canonical Name:** `Point`
- **Russian Name:** Точка
- **Semantic Type:** `PrimitiveEntity` `[FACT]`
- **Definition:** Базовый примитивный объект нулевой размерности, определяющий пространственное положение на евклидовой плоскости `[FACT]`.
- **Dimension:** `0D`
- **Required Attributes:** `id: String`, `coordinates?: (x, y)`

### 2. BoundaryPoint (Точка границы)
- **ID:** `ENT_BOUNDARY_POINT`
- **Canonical Name:** `BoundaryPoint`
- **Russian Name:** Точка границы (точка на окружности)
- **Semantic Type:** `ConstrainedPoint` `[FACT]`
- **Definition:** Точка, строго принадлежащая одномерной границе окружности `CircleBoundary` `[FACT]`.
- **Dimension:** `0D`
- **Required Attributes:** `point_id: String`, `circle_id: String`

### 3. Center (Центр окружности)
- **ID:** `ENT_CENTER`
- **Canonical Name:** `Center`
- **Russian Name:** Центр окружности
- **Semantic Type:** `SpecialPoint` `[FACT]`
- **Definition:** Точка плоскости, равноудаленная от всех точек границы окружности `[FACT]`.
- **Dimension:** `0D`
- **Required Attributes:** `center_id: String`, `circle_id: String`
- **Note:** Не принадлежит самой 1D-границе `CircleBoundary`.

### 4. Line (Прямая)
- **ID:** `ENT_LINE`
- **Canonical Name:** `Line`
- **Russian Name:** Прямая линия
- **Semantic Type:** `UnboundedLinearEntity` `[FACT]`
- **Definition:** Бесконечная одномерная непрерывная совокупность точек на плоскости `[FACT]`.
- **Dimension:** `1D`
- **Required Attributes:** `line_id: String`

### 5. Segment (Отрезок)
- **ID:** `ENT_SEGMENT`
- **Canonical Name:** `Segment`
- **Russian Name:** Отрезок
- **Semantic Type:** `BoundedLinearEntity` `[FACT]`
- **Definition:** Часть прямой линии, ограниченная двумя конечными точками `[FACT]`.
- **Dimension:** `1D`
- **Required Attributes:** `endpoint_A: Point`, `endpoint_B: Point`
- **Allowed Measurements:** `length: ScalarDistance`
- **Disambiguation:** `Segment` — это линейный 1D-отрезок, а НЕ 2D-сегмент круга (`SegmentArea`).

### 6. Radius (Радиус)
- **ID:** `ENT_RADIUS`
- **Canonical Name:** `Radius`
- **Russian Name:** Радиус
- **Semantic Type:** `ConstrainedSegment` `[FACT]`
- **Definition:** Отрезок, соединяющий центр окружности `Center` с любой точкой границы `BoundaryPoint` `[FACT]`.
- **Dimension:** `1D`
- **Required Attributes:** `center: Center`, `boundary_point: BoundaryPoint`
- **Allowed Measurements:** `length: ScalarDistance` ($R$)

### 7. Chord (Хорда)
- **ID:** `ENT_CHORD`
- **Canonical Name:** `Chord`
- **Russian Name:** Хорда
- **Semantic Type:** `ConstrainedSegment` `[FACT]`
- **Definition:** Отрезок, соединяющий две произвольные точки границы окружности `BoundaryPoint` `[FACT]`.
- **Dimension:** `1D`
- **Required Attributes:** `endpoint_A: BoundaryPoint`, `endpoint_B: BoundaryPoint`
- **Allowed Measurements:** `length: ScalarDistance`

### 8. Diameter (Диаметр)
- **ID:** `ENT_DIAMETER`
- **Canonical Name:** `Diameter`
- **Russian Name:** Диаметр
- **Semantic Type:** `SpecializedChord` `[FACT]`
- **Definition:** Хорда окружности, проходящая через ее центр `Center` `[FACT]`.
- **Dimension:** `1D`
- **Required Attributes:** `endpoint_A: BoundaryPoint`, `endpoint_B: BoundaryPoint`, `passes_center: Center`
- **Allowed Measurements:** `length: ScalarDistance`
- **Note:** Связь с хордой — отношение специализации (`is_special_case_of`); равенство $L = 2R$ — метрическое свойство (Package 03).

### 9. CircleBoundary (Окружность / Граница)
- **ID:** `ENT_CIRCLE_BOUNDARY`
- **Canonical Name:** `CircleBoundary`
- **Russian Name:** Окружность (граница)
- **Semantic Type:** `ClosedCurvedBoundary` `[FACT]`
- **Definition:** Однородная замкнутая кривая на плоскости, все точки которой находятся на одинаковом расстоянии $R$ от центра `Center` `[FACT]`.
- **Dimension:** `1D` (замкнутая линия)
- **Required Attributes:** `center: Center`, `radius_value: ScalarDistance`
- **Allowed Measurements:** `circumference: ScalarLength` ($2\pi R$)
- **Disambiguation:** `CircleBoundary` — 1D-линия, а `Disk` — 2D-площадь.

### 10. Disk (Круг / Область)
- **ID:** `ENT_DISK`
- **Canonical Name:** `Disk`
- **Russian Name:** Круг (область)
- **Semantic Type:** `Bounded2DRegion` `[FACT]`
- **Definition:** Двумерная область плоскости, ограниченная окружностью `CircleBoundary` и включающая ее `[FACT]`.
- **Dimension:** `2D` (плоская фигура)
- **Required Attributes:** `boundary: CircleBoundary`
- **Allowed Measurements:** `area: ScalarArea` ($\pi R^2$)

### 11. Arc (Дуга)
- **ID:** `ENT_ARC`
- **Canonical Name:** `Arc`
- **Russian Name:** Дуга окружности
- **Semantic Type:** `OpenCurvedBoundarySegment` `[FACT]`
- **Definition:** Непрерывная часть одномерной границы окружности `CircleBoundary`, заключенная между двумя точками `[FACT]`.
- **Dimension:** `1D` (искривленный отрезок границы)
- **Required Attributes:** `circle: CircleBoundary`, `start_point: BoundaryPoint`, `end_point: BoundaryPoint`
- **Allowed Measurements:**
  - `arc_length: ScalarLength` (линейная длина)
  - `arc_measure: ScalarAngle` (угловая мера в градусах/радианах)

### 12. TangentLine (Касательная прямая)
- **ID:** `ENT_TANGENT_LINE`
- **Canonical Name:** `TangentLine`
- **Russian Name:** Касательная прямая
- **Semantic Type:** `ConstrainedLine` `[FACT]`
- **Definition:** Прямая линия, имеющая с окружностью `CircleBoundary` ровно одну общую точку (точку касания) `[FACT]`.
- **Dimension:** `1D`
- **Required Attributes:** `tangency_point: BoundaryPoint`, `circle: CircleBoundary`

### 13. Sector (Сектор круга)
- **ID:** `ENT_SECTOR`
- **Canonical Name:** `Sector`
- **Russian Name:** Сектор круга
- **Semantic Type:** `SubRegion2D` `[FACT]`
- **Definition:** Часть двумерного круга `Disk`, ограниченная дугой `Arc` и двумя радиусами `Radius`, проведенными к концам этой дуги `[FACT]`.
- **Dimension:** `2D`
- **Required Attributes:** `disk: Disk`, `radius_A: Radius`, `radius_B: Radius`, `arc: Arc`
- **Allowed Measurements:** `area: ScalarArea`, `perimeter: ScalarLength`

### 14. SegmentArea (Сегмент круга)
- **ID:** `ENT_SEGMENT_AREA`
- **Canonical Name:** `SegmentArea`
- **Russian Name:** Сегмент круга (площадной)
- **Semantic Type:** `SubRegion2D` `[FACT]`
- **Definition:** Часть двумерного круга `Disk`, ограниченная хордой `Chord` и стягиваемой ею дугой `Arc` `[FACT]`.
- **Dimension:** `2D`
- **Required Attributes:** `disk: Disk`, `chord: Chord`, `arc: Arc`
- **Allowed Measurements:** `area: ScalarArea`
- **Disambiguation:** `SegmentArea` (2D) $\neq$ `Segment` (1D).

---

## 3. Semantic Hierarchy

```text
GeometricEntity (Abstract Base)
├── PointEntity (Dimension 0)
│   ├── Point (General)
│   ├── BoundaryPoint (Constrained to CircleBoundary)
│   └── Center (Constrained to Circle center)
│
├── LinearEntity (Dimension 1 - Straight)
│   ├── Line (Unbounded)
│   │   └── TangentLine (Single boundary intersection)
│   └── Segment (Bounded)
│       ├── Radius (Center to BoundaryPoint)
│       └── Chord (BoundaryPoint to BoundaryPoint)
│           └── Diameter (Chord passing through Center)
│
├── CurvedBoundaryEntity (Dimension 1 - Curved)
│   └── CircleBoundary (Closed 1D boundary)
│       └── Arc (Sub-segment of CircleBoundary)
│
└── RegionEntity (Dimension 2 - Area)
    └── Disk (Complete 2D circle area)
        ├── Sector (Bounded by Arc + 2 Radii)
        └── SegmentArea (Bounded by Arc + 1 Chord)
```

---

## 4. Codebase Mapping & Compatibility Matrix

| Existing Concept / Fact Key | Package 01 Concept | Mapping Type | Action Required | Status |
|---|---|---|---|---|
| `R` / `radius` | `Radius` | Direct Match | `KEEP EXISTING` | `[FACT]` |
| `side_a`, `side_b`, `side_c` | `Chord` | Semantic Extension | `MAP TO EXISTING` | `[FACT]` |
| `chord_BC`, `chord_length` | `Chord` | Direct Alias | `MAP TO EXISTING` | `[FACT]` |
| `triangle_area` ($K$) | `Disk` / `SegmentArea` | Regional Context | `EXTEND EXISTING` | `[RESULT]` |
| `normalized_area_fraction` ($F$) | `Disk` | Reference Area ($\pi R^2$) | `KEEP EXISTING` | `[FACT]` |
| `equivalent_arc_angle` | `Arc` (`ArcMeasure`) | Measurement Property | `MAP TO EXISTING` | `[FACT]` |
| *Implicit Diameter* ($2R$) | `Diameter` | Explicit Entity | `EXTEND EXISTING` | `[INFERENCE]` |
| `Point`, `Center`, `BoundaryPoint` | Primitives | Structural Primitives | `DECLARATIVE ONLY` | `[INFERENCE]` |
| `CircleBoundary` | 1D Boundary | Boundary Primitive | `DECLARATIVE ONLY` | `[INFERENCE]` |
| `Disk` | 2D Region | Region Primitive | `DECLARATIVE ONLY` | `[INFERENCE]` |
| `TangentLine` | Tangent Line | Line Primitive | `DEFER` | `[INFERENCE]` |
| `Sector`, `SegmentArea` | 2D Sub-regions | Regional Sub-types | `DEFER` | `[INFERENCE]` |

---

## 5. Architectural Non-Interference Guarantees

1. **Zero Code Changes:** No modifications to `src/kernel/canonicalPaths.ts`, `src/kernel/navigator.ts`, `src/types.ts` or `src/environment/`.
2. **Zero Invalidation of Tests:** The 105/105 test suite remains in full passing status.
3. **No Key-Explosion Risk:** Vocabulary entities are not injected into `FactMap` or graph traversal nodes; they exist purely as level-1 ontological definitions.
