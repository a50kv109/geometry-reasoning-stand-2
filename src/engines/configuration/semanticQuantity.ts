// src/engines/configuration/semanticQuantity.ts
// Pure, deterministic semantic quantity projection layer for Package S-03 (Semantic Quantity).
// Principles:
// 1. "The Stand must not lie."
// 2. Wrap numerical values in explicit semantic metadata (semanticType, unit, context, epistemicStatus).
// 3. ZERO mutation of Geometry Core: Geometry Core continues returning canonical numerical floats.
// 4. Guaranteed 100% deterministic, timestamp-free, and read-only.

import { EpistemicStatus } from '../research/researchTypes';
import { FullGeometryState } from '../constructionCore';
import { computeGeometryBase } from '../geometryState';
import { deriveChordArcRelations, deriveCentralInscribedRelations } from '../research/derivedRelations';

/**
 * Standardized semantic quantity types distinguishing geometric meaning.
 */
export type SemanticQuantityType =
  | 'INTERIOR_ANGLE'              // Angle inside a polygon/triangle at a vertex (e.g. ∠ABC in (0, 180°))
  | 'ORIENTED_ANGLE'              // Polar position angle on circle or relative to axis in [0, 360°)
  | 'CENTRAL_ANGLE'               // Angle subtended at the center of circumcircle by an arc (θ)
  | 'INSCRIBED_ANGLE'             // Inscribed angle on the circle subtending an arc (α = θ/2)
  | 'ANGLE_BETWEEN_LINES'         // Angle between two intersecting or parallel lines
  | 'CHORD_LENGTH'                // Euclidean distance between two points on the circumcircle
  | 'SEGMENT_LENGTH'              // Euclidean distance between any two points
  | 'ARC_LENGTH'                  // Curvilinear distance along circle arc
  | 'RADIUS'                      // Circle radius (R)
  | 'DIAMETER'                    // Circle diameter (2R)
  | 'PERIMETER'                   // Perimeter of triangle or polygon
  | 'AREA'                        // Area of triangle or shape
  | 'RATIO_CHORD_TO_DIAMETER'     // Normalized ratio c / (2R) <= 1.0
  | 'CIRCLE_FRACTION'             // Cyclic coordinate u in [0, 1) or fraction of full turn
  | 'DISTANCE_TO_ORIGIN'          // Distance from coordinate origin O(0,0)
  | 'SLOPE'                       // Slope dy/dx of a line
  | 'COORDINATE_U'                // Normalized position on unit circle [0, 1)
  | 'COORDINATE_X'                // Cartesian X coordinate
  | 'COORDINATE_Y';               // Cartesian Y coordinate

/**
 * Standard physical and mathematical units.
 */
export type QuantityUnit =
  | 'DEGREE'
  | 'RADIAN'
  | 'MM'
  | 'MM2'
  | 'UNITLESS_RATIO'
  | 'CYCLE_FRACTION'
  | 'COORDINATE';

/**
 * Context describing what geometric entities define this quantity.
 */
export interface SemanticQuantityContext {
  readonly entityId?: string;
  readonly vertexId?: string;
  readonly arms?: readonly string[];
  readonly endpoints?: readonly [string, string];
  readonly chordLabel?: string;
  readonly arcId?: string;
  readonly referenceId?: string;
  readonly [key: string]: unknown;
}

/**
 * Immutable Semantic Quantity DTO.
 */
export interface SemanticQuantity {
  readonly id: string;
  readonly name: string;
  readonly value: number;
  readonly unit: QuantityUnit;
  readonly semanticType: SemanticQuantityType;
  readonly context: SemanticQuantityContext;
  readonly source: string;
  readonly epistemicStatus: EpistemicStatus;
  readonly formatted: string;
  readonly isExact?: boolean;
  readonly bounds?: { readonly min: number; readonly max: number };
}

/**
 * Factory for creating an immutable SemanticQuantity DTO.
 */
