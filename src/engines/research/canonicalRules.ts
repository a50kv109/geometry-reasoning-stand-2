// src/engines/research/canonicalRules.ts
// Canonical Axiom & Rule Base with Deterministic Precondition Evaluators for Packet #6.
// Pure, deterministic functions: Zero side-effects, zero mutations to GeometryState.
// Fundamental Principle:
// "Topology and provenance provide evidence for verification;
// proof requires a verified rule/axiom whose preconditions are deterministically satisfied."

import { FullGeometryState } from '../constructionCore';
import { computeGeometryBase } from '../geometryState';
import { ConstructionTrace } from './researchTypes';
import {
  RelationSignature,
  PreconditionCheckRecord,
  ProvenanceAssistance,
} from './researchGraphTypes';

const EPSILON = 1e-4;
const METRIC_TOL = 0.5;

export interface CanonicalRuleDefinition {
  readonly id: string;
  readonly signature: RelationSignature;
  readonly name: string;
  readonly formula: string;
  readonly formalStatement: string;
  readonly mathematicalDomain: string;
  readonly requiredPreconditions: Array<{
    readonly id: string;
    readonly description: string;
  }>;
  readonly evaluatePreconditions: (
    state: FullGeometryState,
    targetKey?: string,
    trace?: ConstructionTrace
  ) => {
    readonly records: PreconditionCheckRecord[];
    readonly allSatisfied: boolean;
    readonly provenanceAssistance: ProvenanceAssistance;
  };
}

/**
 * 1. Inscribed Angle Theorem Rule (alpha = theta / 2)
 */
export const RULE_INSCRIBED_ANGLE: CanonicalRuleDefinition = {
  id: 'RULE-INSCRIBED-ANGLE',
  signature: 'INSCRIBED_CENTRAL_ANGLE_RATIO',
  name: 'Теорема о вписанном угле',
  formula: 'α = θ / 2',
  formalStatement:
    'Вписанный угол равен половине центрального угла, опирающегося на ту же дугу окружности.',
  mathematicalDomain: 'Планиметрия (Геометрия окружности)',
  requiredPreconditions: [
    {
      id: 'CENTER_IS_O',
      description: 'Центр окружности O(0,0) зафиксирован с радиусом R > 0',
    },
    {
      id: 'POINTS_ON_CIRCLE',
      description: 'Вершины A, B, C строго лежат на границе описанной окружности (dist(P, O) = R)',
    },
    {
      id: 'COMMON_SUBTENDED_ARC',
      description: 'Центральный угол ∠AOB и вписанный угол ∠ACB опираются на одну и ту же дугу AB',
    },
    {
      id: 'NON_DEGENERATE_TRIANGLE',
      description: 'Вершины A, B, C попарно различны (треугольник невырожден)',
    },
  ],
  evaluatePreconditions: (state, _targetKey, trace) => {
    const records: PreconditionCheckRecord[] = [];
    const R = state.R;

    // 1. Check center
    const centerValid = R > 0;
    records.push({
      preconditionId: 'CENTER_IS_O',
      description: 'Центр окружности O(0,0) зафиксирован с радиусом R > 0',
      satisfied: centerValid,
      evidence: centerValid ? `R = ${R.toFixed(1)} px > 0` : 'Некорректный радиус окружности',
      measuredValue: R,
      requiredCondition: 'R > 0',
    });

    // 2. Check points on circle
    const pA = state.points['pt_A'] || state.points['A'];
    const pB = state.points['pt_B'] || state.points['B'];
    const pC = state.points['pt_C'] || state.points['C'];

    let pointsOnCircle = false;
    if (pA && pB && pC) {
      const distA = Math.hypot(pA.x, pA.y);
      const distB = Math.hypot(pB.x, pB.y);
      const distC = Math.hypot(pC.x, pC.y);
      const devA = Math.abs(distA - R);
      const devB = Math.abs(distB - R);
      const devC = Math.abs(distC - R);
      pointsOnCircle = devA < METRIC_TOL && devB < METRIC_TOL && devC < METRIC_TOL;

      records.push({
        preconditionId: 'POINTS_ON_CIRCLE',
        description: 'Вершины A, B, C строго лежат на границе описанной окружности (dist(P, O) = R)',
        satisfied: pointsOnCircle,
        evidence: pointsOnCircle
          ? `Отклонения от окружности: A=${devA.toFixed(2)}px, B=${devB.toFixed(2)}px, C=${devC.toFixed(2)}px (все < ${METRIC_TOL}px)`
          : `Точки не на окружности: max_dev=${Math.max(devA, devB, devC).toFixed(2)}px`,
        measuredValue: Math.max(devA, devB, devC),
        requiredCondition: `max_dev < ${METRIC_TOL}`,
      });
    } else {
      records.push({
        preconditionId: 'POINTS_ON_CIRCLE',
        description: 'Вершины A, B, C строго лежат на границе описанной окружности',
        satisfied: false,
        evidence: 'Не найдены базовые точки A, B, C в GeometryState',
        requiredCondition: 'Точки A, B, C определены',
      });
    }

    // 3. Check common subtended arc
    const uA = state.pointsU.A;
    const uB = state.pointsU.B;
    const uC = state.pointsU.C;
    const commonArcValid = uA !== undefined && uB !== undefined && uC !== undefined;
    records.push({
      preconditionId: 'COMMON_SUBTENDED_ARC',
      description: 'Центральный угол ∠AOB и вписанный угол ∠ACB опираются на одну и ту же дугу AB',
      satisfied: commonArcValid,
      evidence: commonArcValid
        ? `Циклические координаты u_A=${uA?.toFixed(2)}, u_B=${uB?.toFixed(2)}, u_C=${uC?.toFixed(2)} задают однозначную дугу`
        : 'Координаты дуг не определены',
      requiredCondition: 'Координаты u определены',
    });

    // 4. Non-degenerate triangle
    const nonDegenerate =
      Math.abs(uA - uB) > 0.01 && Math.abs(uB - uC) > 0.01 && Math.abs(uC - uA) > 0.01;
    records.push({
      preconditionId: 'NON_DEGENERATE_TRIANGLE',
      description: 'Вершины A, B, C попарно различны (треугольник невырожден)',
      satisfied: nonDegenerate,
      evidence: nonDegenerate
        ? 'Вершины A, B, C не совпадают'
        : 'Вырожденная конфигурация: вершины совпадают',
      requiredCondition: 'Точки попарно различны',
    });

    // Provenance assistance note
    const provenanceAssistance: ProvenanceAssistance = {
      entityId: 'angle_ACB',
      topologicalRole: 'INSCRIBED_TRIANGLE_VERTEX',
      guidanceNote: trace?.groups.some((g) => g.macroType === 'circumcircle')
        ? 'Провенанс: Окружность построена макросом circumcircle. Провенанс направляет проверку условий принадлежности точек.'
        : 'Провенанс: Базовая окружность определена в GeometryState.',
    };

    const allSatisfied = records.every((r) => r.satisfied);
    return { records, allSatisfied, provenanceAssistance };
  },
};

