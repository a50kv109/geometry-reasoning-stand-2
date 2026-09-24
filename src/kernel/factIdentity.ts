// src/kernel/factIdentity.ts
// Semantic Fact Identity, Role Mapping, and Composite Fact Decomposition Layer (Stage S12)
// Provides generic, deterministic, inspectable bridges between representations WITHOUT unsafe global string aliases.

import { DerivationPath, FactMap, FactValue, SidesTriplet } from './types';

/**
 * Explicit Contextual Semantic Role Mapping Descriptor
 */
export interface SemanticRoleMapping {
  readonly id: string;
  readonly description: string;
  readonly context: string;
  readonly sourceFact: string;
  readonly targetFact: string;
  readonly bidirectional: boolean;
  readonly precondition?: (facts: FactMap) => boolean;
  readonly transform?: (val: FactValue) => FactValue;
}

/**
 * Generic Composite Fact Schema
 */
export interface CompositeFactSchema<T = any> {
  readonly type: string;
  readonly compositeFactKey: string;
  readonly componentFactKeys: readonly string[];
  readonly unpack: (composite: T) => Record<string, FactValue>;
  readonly pack?: (components: FactMap) => T;
  readonly validate?: (composite: any) => boolean;
}

// --------------------------------------------------------------------------
// 1. Inscribed Triangle Convention Mappings:
// In triangle ΔABC inscribed in C(O, R):
// - side a is opposite vertex A -> chord BC
// - side b is opposite vertex B -> chord CA
// - side c is opposite vertex C -> chord AB
// --------------------------------------------------------------------------

function createTriangleConventionPrecondition(factKey: string) {
  return (k: FactMap): boolean => {
    if (k['triangle_convention'] === 'incompatible') return false;
    const val = Number(k[factKey]);
    if (isNaN(val) || val <= 1e-4) return false;
    if (k['R'] !== undefined) {
      const r = Number(k['R']);
      if (!isNaN(r) && r > 0 && val > 2 * r + 1e-4) return false;
    }
    return true;
  };
}

export const INSCRIBED_TRIANGLE_CONVENTIONS: readonly SemanticRoleMapping[] = [
  {
    id: 'ROLE-MAP-CHORD-BC-SIDE-A',
    description: 'Семантическое соответствие ΔABC: хорда BC описанной окружности тождественна стороне a',
    context: 'INSCRIBED_TRIANGLE_CONVENTION',
    sourceFact: 'chord_BC',
    targetFact: 'side_a',
    bidirectional: true,
    precondition: createTriangleConventionPrecondition('chord_BC'),
  },
  {
    id: 'ROLE-MAP-CHORD-CA-SIDE-B',
    description: 'Семантическое соответствие ΔABC: хорда CA описанной окружности тождественна стороне b',
    context: 'INSCRIBED_TRIANGLE_CONVENTION',
    sourceFact: 'chord_CA',
    targetFact: 'side_b',
    bidirectional: true,
    precondition: createTriangleConventionPrecondition('chord_CA'),
  },
  {
    id: 'ROLE-MAP-CHORD-AB-SIDE-C',
    description: 'Семантическое соответствие ΔABC: хорда AB описанной окружности тождественна стороне c',
    context: 'INSCRIBED_TRIANGLE_CONVENTION',
    sourceFact: 'chord_AB',
    targetFact: 'side_c',
    bidirectional: true,
    precondition: createTriangleConventionPrecondition('chord_AB'),
  },
];

// --------------------------------------------------------------------------
// 2. Generic Chord vs Named Chord Role Mapping:
// Distinguishes generic anonymous chord_length from named chord_BC
// Requires explicit contextual focus_chord to prevent accidental ambiguity.
// --------------------------------------------------------------------------

