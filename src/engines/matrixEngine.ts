import { EngineResult, TriangleClass, VertexId } from '../types';
import { computeGeometryBase } from './geometryState';

export class MatrixEngine {
  compute(pointsU: { A: number; B: number; C: number }, R: number): EngineResult {
    const geo = computeGeometryBase(pointsU, R);

    let addSub = 0;
    let mulDiv = 0;
    let sqrt = 0;
    let trig = 0;

    // Step 1: Cyclic Arc Partitioning from points on circle (u_A, u_B, u_C)
    // Points cyclic sort & delta intervals (d1 + d2 + d3 = 1.0)
    // 3 interval subtractions + cyclic wrap
    addSub += 4;

    const arcAB = geo.arcs.AB.fraction;
    const arcBC = geo.arcs.BC.fraction;
    const arcCA = geo.arcs.CA.fraction;

    // Step 2: Inscribed Angle Theorem (Relational opposite law)
    // Each inscribed angle is half of central angle = fraction * 360 / 2 = fraction * 180
    // Opposite mappings:
    // A ↔ Arc BC
    // B ↔ Arc CA
    // C ↔ Arc AB
    mulDiv += 3;
    const angleA = arcBC * 180;
    const angleB = arcCA * 180;
    const angleC = arcAB * 180;

    // Step 3: Pure Algebraic Classification from Arc Partition
    // NO TRIG, NO SQRT required!
    // If maxArc < 0.5 -> acute (center O strictly inside)
    // If maxArc == 0.5 -> right (center O on diameter chord)
    // If maxArc > 0.5 -> obtuse (center O outside)
    addSub += 2;
    const maxArc = Math.max(arcAB, arcBC, arcCA);

    let classification: TriangleClass = 'acute';
    let classificationName = 'Остроугольный';
    let centerPositionDesc = 'Центр O внутри треугольника (все дуги < 1/2 круга)';
    let isRightAngleVertex: VertexId | undefined = undefined;
    let diameterSide: string | undefined = undefined;

    if (Math.abs(maxArc - 0.5) < 0.008) {
      classification = 'right';
      classificationName = 'Прямоугольный';
      centerPositionDesc = 'Центр O лежит на стороне (дуга = 1/2 круга, теорема Фалеса)';
      if (Math.abs(arcBC - 0.5) < 0.008) {
        isRightAngleVertex = 'A';
        diameterSide = 'BC';
      } else if (Math.abs(arcCA - 0.5) < 0.008) {
        isRightAngleVertex = 'B';
        diameterSide = 'CA';
      } else {
        isRightAngleVertex = 'C';
        diameterSide = 'AB';
      }
    } else if (maxArc > 0.5) {
      classification = 'obtuse';
      classificationName = 'Тупоугольный';
      centerPositionDesc = 'Центр O вне треугольника (одна дуга > 1/2 круга)';
    }

    // Step 4: Metric Layer (Chord Conversion)
    // Chords computed via circle relation: L = 2R * sin(d * π)
    // Note: requires metric conversion function
    trig += 3;
    mulDiv += 6;

    const L_AB = 2 * R * Math.sin(arcAB * Math.PI);
    const L_BC = 2 * R * Math.sin(arcBC * Math.PI);
    const L_CA = 2 * R * Math.sin(arcCA * Math.PI);

    // Perimeter
    addSub += 2;
    const perimeter = L_AB + L_BC + L_CA;

    // Area: can be computed via central sectors or Heron
    // Area = (1/2) * R^2 * [sin(2π·d1) + sin(2π·d2) - sin(2π·d3)] (accounting for orientation)
    // or through standard metric semiperimeter for exact numerical match
    addSub += 4;
    mulDiv += 4;
    sqrt += 1;
    const s = perimeter / 2;
    const area = Math.sqrt(Math.max(0, s * (s - L_AB) * (s - L_BC) * (s - L_CA)));

    const total = addSub + mulDiv + sqrt + trig;

    return {
      engineName: 'matrix',
      engineDisplayName: 'RELATIONAL / MATRIX (Structural)',
      arcs: {
        AB: arcAB,
        BC: arcBC,
        CA: arcCA,
      },
      angles: {
        A: angleA,
        B: angleB,
        C: angleC,
      },
      chords: {
        AB: L_AB,
        BC: L_BC,
        CA: L_CA,
      },
      perimeter,
      area,
      classification,
      classificationName,
      centerPositionDesc,
      isRightAngleVertex,
      diameterSide,
      ops: {
        addSub,
        mulDiv,
        sqrt,
        trig,
        total,
      },
      computationSteps: [
        '1. Циклический порядок точек на окружности: (uA, uB, uC)',
        '2. Разбиение на 3 дуги: d(AB) + d(BC) + d(CA) = 1.0 круга',
        '3. Отношения противоположностей: ∠A = d(BC)·180°, ∠B = d(CA)·180°, ∠C = d(AB)·180°',
        '4. Чистая алгебраическая классификация: d_max ⋛ 0.5 (без тригонометрии)',
        '5. Метрический переход к хордам: L = 2R·sin(d·π) [требует функции хорды]',
      ],
    };
  }
}
