// src/engines/semantic/visualSemanticTypes.ts
// Visual Semantic Language & Guard Type Definitions for Geometry Stand V1
// Implements "Visual Identity is mutable; Semantic & Object Identity are stable."

import { SemanticCommand } from './types';

/**
 * Standard visual color palette for interactive geometry stand
 */
export type CanonicalVisualColor =
  | 'RED'
  | 'GREEN'
  | 'BLUE'
  | 'YELLOW'
  | 'ORANGE'
  | 'PURPLE'
  | 'BLACK'
  | 'WHITE'
  | 'CYAN'
  | 'MAGENTA';

/**
 * Visual geometric markers (presentation layer properties)
 */
export type VisualMarkerType =
  | 'RIGHT_ANGLE_SQUARE'
  | 'ANGLE_ARC'
  | 'DOUBLE_ARC'
  | 'TICK_MARK'
  | 'PARALLEL_ARROW'
  | 'HIGHLIGHT';

/**
 * Structured query from natural visual description (e.g. "красно-зелёный угол", "синяя сторона")
 */
export interface VisualQuery {
  readonly colors?: readonly CanonicalVisualColor[];
  readonly marker?: VisualMarkerType;
  readonly entityType?: 'point' | 'segment' | 'line' | 'angle' | 'triangle';
  readonly rawVisualTokens?: readonly string[];
}

/**
 * Angle representation resolved from visual features (e.g. intersection of two colored rays/segments)
 */
export interface ResolvedVisualAngle {
  readonly vertexId: string;
  readonly ray1Id: string;
  readonly ray2Id: string;
  readonly color1: CanonicalVisualColor;
  readonly color2: CanonicalVisualColor;
  readonly isRightAngle?: boolean;
}

/**
 * Outcome of resolving visual identifiers to canonical geometry entities
 */
export type VisualResolutionResult =
  | {
      readonly status: 'RESOLVED';
      readonly targetType: 'segment' | 'line' | 'point' | 'angle';
      readonly entityId: string;
      readonly angleInfo?: ResolvedVisualAngle;
      readonly matchedColors: readonly CanonicalVisualColor[];
      readonly confidence: number;
    }
  | {
      readonly status: 'AMBIGUOUS';
      readonly candidates: readonly {
        readonly entityId: string;
        readonly description: string;
        readonly type: string;
      }[];
      readonly explanation: string;
    }
  | {
      readonly status: 'NOT_FOUND';
      readonly query: VisualQuery;
      readonly explanation: string;
    };

/**
 * Semantic Guard action decision
 */
export type SemanticGuardDecision =
  | {
      readonly action: 'EXECUTE';
      readonly command: SemanticCommand;
      readonly explanation?: string;
    }
  | {
      readonly action: 'CLARIFY';
      readonly clarificationPrompt: string;
      readonly options?: readonly string[];
    }
  | {
      readonly action: 'REJECT';
      readonly reason: string;
      readonly suggestedCorrection?: string;
    };

/**
 * Combined visual execution payload
 */
export interface VisualCommandResult {
  readonly query: string;
  readonly visualQuery: VisualQuery;
  readonly resolution: VisualResolutionResult;
  readonly decision: SemanticGuardDecision;
}
