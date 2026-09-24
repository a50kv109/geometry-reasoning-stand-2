// src/engines/configuration/types.ts
// Pure, deterministic type definitions for GCM-01: Geometry Configuration View.
// Principles:
// 1. "The Stand must not lie."
// 2. The Configuration View is a read-only, transient semantic projection.
// 3. ZERO timestamps, ZERO random identifiers, ZERO mutable state.
// 4. Single Source of Truth: Projects existing GeometryState + Construction DAG + Research Graph.

import { EpistemicStatus } from '../research/researchTypes';
import { SemanticQuantity } from './semanticQuantity';
import { SemanticConstruction, SemanticRelation } from './semanticRelation';

/**
 * Geometric entity kind recognized by the configuration view.
 */
export type ConfigurationEntityKind =
  | 'point'
  | 'segment'
  | 'line'
  | 'circle'
  | 'derived_chord_arc'
  | 'angle';

/**
 * Semantic category classifying the entity's architectural origin.
 */
export type ConfigurationCategory =
  | 'base_primitive'            // Fundamental input primitives (e.g. vertices A, B, C, center O, circle C_0)
  | 'topological_construction'   // Elements derived via geometric tools (midpoints, perpendiculars, etc.)
  | 'derived_relation'          // Dynamically computed relations (chords, arcs, inscribed angles)
  | 'epistemic_fact';           // Invariants, verified theorems, or candidate hypotheses

/**
 * Detailed tabular record representing a single geometric or semantic entity in the configuration.
 */
export interface ConfigurationRecord {
  readonly id: string;
  readonly name: string;
  readonly kind: ConfigurationEntityKind;
  readonly category: ConfigurationCategory;
  readonly role: string;
  readonly depth: number;
  readonly parentIds: readonly string[];
  readonly childIds: readonly string[];
  readonly parameters: Readonly<Record<string, number | string | boolean>>;
  readonly metrics: Readonly<Record<string, number | string>>;
  readonly epistemicStatus: EpistemicStatus;
  readonly provenanceNote?: string;
  readonly theoremId?: string;
  readonly isProven: boolean;
  readonly tags: readonly string[];
  readonly semanticQuantities?: readonly SemanticQuantity[];
  readonly semanticConstruction?: SemanticConstruction;
  readonly semanticRelations?: readonly SemanticRelation[];
}

/**
 * Topological node representation for dependency graph visualization and export.
 */
export interface ConfigurationTopologyNode {
  readonly id: string;
  readonly name: string;
  readonly kind: ConfigurationEntityKind;
  readonly depth: number;
  readonly parentIds: readonly string[];
}

/**
 * Topological edge representation.
 */
export interface ConfigurationTopologyEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relation: 'DEPENDS_ON' | 'SUBTENDS' | 'PASSES_THROUGH' | 'CONTAINS';
}

/**
 * Summary metrics of the entire configuration.
 */
export interface ConfigurationSummary {
  readonly totalRecords: number;
  readonly pointCount: number;
  readonly segmentCount: number;
  readonly lineCount: number;
  readonly circleCount: number;
  readonly derivedRelationCount: number;
  readonly verifiedTheoremCount: number;
  readonly candidateHypothesisCount: number;
  readonly maxTopologicalDepth: number;
  readonly semanticQuantityCount: number;
  readonly semanticRelationCount: number;
  readonly semanticConstructionCount: number;
  readonly circumradius: number;
  readonly scale: number;
}

/**
 * Epistemic entry in the configuration registry.
 */
export interface ConfigurationEpistemicEntry {
  readonly entityId: string;
  readonly title: string;
  readonly status: EpistemicStatus;
  readonly formula: string;
  readonly isProven: boolean;
  readonly ruleId?: string;
  readonly theoremId?: string;
  readonly preconditionsSatisfied: boolean;
  readonly basis: string;
}

/**
 * Complete immutable Geometry Configuration View DTO.
 * 100% deterministic, timestamp-free, and JSON/Excel serializable.
 */
export interface GeometryConfigurationView {
  readonly schemaVersion: '1.0.0';
  readonly configurationId: string;
  readonly timestampFree: true;
  readonly summary: ConfigurationSummary;
  readonly records: readonly ConfigurationRecord[];
  readonly topology: {
    readonly nodes: readonly ConfigurationTopologyNode[];
    readonly edges: readonly ConfigurationTopologyEdge[];
  };
  readonly epistemicRegistry: readonly ConfigurationEpistemicEntry[];
  readonly semanticQuantities: readonly SemanticQuantity[];
  readonly semanticRelations: readonly SemanticRelation[];
  readonly semanticConstructions: readonly SemanticConstruction[];
}

/**
 * Options configuring the projection generation.
 */
export interface ConfigurationViewOptions {
  readonly scale?: number;
  readonly includeAuxiliary?: boolean;
}