export const GENERIC_CHORD_MAPPINGS: readonly SemanticRoleMapping[] = [
  {
    id: 'ROLE-MAP-NAMED-TO-GENERIC-CHORD',
    description: 'Назначение роли: именованная хорда BC выступает в роли длины хорды chord_length',
    context: 'FOCUS_CHORD_CONTEXT',
    sourceFact: 'chord_BC',
    targetFact: 'chord_length',
    bidirectional: false,
    precondition: (k: FactMap) => {
      const val = Number(k['chord_BC']);
      if (isNaN(val) || val <= 1e-4) return false;
      const focus = k['focus_chord'];
      return focus === undefined || focus === 'BC';
    },
  },
  {
    id: 'ROLE-MAP-GENERIC-TO-NAMED-CHORD',
    description: 'Контекстная конкретизация: длина хорды chord_length сопоставляется с хордой BC',
    context: 'FOCUS_CHORD_CONTEXT',
    sourceFact: 'chord_length',
    targetFact: 'chord_BC',
    bidirectional: false,
    precondition: (k: FactMap) => {
      const val = Number(k['chord_length']);
      if (isNaN(val) || val <= 1e-4) return false;
      return k['focus_chord'] === 'BC';
    },
  },
];

// --------------------------------------------------------------------------
// 3. Composite Fact Schema for SidesTriplet
// --------------------------------------------------------------------------

export const SIDES_TRIPLET_SCHEMA: CompositeFactSchema<SidesTriplet> = {
  type: 'SidesTriplet',
  compositeFactKey: 'sides_triplet',
  componentFactKeys: ['side_a', 'side_b', 'side_c'],
  unpack: (c: SidesTriplet) => ({
    side_a: c.side_a,
    side_b: c.side_b,
    side_c: c.side_c,
  }),
  pack: (k: FactMap): SidesTriplet => ({
    side_a: Number(k['side_a']),
    side_b: Number(k['side_b']),
    side_c: Number(k['side_c']),
  }),
  validate: (c: any): boolean => {
    if (!c || typeof c !== 'object') return false;
    const a = Number(c.side_a);
    const b = Number(c.side_b);
    const cVal = Number(c.side_c);
    if (isNaN(a) || isNaN(b) || isNaN(cVal)) return false;
    if (a <= 1e-4 || b <= 1e-4 || cVal <= 1e-4) return false;
    return true;
  },
};

// --------------------------------------------------------------------------
// 4. DerivationPath Generators
// --------------------------------------------------------------------------

/**
 * Generates explicit DerivationPath steps for semantic role mappings
 */
export function generateSemanticMappingPaths(mappings: readonly SemanticRoleMapping[]): DerivationPath[] {
  const paths: DerivationPath[] = [];

  for (const m of mappings) {
    // Forward direction: sourceFact -> targetFact
    const forwardId = `DP-MAP-${m.sourceFact.toUpperCase().replace(/_/g, '-')}-TO-${m.targetFact.toUpperCase().replace(/_/g, '-')}`;
    paths.push({
      id: forwardId,
      description: m.description,
      requires: [m.sourceFact],
      provides: m.targetFact,
      precondition: m.precondition,
      operation: (k: FactMap) => {
        const val = k[m.sourceFact];
        return m.transform ? m.transform(val) : Number(val);
      },
    });

    // Backward direction if bidirectional: targetFact -> sourceFact
    if (m.bidirectional) {
      const backwardId = `DP-MAP-${m.targetFact.toUpperCase().replace(/_/g, '-')}-TO-${m.sourceFact.toUpperCase().replace(/_/g, '-')}`;
      const revPrecondition = createTriangleConventionPrecondition(m.targetFact);
      paths.push({
        id: backwardId,
        description: `Обратное семантическое соответствие: ${m.targetFact} тождественно ${m.sourceFact}`,
        requires: [m.targetFact],
        provides: m.sourceFact,
        precondition: revPrecondition,
        operation: (k: FactMap) => {
          const val = k[m.targetFact];
          return m.transform ? m.transform(val) : Number(val);
        },
      });
    }
  }

  return paths;
}

/**
 * Generates explicit DerivationPath steps for composite fact decomposition
 */