/**
 * 2. Cyclic Chord Metric Law Rule (c = 2R * sin(theta / 2))
 */
export const RULE_CYCLIC_CHORD_LAW: CanonicalRuleDefinition = {
  id: 'RULE-CYCLIC-CHORD-LAW',
  signature: 'CYCLIC_CHORD_METRIC_LAW',
  name: 'Метрический закон хорды окружности',
  formula: 'c(θ) = 2R · sin(θ / 2)',
  formalStatement:
    'Длина хорды окружности радиуса R, стягивающей центральный угол θ, строго равна 2R·sin(θ/2).',
  mathematicalDomain: 'Тригонометрическая метрическая геометрия',
  requiredPreconditions: [
    {
      id: 'CIRCUMCIRCLE_DEFINED',
      description: 'Окружность с центром O(0,0) и радиусом R > 0 определена',
    },
    {
      id: 'CHORD_ENDPOINTS_ON_CIRCLE',
      description: 'Концы хорды P1 и P2 строго лежат на окружности',
    },
    {
      id: 'SUBTENDS_CENTRAL_ANGLE',
      description: 'Центральный угол θ равен углу между векторами OP1 и OP2 в [0, π]',
    },
    {
      id: 'EUCLIDEAN_METRIC',
      description: 'Метрика расстояния является евклидовой: dist(P1, P2) = √((x1-x2)² + (y1-y2)²)',
    },
  ],
  evaluatePreconditions: (state, targetKey = 'AB', trace) => {
    const records: PreconditionCheckRecord[] = [];
    const R = state.R;

    // 1. Circle defined
    const circleValid = R > 0;
    records.push({
      preconditionId: 'CIRCUMCIRCLE_DEFINED',
      description: 'Окружность с центром O(0,0) и радиусом R > 0 определена',
      satisfied: circleValid,
      evidence: circleValid ? `R = ${R.toFixed(1)} px` : 'Радиус окружности <= 0',
      measuredValue: R,
      requiredCondition: 'R > 0',
    });

    // 2. Endpoints on circle
    const p1Name = targetKey.charAt(0) || 'A';
    const p2Name = targetKey.charAt(1) || 'B';
    const p1 = state.points[`pt_${p1Name}`] || state.points[p1Name];
    const p2 = state.points[`pt_${p2Name}`] || state.points[p2Name];

    let endpointsValid = false;
    if (p1 && p2) {
      const d1 = Math.hypot(p1.x, p1.y);
      const d2 = Math.hypot(p2.x, p2.y);
      const dev1 = Math.abs(d1 - R);
      const dev2 = Math.abs(d2 - R);
      endpointsValid = dev1 < METRIC_TOL && dev2 < METRIC_TOL;

      records.push({
        preconditionId: 'CHORD_ENDPOINTS_ON_CIRCLE',
        description: `Концы хорды [${p1Name}${p2Name}] строго лежат на окружности`,
        satisfied: endpointsValid,
        evidence: endpointsValid
          ? `Отклонения: ${p1Name}=${dev1.toFixed(2)}px, ${p2Name}=${dev2.toFixed(2)}px (оба < ${METRIC_TOL}px)`
          : `Точки не на окружности: max_dev=${Math.max(dev1, dev2).toFixed(2)}px`,
        measuredValue: Math.max(dev1, dev2),
        requiredCondition: `max_dev < ${METRIC_TOL}`,
      });
    } else {
      records.push({
        preconditionId: 'CHORD_ENDPOINTS_ON_CIRCLE',
        description: `Концы хорды [${p1Name}${p2Name}] строго лежат на окружности`,
        satisfied: false,
        evidence: `Концевые точки [${p1Name}, ${p2Name}] не найдены в состоянии`,
        requiredCondition: 'Точки определены',
      });
    }

    // 3. Subtends central angle
    const geoBase = computeGeometryBase(state.pointsU, state.R);
    const arcKey = (targetKey.length === 2 ? targetKey : 'AB') as 'AB' | 'BC' | 'CA';
    const centralAngleDeg = geoBase.arcs[arcKey]?.deg ?? 60;
    records.push({
      preconditionId: 'SUBTENDS_CENTRAL_ANGLE',
      description: 'Центральный угол θ задан корректно в диапазоне [0°, 180°]',
      satisfied: centralAngleDeg > 0 && centralAngleDeg <= 180.001,
      evidence: `Центральный угол θ = ${centralAngleDeg.toFixed(1)}°`,
      measuredValue: centralAngleDeg,
      requiredCondition: '0° < θ <= 180°',
    });

    // 4. Euclidean metric
    records.push({
      preconditionId: 'EUCLIDEAN_METRIC',
      description: 'Метрика расстояния является евклидовой L2 нормой',
      satisfied: true,
      evidence: 'Декартово пространство R² с евклидовой метрикой',
      requiredCondition: 'Евклидова метрика',
    });

    const provenanceAssistance: ProvenanceAssistance = {
      entityId: `seg_${targetKey}`,
      topologicalRole: 'CHORD_SEGMENT',
      guidanceNote: trace
        ? 'Провенанс: Хорда идентифицирована из структурного графа построения.'
        : 'Провенанс: Базовая хорда.',
    };

    const allSatisfied = records.every((r) => r.satisfied);
    return { records, allSatisfied, provenanceAssistance };
  },
};

