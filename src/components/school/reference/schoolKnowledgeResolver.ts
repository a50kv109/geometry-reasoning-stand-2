// src/components/school/reference/schoolKnowledgeResolver.ts
// Pure Educational Knowledge Resolver for Contextual School Reference
// Invariant: Deterministic mapping from Verified Facts -> Derived Classification -> Explanation Payload

import { FullGeometryState } from '../../../engines/geometryState';
import { extractVerifiedFacts } from './schoolFactExtractor';
import {
  VerifiedGeometryFacts,
  DerivedEntityClassification,
  ContextualExplanationPayload,
} from './schoolKnowledgeTypes';

/**
 * Derives exact geometric classification based strictly on verified facts.
 * Never infers classification purely from entity.type.
 */
export function deriveClassification(facts: VerifiedGeometryFacts): DerivedEntityClassification {
  switch (facts.entityType) {
    case 'circle': {
      if (facts.isBaseCircumcircle) {
        return 'BASE_CIRCUMCIRCLE';
      }
      return 'AUXILIARY_CIRCLE';
    }

    case 'point': {
      if (facts.isCenter) {
        return 'CIRCUMCENTER';
      }
      if (facts.isBaseVertex) {
        return 'BASE_VERTEX';
      }
      if (facts.role === 'auxiliary') {
        return 'AUXILIARY_CONSTRUCTION_POINT';
      }
      if (facts.isPointOnCircle) {
        return 'POINT_ON_CIRCLE';
      }
      return 'FREE_POINT';
    }

    case 'segment': {
      if (facts.isDiameter) {
        return 'DIAMETER';
      }
      if (facts.isBaseChord) {
        return 'BASE_CHORD';
      }
      return 'FREE_SEGMENT';
    }

    case 'line': {
      if (facts.provenance?.macroType === 'perpendicular_bisector') {
        return 'PERPENDICULAR_BISECTOR';
      }
      if (facts.provenance?.macroType === 'angle_bisector') {
        return 'ANGLE_BISECTOR';
      }
      if (facts.provenance?.macroType === 'perpendicular') {
        return 'PERPENDICULAR_LINE';
      }
      if (facts.provenance?.macroType === 'parallel') {
        return 'PARALLEL_LINE';
      }
      if (facts.circleIntersectionCount === 2) {
        return 'SECANT_LINE';
      }
      // Note: Tangent is intentionally OUT OF MVP as the core does not generate tangent facts
      return 'GENERAL_LINE';
    }
  }
}

/**
 * Resolves full pedagogical explanation payload for a given entity in GeometryState.
 * Completely pure, deterministic, side-effect free.
 */