export function generateCompositeDecompositionPaths(schema: CompositeFactSchema): DerivationPath[] {
  const paths: DerivationPath[] = [];

  for (const compKey of schema.componentFactKeys) {
    const compSuffix = compKey.replace(/^side_/, '').toUpperCase();
    const id = `DP-DECOMPOSE-${schema.compositeFactKey.toUpperCase().replace(/_/g, '-')}-${compSuffix}`;
    paths.push({
      id,
      description: `Распаковка составного факта ${schema.compositeFactKey}: извлечение ${compKey}`,
      requires: [schema.compositeFactKey],
      provides: compKey,
      precondition: (k: FactMap) => {
        const composite = k[schema.compositeFactKey];
        if (!composite) return false;
        return schema.validate ? schema.validate(composite) : true;
      },
      operation: (k: FactMap) => {
        const composite = k[schema.compositeFactKey];
        const unpacked = schema.unpack(composite);
        return unpacked[compKey];
      },
    });
  }

  return paths;
}

// --------------------------------------------------------------------------
// 5. Symmetric Inscribed-Angle Paths (Vertices B and C)
// --------------------------------------------------------------------------

export const DP_INSC_TO_CENT_B: DerivationPath = {
  id: 'DP-INSC-TO-CENT-B',
  description: 'Теорема о вписанном угле B: центральный угол дуги CA = 2 * угол B',
  requires: ['angle_B'],
  provides: 'central_angle_CA',
  precondition: (k: FactMap) => {
    const b = Number(k['angle_B']);
    return !isNaN(b) && b > 1e-4 && b < 180 - 1e-4;
  },
  operation: (k: FactMap) => 2 * Number(k['angle_B']),
};

export const DP_CHORD_TRIG_CA: DerivationPath = {
  id: 'DP-CHORD-TRIG-CA',
  description: 'Длина хорды CA через радиус и центральный угол: 2R * sin(central_CA / 2)',
  requires: ['R', 'central_angle_CA'],
  provides: 'chord_CA',
  precondition: (k: FactMap) => {
    const r = Number(k['R']);
    const cDeg = Number(k['central_angle_CA']);
    return !isNaN(r) && !isNaN(cDeg) && r > 0 && cDeg > 0 && cDeg < 360;
  },
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const cDeg = Number(k['central_angle_CA']);
    return 2 * r * Math.sin(((cDeg / 2) * Math.PI) / 180);
  },
};

export const DP_INSC_TO_CENT_C: DerivationPath = {
  id: 'DP-INSC-TO-CENT-C',
  description: 'Теорема о вписанном угле C: центральный угол дуги AB = 2 * угол C',
  requires: ['angle_C'],
  provides: 'central_angle_AB',
  precondition: (k: FactMap) => {
    const c = Number(k['angle_C']);
    return !isNaN(c) && c > 1e-4 && c < 180 - 1e-4;
  },
  operation: (k: FactMap) => 2 * Number(k['angle_C']),
};

export const DP_CHORD_TRIG_AB: DerivationPath = {
  id: 'DP-CHORD-TRIG-AB',
  description: 'Длина хорды AB через радиус и центральный угол: 2R * sin(central_AB / 2)',
  requires: ['R', 'central_angle_AB'],
  provides: 'chord_AB',
  precondition: (k: FactMap) => {
    const r = Number(k['R']);
    const cDeg = Number(k['central_angle_AB']);
    return !isNaN(r) && !isNaN(cDeg) && r > 0 && cDeg > 0 && cDeg < 360;
  },
  operation: (k: FactMap) => {
    const r = Number(k['R']);
    const cDeg = Number(k['central_angle_AB']);
    return 2 * r * Math.sin(((cDeg / 2) * Math.PI) / 180);
  },
};

// --------------------------------------------------------------------------
// 6. Transferred-Angle Bridge Paths
// Explicit role mapping connecting side_a, side_b, side_c to theta_a, theta_b, theta_c
// --------------------------------------------------------------------------