/**
 * 3. Thales Diameter Theorem Rule (angle_C = 90 deg iff AB is diameter)
 */
export const RULE_THALES_DIAMETER: CanonicalRuleDefinition = {
  id: 'RULE-THALES-DIAMETER',
  signature: 'THALES_DIAMETER_RIGHT_ANGLE',
  name: 'Теорема Фалеса об угле, опирающемся на диаметр',
  formula: '∠ACB = 90° ⟺ AB = 2R (θ = 180°)',
  formalStatement:
    'Если хорда AB является диаметром окружности, то любой вписанный угол ∠ACB с вершиной C на окружности является прямым (90°).',
  mathematicalDomain: 'Планиметрия (Теорема Фалеса)',
  requiredPreconditions: [
    {
      id: 'CHORD_IS_DIAMETER',
      description: 'Хорда AB проходит через центр O(0,0) (длина AB = 2R, дуга AB = 180°)',
    },
    {
      id: 'VERTEX_C_ON_CIRCLE',
      description: 'Вершина C строго лежит на границе окружности (dist(C, O) = R)',
    },
    {
      id: 'NON_COLLINEAR_C',
      description: 'Вершина C не совпадает с концами диаметра A и B',
    },
  ],
  evaluatePreconditions: (state, _targetKey, trace) => {
    const records: PreconditionCheckRecord[] = [];
    const R = state.R;
    const geoBase = computeGeometryBase(state.pointsU, state.R);

    // Identify target diameter chord and opposite vertex
    const target = (_targetKey && _targetKey.length === 2) ? _targetKey : (
      Math.abs(geoBase.arcs.AB.deg - 180) < 0.5 ? 'AB' :
      Math.abs(geoBase.arcs.BC.deg - 180) < 0.5 ? 'BC' :
      Math.abs(geoBase.arcs.CA.deg - 180) < 0.5 ? 'CA' : 'AB'
    );

    const p1Name = target.charAt(0);
    const p2Name = target.charAt(1);
    const oppName = target === 'AB' ? 'C' : (target === 'BC' ? 'A' : 'B');

    // 1. Check if chord is diameter
    const arcKey = (target.length === 2 ? target : 'AB') as 'AB' | 'BC' | 'CA';
    const arcDeg = geoBase.arcs[arcKey]?.deg ?? 0;
    const isDiameter = Math.abs(arcDeg - 180) < 0.5;
    records.push({
      preconditionId: 'CHORD_IS_DIAMETER',
      description: `Хорда ${target} является диаметром (дуга ${target} = 180°)`,
      satisfied: isDiameter,
      evidence: isDiameter
        ? `Дуга ${target} = ${arcDeg.toFixed(1)}° ≈ 180.0° (Диаметр подтверждён)`
        : `Хорда ${target} не является диаметром: дуга ${target} = ${arcDeg.toFixed(1)}° ≠ 180°`,
      measuredValue: arcDeg,
      requiredCondition: `|θ_${target} - 180°| < 0.5°`,
    });

    // 2. Vertex on circle
    const pOpp = state.points[`pt_${oppName}`] || state.points[oppName];
    let oppOnCircle = false;
    if (pOpp) {
      const distOpp = Math.hypot(pOpp.x, pOpp.y);
      const devOpp = Math.abs(distOpp - R);
      oppOnCircle = devOpp < METRIC_TOL;
      records.push({
        preconditionId: 'VERTEX_C_ON_CIRCLE',
        description: `Вершина ${oppName} лежит на окружности`,
        satisfied: oppOnCircle,
        evidence: oppOnCircle
          ? `Отклонение ${oppName} от R: ${devOpp.toFixed(2)}px (< ${METRIC_TOL}px)`
          : `Точка ${oppName} не на окружности: dev=${devOpp.toFixed(2)}px`,
        measuredValue: devOpp,
        requiredCondition: `dev < ${METRIC_TOL}`,
      });
    } else {
      records.push({
        preconditionId: 'VERTEX_C_ON_CIRCLE',
        description: `Вершина ${oppName} лежит на окружности`,
        satisfied: false,
        evidence: `Точка ${oppName} не найдена в состоянии`,
        requiredCondition: `Точка ${oppName} определена`,
      });
    }

    // 3. Non-collinear with diameter endpoints
    const u1 = state.pointsU[p1Name as 'A' | 'B' | 'C'];
    const u2 = state.pointsU[p2Name as 'A' | 'B' | 'C'];
    const uOpp = state.pointsU[oppName as 'A' | 'B' | 'C'];
    const oppDistinct =
      u1 !== undefined && u2 !== undefined && uOpp !== undefined &&
      Math.abs(uOpp - u1) > 0.01 && Math.abs(uOpp - u2) > 0.01;
    records.push({
      preconditionId: 'NON_COLLINEAR_C',
      description: `Вершина ${oppName} не совпадает с концами диаметра ${p1Name} и ${p2Name}`,
      satisfied: oppDistinct,
      evidence: oppDistinct
        ? `Вершина ${oppName} отлична от концов диаметра`
        : `Вершина ${oppName} совпадает с точкой диаметра`,
      requiredCondition: `${oppName} ≠ ${p1Name} и ${oppName} ≠ ${p2Name}`,
    });

    const provenanceAssistance: ProvenanceAssistance = {
      entityId: `pt_${oppName}`,
      topologicalRole: 'RIGHT_ANGLE_VERTEX',
      guidanceNote: trace
        ? 'Провенанс: Диаметр и вершина проверены по топологическому следу.'
        : 'Провенанс: Базовая геометрия.',
    };

    const allSatisfied = records.every((r) => r.satisfied);
    return { records, allSatisfied, provenanceAssistance };
  },
};

