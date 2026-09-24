// src/presentation/educationalTypes.ts
// Pure, deterministic type definitions for Educational Visualization Layer (EV-01).
// Principles:
// 1. "The Stand must not lie."
// 2. The Educational Layer does not compute geometry; it contextualizes epistemic truth and orchestrates user attention.
// 3. Strict separation of Educational Inquiry (question) and Verified Fact (proven theorem).
// 4. Zero coordinates, zero geometric mutators, zero duplicate sources of truth.

import { ActiveHighlight } from '../types';

/**
 * Educational Card Lifecycle State.
 */
export type CardLifecycleState =
  | 'UNAVAILABLE' // Required entities missing from state
  | 'AVAILABLE'   // Configuration valid and verified, ready to explore
  | 'ACTIVE'      // Actively focused in the UI with visualization template applied
  | 'BROKEN'      // Prerequisites invalidated by user moving points
  | 'COMPLETED';  // Interactive exploration completed

/**
 * Visual Highlight Rule for an entity.
 */
export interface EntityHighlightRule {
  readonly entityId: string;
  readonly entityType: 'vertex' | 'segment' | 'arc' | 'angle' | 'center';
  readonly label?: string;
  readonly styleRole: 'primary_focus' | 'secondary_focus' | 'reference_baseline';
}

/**
 * Pure Declarative Visualization Template (Lens).
 * Contains NO coordinates or mathematical formulas.
 */
export interface VisualizationTemplate {
  readonly templateId: string;
  readonly targetRuleId: string;
  readonly targetProfileId?: string;
  readonly highlightEntities: readonly EntityHighlightRule[];
  readonly dimUnfocused: boolean;
  readonly showAnnotations: {
    readonly rightAngleMarker: boolean;
    readonly diameterLabel: boolean;
    readonly arcMeasures: boolean;
  };
  readonly activeHighlightMapping: ActiveHighlight;
}

/**
 * Reference to verified evidence from the epistemic layer (Packet #6).
 */
export interface CardEvidenceReference {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly formalStatement: string;
  readonly theoremNodeId?: string;
  readonly isProven: boolean;
  readonly failedPreconditions?: readonly string[];
}

/**
 * Educational Inquiry (Question / Task).
 * Pedagogical prompt for the student. NEVER marked Q.E.D. or Verified.
 */
export interface EducationalInquiry {
  readonly question: string;
  readonly promptAction: string;
  readonly hint?: string;
}

/**
 * Verified Mathematical Fact.
 * Displayed ONLY when confirmed by Research Graph (isProven === true).
 */
export interface VerifiedFactDisplay {
  readonly statement: string;
  readonly formula: string;
  readonly mathematicalDomain: string;
  readonly qED: true;
}

/**
 * Complete Educational Card ViewModel for Presentation.
 */
export interface EducationalCardViewModel {
  readonly cardId: string;
  readonly title: string;
  readonly state: CardLifecycleState;
  readonly context: string;
  readonly inquiry: EducationalInquiry;
  readonly verifiedFact?: VerifiedFactDisplay;
  readonly evidence: CardEvidenceReference;
  readonly template: VisualizationTemplate;
}
