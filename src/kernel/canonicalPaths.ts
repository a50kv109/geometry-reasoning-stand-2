// src/kernel/canonicalPaths.ts
// Exactly 6 Canonical DerivationPaths audited for semantic consistency

import { DerivationPath, FactMap, Point2D } from './types';
import { S12_CLOSURE_PATHS } from './factIdentity';

export * from './factIdentity';

// Helper for distance calculation
function distance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

// 1. DP-ANG-SUM-C
// Requires: angle_A, angle_B
// Provides: angle_C
// Precondition: None
// Operation: 180 - A - B
export const DP_ANG_SUM_C: DerivationPath = {
  id: 'DP-ANG-SUM-C',
  description: 'Сумма углов треугольника: angle_C = 180° - angle_A - angle_B',
  requires: ['angle_A', 'angle_B'],
  provides: 'angle_C',
  operation: (k: FactMap) => {
    const a = Number(k['angle_A']);
    const b = Number(k['angle_B']);
    return 180 - a - b;
  },
};

// 2. DP-PYTH-HYP
// Requires: leg_a, leg_b, angle_C
// Provides: hypotenuse_c
// Precondition: angle_C == 90 (abs_tol 1e-4)
// Operation: hypot(leg_a, leg_b)
export const DP_PYTH_HYP: DerivationPath = {
  id: 'DP-PYTH-HYP',
  description: 'Теорема Пифагора: c = √(a² + b²) при угле C = 90°',
  requires: ['leg_a', 'leg_b', 'angle_C'],
  provides: 'hypotenuse_c',
  precondition: (k: FactMap) => {
    const angleC = Number(k['angle_C']);
    return Math.abs(angleC - 90) < 1e-4;
  },
  operation: (k: FactMap) => {
    const a = Number(k['leg_a']);
    const b = Number(k['leg_b']);
    return Math.hypot(a, b);
  },
};

// 3. DP-INSC-TO-CENT
// Requires: angle_A
// Provides: central_angle_BC
// Precondition: None
// Operation: 2 * angle_A
// Semantic relation: angle_A is inscribed angle subtending arc BC; central angle of arc BC is 2 * angle_A.
export const DP_INSC_TO_CENT: DerivationPath = {
  id: 'DP-INSC-TO-CENT',
  description: 'Теорема о вписанном угле: центральный угол дуги BC = 2 * вписанный угол A',
  requires: ['angle_A'],
  provides: 'central_angle_BC',
  operation: (k: FactMap) => {
    const angleA = Number(k['angle_A']);
    return 2 * angleA;
  },
};

// 4. DP-CHORD-TRIG
// Requires: R, central_angle_BC
// Provides: chord_BC
// Precondition: None
// Operation: 2 * R * sin(central_angle_BC / 2 * π / 180)
// Semantic relation: Chord BC subtends central angle of arc BC.
export const DP_CHORD_TRIG: DerivationPath = {
  id: 'DP-CHORD-TRIG',
  description: 'Длина хорды BC через радиус и центральный угол: 2R * sin(central_BC / 2)',
  requires: ['R', 'central_angle_BC'],
  provides: 'chord_BC',
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const centralDeg = Number(k['central_angle_BC']);
    const halfAngleRad = (centralDeg / 2) * (Math.PI / 180);
    return 2 * r * Math.sin(halfAngleRad);
  },
};

// 5. DP-THALES-CLASS
// Requires: coord_A, coord_C, R
// Provides: triangle_class = "right"
// Precondition: dist(A, C) == 2R (abs_tol 1e-4) -> AC is diameter, so inscribed angle B = 90°
// Operation: return "right"
export const DP_THALES_CLASS: DerivationPath = {
  id: 'DP-THALES-CLASS',
  description: 'Теорема Фалеса: если хорда AC является диаметром (AC = 2R), треугольник прямоугольный',
  requires: ['coord_A', 'coord_C', 'R'],
  provides: 'triangle_class',
  precondition: (k: FactMap) => {
    const pA = k['coord_A'] as Point2D;
    const pC = k['coord_C'] as Point2D;
    const r = Number(k['R']);
    if (!pA || !pC || !r) return false;
    const distAC = distance(pA, pC);
    return Math.abs(distAC - 2 * r) < 1e-4;
  },
  operation: () => 'right',
};