/**
 * 4. Arc Complement Sum Axiom (theta_min + theta_maj = 360 deg)
 */
export const RULE_ARC_COMPLEMENT_SUM: CanonicalRuleDefinition = {
  id: 'RULE-ARC-COMPLEMENT-SUM',
  signature: 'ARC_COMPLEMENT_PARTITION_360',
  name: 'Аксиома полной меры окружности',
  formula: 'θ_min + θ_maj = 360.0°',
  formalStatement:
    'Любая хорда делит окружность на две дополнительные дуги, сумма градусных мер которых равна 360°.',
  mathematicalDomain: 'Топология окружности S¹',
  requiredPreconditions: [
    {
      id: 'CIRCLE_TOPOLOGY',
      description: 'Окружность S¹ является связным замкнутым 1-многообразием с мерой 2π (360°)',
    },
    {
      id: 'DISJOINT_COMPLEMENT',
      description: 'Меньшая и большая дуги образуют дизъюнктное объединение всей окружности',
    },
  ],
  evaluatePreconditions: (_state, _targetKey, trace) => {
    const records: PreconditionCheckRecord[] = [
      {
        preconditionId: 'CIRCLE_TOPOLOGY',
        description: 'Топологическая замкнутость окружности S¹',
        satisfied: true,
        evidence: 'Полная мера гладкого многообразия S¹ = 360.0° (2π рад)',
        requiredCondition: 'Мера S¹ = 360°',
      },
      {
        preconditionId: 'DISJOINT_COMPLEMENT',
        description: 'Разбиение окружности на дополнительную пару дуг',
        satisfied: true,
        evidence: 'Две точки разбивают S¹ на ровно 2 смежные дуги',
        requiredCondition: 'Корректное разбиение',
      },
    ];

    const provenanceAssistance: ProvenanceAssistance = {
      guidanceNote: 'Провенанс: Топологическая аксиома разбиения S¹.',
    };

    return { records, allSatisfied: true, provenanceAssistance };
  },
};

