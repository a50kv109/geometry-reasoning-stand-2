// src/engines/semantic/aamVisualIntegration.ts
// Pipeline Integration for Visual Semantic Language + Semantic Guard in AAM Gateway
// Preserves: Zero modification to Geometry Core & 100% Backward Compatibility.

import { FullGeometryState } from '../constructionCore';
import { extractVisualQuery, resolveVisualIdentity } from './visualIdentityResolver';
import { evaluateSemanticGuard, GuardEvaluationOptions } from './semanticGuard';
import { VisualCommandResult } from './visualSemanticTypes';

/**
 * Feature flag for experimental Visual Semantic Language subsystem
 */
export const VISUAL_SEMANTIC_FEATURE_FLAG = {
  enabled: true,
};

/**
 * Parses user input using Visual Semantic Language and Semantic Guard.
 * Returns null if the query contains no visual tokens (FAST BYPASS for standard text).
 */
export function processVisualSemanticInput(
  state: FullGeometryState,
  text: string
): VisualCommandResult | null {
  if (!VISUAL_SEMANTIC_FEATURE_FLAG.enabled) {
    return null; // Disabled via Feature Flag
  }

  // 1. FAST BYPASS: Extract visual query (returns null if no visual tokens)
  const visualQuery = extractVisualQuery(text);
  if (!visualQuery) {
    return null;
  }

  const lower = text.toLowerCase();

  // 2. Identify Requested Macro Action
  let requestedAction: GuardEvaluationOptions['requestedAction'] = 'GET_MEASUREMENTS';
  if (lower.includes('биссектрис') || lower.includes('бісектрис') || lower.includes('bisector')) {
    requestedAction = 'CONSTRUCT_ANGLE_BISECTOR';
  } else if (
    lower.includes('перпендикуляр') ||
    lower.includes('высот') ||
    lower.includes('висот') ||
    lower.includes('perpendicular') ||
    lower.includes('altitude')
  ) {
    requestedAction = 'CONSTRUCT_PERPENDICULAR';
  } else if (lower.includes('параллел') || lower.includes('паралел') || lower.includes('parallel')) {
    requestedAction = 'CONSTRUCT_PARALLEL';
  } else if (lower.includes('измер') || lower.includes('вимір') || lower.includes('measure')) {
    requestedAction = 'GET_MEASUREMENTS';
  }

  // Extract optional through point (e.g. "через вершину C", "through C")
  let throughPointId: string | undefined = undefined;
  const throughMatch = text.match(/(?:через|through)(?:\s+точку|\s+вершину)?\s+([A-Za-z0-9_]+)/i);
  if (throughMatch) {
    throughPointId = throughMatch[1].toUpperCase();
  }

  // 3. Resolve Visual Identity to Canonical Geometry Entity
  const resolution = resolveVisualIdentity(state, visualQuery);

  // 4. Evaluate Intent Consistency with Semantic Guard
  const decision = evaluateSemanticGuard(state, resolution, {
    requestedAction,
    throughPointId,
    originalText: text,
  });

  return {
    query: text,
    visualQuery,
    resolution,
    decision,
  };
}