// 6. DP-COORD-CLASS
// Requires: coord_A, coord_B, coord_C
// Provides: triangle_class
// Precondition: None (Fallback coordinate classifier based on side squares)
// Operation: classify by squared side lengths
export const DP_COORD_CLASS: DerivationPath = {
  id: 'DP-COORD-CLASS',
  description: 'Классификация по координатам: через квадраты длин сторон a² + b² vs c²',
  requires: ['coord_A', 'coord_B', 'coord_C'],
  provides: 'triangle_class',
  operation: (k: FactMap) => {
    const pA = k['coord_A'] as Point2D;
    const pB = k['coord_B'] as Point2D;
    const pC = k['coord_C'] as Point2D;
    
    // Side lengths:
    // a = BC, b = AC, c = AB
    const a2 = Math.pow(pB.x - pC.x, 2) + Math.pow(pB.y - pC.y, 2);
    const b2 = Math.pow(pA.x - pC.x, 2) + Math.pow(pA.y - pC.y, 2);
    const c2 = Math.pow(pA.x - pB.x, 2) + Math.pow(pA.y - pB.y, 2);

    const sides = [a2, b2, c2].sort((x, y) => x - y);
    const sumSmaller = sides[0] + sides[1];
    const largest = sides[2];

    const diff = sumSmaller - largest;
    if (Math.abs(diff) < 1e-4) {
      return 'right';
    } else if (diff > 0) {
      return 'acute';
    } else {
      return 'obtuse';
    }
  },
};