export function createSemanticQuantity(
  params: {
    id: string;
    name: string;
    value: number;
    unit: QuantityUnit;
    semanticType: SemanticQuantityType;
    context?: SemanticQuantityContext;
    source?: string;
    epistemicStatus?: EpistemicStatus;
    formatted?: string;
    isExact?: boolean;
    bounds?: { min: number; max: number };
  }
): SemanticQuantity {
  let formatted = params.formatted;
  if (!formatted) {
    switch (params.unit) {
      case 'DEGREE':
        formatted = `${params.value.toFixed(2)}°`;
        break;
      case 'RADIAN':
        formatted = `${params.value.toFixed(4)} rad`;
        break;
      case 'MM':
        formatted = `${params.value.toFixed(2)} мм`;
        break;
      case 'MM2':
        formatted = `${params.value.toFixed(2)} мм²`;
        break;
      case 'CYCLE_FRACTION':
        formatted = `${params.value.toFixed(4)} круга`;
        break;
      case 'UNITLESS_RATIO':
        formatted = params.value.toFixed(4);
        break;
      default:
        formatted = String(params.value);
    }
  }

  return Object.freeze({
    id: params.id,
    name: params.name,
    value: params.value,
    unit: params.unit,
    semanticType: params.semanticType,
    context: Object.freeze(params.context ?? {}),
    source: params.source ?? 'GeometryCore',
    epistemicStatus: params.epistemicStatus ?? 'MEASUREMENT',
    formatted,
    isExact: params.isExact,
    bounds: params.bounds ? Object.freeze(params.bounds) : undefined,
  });
}

/**
 * Pure projection function: Extracts all semantic quantities from the canonical geometry state.
 * Never mutates state, zero background caches.
 */
