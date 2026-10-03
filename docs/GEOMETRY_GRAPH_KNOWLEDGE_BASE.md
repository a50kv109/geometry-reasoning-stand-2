GEOMETRY_GRAPH_KNOWLEDGE_BASE.md
Document Version: 1.0.0-EXPERIMENTAL
Status: Experimental Engineering Instrument v1.0.0-EXPERIMENTAL
Scope: Independent Engineering Knowledge Base for 2D Geometry Stand Graph Architectures.
0. Purpose
Geometry Graph Knowledge Base — это инженерная система знаний для проектирования, реализации и проверки графовой архитектуры 2D Geometry Stands. Она систематизирует результаты эмпирических симуляций (Triangle V1, CQNS-001, кросс-стендовые тесты и слепые реконструкции), отделяя проверенные архитектурные законы от открытых исследовательских гипотез.
1. Scope
 * Included: 2D interactive geometry, multi-layer graph separation (Construction, Constraint, Knowledge), state mutation propagation, validation cycles, epistemic transitions, and inter-stand semantic mapping via PGS-2D.
 * Excluded: 3D spatial geometry, specific theorem-prover implementations, underlying numeric solver code, UI rendering engines, and domain-specific normalizers (which reside in external profiles).
2. Core Ontology
Geometric Objects
 * Proven Universal: POINT, SEGMENT, LINE, CIRCLE, POLYGON / Polygon(n).
 * Candidate Universal: ANGLE, ARC, RAY.
 * Domain-Specific: CYCLIC_QUADRILATERAL, ZEBRA_ARC.
3. Semantic Question Separation
Каждый слой графа отвечает на строго один фундаментальный вопрос, предотвращая смешивание логики:
 * Construction Graph: "HOW was the object constructed?" (Генеративная топология / DAG).
 * Constraint Graph: "UNDER WHAT CONDITIONS must the configuration exist or remain valid?" (Пространственные инварианты / Сеть).
 * Knowledge Graph: "WHAT IS CURRENTLY KNOWN about the configuration?" (Эпистемическая сеть).
4. Three-Graph Architecture
Монолитный граф со связями в виде плоских массивов parents[] отвергнут. Архитектура требует изоляции трёх подсистем:
 * Construction Graph: Управляет происхождением, цепочками зависимостей, пересчетом и генеративной топологией (DAG).
 * Constraint Graph: Управляет невязками (residuals), выполнением пространственных условий и глобальными симметриями (Network).
 * Knowledge Graph: Управляет официальными утверждениями, свойствами и доказательствами (Epistemic network).
5. Inter-Graph Contracts
Графы связаны через строгие направленные контракты передачи данных:
 * Construction → Constraint: Передает обновленные координаты сущностей и топологические связи. Не вычисляет истинность.
 * Constraint → Knowledge: Передает флаги выполнения условий (SATISFIED / VIOLATED) и числовые невязки (\Delta). Не хранит теоремы.
 * Knowledge → Observation (Passport/UI): Передает готовые эпистемические состояния и метрики для отображения. Не меняет геометрию.
6. Identity Model
 * Rule: Object Identity \neq Representation \neq Runtime Local ID \neq Knowledge Claim Identity.
 * PGS-2D Mapping: Внутренний граф использует неизменяемые portableId в сочетании с semanticType и semanticRole, обеспечивая бесшовную сериализацию в цифровые паспорта без привязки к локальным индексам памяти.
7. State vs Topology
 * Rule: \text{State} \neq \text{Topology}.
 * Обычная мутация состояния (например, перемещение свободной точки) не равна мутации топологии. Изменение координат, измерений, невязок и эпистемических статусов изменяет состояние узла, но не обязано перестраивать генеративную топологию (DAG). Исключение: в точках бифуркации, смены ветвей или сингулярности топологическая перестройка и реконфигурация графа допускаются.
