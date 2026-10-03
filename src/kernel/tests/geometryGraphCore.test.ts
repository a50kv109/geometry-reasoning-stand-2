// src/kernel/tests/geometryGraphCore.test.ts
// E2E and Unit Test Suite for Phase 1 Geometry Graph Core
// Verifying all architectural invariants (A to J)

import {
  GeometryGraphManager,
  ConstructionGraph,
  ConstraintGraph,
  KnowledgeGraph,
} from '../geometryGraph/geometryGraphCore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runPhase1GeometryCoreTests() {
  console.log('======================================================================');
  console.log('RUNNING PHASE 1 GEOMETRY GRAPH CORE VERIFICATION MATRIX');
  console.log('======================================================================');

  // -------------------------------------------------------------------
  // TEST A: Construction DAG integrity
  // -------------------------------------------------------------------
  console.log('\n--- TEST A: Construction DAG Integrity ---');
  const manager = new GeometryGraphManager();
  manager.construction.addNode('pt_A', 'POINT', [], { x: 0, y: 0 });
  manager.construction.addNode('pt_B', 'POINT', [], { x: 3, y: 0 });
  manager.construction.addNode('pt_C', 'POINT', [], { x: 0, y: 4 });
  manager.construction.addNode('seg_AB', 'SEGMENT', ['pt_A', 'pt_B']);
  manager.construction.addNode('seg_BC', 'SEGMENT', ['pt_B', 'pt_C']);
  manager.construction.addNode('seg_CA', 'SEGMENT', ['pt_C', 'pt_A']);

  const segAB = manager.construction.getNode('seg_AB');
  assert(segAB !== undefined, 'seg_AB must be successfully created');
  assert(segAB!.parentIds.includes('pt_A'), 'pt_A must be parent of seg_AB');
  assert(segAB!.parentIds.includes('pt_B'), 'pt_B must be parent of seg_AB');

  const ptA = manager.construction.getNode('pt_A');
  assert(ptA!.childrenIds.includes('seg_AB'), 'seg_AB must be registered in children of pt_A');
  assert(ptA!.childrenIds.includes('seg_CA'), 'seg_CA must be registered in children of pt_A');

  // -------------------------------------------------------------------
  // TEST B: Constraint isolation
  // -------------------------------------------------------------------
  console.log('\n--- TEST B: Constraint Isolation ---');
  // Add orthogonality and collinearity constraints
  manager.registerConstraint('const_ortho_ABC', 'ORTHOGONALITY', ['seg_AB', 'seg_CA'], (nodes) => {
    const pA = nodes.get('pt_A');
    const pB = nodes.get('pt_B');
    const pC = nodes.get('pt_C');
    if (!pA || !pB || !pC) return { state: 'VIOLATED', residual: 999 };

    // Check dot product of vectors AB and AC
    const dxAB = pB.properties.x - pA.properties.x;
    const dyAB = pB.properties.y - pA.properties.y;
    const dxAC = pC.properties.x - pA.properties.x;
    const dyAC = pC.properties.y - pA.properties.y;
    const dot = dxAB * dxAC + dyAB * dyAC;

    return {
      state: Math.abs(dot) < 1e-7 ? 'SATISFIED' : 'VIOLATED',
      residual: Math.abs(dot),
    };
  });

  const constraint = manager.constraint.constraints.get('const_ortho_ABC');
  assert(constraint !== undefined, 'Constraint const_ortho_ABC must be registered');
  assert(constraint!.state === 'SATISFIED', 'Orthogonality should be satisfied at right angle configuration');

  // -------------------------------------------------------------------
  // TEST C: Knowledge VANISHED != DELETE
  // -------------------------------------------------------------------
  console.log('\n--- TEST C: Knowledge VANISHED != DELETE ---');
  manager.registerClaim('claim_pythagoras', 'TRIANGLE_ANGLE_SUM', 'Сумма квадратов катетов равна квадрату гипотенузы', ['const_ortho_ABC']);

  const claimNode = manager.knowledge.claims.get('claim_pythagoras');
  assert(claimNode !== undefined, 'Knowledge node must exist in graph');
  assert(claimNode!.state === 'VERIFIED', 'Pythagoras claim must start as VERIFIED');

  // Mutate coordinates to make it non-orthogonal (dot product != 0)
  manager.mutateCoordinates('pt_A', 1, 1);
  assert(manager.knowledge.claims.has('claim_pythagoras'), 'Claim must not be deleted on violation');
  assert(manager.knowledge.claims.get('claim_pythagoras')!.state === 'VANISHED', 'Claim must transition to VANISHED status');

  // -------------------------------------------------------------------
  // TEST D: VALID → INVALID → VALID
  // -------------------------------------------------------------------
  console.log('\n--- TEST D: VALID -> INVALID -> VALID Cycle ---');
  // Restore pt_A to orthogonal position
  manager.mutateCoordinates('pt_A', 0, 0);
  assert(manager.constraint.constraints.get('const_ortho_ABC')!.state === 'SATISFIED', 'Constraint must return to SATISFIED');
  assert(manager.knowledge.claims.get('claim_pythagoras')!.state === 'VERIFIED', 'Knowledge claim must be restored to VERIFIED');

  // -------------------------------------------------------------------
  // TEST E: Graph Delta generation
  // -------------------------------------------------------------------
  console.log('\n--- TEST E: Graph Delta Generation ---');
  const delta = manager.mutateCoordinates('pt_A', 2, 2);
  assert(delta.triggerEvent === 'MOVE_VERTEX(pt_A)', 'Trigger event field must be accurate');
  assert(delta.affectedConstructionEntities.includes('pt_A'), 'pt_A must be registered as affected construction');
  assert(delta.affectedConstraints.includes('const_ortho_ABC'), 'Ortho constraint must be affected');
  assert(delta.affectedKnowledgeClaims.includes('claim_pythagoras'), 'Pythagoras claim must be affected');
  assert(delta.blastClassification !== undefined, 'Blast classification must be computed');

  // -------------------------------------------------------------------
  // TEST F: Blast Radius LOCAL
  // -------------------------------------------------------------------
  console.log('\n--- TEST F: Blast Radius LOCAL ---');
  // A local leaf construction node (e.g., adding a dependent segment point)
  const localManager = new GeometryGraphManager();
  localManager.construction.addNode('pt_X', 'POINT', [], { x: 0, y: 0 });
  localManager.construction.addNode('seg_XY', 'SEGMENT', ['pt_X'], {}); // XY depends on pt_X
  const localDelta = localManager.mutateCoordinates('pt_X', 1, 1);
  assert(localDelta.blastClassification === 'LOCAL', 'Direct depth 1 mutation must classify as LOCAL');

  // -------------------------------------------------------------------
  // TEST G: Blast Radius PATH
  // -------------------------------------------------------------------
  console.log('\n--- TEST G: Blast Radius PATH ---');
  const pathManager = new GeometryGraphManager();
  pathManager.construction.addNode('pt_O', 'POINT', [], { x: 0, y: 0 });
  pathManager.construction.addNode('pt_M', 'POINT', ['pt_O'], { x: 10, y: 10 });
  pathManager.construction.addNode('seg_OM', 'SEGMENT', ['pt_O', 'pt_M'], {});
  pathManager.construction.addNode('circ_M', 'CIRCLE', ['seg_OM'], {}); // Depth 3 chain
  const pathDelta = pathManager.mutateCoordinates('pt_M', 11, 11);
  assert(pathDelta.blastClassification === 'PATH', 'Deeper transitive chain within a single branch must classify as PATH');

  // -------------------------------------------------------------------
  // TEST H: Blast Radius GLOBAL
  // -------------------------------------------------------------------
  console.log('\n--- TEST H: Blast Radius GLOBAL ---');
  const globalManager = new GeometryGraphManager();
  globalManager.construction.addNode('root_P', 'POINT', [], { x: 0, y: 0 }); // A root point
  globalManager.construction.addNode('pt_Q', 'POINT', [], { x: 5, y: 5 });
  globalManager.construction.addNode('seg_PQ', 'SEGMENT', ['root_P', 'pt_Q'], {});
  globalManager.construction.addNode('pt_R', 'POINT', ['seg_PQ'], { x: 2, y: 2 }); // Descendant of seg_PQ to make depth > 1
  globalManager.construction.addNode('seg_QR', 'SEGMENT', ['pt_Q'], {});
  // Mutating a major root point that triggers wide cascade
  const globalDelta = globalManager.mutateCoordinates('root_P', 2, 2);
  assert(globalDelta.blastClassification === 'GLOBAL', 'Root node mutation or large span must classify as GLOBAL');

  // -------------------------------------------------------------------
  // TEST I: Coordinate mutation does not redefine structural identity
  // -------------------------------------------------------------------
  console.log('\n--- TEST I: Coordinate Mutation Invariance ---');
  const delta1 = manager.mutateCoordinates('pt_A', 3, 3);
  const delta2 = manager.mutateCoordinates('pt_A', 5, 5);
  // Compare structural metadata (excluding coordinates/triggers)
  assert(delta1.blastClassification === delta2.blastClassification, 'Blast classification must remain invariant to coordinates');
  assert(delta1.affectedConstraints.join(',') === delta2.affectedConstraints.join(','), 'Affected constraints must remain invariant');

  // -------------------------------------------------------------------
  // TEST J: ACP/Research layer absence does not affect Geometry Core
  // -------------------------------------------------------------------
  console.log('\n--- TEST J: Strict Separation from Research Layer ---');
  // Core functionality runs perfectly with zero knowledge of ACP or Research Layer
  const cleanManager = new GeometryGraphManager();
  cleanManager.construction.addNode('pt_Z', 'POINT', [], { x: 0, y: 0 });
  cleanManager.construction.addNode('pt_W', 'POINT', [], { x: 10, y: 10 });
  cleanManager.registerConstraint('const_dist', 'DISTANCE', ['pt_Z', 'pt_W'], (nodes) => {
    return { state: 'SATISFIED', residual: 0 };
  });
  const cleanDelta = cleanManager.mutateCoordinates('pt_Z', 2, 2);
  assert(cleanDelta.affectedConstraints.includes('const_dist'), 'Core constraint triggers must work without any research modules');

  console.log('\n======================================================================');
  console.log('ALL PHASE 1 GEOMETRY GRAPH CORE TESTS PASSED PERFECTLY! 🎉');
  console.log('======================================================================');
}