/**
 * 5. Perpendicular Bisector Rule (Equidistance & Orthogonality)
 */
export const RULE_PERPENDICULAR_BISECTOR: CanonicalRuleDefinition = {
  id: 'RULE-PERPENDICULAR-BISECTOR',
  signature: 'PERPENDICULAR_BISECTOR_EQUIDISTANCE',
  name: 'Свойство серединного перпендикуляра',
  formula: 'P ∈ perp_bisector(AB) ⟺ |PA| = |PB| ∧ line ⟂ AB',
  formalStatement:
    'Серединный перпендикуляр к отрезку есть геометрическое место точек, равноудаленных от концов отрезка, и перпендикулярен отрезку в его середине.',
  mathematicalDomain: 'Метрическая планиметрия (Sutton Fig. 9)',
  requiredPreconditions: [
    {
      id: 'SEGMENT_NON_DEGENERATE',
      description: 'Отрезок AB имеет положительную длину (|AB| > 0)',
    },
    {
      id: 'LINE_ORTHOGONAL_TO_SEGMENT',
      description: 'Прямая перпендикулярна отрезку (скалярное произведение направляющих векторов = 0)',
    },
    {
      id: 'LINE_PASSES_THROUGH_MIDPOINT',
      description: 'Прямая проходит через середину отрезка M = (A + B) / 2',
    },
    {
      id: 'EQUIDISTANT_POINTS',
      description: 'Точки на прямой равноудалены от концов отрезка A и B',
    },
  ],
  evaluatePreconditions: (state, targetKey, trace) => {
    const records: PreconditionCheckRecord[] = [];

    // Find the target line or any perpendicular bisector line in state
    const lines = Object.values(state.lines);
    const line = targetKey ? state.lines[targetKey] : lines.find((l) => l.provenance?.macroType === 'perpendicular_bisector') || lines[0];

    if (!line) {
      records.push({
        preconditionId: 'SEGMENT_NON_DEGENERATE',
        description: 'Поиск линии и отрезка',
        satisfied: false,
        evidence: 'Линия не найдена в состоянии',
        requiredCondition: 'Линия существует',
      });
      return { records, allSatisfied: false, provenanceAssistance: { guidanceNote: 'Линия отсутствует.' } };
    }

    // Determine target endpoints A and B
    const sourceIds = (line.provenance as any)?.sourceIds || (line.provenance as any)?.sourceEntityIds || [];
    let pA = undefined;
    let pB = undefined;
    if (sourceIds.length >= 2 && state.points[sourceIds[0]] && state.points[sourceIds[1]]) {
      pA = state.points[sourceIds[0]];
      pB = state.points[sourceIds[1]];
    } else if (sourceIds.length > 0 && state.segments[sourceIds[0]]) {
      const seg = state.segments[sourceIds[0]];
      pA = state.points[seg.p1Id];
      pB = state.points[seg.p2Id];
    } else {
      // Fallback search segment perpendicular to line through its midpoint
      const seg = Object.values(state.segments).find((s) => {
        const p1 = state.points[s.p1Id];
        const p2 = state.points[s.p2Id];
        if (!p1 || !p2) return false;
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const lp1 = state.points[line.p1Id];
        const lp2 = state.points[line.p2Id];
        if (!lp1 || !lp2) return false;
        const distMid = Math.abs((lp2.x - lp1.x) * (lp1.y - my) - (lp1.x - mx) * (lp2.y - lp1.y)) / Math.hypot(lp2.x - lp1.x, lp2.y - lp1.y);
        return distMid < 1.0;
      });
      if (seg) {
        pA = state.points[seg.p1Id];
        pB = state.points[seg.p2Id];
      }
    }
    const lp1 = state.points[line.p1Id];
    const lp2 = state.points[line.p2Id];

    const segValid = Boolean(pA && pB && Math.hypot(pA.x - pB.x, pA.y - pB.y) > 1e-3);
    records.push({
      preconditionId: 'SEGMENT_NON_DEGENERATE',
      description: 'Отрезок AB имеет положительную длину',
      satisfied: segValid,
      evidence: segValid ? `Отрезок [${pA!.id}${pB!.id}] длина = ${Math.hypot(pA!.x - pB!.x, pA!.y - pB!.y).toFixed(1)} px` : 'Отрезок не найден',
      requiredCondition: '|AB| > 0',
    });

    if (!segValid || !lp1 || !lp2 || !pA || !pB) {
      return { records, allSatisfied: false, provenanceAssistance: { guidanceNote: 'Недостаточно данных для верификации.' } };
    }

    // Orthogonality
    const dxSeg = pB.x - pA.x;
    const dySeg = pB.y - pA.y;
    const dxLine = lp2.x - lp1.x;
    const dyLine = lp2.y - lp1.y;
    const dot = dxSeg * dxLine + dySeg * dyLine;
    const lenSeg = Math.hypot(dxSeg, dySeg);
    const lenLine = Math.hypot(dxLine, dyLine);
    const cosAngle = Math.abs(dot / (lenSeg * lenLine));
    const isOrthogonal = cosAngle < 1e-3;

    records.push({
      preconditionId: 'LINE_ORTHOGONAL_TO_SEGMENT',
      description: 'Прямая перпендикулярна отрезку',
      satisfied: isOrthogonal,
      evidence: `cos(угол) = ${cosAngle.toFixed(5)} (угол = ${(Math.acos(cosAngle) * 180 / Math.PI).toFixed(2)}°)`,
      requiredCondition: 'cos(угол) ≈ 0',
    });

    // Passes through midpoint
    const mx = (pA.x + pB.x) / 2;
    const my = (pA.y + pB.y) / 2;
    const distMid = Math.abs(dyLine * mx - dxLine * my + lp2.x * lp1.y - lp2.y * lp1.x) / lenLine;
    const passesMid = distMid < 1.0;

    records.push({
      preconditionId: 'LINE_PASSES_THROUGH_MIDPOINT',
      description: 'Прямая проходит через середину отрезка M',
      satisfied: passesMid,
      evidence: `Расстояние от середины M до прямой = ${distMid.toFixed(3)} px`,
      requiredCondition: 'dist(M, line) < 1.0 px',
    });

    // Equidistant points on line
    const d1A = Math.hypot(lp1.x - pA.x, lp1.y - pA.y);
    const d1B = Math.hypot(lp1.x - pB.x, lp1.y - pB.y);
    const d2A = Math.hypot(lp2.x - pA.x, lp2.y - pA.y);
    const d2B = Math.hypot(lp2.x - pB.x, lp2.y - pB.y);
    const equidistant = Math.abs(d1A - d1B) < 1.0 && Math.abs(d2A - d2B) < 1.0;

    records.push({
      preconditionId: 'EQUIDISTANT_POINTS',
      description: 'Точки на прямой равноудалены от концов отрезка A и B',
      satisfied: equidistant,
      evidence: `|P1A - P1B| = ${Math.abs(d1A - d1B).toFixed(3)} px, |P2A - P2B| = ${Math.abs(d2A - d2B).toFixed(3)} px`,
      requiredCondition: '|PA| = |PB|',
    });

    const allSatisfied = records.every((r) => r.satisfied);
    const provenanceAssistance: ProvenanceAssistance = {
      guidanceNote: line.provenance?.macroType === 'perpendicular_bisector'
        ? 'Провенанс: Построено макросом серединного перпендикуляра.'
        : 'Провенанс: Аналитическая проверка геометрических инвариантов.',
    };

    return { records, allSatisfied, provenanceAssistance };
  },
};

