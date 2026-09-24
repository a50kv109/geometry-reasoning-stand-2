// src/kernel/tests/auditChains.ts
// Verifies all 7 critical cross-cluster derivation chains (A through G) from S12 recovery

import { DeterministicNavigator } from '../navigator';
import { CANONICAL_GRAPH } from '../canonicalPaths';

export function runChainAudit() {
  const nav = new DeterministicNavigator(CANONICAL_GRAPH);

  console.log('=== AUDITING CRITICAL CHAINS A - G ===');

  // Chain A: angle_A + angle_B -> angle_C -> sides -> perimeter -> area
  {
    const traceP = nav.solve({ angle_A: 30, angle_B: 60, R: 5 }, 'perimeter');
    const traceK = nav.solve({ angle_A: 30, angle_B: 60, R: 5 }, 'triangle_area');
    console.log('Chain A:', {
      perimeterStatus: traceP.status,
      perimeterVal: traceP.finalValue,
      areaStatus: traceK.status,
      areaVal: traceK.finalValue,
      perimeterSteps: traceP.selectedPathIds,
    });
  }

  // Chain B: angle_A + R -> central_angle_BC -> chord_BC -> side_a
  {
    const traceSideA = nav.solve({ angle_A: 30, R: 5 }, 'side_a');
    console.log('Chain B:', {
      sideAStatus: traceSideA.status,
      sideAVal: traceSideA.finalValue,
      steps: traceSideA.selectedPathIds,
    });
  }

  // Chain C: radial_distance_a/b/c + R -> sides_triplet -> sides -> perimeter -> area
  {
    const r = 5;
    const s = 5 * Math.sqrt(3); // equilateral
    const d = Math.sqrt(r * r - (s * s) / 4); // 2.5
    const traceP = nav.solve({ radial_distance_a: d, radial_distance_b: d, radial_distance_c: d, R: r }, 'perimeter');
    const traceK = nav.solve({ radial_distance_a: d, radial_distance_b: d, radial_distance_c: d, R: r }, 'triangle_area');
    console.log('Chain C:', {
      perimeterStatus: traceP.status,
      perimeterVal: traceP.finalValue,
      areaStatus: traceK.status,
      areaVal: traceK.finalValue,
      perimeterSteps: traceP.selectedPathIds,
    });
  }

  // Chain D: sides -> area -> normalized_area
  {
    const traceNorm = nav.solve({ side_a: 6, side_b: 8, side_c: 10, R: 5 }, 'normalized_area_fraction');
    console.log('Chain D:', {
      status: traceNorm.status,
      val: traceNorm.finalValue,
      steps: traceNorm.selectedPathIds,
    });
  }

  // Chain E: sides -> transferred_minor_angles -> transferred_angle_sum -> obtuse diagnostic/recovery
  {
    // Obtuse triangle with A=120, B=30, C=30, R=5
    // a = 2*5*sin(60°) = 5*sqrt(3) = 8.660254037844386
    // b = c = 2*5*sin(15°) = 10 * ((sqrt(6)-sqrt(2))/4) = 2.5881904510252074
    const a = 2 * 5 * Math.sin((120 / 2) * (Math.PI / 180));
    const b = 2 * 5 * Math.sin((30 / 2) * (Math.PI / 180));
    const c = b;
    const traceDiag = nav.solve({ side_a: a, side_b: b, side_c: c, R: 5 }, 'diagnostic_triangle_class');
    const traceObtuse = nav.solve({ side_a: a, side_b: b, side_c: c, R: 5 }, 'recovered_obtuse_angle');
    console.log('Chain E:', {
      diagStatus: traceDiag.status,
      diagVal: traceDiag.finalValue,
      obtuseStatus: traceObtuse.status,
      obtuseVal: traceObtuse.finalValue,
      diagSteps: traceDiag.selectedPathIds,
    });
  }

  // Chain F: two competing triangle-class routes: Thales vs coordinate classification
  {
    const traceThales = nav.solve({ coord_A: { x: -5, y: 0 }, coord_C: { x: 5, y: 0 }, R: 5 }, 'triangle_class');
    const traceCoord = nav.solve({ coord_A: { x: -5, y: 0 }, coord_B: { x: 0, y: 5 }, coord_C: { x: 5, y: 0 } }, 'triangle_class');
    console.log('Chain F:', {
      thalesStatus: traceThales.status,
      thalesVal: traceThales.finalValue,
      thalesSteps: traceThales.selectedPathIds,
      coordStatus: traceCoord.status,
      coordVal: traceCoord.finalValue,
      coordSteps: traceCoord.selectedPathIds,
    });
  }

  // Chain G: area: angle/R route vs Heron route
  {
    const traceAngArea = nav.solve({ angle_A: 30, angle_B: 60, angle_C: 90, R: 5 }, 'triangle_area');
    const traceHeronArea = nav.solve({ side_a: 6, side_b: 8, side_c: 10 }, 'triangle_area');
    console.log('Chain G:', {
      angAreaStatus: traceAngArea.status,
      angAreaVal: traceAngArea.finalValue,
      angSteps: traceAngArea.selectedPathIds,
      heronStatus: traceHeronArea.status,
      heronVal: traceHeronArea.finalValue,
      heronSteps: traceHeronArea.selectedPathIds,
    });
  }
}

runChainAudit();
