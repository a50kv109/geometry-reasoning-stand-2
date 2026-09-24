// src/kernel/hostAdapter.ts
// Host Adapter: converts host geometry state into FactMap without creating a second geometry model

import { FactMap, Point2D } from './types';
import { GeometrySnapshot } from '../types';

export interface HostGeometryInput {
  pointsU: { A: number; B: number; C: number };
  R: number;
  snapshot?: GeometrySnapshot;
}

/**
 * Maps existing host geometry state (pointsU, R, GeometrySnapshot) to FactMap
 * Enforces explicit semantics:
 * - angles in degrees
 * - points in Point2D {x, y}
 * - legs dynamically identified when right angle exists
 */
export function createFactMapFromHost(input: HostGeometryInput): FactMap {
  const { pointsU, R, snapshot } = input;
  const facts: FactMap = {};

  // 1. Radius
  facts['R'] = R;

  // 2. Vertex coordinates (x, y)
  const computeCoord = (u: number): Point2D => ({
    x: R * Math.cos(2 * Math.PI * u),
    y: R * Math.sin(2 * Math.PI * u),
  });

  const coordA = computeCoord(pointsU.A);
  const coordB = computeCoord(pointsU.B);
  const coordC = computeCoord(pointsU.C);

  facts['coord_A'] = coordA;
  facts['coord_B'] = coordB;
  facts['coord_C'] = coordC;

  // 3. Arcs & Central angles (in degrees)
  // d_BC is arc from B to C (subtends angle A)
  const dBC = (pointsU.C - pointsU.B + 1) % 1;
  const dCA = (pointsU.A - pointsU.C + 1) % 1;
  const dAB = (pointsU.B - pointsU.A + 1) % 1;

  facts['central_angle_BC'] = dBC * 360;
  facts['central_angle_CA'] = dCA * 360;
  facts['central_angle_AB'] = dAB * 360;

  // 4. Inscribed angles (in degrees)
  // By theorem: inscribed angle = central_angle / 2 = arc_fraction * 180
  const angleA = dBC * 180;
  const angleB = dCA * 180;
  const angleC = dAB * 180;

  facts['angle_A'] = angleA;
  facts['angle_B'] = angleB;
  facts['angle_C'] = angleC;

  // 5. Chords / side lengths
  // chord_BC = opposite vertex A
  // chord_CA = opposite vertex B
  // chord_AB = opposite vertex C
  const chordBC = 2 * R * Math.sin((dBC * Math.PI));
  const chordCA = 2 * R * Math.sin((dCA * Math.PI));
  const chordAB = 2 * R * Math.sin((dAB * Math.PI));

  facts['chord_BC'] = chordBC;
  facts['chord_CA'] = chordCA;
  facts['chord_AB'] = chordAB;

  // 6. Pythagorean Semantics (when angle_C == 90° or near 90°)
  // Section 5 of contract:
  // "При angle_C = 90°:
  //  leg_a = side/chord opposite A = BC
  //  leg_b = side/chord opposite B = AC
  //  hypotenuse_c = side/chord opposite C = AB"
  if (Math.abs(angleC - 90) < 1e-4) {
    facts['leg_a'] = chordBC;
    facts['leg_b'] = chordCA;
    facts['hypotenuse_c'] = chordAB;
  }

  // If snapshot is supplied, enrich/verify against snapshot values
  if (snapshot) {
    facts['snapshot_perimeter'] = snapshot.perimeter;
    facts['snapshot_area'] = snapshot.area;
  }

  return facts;
}