/**
 * 6. Angle Bisector Rule (Half-Angle Equality)
 */
export const RULE_ANGLE_BISECTOR: CanonicalRuleDefinition = {
  id: 'RULE-ANGLE-BISECTOR',
  signature: 'ANGLE_BISECTOR_EQUALITY',
  name: 'Теорема о биссектрисе угла',
  formula: '∠AVL = ∠BVL = 1/2 ∠AVB',
  formalStatement:
    'Биссектриса угла делит его на два равных угла и является геометрическим местом точек, равноудаленных от сторон угла.',
  mathematicalDomain: 'Метрическая планиметрия (Sutton Fig. 3)',
  requiredPreconditions: [
    {
      id: 'ANGLE_VERTEX_EXISTS',
      description: 'Вершина угла V и лучи VA, VB определены и не совпадают',
    },
    {
      id: 'BISECTOR_PASSES_THROUGH_VERTEX',
      description: 'Биссектриса проходит через вершину угла V',
    },
    {
      id: 'EQUAL_HALF_ANGLES',
      description: 'Углы между биссектрисой и сторонами угла равны',
    },
  ],
  evaluatePreconditions: (state, targetKey, trace) => {
    const records: PreconditionCheckRecord[] = [];

    const lines = Object.values(state.lines);
    const line = targetKey ? state.lines[targetKey] : lines.find((l) => l.provenance?.macroType === 'angle_bisector') || lines[0];

    if (!line) {
      records.push({
        preconditionId: 'ANGLE_VERTEX_EXISTS',
        description: 'Поиск биссектрисы угла',
        satisfied: false,
        evidence: 'Линия не найдена в состоянии',
        requiredCondition: 'Линия существует',
      });
      return { records, allSatisfied: false, provenanceAssistance: { guidanceNote: 'Линия отсутствует.' } };
    }

    const sourceIds = (line.provenance as any)?.sourceIds || (line.provenance as any)?.sourceEntityIds || [];
    let targetVertexId = 'C';
    let pA = state.points.A || state.points.pt_A;
    let pB = state.points.B || state.points.pt_B;
    if (sourceIds.length >= 3) {
      pA = state.points[sourceIds[0]];
      targetVertexId = sourceIds[1];
      pB = state.points[sourceIds[2]];
    } else if (sourceIds.length === 1) {
      targetVertexId = sourceIds[0];
    }
    const vPt = state.points[targetVertexId] || state.points.C || state.points.pt_C;

    const vertexValid = Boolean(vPt && pA && pB);
    records.push({
      preconditionId: 'ANGLE_VERTEX_EXISTS',
      description: 'Вершина V и стороны угла существуют',
      satisfied: vertexValid,
      evidence: vertexValid ? `Вершина ${vPt?.id}, стороны к ${pA?.id} и ${pB?.id}` : 'Вершина или стороны угла не найдены',
      requiredCondition: 'V, A, B определены',
    });

    if (!vertexValid || !vPt || !pA || !pB) {
      return { records, allSatisfied: false, provenanceAssistance: { guidanceNote: 'Недостаточно данных.' } };
    }

    const lp1 = state.points[line.p1Id];
    const lp2 = state.points[line.p2Id];
    if (!lp1 || !lp2) {
      return { records, allSatisfied: false, provenanceAssistance: { guidanceNote: 'Точки линии не найдены.' } };
    }

    // Passes through V
    const dxLine = lp2.x - lp1.x;
    const dyLine = lp2.y - lp1.y;
    const lenLine = Math.hypot(dxLine, dyLine);
    const distV = Math.abs(dyLine * vPt.x - dxLine * vPt.y + lp2.x * lp1.y - lp2.y * lp1.x) / lenLine;
    const passesV = distV < 1.0;

    records.push({
      preconditionId: 'BISECTOR_PASSES_THROUGH_VERTEX',
      description: 'Биссектриса проходит через вершину V',
      satisfied: passesV,
      evidence: `Расстояние от вершины ${vPt.id} до линии = ${distV.toFixed(3)} px`,
      requiredCondition: 'dist(V, line) < 1.0 px',
    });

    // Direction vector of bisector from V
    // Determine which point on line is away from V
    const otherPt = Math.hypot(lp1.x - vPt.x, lp1.y - vPt.y) > 1e-2 ? lp1 : lp2;
    const dirX = otherPt.x - vPt.x;
    const dirY = otherPt.y - vPt.y;
    const dirLen = Math.hypot(dirX, dirY);

    const vAx = pA.x - vPt.x;
    const vAy = pA.y - vPt.y;
    const vALen = Math.hypot(vAx, vAy);

    const vBx = pB.x - vPt.x;
    const vBy = pB.y - vPt.y;
    const vBLen = Math.hypot(vBx, vBy);

    const cos1 = Math.max(-1, Math.min(1, (dirX * vAx + dirY * vAy) / (dirLen * vALen)));
    const cos2 = Math.max(-1, Math.min(1, (dirX * vBx + dirY * vBy) / (dirLen * vBLen)));
    const angle1Deg = (Math.acos(cos1) * 180) / Math.PI;
    const angle2Deg = (Math.acos(cos2) * 180) / Math.PI;

    const equalHalf = Math.abs(angle1Deg - angle2Deg) < 0.75;
    records.push({
      preconditionId: 'EQUAL_HALF_ANGLES',
      description: 'Углы между биссектрисой и сторонами равны',
      satisfied: equalHalf,
      evidence: `α1 = ${angle1Deg.toFixed(2)}°, α2 = ${angle2Deg.toFixed(2)}°, |Δ| = ${Math.abs(angle1Deg - angle2Deg).toFixed(3)}°`,
      requiredCondition: '|α1 - α2| < 0.75°',
    });

    const allSatisfied = records.every((r) => r.satisfied);
    const provenanceAssistance: ProvenanceAssistance = {
      guidanceNote: line.provenance?.macroType === 'angle_bisector'
        ? 'Провенанс: Построено макросом биссектрисы угла.'
        : 'Провенанс: Аналитическая проверка деления угла пополам.',
    };

    return { records, allSatisfied, provenanceAssistance };
  },
};

