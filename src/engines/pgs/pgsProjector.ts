// src/engines/pgs/pgsProjector.ts
// Projects FullGeometryState (SSOT) into Canonical PGS-2D Passport
// Complies with "One Geometry, Many Clients", EXACT_STATE transferMode, and Portable Identity rules

import { FullGeometryState } from '../constructionCore';
import { computeGeometryBase } from '../geometryState';
import {
  PGS2DPassport,
  PGSPoint2D,
  PGSSegment2D,
  PGSLine2D,
  PGSCircle2D,
  PGSPolygon,
  PGSPolygonTopology,
  PGSRelation,
  PGSMeasurement,
} from './types';

export interface PGSProjectorOptions {
  standId?: string;
  comment?: string;
}

export function projectStateToPgsPassport(
  state: FullGeometryState,
  options: PGSProjectorOptions = {}
): PGS2DPassport {
  const { standId = 'geometry-reasoning-stand-2', comment } = options;

  const R = state.R;
  const pA = state.points.A;
  const pB = state.points.B;
  const pC = state.points.C;

  if (!pA || !pB || !pC) {
    throw new Error('FullGeometryState is missing primary vertices A, B, or C');
  }

  // 1. Primary Objects
  const ptA: PGSPoint2D = {
    type: 'Point2D',
    portableId: 'pt_A',
    localId: pA.id,
    displayLabel: pA.name || 'A',
    role: 'vertex',
    x: pA.x,
    y: pA.y,
  };

  const ptB: PGSPoint2D = {
    type: 'Point2D',
    portableId: 'pt_B',
    localId: pB.id,
    displayLabel: pB.name || 'B',
    role: 'vertex',
    x: pB.x,
    y: pB.y,
  };

  const ptC: PGSPoint2D = {
    type: 'Point2D',
    portableId: 'pt_C',
    localId: pC.id,
    displayLabel: pC.name || 'C',
    role: 'vertex',
    x: pC.x,
    y: pC.y,
  };

  const ptO: PGSPoint2D = {
    type: 'Point2D',
    portableId: 'pt_O',
    localId: 'O',
    displayLabel: 'O',
    role: 'center',
    x: 0,
    y: 0,
  };

  // Boundary Edges
  const edgeAB: PGSSegment2D = {
    type: 'Segment2D',
    portableId: 'edge_AB',
    localId: 'chord_AB',
    displayLabel: 'AB',
    role: 'boundary_edge',
    p1Id: 'pt_A',
    p2Id: 'pt_B',
    length: Math.hypot(pB.x - pA.x, pB.y - pA.y),
  };

  const edgeBC: PGSSegment2D = {
    type: 'Segment2D',
    portableId: 'edge_BC',
    localId: 'chord_BC',
    displayLabel: 'BC',
    role: 'boundary_edge',
    p1Id: 'pt_B',
    p2Id: 'pt_C',
    length: Math.hypot(pC.x - pB.x, pC.y - pB.y),
  };

  const edgeCA: PGSSegment2D = {
    type: 'Segment2D',
    portableId: 'edge_CA',
    localId: 'chord_CA',
    displayLabel: 'CA',
    role: 'boundary_edge',
    p1Id: 'pt_C',
    p2Id: 'pt_A',
    length: Math.hypot(pA.x - pC.x, pA.y - pC.y),
  };

  // Polygon(3)
  const polygon: PGSPolygon = {
    type: 'Polygon',
    portableId: 'poly_ABC',
    localId: 'triangle_ABC',
    displayLabel: 'ΔABC',
    vertexCount: 3,
    vertexIds: ['pt_A', 'pt_B', 'pt_C'],
  };

  // Base Circumcircle
  const circumcircle: PGSCircle2D = {
    type: 'Circle2D',
    portableId: 'circle_circumcircle',
    localId: 'base_circle',
    displayLabel: 'ω',
    role: 'circumcircle',
    centerId: 'pt_O',
    radius: R,
  };

  // 2. Auxiliary Construction Objects
  const auxObjects: (PGSPoint2D | PGSSegment2D | PGSLine2D | PGSCircle2D)[] = [];

  // Aux Points
  Object.values(state.points).forEach((pt) => {
    if (pt.id !== 'A' && pt.id !== 'B' && pt.id !== 'C' && pt.id !== 'O') {
      auxObjects.push({
        type: 'Point2D',
        portableId: `pt_${pt.id}`,
        localId: pt.id,
        displayLabel: pt.name || pt.id,
        role: 'auxiliary_point',
        x: pt.x,
        y: pt.y,
      });
    }
  });

  // Aux Lines
  Object.values(state.lines).forEach((line) => {
    auxObjects.push({
      type: 'Line2D',
      portableId: `line_${line.id}`,
      localId: line.id,
      displayLabel: line.id,
      role: 'construction_line',
      p1Id: `pt_${line.p1Id}`,
      p2Id: `pt_${line.p2Id}`,
    });
  });

  // Aux Circles
  Object.values(state.circles).forEach((circle) => {
    if (!circle.isBaseCircumcircle) {
      auxObjects.push({
        type: 'Circle2D',
        portableId: `circle_${circle.id}`,
        localId: circle.id,
        displayLabel: circle.id,
        role: 'auxiliary_circle',
        centerId: `pt_${circle.centerId}`,
        radius: circle.radius,
      });
    }
  });

  // 3. Topology
  const polygonTopology: PGSPolygonTopology = {
    type: 'PolygonTopology',
    polygonId: 'poly_ABC',
    vertexIds: ['pt_A', 'pt_B', 'pt_C'],
    edgeIds: ['edge_AB', 'edge_BC', 'edge_CA'],
  };

  // 4. Relations
  const relations: PGSRelation[] = [
    {
      id: 'rel_concyclic_ABC',
      type: 'concyclic',
      sourceIds: ['pt_A', 'pt_B', 'pt_C', 'circle_circumcircle'],
      description: 'Vertices A, B, C lie on circumcircle ω',
    },
    {
      id: 'rel_center_O',
      type: 'center_of',
      sourceIds: ['pt_O', 'circle_circumcircle'],
      description: 'Point O is center of circumcircle ω',
    },
  ];

  // 5. Measurements
  const geoBase = computeGeometryBase(state.pointsU, R);

  // Inscribed Angles
  const angleA = geoBase.arcs.BC.fraction * 180;
  const angleB = geoBase.arcs.CA.fraction * 180;
  const angleC = geoBase.arcs.AB.fraction * 180;

  const perimeter = edgeAB.length! + edgeBC.length! + edgeCA.length!;
  const s = perimeter / 2;
  const area = Math.sqrt(Math.max(0, s * (s - edgeAB.length!) * (s - edgeBC.length!) * (s - edgeCA.length!)));

  const measurements: PGSMeasurement[] = [
    { id: 'm_length_AB', targetId: 'edge_AB', property: 'length', value: edgeAB.length!, unit: 'mm' },
    { id: 'm_length_BC', targetId: 'edge_BC', property: 'length', value: edgeBC.length!, unit: 'mm' },
    { id: 'm_length_CA', targetId: 'edge_CA', property: 'length', value: edgeCA.length!, unit: 'mm' },
    { id: 'm_angle_A', targetId: 'pt_A', property: 'angle', value: angleA, unit: 'deg' },
    { id: 'm_angle_B', targetId: 'pt_B', property: 'angle', value: angleB, unit: 'deg' },
    { id: 'm_angle_C', targetId: 'pt_C', property: 'angle', value: angleC, unit: 'deg' },
    { id: 'm_radius_R', targetId: 'circle_circumcircle', property: 'radius', value: R, unit: 'mm' },
    { id: 'm_perimeter', targetId: 'poly_ABC', property: 'perimeter', value: perimeter, unit: 'mm' },
    { id: 'm_area', targetId: 'poly_ABC', property: 'area', value: area, unit: 'mm^2' },
  ];

  return {
    meta: {
      format: 'PGS-2D',
      version: '0.1',
      generator: 'Geometry Reasoning Stand 2 (Triangle Stand)',
      exportedAt: new Date().toISOString(),
      transferMode: 'EXACT_STATE',
    },
    sourceClaim: {
      verified: true,
      standId,
      timestamp: new Date().toISOString(),
      comment: comment || 'Exported EXACT_STATE from FullGeometryState SSOT',
    },
    objects: [ptA, ptB, ptC, ptO, edgeAB, edgeBC, edgeCA, polygon, circumcircle, ...auxObjects],
    topology: [polygonTopology],
    relations,
    measurements,
  };
}
