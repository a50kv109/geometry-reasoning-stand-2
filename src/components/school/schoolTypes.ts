// src/components/school/schoolTypes.ts
// Contract types for School Mode and Core Drawing Tools

import { AngleBisectorTargetDescriptor } from '../../engines/angleBisector';
import { TransientIntersectionPoint } from '../../engines/geometryIntersections';

export type SchoolTool =
  | 'select'
  | 'point'
  | 'segment'
  | 'line'
  | 'circle'
  | 'ruler'
  | 'compass'
  | 'perp_bisector'
  | 'angle_bisector'
  | 'perpendicular'
  | 'parallel'
  | 'erase';

export type ToolStatus = 'IDLE' | 'POINT_1_SELECTED' | 'POINT_2_SELECTED' | 'PREVIEW';

export interface RulerMeasurement {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  distanceModel: number;
  distanceMm: number;
  distancePx: number;
}

export interface SchoolPreviewData {
  tool: SchoolTool;
  firstPoint?: { x: number; y: number; id?: string; name?: string };
  currentPoint?: { x: number; y: number };
  radius?: number;
  selectedLineId?: string;
  referenceLineCoords?: { p1: { x: number; y: number }; p2: { x: number; y: number } };
  transientIntersections?: TransientIntersectionPoint[];
}

export interface ToolState {
  tool: SchoolTool;
  status: ToolStatus;
  firstPoint?: { x: number; y: number; id?: string; name?: string };
  secondPoint?: { x: number; y: number; id?: string; name?: string };
  selectedLineId?: string;
  previewPoint?: { x: number; y: number };
  rulerMeasurement?: RulerMeasurement | null;
  hoverTarget?: { type: 'point' | 'segment' | 'line' | 'circle'; id: string } | null;
  hoverSmartTargetId?: string | null;
  angleBisectorTargets?: AngleBisectorTargetDescriptor[];
  lastActionMessage?: string | null;
}