function createTransferredAnglePath(sideKey: 'side_a' | 'side_b' | 'side_c', targetAngleKey: 'theta_a' | 'theta_b' | 'theta_c'): DerivationPath {
  const sideLetter = sideKey.replace('side_', '');
  return {
    id: `DP-SIDE-${sideLetter.toUpperCase()}-TO-TRANSFERRED-ANGLE`,
    description: `Малый центральный угол, перенесенный для стороны ${sideLetter}: ${targetAngleKey} = 2 * arcsin(${sideKey} / 2R)`,
    requires: [sideKey, 'R'],
    provides: targetAngleKey,
    precondition: (k: FactMap) => {
      const r = Number(k['R']);
      const s = Number(k[sideKey]);
      if (isNaN(r) || isNaN(s)) return false;
      if (r <= 0 || s <= 1e-4) return false;
      if (s > 2 * r + 1e-4) return false;
      return true;
    },
    operation: (k: FactMap) => {
      const r = Number(k['R']);
      const s = Math.max(0, Number(k[sideKey]));
      const ratio = Math.max(0, Math.min(1, s / (2 * r)));
      return (2 * Math.asin(ratio) * 180) / Math.PI;
    },
  };
}

export const DP_SIDE_A_TO_TRANSFERRED_ANGLE = createTransferredAnglePath('side_a', 'theta_a');
export const DP_SIDE_B_TO_TRANSFERRED_ANGLE = createTransferredAnglePath('side_b', 'theta_b');
export const DP_SIDE_C_TO_TRANSFERRED_ANGLE = createTransferredAnglePath('side_c', 'theta_c');

// --------------------------------------------------------------------------
// 7. Side to Radial Distance Bridges (Pythagorean Invariant)
// --------------------------------------------------------------------------

function createSideToRadialDistPath(
  sideKey: 'side_a' | 'side_b' | 'side_c',
  targetDistKey: 'radial_distance_a' | 'radial_distance_b' | 'radial_distance_c'
): DerivationPath {
  const sideLetter = sideKey.replace('side_', '');
  return {
    id: `DP-SIDE-${sideLetter.toUpperCase()}-TO-RADIAL-DIST`,
    description: `Расстояние от центра до стороны ${sideLetter}: ${targetDistKey} = √(R² - (${sideKey}/2)²)`,
    requires: [sideKey, 'R'],
    provides: targetDistKey,
    precondition: (k: FactMap) => {
      const r = Number(k['R']);
      const s = Number(k[sideKey]);
      if (isNaN(r) || isNaN(s) || r <= 0 || s <= 1e-4) return false;
      if (s > 2 * r + 1e-4) return false;
      return true;
    },
    operation: (k: FactMap) => {
      const r = Number(k['R']);
      const s = Number(k[sideKey]);
      return Math.sqrt(Math.max(0, r * r - (s * s) / 4));
    },
  };
}

export const DP_SIDE_A_TO_RADIAL_DIST = createSideToRadialDistPath('side_a', 'radial_distance_a');
export const DP_SIDE_B_TO_RADIAL_DIST = createSideToRadialDistPath('side_b', 'radial_distance_b');
export const DP_SIDE_C_TO_RADIAL_DIST = createSideToRadialDistPath('side_c', 'radial_distance_c');

// --------------------------------------------------------------------------
// 8. Complete S12 Graph Closure Extensions
// --------------------------------------------------------------------------

export const S12_CLOSURE_PATHS: readonly DerivationPath[] = [
  // Symmetric inscribed angle paths
  DP_INSC_TO_CENT_B,
  DP_CHORD_TRIG_CA,
  DP_INSC_TO_CENT_C,
  DP_CHORD_TRIG_AB,

  // Semantic role mappings (triangle convention + generic chord)
  ...generateSemanticMappingPaths(INSCRIBED_TRIANGLE_CONVENTIONS),
  ...generateSemanticMappingPaths(GENERIC_CHORD_MAPPINGS),

  // Composite fact decompositions
  ...generateCompositeDecompositionPaths(SIDES_TRIPLET_SCHEMA),

  // Transferred-angle bridges
  DP_SIDE_A_TO_TRANSFERRED_ANGLE,
  DP_SIDE_B_TO_TRANSFERRED_ANGLE,
  DP_SIDE_C_TO_TRANSFERRED_ANGLE,

  // Radial distance bridges
  DP_SIDE_A_TO_RADIAL_DIST,
  DP_SIDE_B_TO_RADIAL_DIST,
  DP_SIDE_C_TO_RADIAL_DIST,
];