8. Object vs Knowledge Claim
 * Rule: \text{Geometric Object} \neq \text{Statement About Object}.
 * Сущность POINT A физически существует независимо от того, верно ли утверждение о том, что она принадлежит определенной окружности.
9. Epistemic States
Утверждения в Knowledge Graph используют триаду статусов:
 * VERIFIED: Утверждение доказано текущим состоянием геометрии и консистентностью ограничений.
 * REFUTED: Утверждение доказано ложным.
 * VANISHED: Утверждение потеряло основание для проверки (объект существует, но условие его валидности нарушено).
 * Rule: \text{VANISHED} \neq \text{DELETE}. Узел знания не удаляется, а меняет эпистемический тег.
10. VALID → INVALID → VALID
 * Стенд обязан тестироваться не только в статических валидных конфигурациях, но и на всей динамической траектории: VALID → INVALID (Constraint Violation / Vanished Claim) → VALID (Restoration / Re-verification).
11. Layer-Specific Blast Radius
 * Мутация геометрии порождает разные множества затронутых узлов в каждом слое:
   \text{Construction Radius} \neq \text{Constraint Radius} \neq \text{Knowledge Radius}.
 * Оптимизация пересчета обязана учитывать эту независимость.
12. Solution Branch Identity
 * При пересечениях с несколькими корнями (например, прямая и окружность \to I_1, I_2) простая координатная сортировка вызывает перестановку идентичности (branch flipping). Требуются стабильные метки ветвей решения (Solution Branch Provenance).
 * Status: INFERRED.
13. Event / Temporal Semantics
 * Мутации распространяются через упорядоченный событийный контур: GEOMETRY_MUTATION → CONSTRUCTION_UPDATED → CONSTRAINT_EVALUATION → KNOWLEDGE_TRANSITION → OBSERVATION.
 * Status: VERIFIED.
14. Domain Profiles
 * Универсальное ядро графа отделено от специфики предметной области. Доменные правила (например, цикличность или модель «Зебра») инкапсулируются в Domain Profiles / Normalizers, а не встраиваются в core-логику.
15. PGS-2D Relationship
 * PGS-2D выступает в роли межстендового семантического паспорта (переносимое состояние, точные координаты, DAG-провенанс и валидационные метаданные), а не прямой слепок оперативной памяти runtime-графа.
16. Anti-Patterns
 * The Flat Parents Array: Хранение связей в нетипизированном списке parents[].
 * Construction = Constraint: Попытка принудительно выстроить глобальные симметрии в виде дочерних элементов DAG.
 * Constraint = Knowledge: Смешивание пространственных невязок (\epsilon) с математическими доказательствами.
 * Delete Instead of Epistemic Transition: Удаление узла при сбое теоремы вместо перевода в статус VANISHED.
 * Coordinate Sorting as Branch Identity: Использование динамических координат x/y для идентификации пересечений.
17. Engineering Design Procedure
Шаги создания нового стенда:
 * Определить онтологию домена.
 * Выделить геометрические объекты.
 * Описать конструктивные операции.
 * Спроектировать Construction DAG.
 * Выделить пространственные ограничения.
 * Спроектировать Constraint Graph.
 * Определить Knowledge Claims.
 * Спроектировать Knowledge Graph.
 * Зафиксировать схемы идентификации (portableId).
 * Реализовать Inter-Graph Contracts.
 * Настроить контур мутаций.
 * Проверить цикл VALID → INVALID → VALID.
 * Проверить многорешенные конфигурации.
 * Вычислить радиусы поражения.
 * Подключить PGS-2D адаптер.
 * Пройти контрольный чек-лист.
18. Geometry Stand Design Checklist
(Сводный чек-лист)
 * [ ] Онтология объектов, отношений и знаний задокументирована.
 * [ ] Construction Graph является чистым DAG.
 * [ ] Constraint Graph отделен от генеративной топологии.
 * [ ] Knowledge Graph поддерживает статусы VERIFIED, REFUTED, VANISHED.
 * [ ] Межграфовые контракты соблюдают правило одностороннего потока.
 * [ ] Проверен цикл восстановления VALID → INVALID → VALID.