export function extractSemanticQuantities(
  state: FullGeometryState,
  scale: number = 1.0
): readonly SemanticQuantity[] {
  const quantities: SemanticQuantity[] = [];
  const R_mm = Number((state.R * scale).toFixed(2));
  const diameter_mm = Number((2 * R_mm).toFixed(2));

  // --- 1. Global Circumcircle & Circumradius Quantities ---
  quantities.push(
    createSemanticQuantity({
      id: 'QTY-CIRCUMRADIUS',
      name: 'Радиус описанной окружности R',
      value: R_mm,
      unit: 'MM',
      semanticType: 'RADIUS',
      context: { entityId: 'base_circle' },
      source: 'GeometryCore',
      epistemicStatus: 'FACT',
      formatted: `${R_mm} мм`,
      isExact: true,
      bounds: { min: 0, max: Infinity },
    })
  );

  quantities.push(
    createSemanticQuantity({
      id: 'QTY-DIAMETER',
      name: 'Диаметр описанной окружности 2R',
      value: diameter_mm,
      unit: 'MM',
      semanticType: 'DIAMETER',
      context: { entityId: 'base_circle' },
      source: 'GeometryCore',
      epistemicStatus: 'FACT',
      formatted: `${diameter_mm} мм`,
      isExact: true,
      bounds: { min: 0, max: Infinity },
    })
  );

  // --- 2. Base Triangle Geometry Quantities ---
  if (state.pointsU) {
    const geoBase = computeGeometryBase(state.pointsU, state.R);

    // Vertex Coordinates & Polar Angles
    for (const v of geoBase.vertices) {
      const uVal = Number(v.u.toFixed(6));
      const polarDeg = Number(v.angleDeg.toFixed(2));
      const x_mm = Number((v.x * scale).toFixed(2));
      const y_mm = Number((v.y * scale).toFixed(2));

      quantities.push(
        createSemanticQuantity({
          id: `QTY-U-${v.id}`,
          name: `Циклическая координата u(${v.id})`,
          value: uVal,
          unit: 'CYCLE_FRACTION',
          semanticType: 'COORDINATE_U',
          context: { entityId: v.id, vertexId: v.id },
          source: 'GeometryCore',
          epistemicStatus: 'FACT',
          formatted: `${uVal} круга`,
          bounds: { min: 0, max: 1 },
        })
      );

      quantities.push(
        createSemanticQuantity({
          id: `QTY-POLAR-ANGLE-${v.id}`,
          name: `Полярный угол вершины ${v.id}`,
          value: polarDeg,
          unit: 'DEGREE',
          semanticType: 'ORIENTED_ANGLE',
          context: { entityId: v.id, vertexId: v.id },
          source: 'GeometryCore',
          epistemicStatus: 'FACT',
          formatted: `${polarDeg}°`,
          bounds: { min: 0, max: 360 },
        })
      );

      quantities.push(
        createSemanticQuantity({
          id: `QTY-COORD-X-${v.id}`,
          name: `Координата X вершины ${v.id}`,
          value: x_mm,
          unit: 'MM',
          semanticType: 'COORDINATE_X',
          context: { entityId: v.id, vertexId: v.id },
          source: 'GeometryCore',
          epistemicStatus: 'FACT',
          formatted: `${x_mm} мм`,
        })
      );

      quantities.push(
        createSemanticQuantity({
          id: `QTY-COORD-Y-${v.id}`,
          name: `Координата Y вершины ${v.id}`,
          value: y_mm,
          unit: 'MM',
          semanticType: 'COORDINATE_Y',
          context: { entityId: v.id, vertexId: v.id },
          source: 'GeometryCore',
          epistemicStatus: 'FACT',
          formatted: `${y_mm} мм`,
        })
      );
    }

    // Arc Quantities & Central Angles
    for (const [key, arc] of Object.entries(geoBase.arcs)) {
      const arcDeg = Number(arc.deg.toFixed(2));
      const arcFraction = Number(arc.fraction.toFixed(4));
      const arcLength_mm = Number(((arcDeg / 360) * 2 * Math.PI * R_mm).toFixed(2));

      quantities.push(
        createSemanticQuantity({
          id: `QTY-CENTRAL-ANGLE-${key}`,
          name: `Центральный угол дуги ${arc.chordLabel} (∠${arc.startId}O${arc.endId})`,
          value: arcDeg,
          unit: 'DEGREE',
          semanticType: 'CENTRAL_ANGLE',
          context: {
            arcId: `arc_${key}`,
            chordLabel: arc.chordLabel,
            endpoints: [arc.startId, arc.endId],
            oppositeVertexId: arc.oppositeVertexId,
          },
          source: 'DerivedRelations',
          epistemicStatus: arc.isDiameter ? 'VERIFIED_INVARIANT' : 'OBSERVATION',
          formatted: `${arcDeg}°`,
          isExact: arc.isDiameter,
          bounds: { min: 0, max: 360 },
        })
      );

      quantities.push(
        createSemanticQuantity({
          id: `QTY-ARC-LENGTH-${key}`,
          name: `Длина дуги ${arc.chordLabel}`,
          value: arcLength_mm,
          unit: 'MM',
          semanticType: 'ARC_LENGTH',
          context: {
            arcId: `arc_${key}`,
            chordLabel: arc.chordLabel,
            fraction: arcFraction,
          },
          source: 'DerivedRelations',
          epistemicStatus: 'MEASUREMENT',
          formatted: `${arcLength_mm} мм`,
          bounds: { min: 0, max: Number((2 * Math.PI * R_mm).toFixed(2)) },
        })
      );
    }
  }

  // --- 3. Derived Chord & Arc Relations ---
  const chordArcRelations = deriveChordArcRelations(state, scale);
  for (const rel of chordArcRelations) {
    quantities.push(
      createSemanticQuantity({
        id: `QTY-CHORD-LENGTH-${rel.chordId}`,
        name: `Длина хорды [${rel.p1Name}${rel.p2Name}]`,
        value: rel.chordLength,
        unit: 'MM',
        semanticType: 'CHORD_LENGTH',
        context: {
          entityId: rel.chordId,
          endpoints: [rel.p1Id, rel.p2Id],
          isDiameter: rel.isDiameter,
        },
        source: 'GeometryCore',
        epistemicStatus: 'MEASUREMENT',
        formatted: `${rel.chordLength} мм`,
        bounds: { min: 0, max: diameter_mm },
      })
    );

    quantities.push(
      createSemanticQuantity({
        id: `QTY-RATIO-TO-DIAMETER-${rel.chordId}`,
        name: `Отношение хорды [${rel.p1Name}${rel.p2Name}] к диаметру (c/2R)`,
        value: rel.ratioChordToDiameter,
        unit: 'UNITLESS_RATIO',
        semanticType: 'RATIO_CHORD_TO_DIAMETER',
        context: {
          entityId: rel.chordId,
          endpoints: [rel.p1Id, rel.p2Id],
          isDiameter: rel.isDiameter,
        },
        source: 'DerivedRelations',
        epistemicStatus: rel.isDiameter ? 'VERIFIED_INVARIANT' : 'OBSERVATION',
        formatted: rel.ratioChordToDiameter.toFixed(4),
        isExact: rel.isDiameter,
        bounds: { min: 0, max: 1 },
      })
    );
  }

  // --- 4. Central & Inscribed Angles ---
  if (state.pointsU) {
    const centralInscribed = deriveCentralInscribedRelations(state.pointsU, state.R);
    for (const rel of centralInscribed) {
      if (rel.inscribedAngleDeg !== undefined) {
        const angleVal = Number(rel.inscribedAngleDeg.toFixed(2));
        const vertex = String(rel.inscribedVertexId || 'C');

        quantities.push(
          createSemanticQuantity({
            id: `QTY-INSCRIBED-ANGLE-${rel.arcId}`,
            name: `Вписанный угол над дугой ${rel.chordLabel} (∠ при вершине ${vertex})`,
            value: angleVal,
            unit: 'DEGREE',
            semanticType: 'INSCRIBED_ANGLE',
            context: {
              arcId: rel.arcId,
              chordLabel: rel.chordLabel,
              vertexId: vertex,
              isRightAngle: rel.isRightAngle,
            },
            source: 'DerivedRelations',
            epistemicStatus: rel.isRightAngle ? 'VERIFIED_INVARIANT' : 'KNOWN_RELATION_MATCH',
            formatted: `${angleVal}°`,
            isExact: rel.isRightAngle,
            bounds: { min: 0, max: 180 },
          })
        );
      }
    }
  }

  // --- 5. Generic Segments in State (if not already covered as chord) ---
  for (const seg of Object.values(state.segments)) {
    if (quantities.some((q) => q.context.entityId === seg.id)) continue;
    const len_mm = Number((seg.length * scale).toFixed(2));
    quantities.push(
      createSemanticQuantity({
        id: `QTY-SEGMENT-LENGTH-${seg.id}`,
        name: `Длина отрезка [${seg.p1Id}${seg.p2Id}]`,
        value: len_mm,
        unit: 'MM',
        semanticType: 'SEGMENT_LENGTH',
        context: {
          entityId: seg.id,
          endpoints: [seg.p1Id, seg.p2Id],
        },
        source: 'GeometryCore',
        epistemicStatus: 'MEASUREMENT',
        formatted: `${len_mm} мм`,
        bounds: { min: 0, max: Infinity },
      })
    );
  }

  // --- 6. Lines (Slope) ---
  for (const line of Object.values(state.lines)) {
    const p1 = state.points[line.p1Id];
    const p2 = state.points[line.p2Id];
    if (!p1 || !p2) continue;
    const isVert = Math.abs(p2.x - p1.x) < 1e-6;
    const slopeVal = !isVert ? Number(((p2.y - p1.y) / (p2.x - p1.x)).toFixed(4)) : Infinity;

    quantities.push(
      createSemanticQuantity({
        id: `QTY-LINE-SLOPE-${line.id}`,
        name: `Угловой коэффициент прямой (${line.p1Id}${line.p2Id})`,
        value: isVert ? 999999 : slopeVal,
        unit: 'UNITLESS_RATIO',
        semanticType: 'SLOPE',
        context: {
          entityId: line.id,
          endpoints: [line.p1Id, line.p2Id],
          isVertical: isVert,
        },
        source: 'GeometryCore',
        epistemicStatus: 'FACT',
        formatted: isVert ? '∞ (вертикальная)' : String(slopeVal),
      })
    );
  }

  return Object.freeze(quantities);
}

/**
 * Filters a list of semantic quantities by entity ID.
 */
export function findSemanticQuantitiesByEntity(
  quantities: readonly SemanticQuantity[],
  entityId: string
): readonly SemanticQuantity[] {
  const cleanId = entityId.startsWith('pt_') ? entityId.slice(3) : entityId;
  const ptPrefixed = `pt_${cleanId}`;
  return quantities.filter(
    (q) =>
      q.context.entityId === entityId ||
      q.context.entityId === cleanId ||
      q.context.entityId === ptPrefixed ||
      q.context.vertexId === cleanId ||
      q.context.arcId === entityId
  );
}
