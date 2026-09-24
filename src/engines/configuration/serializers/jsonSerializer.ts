// src/engines/configuration/serializers/jsonSerializer.ts
// Deterministic JSON serializer for Geometry Configuration View (GCM-01).
// Formats:
// 1. Full schema-compliant JSON (lossless).
// 2. Specialized concise AI context prompt format.

import { GeometryConfigurationView } from '../types';

/**
 * Serializes the complete GeometryConfigurationView to a deterministic, formatted JSON string.
 */
export function serializeConfigurationToJson(
  view: GeometryConfigurationView,
  pretty: boolean = true
): string {
  return JSON.stringify(view, null, pretty ? 2 : undefined);
}

/**
 * Formats the configuration view into a structured semantic block specifically optimized for AI Prompts.
 */
export function serializeConfigurationForAI(view: GeometryConfigurationView): string {
  const lines: string[] = [];

  lines.push('=== GEOMETRY CONFIGURATION VIEW (AI SEMANTIC SUMMARY) ===');
  lines.push(`Configuration ID: ${view.configurationId}`);
  lines.push(`Scale: 1 px = ${view.summary.scale} mm | Circumradius R: ${view.summary.circumradius} mm`);
  lines.push(`Total Records: ${view.summary.totalRecords} (Points: ${view.summary.pointCount}, Segments: ${view.summary.segmentCount}, Circles: ${view.summary.circleCount}, Derived: ${view.summary.derivedRelationCount}, Semantic Quantities: ${view.summary.semanticQuantityCount})`);
  lines.push(`Verified Theorems (Q.E.D.): ${view.summary.verifiedTheoremCount} | Candidate Hypotheses: ${view.summary.candidateHypothesisCount}`);
  lines.push('');

  lines.push('--- ENTITY INVENTORY & TOPOLOGY ---');
  for (const rec of view.records) {
    const parentStr = rec.parentIds.length > 0 ? ` [Parents: ${rec.parentIds.join(', ')}]` : '';
    const childStr = rec.childIds.length > 0 ? ` [Children: ${rec.childIds.join(', ')}]` : '';
    const metricsStr = Object.entries(rec.metrics)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    const thmStr = rec.theoremId ? ` [Theorem: ${rec.theoremId} (Q.E.D.)]` : '';

    lines.push(
      `* [${rec.id}] ${rec.name} (${rec.kind}, depth=${rec.depth}, status=${rec.epistemicStatus})${parentStr}${childStr}${thmStr}`
    );
    lines.push(`    Metrics: ${metricsStr}`);
    if (rec.semanticConstruction) {
      lines.push(`    Construction: [${rec.semanticConstruction.operation}] ${rec.semanticConstruction.description}`);
    }
    if (rec.semanticRelations && rec.semanticRelations.length > 0) {
      const rels = rec.semanticRelations.map((r) => `${r.formalNotation} [${r.status}]`).join('; ');
      lines.push(`    Relations: ${rels}`);
    }
    if (rec.provenanceNote) {
      lines.push(`    Provenance: ${rec.provenanceNote}`);
    }
  }

  if (view.semanticRelations && view.semanticRelations.length > 0) {
    lines.push('');
    lines.push('--- SEMANTIC RELATIONS (S-01 ADAPTER) ---');
    for (const rel of view.semanticRelations) {
      const thmStr = rel.theoremOrRuleId ? ` via ${rel.theoremOrRuleId}` : '';
      lines.push(`* ${rel.formalNotation} (${rel.relationType}, status=${rel.status}${thmStr}) — ${rel.description}`);
    }
  }

  lines.push('');
  lines.push('--- EPISTEMIC REGISTRY (FACTS & THEOREMS) ---');
  for (const entry of view.epistemicRegistry) {
    const qedStr = entry.isProven ? ' [Q.E.D. PROVEN]' : ' [EMPIRICAL / CANDIDATE]';
    lines.push(`* ${entry.title}${qedStr} (${entry.status})`);
    lines.push(`    Formula: ${entry.formula}`);
    lines.push(`    Basis: ${entry.basis}`);
  }

  lines.push('========================================================');
  return lines.join('\n');
}