// 7. DP-CHORD-TO-RADIAL-DIST
// Requires: chord_length, R
// Provides: radial_distance
// Precondition: R > 0, 0 <= chord_length <= 2R
// Operation: d = √(R² - (L/2)²)
export const DP_CHORD_TO_RADIAL_DIST: DerivationPath = {
  id: 'DP-CHORD-TO-RADIAL-DIST',
  description: 'Вычисление расстояния от центра до хорды: d = √(R² - (L/2)²)',
  requires: ['chord_length', 'R'],
  provides: 'radial_distance',
  precondition: (k: FactMap) => {
    const r = Number(k['R']);
    const l = Number(k['chord_length']);
    if (isNaN(r) || isNaN(l)) return false;
    if (r <= 0) return false;
    if (l < -1e-4) return false;
    if (l > 2 * r + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const l = Math.max(0, Number(k['chord_length']));
    const val = Math.max(0, r * r - (l * l) / 4);
    return Math.sqrt(val);
  },
};

// 8. DP-RADIAL-DIST-TO-CHORD
// Requires: radial_distance, R
// Provides: chord_length
// Precondition: R > 0, 0 <= radial_distance <= R
// Operation: L = 2√(R² - d²)
export const DP_RADIAL_DIST_TO_CHORD: DerivationPath = {
  id: 'DP-RADIAL-DIST-TO-CHORD',
  description: 'Вычисление длины хорды через расстояние от центра: L = 2√(R² - d²)',
  requires: ['radial_distance', 'R'],
  provides: 'chord_length',
  precondition: (k: FactMap) => {
    const r = Number(k['R']);
    const d = Number(k['radial_distance']);
    if (isNaN(r) || isNaN(d)) return false;
    if (r <= 0) return false;
    if (d < -1e-4) return false;
    if (d > r + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const d = Math.max(0, Number(k['radial_distance']));
    const val = Math.max(0, r * r - d * d);
    return 2 * Math.sqrt(val);
  },
};

// 9. DP-REF-DIAM-CHORD
// Contextual construction: Chord parallel to fixed reference diameter with radial angle θ.
// Requires: reference_angle, R, is_parallel_to_reference_diameter
// Provides: chord_length
// Precondition: is_parallel_to_reference_diameter === true, R > 0, 0 <= reference_angle <= 90°
// Operation: L = 2R * cos(θ)
export const DP_REF_DIAM_CHORD: DerivationPath = {
  id: 'DP-REF-DIAM-CHORD',
  description: 'Хорда, параллельная опорному диаметру: L = 2R * cos(θ)',
  requires: ['reference_angle', 'R', 'is_parallel_to_reference_diameter'],
  provides: 'chord_length',
  precondition: (k: FactMap) => {
    if (k['is_parallel_to_reference_diameter'] !== true) return false;
    const r = Number(k['R']);
    const theta = Number(k['reference_angle']);
    if (isNaN(r) || isNaN(theta)) return false;
    if (r <= 0) return false;
    if (theta < -1e-4 || theta > 90 + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const theta = Number(k['reference_angle']);
    const rad = (theta * Math.PI) / 180;
    return Math.max(0, 2 * r * Math.cos(rad));
  },
};

// 10. DP-REF-DIAM-ANGLE
// Inverse contextual construction: Radial angle θ from parallel chord length L.
// Requires: chord_length, R, is_parallel_to_reference_diameter
// Provides: reference_angle
// Precondition: is_parallel_to_reference_diameter === true, R > 0, 0 <= chord_length <= 2R
// Operation: θ = arccos(L / 2R) (in degrees)
export const DP_REF_DIAM_ANGLE: DerivationPath = {
  id: 'DP-REF-DIAM-ANGLE',
  description: 'Угол радиуса к опорному диаметру через длину параллельной хорды: θ = arccos(L / 2R)',
  requires: ['chord_length', 'R', 'is_parallel_to_reference_diameter'],
  provides: 'reference_angle',
  precondition: (k: FactMap) => {
    if (k['is_parallel_to_reference_diameter'] !== true) return false;
    const r = Number(k['R']);
    const l = Number(k['chord_length']);
    if (isNaN(r) || isNaN(l)) return false;
    if (r <= 0) return false;
    if (l < -1e-4 || l > 2 * r + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const l = Number(k['chord_length']);
    const ratio = Math.max(0, Math.min(1, l / (2 * r)));
    return (Math.acos(ratio) * 180) / Math.PI;
  },
};

// 11. DP-SIDE-TO-MINOR-ANGLE
// Transferred Minor Central Angle from standalone chord/side length: θ = 2 * arcsin(L / 2R)
// Requires: chord_length, R
// Provides: minor_central_angle
// Precondition: R > 0, 0 <= chord_length <= 2R
// Operation: θ = 2 * arcsin(L / 2R) (in degrees, bounded to [0, 180°])
export const DP_SIDE_TO_MINOR_ANGLE: DerivationPath = {
  id: 'DP-SIDE-TO-MINOR-ANGLE',
  description: 'Малый центральный угол хорды/стороны: θ = 2 * arcsin(L / 2R)',
  requires: ['chord_length', 'R'],
  provides: 'minor_central_angle',
  precondition: (k: FactMap) => {
    const r = Number(k['R']);
    const l = Number(k['chord_length']);
    if (isNaN(r) || isNaN(l)) return false;
    if (r <= 0) return false;
    if (l < -1e-4 || l > 2 * r + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const l = Math.max(0, Number(k['chord_length']));
    const ratio = Math.max(0, Math.min(1, l / (2 * r)));
    return (2 * Math.asin(ratio) * 180) / Math.PI;
  },
};

// 12. DP-TRANSFERRED-ANGLE-SUM
// Transferred Minor Central Angle Sum: Θ = θ_a + θ_b + θ_c
// Requires: theta_a, theta_b, theta_c
// Provides: transferred_angle_sum
// Precondition: 0 <= theta_i <= 180°
// Operation: Θ = θ_a + θ_b + θ_c
export const DP_TRANSFERRED_ANGLE_SUM: DerivationPath = {
  id: 'DP-TRANSFERRED-ANGLE-SUM',
  description: 'Сумма перенесенных малых центральных углов: Θ = θ_a + θ_b + θ_c',
  requires: ['theta_a', 'theta_b', 'theta_c'],
  provides: 'transferred_angle_sum',
  precondition: (k: FactMap) => {
    const a = Number(k['theta_a']);
    const b = Number(k['theta_b']);
    const c = Number(k['theta_c']);
    if (isNaN(a) || isNaN(b) || isNaN(c)) return false;
    if (a < -1e-4 || b < -1e-4 || c < -1e-4) return false;
    if (a > 180 + 1e-4 || b > 180 + 1e-4 || c > 180 + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const a = Math.max(0, Number(k['theta_a']));
    const b = Math.max(0, Number(k['theta_b']));
    const c = Math.max(0, Number(k['theta_c']));
    return a + b + c;
  },
};

// 13. DP-OBTUSE-DIAGNOSTIC
// Triangle shape classification from transferred angle sum: ACUTE_RIGHT (Θ ≈ 360°) vs OBTUSE (Θ < 360°)
// Requires: transferred_angle_sum
// Provides: diagnostic_triangle_class
// Precondition: 0 < transferred_angle_sum <= 360°
// Operation: 'ACUTE_RIGHT' if Θ >= 360 - 1e-3, else 'OBTUSE'
export const DP_OBTUSE_DIAGNOSTIC: DerivationPath = {
  id: 'DP-OBTUSE-DIAGNOSTIC',
  description: 'Диагностика класса треугольника по сумме перенесенных углов (ACUTE_RIGHT / OBTUSE)',
  requires: ['transferred_angle_sum'],
  provides: 'diagnostic_triangle_class',
  precondition: (k: FactMap) => {
    const sum = Number(k['transferred_angle_sum']);
    if (isNaN(sum)) return false;
    if (sum < -1e-4 || sum > 360 + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const sum = Number(k['transferred_angle_sum']);
    return sum >= 360 - 1e-3 ? 'ACUTE_RIGHT' : 'OBTUSE';
  },
};

// 14. DP-SUM-TO-OBTUSE-MAGNITUDE
// Exact obtuse angle magnitude recovery from deficit: A = 180° - Θ / 4 = 90° + (360° - Θ) / 4
// Requires: transferred_angle_sum
// Provides: recovered_obtuse_angle
// Precondition: 0 < transferred_angle_sum < 360° (strictly obtuse domain)
// Operation: A = 180° - Θ / 4
export const DP_SUM_TO_OBTUSE_MAGNITUDE: DerivationPath = {
  id: 'DP-SUM-TO-OBTUSE-MAGNITUDE',
  description: 'Восстановление величины тупого угла: A = 90° + (360° - Θ) / 4',
  requires: ['transferred_angle_sum'],
  provides: 'recovered_obtuse_angle',
  precondition: (k: FactMap) => {
    const sum = Number(k['transferred_angle_sum']);
    if (isNaN(sum)) return false;
    if (sum <= 0 || sum >= 360 - 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const sum = Number(k['transferred_angle_sum']);
    return 180 - sum / 4;
  },
};

// 15. DP-TRIANGLE-PERIMETER
// Triangle straight perimeter: P = a + b + c
// Requires: side_a, side_b, side_c
// Provides: perimeter
// Precondition: a > 0, b > 0, c > 0, strict triangle inequality (a + b > c, b + c > a, c + a > b)
// Operation: P = a + b + c
export const DP_TRIANGLE_PERIMETER: DerivationPath = {
  id: 'DP-TRIANGLE-PERIMETER',
  description: 'Периметр треугольника: P = a + b + c',
  requires: ['side_a', 'side_b', 'side_c'],
  provides: 'perimeter',
  precondition: (k: FactMap) => {
    const a = Number(k['side_a']);
    const b = Number(k['side_b']);
    const c = Number(k['side_c']);
    if (isNaN(a) || isNaN(b) || isNaN(c)) return false;
    if (a <= 1e-4 || b <= 1e-4 || c <= 1e-4) return false;
    if (a + b <= c - 1e-4 || b + c <= a - 1e-4 || c + a <= b - 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const a = Number(k['side_a']);
    const b = Number(k['side_b']);
    const c = Number(k['side_c']);
    return a + b + c;
  },
};

// 16. DP-PERIMETER-TO-EQUIVALENT-ARC-ANGLE
// Equivalent Arc Central Angle: Θ_P = P / R (radians)
// Requires: perimeter, R
// Provides: equivalent_arc_angle
// Precondition: R > 0, 0 < P <= 3√3 * R + 1e-4
// Operation: Θ_P = P / R
export const DP_PERIMETER_TO_EQUIVALENT_ARC_ANGLE: DerivationPath = {
  id: 'DP-PERIMETER-TO-EQUIVALENT-ARC-ANGLE',
  description: 'Эквивалентный угол дуги периметра: Θ_P = P / R (рад)',
  requires: ['perimeter', 'R'],
  provides: 'equivalent_arc_angle',
  precondition: (k: FactMap) => {
    const p = Number(k['perimeter']);
    const r = Number(k['R']);
    if (isNaN(p) || isNaN(r)) return false;
    if (r <= 0 || p <= 0) return false;
    const maxP = 3 * Math.sqrt(3) * r;
    if (p > maxP + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const p = Number(k['perimeter']);
    const r = Number(k['R']);
    return p / r;
  },
};

// 17. DP-PERIMETER-TO-CIRCUMFERENCE-FRACTION
// Circumference Fraction spanned by straight perimeter: Q = P / (2πR)
// Requires: perimeter, R
// Provides: circumference_fraction
// Precondition: R > 0, 0 < P <= 3√3 * R + 1e-4
// Operation: Q = P / (2 * π * R)
export const DP_PERIMETER_TO_CIRCUMFERENCE_FRACTION: DerivationPath = {
  id: 'DP-PERIMETER-TO-CIRCUMFERENCE-FRACTION',
  description: 'Доля длины окружности, покрываемая периметром: Q = P / (2πR)',
  requires: ['perimeter', 'R'],
  provides: 'circumference_fraction',
  precondition: (k: FactMap) => {
    const p = Number(k['perimeter']);
    const r = Number(k['R']);
    if (isNaN(p) || isNaN(r)) return false;
    if (r <= 0 || p <= 0) return false;
    const maxP = 3 * Math.sqrt(3) * r;
    if (p > maxP + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const p = Number(k['perimeter']);
    const r = Number(k['R']);
    return p / (2 * Math.PI * r);
  },
};

// 18. DP-TRIANGLE-AREA-ANGLES-R
// Triangle area via internal angles and circumradius: K = 2 * R^2 * sin(A) * sin(B) * sin(C)
// Requires: angle_A, angle_B, angle_C, R
// Provides: triangle_area
// Precondition: R > 0, all angles > 0, angle sum == 180° (|A + B + C - 180| <= 1e-4)
// Operation: K = 2 * R^2 * sin(A) * sin(B) * sin(C)
export const DP_TRIANGLE_AREA_ANGLES_R: DerivationPath = {
  id: 'DP-TRIANGLE-AREA-ANGLES-R',
  description: 'Площадь треугольника через углы и радиус: K = 2 * R² * sin(A) * sin(B) * sin(C)',
  requires: ['angle_A', 'angle_B', 'angle_C', 'R'],
  provides: 'triangle_area',
  precondition: (k: FactMap) => {
    const r = Number(k['R']);
    const a = Number(k['angle_A'] ?? k['angle_a']);
    const b = Number(k['angle_B'] ?? k['angle_b']);
    const c = Number(k['angle_C'] ?? k['angle_c']);
    if (isNaN(r) || isNaN(a) || isNaN(b) || isNaN(c)) return false;
    if (r <= 0 || a <= 1e-4 || b <= 1e-4 || c <= 1e-4) return false;
    if (Math.abs(a + b + c - 180) > 1e-3) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const a = Number(k['angle_A'] ?? k['angle_a']);
    const b = Number(k['angle_B'] ?? k['angle_b']);
    const c = Number(k['angle_C'] ?? k['angle_c']);
    const sinA = Math.sin((a * Math.PI) / 180);
    const sinB = Math.sin((b * Math.PI) / 180);
    const sinC = Math.sin((c * Math.PI) / 180);
    return 2 * r * r * sinA * sinB * sinC;
  },
};

// 19. DP-TRIANGLE-AREA-HERON
// Triangle area via Heron's formula: K = √(s * (s - a) * (s - b) * (s - c)) where s = (a + b + c) / 2
// Requires: side_a, side_b, side_c
// Provides: triangle_area
// Precondition: a > 0, b > 0, c > 0, strict triangle inequality (a + b > c, b + c > a, c + a > b)
// Operation: K = √(s * (s - a) * (s - b) * (s - c))
export const DP_TRIANGLE_AREA_HERON: DerivationPath = {
  id: 'DP-TRIANGLE-AREA-HERON',
  description: 'Площадь треугольника по формуле Герона: K = √(s(s-a)(s-b)(s-c))',
  requires: ['side_a', 'side_b', 'side_c'],
  provides: 'triangle_area',
  precondition: (k: FactMap) => {
    const a = Number(k['side_a']);
    const b = Number(k['side_b']);
    const c = Number(k['side_c']);
    if (isNaN(a) || isNaN(b) || isNaN(c)) return false;
    if (a <= 1e-4 || b <= 1e-4 || c <= 1e-4) return false;
    if (a + b <= c - 1e-4 || b + c <= a - 1e-4 || c + a <= b - 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const a = Number(k['side_a']);
    const b = Number(k['side_b']);
    const c = Number(k['side_c']);
    const s = (a + b + c) / 2;
    const rad = s * (s - a) * (s - b) * (s - c);
    return Math.sqrt(Math.max(0, rad));
  },
};

// 20. DP-NORMALIZED-AREA
// Normalized Area Fraction: F = K / (π * R²)
// Requires: triangle_area, R
// Provides: normalized_area_fraction
// Precondition: R > 0, K > 0, K <= (3√3 / 4) * R² + 1e-4
// Operation: F = K / (π * R²)
export const DP_NORMALIZED_AREA: DerivationPath = {
  id: 'DP-NORMALIZED-AREA',
  description: 'Нормированная площадь треугольника: F = K / (π * R²)',
  requires: ['triangle_area', 'R'],
  provides: 'normalized_area_fraction',
  precondition: (k: FactMap) => {
    const area = Number(k['triangle_area']);
    const r = Number(k['R']);
    if (isNaN(area) || isNaN(r)) return false;
    if (r <= 0 || area <= 0) return false;
    const maxK = ((3 * Math.sqrt(3)) / 4) * r * r;
    if (area > maxK + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const area = Number(k['triangle_area']);
    const r = Number(k['R']);
    return area / (Math.PI * r * r);
  },
};

// 21. DP-RADIAL-TRIPLET-TO-SIDES
// Reconstruction of triangle sides triplet from radial distances: a_i = 2 * √(R² - d_i²)
// Requires: radial_distance_a, radial_distance_b, radial_distance_c, R
// Provides: sides_triplet
// Precondition: R > 0, 0 <= d_i <= R for all i ∈ {a, b, c}, and reconstructed sides satisfy strict triangle inequality
// Operation: returns { side_a, side_b, side_c }
export const DP_RADIAL_TRIPLET_TO_SIDES: DerivationPath = {
  id: 'DP-RADIAL-TRIPLET-TO-SIDES',
  description: 'Восстановление тройки сторон по расстояниям от центра: a_i = 2√(R² - d_i²)',
  requires: ['radial_distance_a', 'radial_distance_b', 'radial_distance_c', 'R'],
  provides: 'sides_triplet',
  precondition: (k: FactMap) => {
    const r = Number(k['R']);
    const da = Number(k['radial_distance_a'] ?? k['d_a']);
    const db = Number(k['radial_distance_b'] ?? k['d_b']);
    const dc = Number(k['radial_distance_c'] ?? k['d_c']);
    if (isNaN(r) || isNaN(da) || isNaN(db) || isNaN(dc)) return false;
    if (r <= 0) return false;
    if (da < -1e-4 || da > r + 1e-4) return false;
    if (db < -1e-4 || db > r + 1e-4) return false;
    if (dc < -1e-4 || dc > r + 1e-4) return false;

    // Verify reconstructed sides satisfy triangle inequality
    const sa = 2 * Math.sqrt(Math.max(0, r * r - da * da));
    const sb = 2 * Math.sqrt(Math.max(0, r * r - db * db));
    const sc = 2 * Math.sqrt(Math.max(0, r * r - dc * dc));
    if (sa <= 1e-4 || sb <= 1e-4 || sc <= 1e-4) return false;
    if (sa + sb <= sc - 1e-4 || sb + sc <= sa - 1e-4 || sc + sa <= sb - 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const da = Math.max(0, Math.min(r, Number(k['radial_distance_a'] ?? k['d_a'])));
    const db = Math.max(0, Math.min(r, Number(k['radial_distance_b'] ?? k['d_b'])));
    const dc = Math.max(0, Math.min(r, Number(k['radial_distance_c'] ?? k['d_c'])));
    return {
      side_a: 2 * Math.sqrt(Math.max(0, r * r - da * da)),
      side_b: 2 * Math.sqrt(Math.max(0, r * r - db * db)),
      side_c: 2 * Math.sqrt(Math.max(0, r * r - dc * dc)),
    };
  },
};

// 22. DP-RADIAL-SUM-TO-INRADIUS
// Inradius derivation via acute radial distance sum: r = d_a + d_b + d_c - R
// Requires: radial_distance_a, radial_distance_b, radial_distance_c, R, is_acute
// Provides: inradius
// Precondition: is_acute === true, R > 0, 0 <= d_i <= R, r > 0, and r <= R / 2 + 1e-4 (Euler's inradius inequality)
// Operation: r = d_a + d_b + d_c - R
export const DP_RADIAL_SUM_TO_INRADIUS: DerivationPath = {
  id: 'DP-RADIAL-SUM-TO-INRADIUS',
  description: 'Радиус вписанной окружности остроугольного треугольника через сумму расстояний: r = d_a + d_b + d_c - R',
  requires: ['radial_distance_a', 'radial_distance_b', 'radial_distance_c', 'R', 'is_acute'],
  provides: 'inradius',
  precondition: (k: FactMap) => {
    if (k['is_acute'] !== true) return false;
    const r = Number(k['R']);
    const da = Number(k['radial_distance_a'] ?? k['d_a']);
    const db = Number(k['radial_distance_b'] ?? k['d_b']);
    const dc = Number(k['radial_distance_c'] ?? k['d_c']);
    if (isNaN(r) || isNaN(da) || isNaN(db) || isNaN(dc)) return false;
    if (r <= 0) return false;
    if (da < -1e-4 || da > r + 1e-4) return false;
    if (db < -1e-4 || db > r + 1e-4) return false;
    if (dc < -1e-4 || dc > r + 1e-4) return false;
    const inr = da + db + dc - r;
    if (inr <= 1e-4) return false;
    if (inr > r / 2 + 1e-4) return false;
    return true;
  },
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const da = Number(k['radial_distance_a'] ?? k['d_a']);
    const db = Number(k['radial_distance_b'] ?? k['d_b']);
    const dc = Number(k['radial_distance_c'] ?? k['d_c']);
    return da + db + dc - r;
  },
};

// Canonical graph array with S12 semantic closure extensions
export const CANONICAL_GRAPH: readonly DerivationPath[] = [
  DP_ANG_SUM_C,
  DP_PYTH_HYP,
  DP_INSC_TO_CENT,
  DP_CHORD_TRIG,
  DP_THALES_CLASS,
  DP_COORD_CLASS,
  DP_CHORD_TO_RADIAL_DIST,
  DP_RADIAL_DIST_TO_CHORD,
  DP_REF_DIAM_CHORD,
  DP_REF_DIAM_ANGLE,
  DP_SIDE_TO_MINOR_ANGLE,
  DP_TRANSFERRED_ANGLE_SUM,
  DP_OBTUSE_DIAGNOSTIC,
  DP_SUM_TO_OBTUSE_MAGNITUDE,
  DP_TRIANGLE_PERIMETER,
  DP_PERIMETER_TO_EQUIVALENT_ARC_ANGLE,
  DP_PERIMETER_TO_CIRCUMFERENCE_FRACTION,
  DP_TRIANGLE_AREA_ANGLES_R,
  DP_TRIANGLE_AREA_HERON,
  DP_NORMALIZED_AREA,
  DP_RADIAL_TRIPLET_TO_SIDES,
  DP_RADIAL_SUM_TO_INRADIUS,
  ...S12_CLOSURE_PATHS,
] as const;
