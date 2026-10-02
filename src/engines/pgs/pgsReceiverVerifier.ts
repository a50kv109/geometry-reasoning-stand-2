// src/engines/pgs/pgsReceiverVerifier.ts
// Independent Receiver Verification Module for Receiving Stand
// Complies with "SOURCE CLAIM != RECEIVER VERIFICATION" rule.

import { PGS2DPassport, PGSReceiverVerification, PGSVerificationCheck, PGSPoint2D, PGSCircle2D } from './types';

export function verifyPgsPassportAsReceiver(passport: PGS2DPassport): PGSReceiverVerification {
  const checks: PGSVerificationCheck[] = [];
  let isRefuted = false;
  let isDegenerate = false;

  // 1. Check Schema & Transfer Mode
  if (passport.meta.transferMode !== 'EXACT_STATE') {
    checks.push({
      name: 'TRANSFER_MODE_CHECK',
      status: 'FAILED',
      message: `Unsupported transferMode: ${passport.meta.transferMode}. Only EXACT_STATE is supported.`,
    });
    isRefuted = true;
  } else {
    checks.push({ name: 'TRANSFER_MODE_CHECK', status: 'PASSED' });
  }

  // Find objects
  const objectsByPortableId = new Map(passport.objects.map((o) => [o.portableId, o]));

  // 2. Polygon(3) Presence & Topology Check
  const polygon = passport.objects.find((o) => o.type === 'Polygon');
  const polygonTop = passport.topology.find((t) => t.type === 'PolygonTopology');

  if (!polygon || polygon.vertexCount !== 3 || !polygonTop) {
    checks.push({
      name: 'TRIANGLE_TOPOLOGY_CHECK',
      status: 'FAILED',
      message: 'Polygon(3) or PolygonTopology missing from passport',
    });
    isRefuted = true;
  } else {
    checks.push({ name: 'TRIANGLE_TOPOLOGY_CHECK', status: 'PASSED' });
  }

  // 3. Base Vertices Check (pt_A, pt_B, pt_C)
  const pA = objectsByPortableId.get('pt_A') as PGSPoint2D | undefined;
  const pB = objectsByPortableId.get('pt_B') as PGSPoint2D | undefined;
  const pC = objectsByPortableId.get('pt_C') as PGSPoint2D | undefined;

  if (!pA || !pB || !pC) {
    checks.push({
      name: 'BASE_VERTICES_CHECK',
      status: 'FAILED',
      message: 'Missing primary vertices A, B, or C',
    });
    isRefuted = true;
  } else {
    checks.push({ name: 'BASE_VERTICES_CHECK', status: 'PASSED' });
  }

  // 4. Non-degeneracy & Area Check
  if (pA && pB && pC) {
    // Shoelace formula for area
    const area = 0.5 * Math.abs(pA.x * (pB.y - pC.y) + pB.x * (pC.y - pA.y) + pC.x * (pA.y - pB.y));
    if (area < 1e-4) {
      checks.push({
        name: 'NON_DEGENERACY_CHECK',
        status: 'FAILED',
        message: 'Triangle vertices are collinear or degenerate (Area ≈ 0)',
      });
      isDegenerate = true;
    } else {
      checks.push({
        name: 'NON_DEGENERACY_CHECK',
        status: 'PASSED',
        message: `Area = ${area.toFixed(2)} mm²`,
      });
    }
  }

  // 5. Circumcircle & Center O Consistency Check
  const pO = objectsByPortableId.get('pt_O') as PGSPoint2D | undefined;
  const circumcircle = passport.objects.find((o) => o.type === 'Circle2D' && o.role === 'circumcircle') as PGSCircle2D | undefined;

  if (!pO || !circumcircle) {
    checks.push({
      name: 'CIRCUMCIRCLE_CHECK',
      status: 'FAILED',
      message: 'Missing center point O or circumcircle',
    });
    isRefuted = true;
  } else if (pA && pB && pC) {
    const R = circumcircle.radius;
    const dA = Math.hypot(pA.x - pO.x, pA.y - pO.y);
    const dB = Math.hypot(pB.x - pO.x, pB.y - pO.y);
    const dC = Math.hypot(pC.x - pO.x, pC.y - pO.y);

    const maxDev = Math.max(Math.abs(dA - R), Math.abs(dB - R), Math.abs(dC - R));

    if (maxDev > 1e-2) {
      checks.push({
        name: 'CIRCUMCIRCLE_CHECK',
        status: 'FAILED',
        message: `Vertices do not lie on circumcircle within tolerance (max deviation: ${maxDev.toFixed(4)} mm)`,
      });
      isRefuted = true;
    } else {
      checks.push({
        name: 'CIRCUMCIRCLE_CHECK',
        status: 'PASSED',
        message: `All vertices lie on circumcircle (R = ${R.toFixed(2)} mm)`,
      });
    }
  }

  // 6. Auxiliary Lines Boundary Edge Separation Check
  const boundaryEdgeIds = new Set(polygonTop?.edgeIds || []);
  const nonBoundarySegmentsAsEdges = passport.objects.filter(
    (o) => o.type === 'Segment2D' && o.role === 'auxiliary_segment' && boundaryEdgeIds.has(o.portableId)
  );

  if (nonBoundarySegmentsAsEdges.length > 0) {
    checks.push({
      name: 'TOPOLOGY_ISOLATION_CHECK',
      status: 'FAILED',
      message: 'Auxiliary segments improperly registered as polygon boundary edges',
    });
    isRefuted = true;
  } else {
    checks.push({ name: 'TOPOLOGY_ISOLATION_CHECK', status: 'PASSED' });
  }

  const verified = !isRefuted && !isDegenerate;
  const status: PGSReceiverVerification['status'] = isRefuted
    ? 'REFUTED'
    : isDegenerate
    ? 'DEGENERATE'
    : 'VERIFIED';

  return {
    verified,
    status,
    checkedAt: new Date().toISOString(),
    checks,
  };
}