19. Evidence Model
Матрица доказательств (GEOMETRY_GRAPH_EVIDENCE_MATRIX.md) является абсолютным авторитетом статусов (VERIFIED, INFERRED, PROPOSED).
20. Known Knowledge vs Open Knowledge
 * Established (VERIFIED): GGP-01..07, разделение трех графов, эпистемические статусы, неизменность DAG при обычной смене состояния, межграфовые контракты.
 * Open Questions (INFERRED / PROPOSED): Стабильная идентификация ветвей многорешенных пересечений (Solution Branch Identity), оптимальные стратегии кэширования радиусов поражения.
21. ENGINEERING READINESS TEST
 * Required Input: Геометрический субстрат предметной области + данная Knowledge Base.
 * Available Knowledge: Онтологическое разделение, контракты, принципы изоляции графов, циклы валидации.
 * Missing Knowledge: Автоматическое разрешение ветвей пересечений без ручной разметки.
 * Decisions Already Made: Трехслойная структура графов обязательна; плоские массивы запрещены; статусы эпистемических систем отделены от пространственных невязок.
 * Decisions Requiring Experiment: Конкретная схема кэширования для сглаживания анимаций drag-and-drop.
 * Risk of Overgeneralization: Перенос специфических проверок вписанных окружностей CQNS в универсальный конструктивный каркас.
22. Design-from-Knowledge Criteria
Критерии проверки методики при создании нового стенда:
 * Не используется старый код графов.
 * Архитектура собирается строго по Guide + Checklist.
 * Графы Construction, Constraint и Knowledge независимы.
 * Соблюдены межграфовые контракты.
 * Пройден цикл VALID → INVALID → VALID.
# FINAL PRINCIPLES
 * GGP-01 (Ontology First): Определяй сущности и связи до написания алгоритмов пересчета (VERIFIED).
 * GGP-02 (Construction \neq Constraint): Генеративный DAG отделен от пространственных инвариантов (VERIFIED).
 * GGP-03 (Constraint \neq Knowledge): Пространственная невязка не является доказанной теоремой (VERIFIED).
 * GGP-04 (Object \neq Claim): Физический объект существует независимо от валидности знаний о нем (VERIFIED).
 * GGP-05 (State \neq Topology): Мутация координат не перестраивает генеративную топологию (за исключением точек бифуркации и смены ветвей) (VERIFIED).
 * GGP-06 (Isolated Graphs & Contracts): Слои взаимодействуют через явные однонаправленные контракты (VERIFIED).
 * GGP-07 (Reversible Cycle): Система обязана корректно проходить цикл VALID → INVALID → VALID (VERIFIED).
 * Vanishing Property Rule: Потеря основания превращает факт в VANISHED, не удаляя сущность (VERIFIED).
 * Layer-Specific Blast Radius: Радиусы поражения слоев не эквивалентны (VERIFIED).
 * Domain Profile Isolation: Доменные правила инкапсулируются во внешние нормализаторы (VERIFIED).
24. FINAL CONCLUSION
 * A. What is already established? Разделение на три графа, онтологическая база, правила эпистемических статусов и межграфовые контракты.
 * B. What is sufficiently mature for engineering reuse? GGP-01..07, инженерная процедура, дизайн-чек-лист и контракты взаимодействия слоев.
 * C. What remains experimental? Solution Branch Identity и динамические топологические пересходы ветвей.
 * Can the knowledge serve as an engineering instrument? Да. Накопленное знание перешло из фазы эмпирических гипотез в статус экспериментального инженерного инструмента (Experimental Engineering Instrument v1.0.0-EXPERIMENTAL) для проектирования новых 2D Geometry Stands.
