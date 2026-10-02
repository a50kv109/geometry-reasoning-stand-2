// src/engines/pgs/types.ts
// Canonical PGS-2D v0.1 Inter-Stand Contract Specifications
// Complies with "Object != Representation", "portableId != localId", and "sourceClaim != receiverVerification"

export type PGSTransferMode = 'EXACT_STATE' | 'CONSTRUCTIVE_STATE';

export interface PGSPortableIdentity {
  portableId: string;
  localId?: string;
  displayLabel?: string;
}

export interface PGSPoint2D extends PGSPortableIdentity {
  type: 'Point2D';
  role: 'vertex' | 'center' | 'auxiliary_point' | 'free_point';
  x: number;
  y: number;
}

export interface PGSSegment2D extends PGSPortableIdentity {
  type: 'Segment2D';
  role: 'boundary_edge' | 'auxiliary_segment';
  p1Id: string; // portableId of start point
  p2Id: string; // portableId of end point
  length?: number;
}

export interface PGSLine2D extends PGSPortableIdentity {
  type: 'Line2D';
  role: 'construction_line' | 'auxiliary_line';
  p1Id: string; // portableId of point 1
  p2Id: string; // portableId of point 2
}

export interface PGSCircle2D extends PGSPortableIdentity {
  type: 'Circle2D';
  role: 'circumcircle' | 'auxiliary_circle';
  centerId: string; // portableId of center point
  radius: number;
}

export interface PGSPolygon extends PGSPortableIdentity {
  type: 'Polygon';
  vertexCount: number; // 3 for Triangle Stand
  vertexIds: string[]; // array of portableIds in cyclic order
}

export type PGSObject = PGSPoint2D | PGSSegment2D | PGSLine2D | PGSCircle2D | PGSPolygon;

export interface PGSPolygonTopology {
  type: 'PolygonTopology';
  polygonId: string; // portableId of Polygon
  vertexIds: string[]; // portableIds [pt_A, pt_B, pt_C]
  edgeIds: string[]; // portableIds [edge_AB, edge_BC, edge_CA]
}

export type PGSTopology = PGSPolygonTopology;

export interface PGSRelation {
  id: string;
  type: 'incident' | 'concyclic' | 'center_of' | 'perpendicular' | 'parallel' | 'on_circle';
  sourceIds: string[]; // portableIds of involved objects
  description?: string;
}

export interface PGSMeasurement {
  id: string;
  targetId: string; // portableId of target object
  property: 'length' | 'angle' | 'area' | 'perimeter' | 'radius';
  value: number;
  unit: 'mm' | 'deg' | 'mm^2' | 'unit';
}

export interface PGSSourceClaim {
  verified: boolean;
  standId: string;
  timestamp?: string;
  comment?: string;
}

export interface PGSVerificationCheck {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  message?: string;
}

export interface PGSReceiverVerification {
  verified: boolean;
  status: 'VERIFIED' | 'REFUTED' | 'DEGENERATE' | 'INVALID_SCHEMA';
  checkedAt: string;
  checks: PGSVerificationCheck[];
}

export interface PGS2DMeta {
  format: 'PGS-2D';
  version: '0.1';
  generator: string;
  exportedAt: string;
  transferMode: PGSTransferMode;
}

export interface PGS2DPassport {
  meta: PGS2DMeta;
  sourceClaim: PGSSourceClaim;
  receiverVerification?: PGSReceiverVerification;
  objects: PGSObject[];
  topology: PGSTopology[];
  relations: PGSRelation[];
  measurements: PGSMeasurement[];
}
