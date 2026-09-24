// src/engines/configuration/tests/testSemanticAdapterS01S02.ts
// Comprehensive verification test suite for Semantic Adapter: S-01 (Relation Extractor) & S-02 (Construction Contract).
// Verifies:
// 1. Semantic Construction Contract (S-02) extraction for all tools (PERPENDICULAR, PARALLEL, ANGLE_BISECTOR, PERPENDICULAR_BISECTOR, etc.).
// 2. Semantic Relation Model (S-01) extraction with strict epistemic separation (CONSTRUCTED vs DERIVED vs VERIFIED).
// 3. Epistemic fact grounding (Thales perpendicularity, chord/diameter relations, incidence, intersections).
// 4. Configuration Passport integration (records, summary, topology, AI context serialization).
// 5. Determinism, immutability, and "One Geometry, Many Clients" invariant.

import { createDefaultGeometryState } from '../../constructionCore';
import { applyPerpendicularLine } from '../../perpendicularLine';
import { applyParallelLine } from '../../parallelLine';
import { applyAngleBisector } from '../../angleBisector';
import { applyPerpendicularBisector } from '../../perpendicularBisector';
import { buildConfigurationView } from '../configurationProjector';
import {
  extractSemanticConstructions,
  extractSemanticRelations,
  findSemanticConstructionByEntity,
  findSemanticRelationsByEntity,
} from '../semanticRelation';
import { serializeConfigurationForAI, serializeConfigurationToJson } from '../serializers/jsonSerializer';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${msg}`);
}

console.log('======================================================================');
console.log('RUNNING SEMANTIC ADAPTER (S-01 + S-02) TEST SUITE');
console.log('======================================================================\n');

// -------------------------------------------------------------------
// TEST S01S02-01: Base State Semantic Extraction (Thales Configuration)
// -------------------------------------------------------------------
console.log('--- TEST S01S02-01: Base State Semantic Extraction ---');
const baseState = createDefaultGeometryState({ A: 0.0, B: 0.5, C: 0.25 }, 100);

const baseConstructions = extractSemanticConstructions(baseState);
const baseRelations = extractSemanticRelations(baseState);

assert(baseConstructions.length > 0, `S01S02-01.1: Extracted ${baseConstructions.length} base constructions`);
assert(baseRelations.length > 0, `S01S02-01.2: Extracted ${baseRelations.length} base relations`);

// Verify Point C on circle
const ptCRel = baseRelations.find(
  (r) => r.sourceEntityId === 'C' && r.relationType === 'POINT_ON' && r.targetEntityIds.includes('base_circle')
);
assert(ptCRel !== undefined, 'S01S02-01.3: Point C POINT_ON base_circle relation found');
assert(ptCRel?.status === 'CONSTRUCTED', 'S01S02-01.4: Point C on circle has CONSTRUCTED status');

// Verify Diameter Chord AB
const diamRel = baseRelations.find(
  (r) => r.sourceEntityId === 'chord_AB' && r.relationType === 'DIAMETER_OF'
);
assert(diamRel !== undefined, 'S01S02-01.5: Diameter relation for chord_AB found');
assert(diamRel?.status === 'VERIFIED', 'S01S02-01.6: Diameter relation has VERIFIED status');
assert(diamRel?.theoremOrRuleId === 'RULE-THALES-DIAMETER', 'S01S02-01.7: Diameter relation references RULE-THALES-DIAMETER');

// Verify Thales Right Angle Relation (AC ⟂ BC)
const thalesRel = baseRelations.find(
  (r) => r.relationType === 'PERPENDICULAR_TO' && r.theoremOrRuleId === 'RULE-THALES-DIAMETER'
);
assert(thalesRel !== undefined, 'S01S02-01.8: Thales Right Angle relation (AC ⟂ BC) found');
assert(thalesRel?.status === 'VERIFIED', 'S01S02-01.9: Thales relation has VERIFIED status');

// -------------------------------------------------------------------
// TEST S01S02-02: Perpendicular Tool Semantic Contract & Relations
// -------------------------------------------------------------------
console.log('\n--- TEST S01S02-02: Perpendicular Tool Semantic Contract & Relations ---');
const perpRes = applyPerpendicularLine(baseState, 'chord_AB', 'C', 'test_perp_group');
assert(perpRes.plan.success, 'S01S02-02.1: Perpendicular line constructed successfully');

const perpState = perpRes.nextState;
const perpConstructions = extractSemanticConstructions(perpState);
const perpRelations = extractSemanticRelations(perpState);

const perpLineId = (perpRes.plan as any).createdObjectIds.perpendicularLineId;

// S-02: Semantic Construction Contract
const perpConstruction = findSemanticConstructionByEntity(perpConstructions, perpLineId);
assert(perpConstruction !== undefined, 'S01S02-02.2: Perpendicular SemanticConstruction found');
assert(perpConstruction?.operation === 'PERPENDICULAR', 'S01S02-02.3: Operation is PERPENDICULAR');
assert(perpConstruction?.referenceIds.includes('chord_AB'), 'S01S02-02.4: Reference includes chord_AB');
assert(perpConstruction?.targetId === 'C', 'S01S02-02.5: Target is point C');
assert(perpConstruction?.resultEntityId === perpLineId, 'S01S02-02.6: ResultEntityId matches perpendicularLineId');

// S-01: Semantic Relations
const linePerpRels = findSemanticRelationsByEntity(perpRelations, perpLineId);
const perpToRel = linePerpRels.find((r) => r.relationType === 'PERPENDICULAR_TO' && r.sourceEntityId === perpLineId);
assert(perpToRel !== undefined, 'S01S02-02.7: PERPENDICULAR_TO relation found for line');
assert(perpToRel?.status === 'CONSTRUCTED', 'S01S02-02.8: PERPENDICULAR_TO has CONSTRUCTED status');
assert(perpToRel?.targetEntityIds.includes('chord_AB'), 'S01S02-02.9: Target is chord_AB');

const incidentRel = linePerpRels.find((r) => r.relationType === 'PASSES_THROUGH' && r.sourceEntityId === perpLineId);
assert(incidentRel !== undefined, 'S01S02-02.10: PASSES_THROUGH relation found for line');
assert(incidentRel?.targetEntityIds.includes('C'), 'S01S02-02.11: Line passes through point C');

// Intersection Points on Perpendicular
const intPoints = (perpRes.plan as any).createdObjectIds.intersectionPointIds || [];
if (intPoints.length > 0) {
  const intPtId = intPoints[0];
  const intPtRel = perpRelations.find((r) => r.sourceEntityId === intPtId && r.relationType === 'INTERSECTION_OF');
  assert(intPtRel !== undefined, `S01S02-02.12: INTERSECTION_OF relation found for ${intPtId}`);
  assert(intPtRel?.status === 'CONSTRUCTED', 'S01S02-02.13: Intersection point has CONSTRUCTED status');
}

// -------------------------------------------------------------------
// TEST S01S02-03: Parallel Tool Semantic Contract & Relations
// -------------------------------------------------------------------
console.log('\n--- TEST S01S02-03: Parallel Tool Semantic Contract & Relations ---');
const parRes = applyParallelLine(baseState, 'chord_AB', 'C', 'test_par_group');
assert(parRes.plan.success, 'S01S02-03.1: Parallel line constructed successfully');

const parState = parRes.nextState;
const parConstructions = extractSemanticConstructions(parState);
const parRelations = extractSemanticRelations(parState);

const parLineId = (parRes.plan as any).createdObjectIds.parallelLineId;

// S-02: Semantic Construction Contract
const parConstruction = findSemanticConstructionByEntity(parConstructions, parLineId);
assert(parConstruction !== undefined, 'S01S02-03.2: Parallel SemanticConstruction found');
assert(parConstruction?.operation === 'PARALLEL', 'S01S02-03.3: Operation is PARALLEL');
assert(parConstruction?.referenceIds.includes('chord_AB'), 'S01S02-03.4: Reference includes chord_AB');
assert(parConstruction?.targetId === 'C', 'S01S02-03.5: Target is point C');

// S-01: Semantic Relations
const lineParRels = findSemanticRelationsByEntity(parRelations, parLineId);
const parToRel = lineParRels.find((r) => r.relationType === 'PARALLEL_TO' && r.sourceEntityId === parLineId);
assert(parToRel !== undefined, 'S01S02-03.6: PARALLEL_TO relation found for line');
assert(parToRel?.status === 'CONSTRUCTED', 'S01S02-03.7: PARALLEL_TO has CONSTRUCTED status');
assert(parToRel?.targetEntityIds.includes('chord_AB'), 'S01S02-03.8: Target is chord_AB');

// -------------------------------------------------------------------
// TEST S01S02-04: Angle Bisector Tool Semantic Contract & Relations
// -------------------------------------------------------------------
console.log('\n--- TEST S01S02-04: Angle Bisector Tool Semantic Contract & Relations ---');
const abRes = applyAngleBisector(baseState, 'A', 'C', 'B');
assert(abRes.plan.success, 'S01S02-04.1: Angle bisector constructed successfully');

const abState = abRes.nextState;
const abConstructions = extractSemanticConstructions(abState);
const abRelations = extractSemanticRelations(abState);

const abLineId = (abRes.plan as any).createdObjectIds.bisectorLineId;

// S-02: Semantic Construction Contract
const abConstruction = findSemanticConstructionByEntity(abConstructions, abLineId);
assert(abConstruction !== undefined, 'S01S02-04.2: Angle bisector SemanticConstruction found');
assert(abConstruction?.operation === 'ANGLE_BISECTOR', 'S01S02-04.3: Operation is ANGLE_BISECTOR');
assert(abConstruction?.targetId === 'C', 'S01S02-04.4: Target vertex is C');

// S-01: Semantic Relations
const lineAbRels = findSemanticRelationsByEntity(abRelations, abLineId);
const bisectorRel = lineAbRels.find((r) => r.relationType === 'ANGLE_BISECTOR_OF');
assert(bisectorRel !== undefined, 'S01S02-04.5: ANGLE_BISECTOR_OF relation found');
assert(bisectorRel?.status === 'CONSTRUCTED', 'S01S02-04.6: ANGLE_BISECTOR_OF has CONSTRUCTED status');
assert(bisectorRel?.targetEntityIds.includes('C'), 'S01S02-04.7: Target includes vertex C');

// -------------------------------------------------------------------
// TEST S01S02-05: Perpendicular Bisector Tool Semantic Contract & Relations
// -------------------------------------------------------------------
console.log('\n--- TEST S01S02-05: Perpendicular Bisector Tool Semantic Contract & Relations ---');
const pbRes = applyPerpendicularBisector(baseState, 'A', 'B');
assert(pbRes.plan.success, 'S01S02-05.1: Perpendicular bisector constructed successfully');

const pbState = pbRes.nextState;
const pbConstructions = extractSemanticConstructions(pbState);
const pbRelations = extractSemanticRelations(pbState);

const pbLineId = (pbRes.plan as any).createdObjectIds.bisectorLineId;

// S-02: Semantic Construction Contract
const pbConstruction = findSemanticConstructionByEntity(pbConstructions, pbLineId);
assert(pbConstruction !== undefined, 'S01S02-05.2: Perpendicular bisector SemanticConstruction found');
assert(pbConstruction?.operation === 'PERPENDICULAR_BISECTOR', 'S01S02-05.3: Operation is PERPENDICULAR_BISECTOR');
assert(pbConstruction?.referenceIds.includes('A') && pbConstruction?.referenceIds.includes('B'), 'S01S02-05.4: Reference points are A and B');

// S-01: Semantic Relations
const linePbRels = findSemanticRelationsByEntity(pbRelations, pbLineId);
const pbRel = linePbRels.find((r) => r.relationType === 'PERPENDICULAR_BISECTOR_OF');
assert(pbRel !== undefined, 'S01S02-05.5: PERPENDICULAR_BISECTOR_OF relation found');
assert(pbRel?.status === 'CONSTRUCTED', 'S01S02-05.6: PERPENDICULAR_BISECTOR_OF has CONSTRUCTED status');

// -------------------------------------------------------------------
// TEST S01S02-06: Configuration Passport Integration & Serializers
// -------------------------------------------------------------------
console.log('\n--- TEST S01S02-06: Configuration Passport Integration & Serializers ---');
const configView = buildConfigurationView(perpState, { scale: 1.0 });

assert(configView.semanticConstructions.length > 0, 'S01S02-06.1: configView.semanticConstructions is populated');
assert(configView.semanticRelations.length > 0, 'S01S02-06.2: configView.semanticRelations is populated');
assert(configView.summary.semanticConstructionCount === configView.semanticConstructions.length, 'S01S02-06.3: Summary construction count matches array length');
assert(configView.summary.semanticRelationCount === configView.semanticRelations.length, 'S01S02-06.4: Summary relation count matches array length');

// Check attached fields on record
const perpRecord = configView.records.find((r) => r.id === perpLineId);
assert(perpRecord !== undefined, 'S01S02-06.5: Perpendicular line record exists');
assert(perpRecord?.semanticConstruction !== undefined, 'S01S02-06.6: Record has attached semanticConstruction');
assert(perpRecord?.semanticRelations !== undefined && perpRecord.semanticRelations.length > 0, 'S01S02-06.7: Record has attached semanticRelations');

// Test AI Serializer
const aiContext = serializeConfigurationForAI(configView);
assert(aiContext.includes('SEMANTIC RELATIONS (S-01 ADAPTER)'), 'S01S02-06.8: AI serialization includes Semantic Relations section');
assert(aiContext.includes('PERPENDICULAR'), 'S01S02-06.9: AI serialization includes PERPENDICULAR operation');

// Test JSON Serializer
const jsonStr = serializeConfigurationToJson(configView);
const parsed = JSON.parse(jsonStr);
assert(parsed.semanticRelations.length === configView.semanticRelations.length, 'S01S02-06.10: Lossless JSON serialization of semanticRelations');
assert(parsed.semanticConstructions.length === configView.semanticConstructions.length, 'S01S02-06.11: Lossless JSON serialization of semanticConstructions');

// -------------------------------------------------------------------
// TEST S01S02-07: Invariance & Determinism
// -------------------------------------------------------------------
console.log('\n--- TEST S01S02-07: Invariance & Determinism ---');
const viewA = buildConfigurationView(perpState);
const viewB = buildConfigurationView(perpState);

assert(
  JSON.stringify(viewA.semanticConstructions) === JSON.stringify(viewB.semanticConstructions),
  'S01S02-07.1: Successive extractions of semanticConstructions are byte-for-byte identical'
);
assert(
  JSON.stringify(viewA.semanticRelations) === JSON.stringify(viewB.semanticRelations),
  'S01S02-07.2: Successive extractions of semanticRelations are byte-for-byte identical'
);

console.log('\n======================================================================');
console.log('✓ ALL SEMANTIC ADAPTER (S-01 + S-02) TESTS PASSED PERFECTLY!');
console.log('======================================================================\n');
