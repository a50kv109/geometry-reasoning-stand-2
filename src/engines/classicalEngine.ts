import { EngineResult, TriangleClass, VertexId } from '../types';
import { computeGeometryBase } from './geometryState';

export class ClassicalEngine {
  compute(pointsU: { A: number; B: number; C: number }, R: number): EngineResult {
    const geo = computeGeometryBase(pointsU, R);
    const vMap: Record<VertexId, { x: number; y: number }> = {
      A: geo.vertices.find((v) => v.id === 'A')!,
      B: geo.vertices.find((v) => v.id === 'B')!,
      C: geo.vertices.find((v) => v.id === 'C')!,
    };

    let addSub = 0;
    let mulDiv = 0;
    let sqrt = 0;
    let trig = 0;

    // Cartesian Coordinates (cos, sin)
    // 3 vertices * (2 trig calls + 2 multiplications)
    trig += 6;
    mulDiv += 6;

    // Euclidean Distance for chords: sqrt( (x1-x2)^2 + (y1-y2)^2 )
    // 3 chords * (2 subtractions, 2 multiplications/squares, 1 addition, 1 sqrt)
    addSub += 9;
    mulDiv += 6;
    sqrt += 3;

    const L_AB = Math.hypot(vMap.A.x - vMap.B.x, vMap.A.y - vMap.B.y);
    const L_BC = Math.hypot(vMap.B.x - vMap.C.x, vMap.B.y - vMap.C.y);
    const L_CA = Math.hypot(vMap.C.x - vMap.A.x, vMap.C.y - vMap.A.y);

    // Law of Cosines for angles:
    // cos(A) = (b^2 + c^2 - a^2) / (2 * b * c) -> acos(...)
    // per angle: 3 squares + 1 add + 1 sub + 2 mul + 1 div + 1 acos
    addSub += 6;
    mulDiv += 9;
    trig += 3;

    function safeAcos(cosVal: number): number {
      const clamped = Math.max(-1, Math.min(1, cosVal));
      return Math.acos(clamped) * (180 / Math.PI);
    }

    const angleA = safeAcos((L_CA * L_CA + L_AB * L_AB - L_BC * L_BC) / (2 * L_CA * L_AB));
    const angleB = safeAcos((L_AB * L_AB + L_BC * L_BC - L_CA * L_CA) / (2 * L_AB * L_BC));
    const angleC = Math.max(0, 180 - angleA - angleB);
    addSub += 2;

    // Perimeter & Area via Heron's formula:
    // s = (a+b+c)/2
    // Area = sqrt(s * (s-a) * (s-b) * (s-c))
    addSub += 5;
    mulDiv += 4;
    sqrt += 1;

    const perimeter = L_AB + L_BC + L_CA;
    const s = perimeter / 2;
    const area = Math.sqrt(Math.max(0, s * (s - L_AB) * (s - L_BC) * (s - L_CA)));

    // Classical classification: based on angles (evaluated from acos)
    let classification: TriangleClass = 'acute';
    let classificationName = 'Остроугольный';
    let centerPositionDesc = 'Центр O находится внутри треугольника (все углы < 90°)';
    let isRightAngleVertex: VertexId | undefined = undefined;
    let diameterSide: string | undefined = undefined;

    const maxAngle = Math.max(angleA, angleB, angleC);
    if (Math.abs(maxAngle - 90) < 1.5) {
      classification = 'right';
      classificationName = 'Прямоугольный';
      centerPositionDesc = 'Центр O лежит на гипотенузе (диаметре окружности)';
      if (Math.abs(angleA - 90) < 1.5) {
        isRightAngleVertex = 'A';
        diameterSide = 'BC';
      } else if (Math.abs(angleB - 90) < 1.5) {
        isRightAngleVertex = 'B';
        diameterSide = 'CA';
      } else {
        isRightAngleVertex = 'C';
        diameterSide = 'AB';
      }
    } else if (maxAngle > 90) {
      classification = 'obtuse';
      classificationName = 'Тупоугольный';
      centerPositionDesc = 'Центр O находится вне треугольника (наибольший угол > 90°)';
    }

    const total = addSub + mulDiv + sqrt + trig;

    return {
      engineName: 'classical',
      engineDisplayName: 'CLASSICAL (Trigonometric)',
      arcs: {
        AB: geo.arcs.AB.fraction,
        BC: geo.arcs.BC.fraction,
        CA: geo.arcs.CA.fraction,
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
        '1. Координаты вершин: (x, y) = (R·cos θ, R·sin θ)',
        '2. Длины хорд через Евклидово расстояние: d = √((Δx)² + (Δy)²)',
        '3. Углы по теореме косинусов: cos(∠A) = (b² + c² - a²) / (2bc) → acos',
        '4. Площадь по формуле Герона: S = √(s(s-a)(s-b)(s-c))',
        '5. Классификация по максимальному вычисленному углу',
      ],
    };
  }
}
