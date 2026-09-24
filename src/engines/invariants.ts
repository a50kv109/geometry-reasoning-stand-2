import { GeometrySnapshot, EngineResult } from '../types';

export interface InvariantCheckResult {
  readonly name: string;
  readonly passed: boolean;
  readonly actual: string;
  readonly expected: string;
  readonly details?: string;
}

/**
 * Validates canonical geometric invariants (SOL Constraints).
 */
export function checkGeometryInvariants(
  snapshot: GeometrySnapshot,
  engineResult?: EngineResult
): InvariantCheckResult[] {
  const results: InvariantCheckResult[] = [];
  const eps = 1e-4;

  // 1. Three distinct vertices
  const uA = snapshot.source.pointsU.A;
  const uB = snapshot.source.pointsU.B;
  const uC = snapshot.source.pointsU.C;
  const dAB = Math.abs(uA - uB);
  const dBC = Math.abs(uB - uC);
  const dCA = Math.abs(uC - uA);
  const distinct = dAB > eps && dBC > eps && dCA > eps;
  results.push({
    name: 'Вершины не совпадают (distinct vertices)',
    passed: distinct,
    actual: distinct ? '3 различные точки' : 'слияние точек',
    expected: '3 различные точки',
  });

  // 2. Arc fractions sum to 1.0
  const arcSum = snapshot.arcs.AB + snapshot.arcs.BC + snapshot.arcs.CA;
  const arcSumPassed = Math.abs(arcSum - 1.0) < eps;
  results.push({
    name: 'Сумма долей дуг равна 1.0 (полный круг)',
    passed: arcSumPassed,
    actual: arcSum.toFixed(4),
    expected: '1.0000',
  });

  // 3. Central angles sum to 360°
  const centralSum = (snapshot.arcs.AB + snapshot.arcs.BC + snapshot.arcs.CA) * 360;
  const centralSumPassed = Math.abs(centralSum - 360) < 0.1;
  results.push({
    name: 'Сумма центральных углов равна 360°',
    passed: centralSumPassed,
    actual: `${centralSum.toFixed(1)}°`,
    expected: '360.0°',
  });

  // 4. Inscribed angles sum to 180°
  const angleSum = snapshot.angles.A + snapshot.angles.B + snapshot.angles.C;
  const angleSumPassed = Math.abs(angleSum - 180) < 0.2;
  results.push({
    name: 'Сумма вписанных углов треугольника равна 180°',
    passed: angleSumPassed,
    actual: `${angleSum.toFixed(1)}°`,
    expected: '180.0°',
  });

  // 5. Area >= 0
  const areaPassed = snapshot.area >= 0;
  results.push({
    name: 'Площадь неотрицательна',
    passed: areaPassed,
    actual: snapshot.area.toFixed(1),
    expected: '>= 0',
  });

  // 6. Perimeter >= 0
  const perimeterPassed = snapshot.perimeter > 0;
  results.push({
    name: 'Периметр положителен',
    passed: perimeterPassed,
    actual: snapshot.perimeter.toFixed(1),
    expected: '> 0',
  });

  // 7. Consistency with active EngineResult (if provided)
  if (engineResult) {
    const angleMatch =
      Math.abs(engineResult.angles.A - snapshot.angles.A) < 0.2 &&
      Math.abs(engineResult.angles.B - snapshot.angles.B) < 0.2 &&
      Math.abs(engineResult.angles.C - snapshot.angles.C) < 0.2;
    results.push({
      name: 'Согласованность с результатами расчётного движка',
      passed: angleMatch,
      actual: angleMatch ? 'Идентичны' : 'Расхождение',
      expected: 'Идентичны',
    });
  }

  return results;
}