export function resolveSchoolContext(
  entityId: string,
  state: FullGeometryState,
  scale: number = 1.0
): ContextualExplanationPayload | null {
  const facts = extractVerifiedFacts(entityId, state);
  if (!facts) return null;

  const classification = deriveClassification(facts);

  // Derive human-readable entity name
  let entityName = entityId;
  if (state.points[entityId]) {
    entityName = `Точка ${state.points[entityId].name}`;
  } else if (state.segments[entityId]) {
    const s = state.segments[entityId];
    const p1Name = state.points[s.p1Id]?.name || s.p1Id;
    const p2Name = state.points[s.p2Id]?.name || s.p2Id;
    entityName = `Отрезок ${p1Name}${p2Name}`;
  } else if (state.lines[entityId]) {
    const l = state.lines[entityId];
    const p1Name = state.points[l.p1Id]?.name || l.p1Id;
    const p2Name = state.points[l.p2Id]?.name || l.p2Id;
    entityName = `Прямая (${p1Name}, ${p2Name})`;
  } else if (state.circles[entityId]) {
    const c = state.circles[entityId];
    entityName = c.isBaseCircumcircle ? 'Описанная окружность ω' : `Окружность (${c.centerId})`;
  }

  // Construct Level 1, 2, 3, 4 based on derived classification
  switch (classification) {
    case 'BASE_CIRCUMCIRCLE': {
      const radiusMm = ((facts.circleRadius ?? state.R) * scale).toFixed(1);
      const diameterMm = ((facts.circleRadius ?? state.R) * 2 * scale).toFixed(1);
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Базовая фигура', variant: 'base' },
        level1_identification: {
          title: 'Описанная окружность треугольника',
          definition: 'Окружность, проходящая через все три вершины треугольника (A, B, C).',
        },
        level2_properties: {
          items: [
            `Радиус окружности: R = ${radiusMm} мм`,
            `Диаметр окружности: d = 2R = ${diameterMm} мм`,
            'Центр O равноудалён от всех трёх вершин треугольника (OA = OB = OC = R).',
            'Окружность делит плоскость на внутреннюю и внешнюю области.',
          ],
        },
        level3_provenance: {
          hasProvenance: false,
          role: 'base',
          description: 'Базовый опорный объект чертежа. Центр зафиксирован в начале координат (0, 0).',
        },
        level4_theorem: {
          name: 'Длина окружности и площадь круга',
          statement: 'Длина окружности пропорциональна её радиусу, а площадь — квадрату радиуса.',
          formula: 'L = 2πR,  S = πR²',
        },
      };
    }

    case 'AUXILIARY_CIRCLE': {
      const radiusMm = ((facts.circleRadius ?? 0) * scale).toFixed(1);
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Вспомогательная окружность', variant: 'auxiliary' },
        level1_identification: {
          title: 'Построенная окружность (засечка циркуля)',
          definition: 'Геометрическое место точек плоскости, равноудалённых от заданного центра.',
        },
        level2_properties: {
          items: [
            `Центр окружности: точка ${facts.circleCenterId || 'O'}`,
            `Радиус окружности: R = ${radiusMm} мм`,
            'Все точки окружности удалены от центра ровно на длину заданного радиуса.',
          ],
        },
        level3_provenance: {
          hasProvenance: Boolean(facts.provenance),
          role: facts.role || 'auxiliary',
          macroType: facts.provenance?.macroType,
          description: facts.provenance
            ? `Построена циркулем в составе инструмента «${getMacroRussianName(facts.provenance.macroType)}».`
            : 'Построена пользователем с помощью инструмента «Циркуль».',
        },
        level4_theorem: {
          name: 'Постулат 3 Евклида',
          statement: 'Из всякого центра и всяким раствором циркуля может быть описан круг.',
          formula: '(x - x₀)² + (y - y₀)² = R²',
        },
      };
    }

    case 'CIRCUMCENTER': {
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Центр окружности', variant: 'primary' },
        level1_identification: {
          title: 'Центр описанной окружности (Точка O)',
          definition: 'Точка плоскости, равноудалённая от всех точек описанной окружности.',
        },
        level2_properties: {
          items: [
            'Координаты центра: (0, 0) мм (начало координат).',
            'Расстояние от центра O до любой вершины A, B, C строго равно радиусу R.',
            'Точка пересечения серединных перпендикуляров всех сторон треугольника.',
          ],
        },
        level3_provenance: {
          hasProvenance: false,
          role: 'base',
          description: 'Базовый геометрический центр стенда.',
        },
        level4_theorem: {
          name: 'Теорема о центре описанной окружности',
          statement: 'Серединные перпендикуляры к сторонам треугольника пересекаются в одной точке — центре описанной окружности.',
          formula: 'OA = OB = OC = R',
        },
      };
    }

    case 'BASE_VERTEX': {
      const pt = state.points[entityId];
      const name = pt?.name || entityId;
      const angle = facts.angleDeg !== undefined ? `${facts.angleDeg.toFixed(1)}°` : undefined;
      const properties = [
        `Лежит на описанной окружности (расстояние до O = ${((state.R) * scale).toFixed(1)} мм).`,
        `Координаты на плоскости: (${((pt?.x ?? 0) * scale).toFixed(1)}, ${((pt?.y ?? 0) * scale).toFixed(1)}) мм.`,
        'Является вершиной треугольника ABC и может свободно перемещаться по окружности.',
      ];

      let theoremInfo: { name: string; statement: string; formula?: string } | undefined = undefined;

      if (facts.subtendsDiameter && facts.isRightAngle) {
        properties.push('Вписанный угол при этой вершине опирается на диаметр окружности и равен ровно 90°.');
        theoremInfo = {
          name: 'Теорема Фалеса о прямом вписанном угле',
          statement: 'Вписанный угол, опирающийся на диаметр окружности, является прямым.',
          formula: `∠${name} = 90°  (дуга = 180°)`,
        };
      } else {
        theoremInfo = {
          name: 'Теорема о вписанном угле',
          statement: 'Вписанный угол равен половине центрального угла, опирающегося на ту же дугу.',
          formula: '∠вписанный = 1/2 · ∠центральный',
        };
      }

      return {
        entityId,
        entityName,
        classification,
        badge: {
          label: facts.isRightAngle ? 'Прямой угол (Фалес)' : 'Вершина треугольника',
          variant: facts.isRightAngle ? 'theorem' : 'primary',
        },
        level1_identification: {
          title: `Вершина треугольника ${name}`,
          definition: 'Базовая точка на окружности, образующая стороны и углы треугольника ABC.',
        },
        level2_properties: {
          items: properties,
        },
        level3_provenance: {
          hasProvenance: false,
          role: 'base',
          description: 'Базовая вершина треугольника. Захватывается и перемещается мышью.',
        },
        level4_theorem: theoremInfo,
      };
    }

    case 'POINT_ON_CIRCLE': {
      const pt = state.points[entityId];
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Точка на окружности', variant: 'primary' },
        level1_identification: {
          title: `Точка ${pt?.name || entityId} на окружности`,
          definition: 'Точка плоскости, принадлежащая базовой описанной окружности.',
        },
        level2_properties: {
          items: [
            `Расстояние до центра O равно радиусу: R = ${(state.R * scale).toFixed(1)} мм.`,
            `Координаты: (${((pt?.x ?? 0) * scale).toFixed(1)}, ${((pt?.y ?? 0) * scale).toFixed(1)}) мм.`,
            'Любой отрезок от центра O до этой точки является радиусом окружности.',
          ],
        },
        level3_provenance: {
          hasProvenance: Boolean(facts.provenance),
          role: facts.role || 'primary',
          macroType: facts.provenance?.macroType,
          description: facts.provenance
            ? `Создана макросом «${getMacroRussianName(facts.provenance.macroType)}».`
            : 'Поставлена пользователем с привязкой к описанной окружности (snap-to-circle).',
        },
        level4_theorem: {
          name: 'Уравнение окружности',
          statement: 'Все точки окружности удовлетворяют каноническому уравнению расстояния до центра.',
          formula: 'x² + y² = R²',
        },
      };
    }

    case 'AUXILIARY_CONSTRUCTION_POINT': {
      const pt = state.points[entityId];
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Вспомогательная точка', variant: 'auxiliary' },
        level1_identification: {
          title: `Вспомогательная точка ${pt?.name || entityId}`,
          definition: 'Промежуточная точка пересечения или засечки циркуля, использованная в ходе геометрического построения.',
        },
        level2_properties: {
          items: [
            `Координаты: (${((pt?.x ?? 0) * scale).toFixed(1)}, ${((pt?.y ?? 0) * scale).toFixed(1)}) мм.`,
            'Является результатом пересечения вспомогательных окружностей или прямых.',
            'При удалении исходных базовых точек удаляется автоматически (каскадное свойство).',
          ],
        },
        level3_provenance: {
          hasProvenance: Boolean(facts.provenance),
          role: 'auxiliary',
          macroType: facts.provenance?.macroType,
          description: facts.provenance
            ? `Построена автоматически как шаг макроса «${getMacroRussianName(facts.provenance.macroType)}».`
            : 'Вспомогательный след конструктивного построения.',
        },
      };
    }

    case 'FREE_POINT': {
      const pt = state.points[entityId];
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Точка плоскости', variant: 'primary' },
        level1_identification: {
          title: `Свободная точка ${pt?.name || entityId}`,
          definition: 'Точка евклидовой плоскости, не связанная геометрическими ограничениями.',
        },
        level2_properties: {
          items: [
            `Координаты: (${((pt?.x ?? 0) * scale).toFixed(1)}, ${((pt?.y ?? 0) * scale).toFixed(1)}) мм.`,
            `Расстояние до центра O: ${(Math.hypot(pt?.x ?? 0, pt?.y ?? 0) * scale).toFixed(1)} мм.`,
            'Может свободно перемещаться в любую точку чертежа.',
          ],
        },
        level3_provenance: {
          hasProvenance: false,
          role: 'primary',
          description: 'Создана пользователем с помощью инструмента «Точка».',
        },
      };
    }

    case 'DIAMETER': {
      const lenMm = ((facts.segmentLength ?? state.R * 2) * scale).toFixed(1);
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Диаметр (d = 2R)', variant: 'theorem' },
        level1_identification: {
          title: 'Диаметр окружности',
          definition: 'Диаметр — хорда, проходящая через центр окружности.',
        },
        level2_properties: {
          items: [
            `Длина диаметра: d = ${lenMm} мм (ровно 2R).`,
            'Диаметр делит окружность на две равные дуги по 180°.',
            'Диаметр является наибольшей хордой окружности.',
            'Проходит строго через центр окружности O(0, 0).',
          ],
        },
        level3_provenance: {
          hasProvenance: Boolean(facts.provenance),
          role: 'base',
          description: 'Базовая хорда окружности, совмещённая с диаметром.',
        },
        level4_theorem: {
          name: 'Свойства диаметра',
          statement: 'Диаметр вдвое больше радиуса и делит круг и окружность на две равные симметричные половины.',
          formula: 'd = 2R,   дуга₁ = дуга₂ = 180°',
        },
      };
    }

    case 'BASE_CHORD': {
      const lenMm = ((facts.segmentLength ?? 0) * scale).toFixed(1);
      const arcDeg = facts.subtendedArcDeg !== undefined ? `${facts.subtendedArcDeg.toFixed(1)}°` : '';
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Хорда окружности', variant: 'primary' },
        level1_identification: {
          title: 'Хорда окружности (сторона треугольника)',
          definition: 'Отрезок, соединяющий две точки окружности.',
        },
        level2_properties: {
          items: [
            `Длина хорды: L = ${lenMm} мм.`,
            arcDeg ? `Стягивает дугу окружности: ${arcDeg}.` : 'Стягивает соответствующую дугу окружности.',
            'Концы отрезка лежат на описанной окружности.',
          ],
        },
        level3_provenance: {
          hasProvenance: false,
          role: 'base',
          description: 'Базовая сторона треугольника ABC на описанной окружности.',
        },
        level4_theorem: {
          name: 'Теорема о хорде и центральном угле',
          statement: 'Длина хорды вычисляется через радиус окружности и синус половины стягиваемого центрального угла.',
          formula: 'a = 2R · sin(α / 2)',
        },
      };
    }

    case 'FREE_SEGMENT': {
      const lenMm = ((facts.segmentLength ?? 0) * scale).toFixed(1);
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Отрезок', variant: 'primary' },
        level1_identification: {
          title: 'Прямолинейный отрезок',
          definition: 'Часть прямой линии, ограниченная двумя точками (концами отрезка).',
        },
        level2_properties: {
          items: [
            `Длина отрезка: L = ${lenMm} мм.`,
            `Соединяет точки ${facts.segmentEndpoints?.p1Id} и ${facts.segmentEndpoints?.p2Id}.`,
            'Кратчайшее расстояние между своими концами на евклидовой плоскости.',
          ],
        },
        level3_provenance: {
          hasProvenance: Boolean(facts.provenance),
          role: facts.role || 'primary',
          macroType: facts.provenance?.macroType,
          description: facts.provenance
            ? `Построен макросом «${getMacroRussianName(facts.provenance.macroType)}».`
            : 'Построен пользователем с помощью инструмента «Отрезок».',
        },
        level4_theorem: {
          name: 'Аксиома отрезка (Постулат 1 Евклида)',
          statement: 'От всякой точки до всякой другой точки можно провести единственный прямолинейный отрезок.',
          formula: 'L = √((x₂ - x₁)² + (y₂ - y₁)²)',
        },
      };
    }

    case 'PERPENDICULAR_BISECTOR': {
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Серединный перпендикуляр', variant: 'theorem' },
        level1_identification: {
          title: 'Серединный перпендикуляр к отрезку',
          definition: 'Прямая, перпендикулярная отрезку и проходящая через его середину.',
        },
        level2_properties: {
          items: [
            'Делит базовый отрезок на две равные части.',
            'Образует прямой угол (90°) с исходным отрезком.',
            'Геометрическое место точек: каждая точка этой прямой равноудалена от концов отрезка.',
          ],
        },
        level3_provenance: {
          hasProvenance: true,
          role: 'primary',
          macroType: 'perpendicular_bisector',
          description: 'Построено классическим циркульным макросом через пересечение двух равных окружностей засечек.',
        },
        level4_theorem: {
          name: 'Теорема о серединном перпендикуляре',
          statement: 'Каждая точка серединного перпендикуляра к отрезку равноудалена от его концов.',
          formula: 'PA = PB  (для любой точки P на прямой)',
        },
      };
    }

    case 'ANGLE_BISECTOR': {
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Биссектриса угла', variant: 'theorem' },
        level1_identification: {
          title: 'Биссектриса угла',
          definition: 'Луч или прямая, выходящая из вершины угла и делящая его на два равных угла.',
        },
        level2_properties: {
          items: [
            'Делит исходный угол на две равные половины: ∠₁ = ∠₂ = ∠ / 2.',
            'Геометрическое место точек: каждая точка биссектрисы равноудалена от сторон угла.',
          ],
        },
        level3_provenance: {
          hasProvenance: true,
          role: 'primary',
          macroType: 'angle_bisector',
          description: 'Построено циркульным методом засечек: дуга из вершины + равные окружности из точек засечек.',
        },
        level4_theorem: {
          name: 'Теорема о биссектрисе угла',
          statement: 'Каждая точка биссектрисы угла равноудалена от прямых, содержащих стороны этого угла.',
          formula: 'd(P, a) = d(P, b)  (для любой точки P на луче)',
        },
      };
    }

    case 'PERPENDICULAR_LINE': {
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Перпендикулярная прямая', variant: 'theorem' },
        level1_identification: {
          title: 'Перпендикуляр к прямой через точку',
          definition: 'Прямая, пересекающая данную прямую под прямым углом (90°).',
        },
        level2_properties: {
          items: [
            'Угол между прямыми строго равен 90°.',
            'Кратчайшее расстояние от точки до прямой измеряется по перпендикуляру.',
          ],
        },
        level3_provenance: {
          hasProvenance: true,
          role: 'primary',
          macroType: 'perpendicular',
          description: 'Построено классическим методом циркуля и линейки через симметричные засечки.',
        },
        level4_theorem: {
          name: 'Теорема о единственности перпендикуляра',
          statement: 'Через любую точку плоскости можно провести единственную прямую, перпендикулярную данной.',
          formula: 'a ⟂ b  ⟺  ∠(a, b) = 90°',
        },
      };
    }

    case 'PARALLEL_LINE': {
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Параллельная прямая', variant: 'theorem' },
        level1_identification: {
          title: 'Параллельная прямая через точку',
          definition: 'Две прямые на плоскости называются параллельными, если они не пересекаются, сколько бы их ни продолжали.',
        },
        level2_properties: {
          items: [
            'Не имеет общих точек с исходной прямой на всей бесконечной плоскости.',
            'Расстояние между параллельными прямыми постоянно в любой точке.',
            'Накрест лежащие и соответственные углы при секущей равны.',
          ],
        },
        level3_provenance: {
          hasProvenance: true,
          role: 'primary',
          macroType: 'parallel',
          description: 'Построено методом ромба: дуга радиуса R из точки P + перенос расстояния засечкой.',
        },
        level4_theorem: {
          name: 'Аксиома параллельности Евклида',
          statement: 'Через точку, не лежащую на данной прямой, проходит не более одной прямой, параллельной данной.',
          formula: 'a ∥ b  ⟺  a ∩ b = ∅',
        },
      };
    }

    case 'SECANT_LINE': {
      return {
        entityId,
        entityName,
        classification,
        badge: { label: 'Секущая прямая', variant: 'primary' },
        level1_identification: {
          title: 'Секущая прямой к окружности',
          definition: 'Прямая линия, пересекающая окружность ровно в двух различных точках.',
        },
        level2_properties: {
          items: [
            'Имеет ровно 2 точки пересечения с базовой описанной окружностью.',
            `Расстояние от центра O до прямой меньше радиуса R (${((facts.distanceToCenter ?? 0) * scale).toFixed(1)} < ${(state.R * scale).toFixed(1)} мм).`,
            'Отрезок секущей, заключённый внутри окружности, является хордой.',
          ],
        },
        level3_provenance: {
          hasProvenance: Boolean(facts.provenance),
          role: facts.role || 'primary',
          macroType: facts.provenance?.macroType,
          description: facts.provenance
            ? `Построена макросом «${getMacroRussianName(facts.provenance.macroType)}».`
            : 'Построена пользователем через две выбранные точки.',
        },
        level4_theorem: {
          name: 'Теорема о секущих',
          statement: 'Если через точку проведены две секущие к окружности, то произведение отрезков одной секущей равно произведению отрезков другой.',
          formula: 'PA · PB = PC · PD',
        },
      };
    }

    case 'GENERAL_LINE':
    default: {
      return {
        entityId,
        entityName,
        classification: 'GENERAL_LINE',
        badge: { label: 'Прямая', variant: 'primary' },
        level1_identification: {
          title: 'Прямая линия на плоскости',
          definition: 'Бесконечная геометрическая линия, не имеющая кривизны и толщины.',
        },
        level2_properties: {
          items: [
            `Проходит через точки ${facts.lineEndpoints?.p1Id} и ${facts.lineEndpoints?.p2Id}.`,
            'Продолжается бесконечно в обоих направлениях.',
            'Любые две различные точки однозначно задают положение прямой на плоскости.',
          ],
        },
        level3_provenance: {
          hasProvenance: Boolean(facts.provenance),
          role: facts.role || 'primary',
          macroType: facts.provenance?.macroType,
          description: facts.provenance
            ? `Построена макросом «${getMacroRussianName(facts.provenance.macroType)}».`
            : 'Построена пользователем с помощью инструмента «Прямая».',
        },
        level4_theorem: {
          name: 'Аксиома прямой линии',
          statement: 'Через любые две различные точки плоскости проходит единственная прямая линия.',
          formula: 'Ax + By + C = 0',
        },
      };
    }
  }
}

function getMacroRussianName(macroType?: string): string {
  switch (macroType) {
    case 'perpendicular_bisector':
      return 'Серединный перпендикуляр';
    case 'angle_bisector':
      return 'Биссектриса угла';
    case 'perpendicular':
      return 'Перпендикуляр к прямой';
    case 'parallel':
      return 'Параллельная прямая';
    default:
      return 'Геометрическое построение';
  }
}