/**
 * 7. Tangent-Radius Orthogonality Rule (Sutton Fig. 13-14)
 */
export const RULE_TANGENT_RADIUS_ORTHOGONALITY: CanonicalRuleDefinition = {
  id: 'RULE-TANGENT-RADIUS-ORTHOGONALITY',
  signature: 'TANGENT_RADIUS_ORTHOGONALITY',
  name: 'Теорема о касательной к окружности',
  formula: 'l ⟂ OT ⟺ dist(O, l) = R ⟺ l касательная к C(O, R) в точке T',
  formalStatement:
    'Прямая является касательной к окружности тогда и только тогда, когда расстояние от центра окружности до прямой равно радиусу, и радиус, проведенный в точку касания, перпендикулярен прямой.',
  mathematicalDomain: 'Планиметрия (Геометрия касательных, Sutton Fig. 13-14)',
  requiredPreconditions: [
    {
      id: 'CIRCLE_EXISTS_WITH_POSITIVE_RADIUS',
      description: 'Окружность существует и имеет положительный радиус R > 0',
    },
    {
      id: 'DISTANCE_CENTER_TO_LINE_EQUALS_RADIUS',
      description: 'Расстояние от центра окружности O до прямой l строго равно радиусу R (|dist - R| < 1.0 px)',
    },
    {
      id: 'RADIUS_ORTHOGONAL_TO_LINE',
      description: 'Вектор радиуса OT перпендикулярен направляющему вектору касательной прямой l',
    },
  ],
  evaluatePreconditions: (state, targetKey, trace) => {
    const records: PreconditionCheckRecord[] = [];
    const R = state.R;

    const circleValid = R > 0;
    records.push({
      preconditionId: 'CIRCLE_EXISTS_WITH_POSITIVE_RADIUS',
      description: 'Окружность имеет положительный радиус',
      satisfied: circleValid,
      evidence: circleValid ? `Радиус R = ${R.toFixed(1)} px` : 'Радиус <= 0',
      requiredCondition: 'R > 0',
    });

    if (!circleValid) {
      return { records, allSatisfied: false, provenanceAssistance: { guidanceNote: 'Радиус некорректен.' } };
    }

    const lines = Object.values(state.lines);
    const line = targetKey ? state.lines[targetKey] : lines[0];

    if (!line) {
      records.push({
        preconditionId: 'DISTANCE_CENTER_TO_LINE_EQUALS_RADIUS',
        description: 'Поиск проверяемой прямой',
        satisfied: false,
        evidence: 'Линия не найдена',
        requiredCondition: 'Линия существует',
      });
      return { records, allSatisfied: false, provenanceAssistance: { guidanceNote: 'Линия не найдена.' } };
    }

    const lp1 = state.points[line.p1Id];
    const lp2 = state.points[line.p2Id];

    if (!lp1 || !lp2) {
      return { records, allSatisfied: false, provenanceAssistance: { guidanceNote: 'Точки линии не найдены.' } };
    }

    // Distance from center O(0, 0) to line (lp1, lp2)
    const dx = lp2.x - lp1.x;
    const dy = lp2.y - lp1.y;
    const len = Math.hypot(dx, dy);
    const distCenter = Math.abs(lp1.x * lp2.y - lp2.x * lp1.y) / len;
    const devDist = Math.abs(distCenter - R);
    const isTangentDist = devDist < 1.0;

    records.push({
      preconditionId: 'DISTANCE_CENTER_TO_LINE_EQUALS_RADIUS',
      description: 'Расстояние от центра до прямой равно R',
      satisfied: isTangentDist,
      evidence: `dist(O, line) = ${distCenter.toFixed(2)} px, R = ${R.toFixed(2)} px (|Δ| = ${devDist.toFixed(3)} px)`,
      requiredCondition: '|dist(O, line) - R| < 1.0 px',
    });

    // Tangency point projection
    const t = - (lp1.x * dx + lp1.y * dy) / (len * len);
    const tx = lp1.x + t * dx;
    const ty = lp1.y + t * dy;

    // Radius vector OT dot line dir
    const dotRadius = tx * dx + ty * dy;
    const radLen = Math.hypot(tx, ty);
    const cosRad = Math.abs(dotRadius / (radLen * len));
    const isOrthogonal = cosRad < 1e-3;

    records.push({
      preconditionId: 'RADIUS_ORTHOGONAL_TO_LINE',
      description: 'Радиус в точку касания перпендикулярен прямой',
      satisfied: isOrthogonal,
      evidence: `cos(OT, line) = ${cosRad.toFixed(5)}, точка касания T(${tx.toFixed(1)}, ${ty.toFixed(1)})`,
      requiredCondition: 'OT ⟂ line (cos ≈ 0)',
    });

    const allSatisfied = records.every((r) => r.satisfied);
    const provenanceAssistance: ProvenanceAssistance = {
      guidanceNote: 'Провенанс: Аналитическая проверка расстояния и перпендикулярности радиуса к касательной.',
    };

    return { records, allSatisfied, provenanceAssistance };
  },
};

/**
 * All Canonical Rules in the Research Kernel Suite.
 */
export const CANONICAL_RESEARCH_RULES: readonly CanonicalRuleDefinition[] = [
  RULE_INSCRIBED_ANGLE,
  RULE_CYCLIC_CHORD_LAW,
  RULE_THALES_DIAMETER,
  RULE_ARC_COMPLEMENT_SUM,
  RULE_PERPENDICULAR_BISECTOR,
  RULE_ANGLE_BISECTOR,
  RULE_TANGENT_RADIUS_ORTHOGONALITY,
] as const;

/**
 * Looks up a canonical rule by signature.
 */
export function findCanonicalRuleBySignature(
  sig: RelationSignature
): CanonicalRuleDefinition | undefined {
  return CANONICAL_RESEARCH_RULES.find((r) => r.signature === sig);
}

/**
 * Looks up a canonical rule by ID.
 */
export function findCanonicalRuleById(ruleId: string): CanonicalRuleDefinition | undefined {
  return CANONICAL_RESEARCH_RULES.find((r) => r.id === ruleId);
}
