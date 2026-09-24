// src/kernel/consistencyEngine.ts
// Cross-Representation Consistency & Evidence Generation Layer for Deterministic Geometry Stand
// Epistemically isolated: Does NOT mutate or modify CANONICAL_GRAPH. Evaluates multi-route consistency.
// Stage S10 Hardened: Immutable trust boundaries, circular self-validation protection, provenance tracking.

import { DeterministicNavigator } from './navigator';
import { CANONICAL_GRAPH } from './canonicalPaths';
import { FactMap, FactValue } from './types';

export type ConsistencyStatus =
  | 'CONSISTENT'
  | 'INCONSISTENT'
  | 'UNDERDETERMINED'
  | 'INVALID_INPUT'
  | 'PRECONDITION_FAILED';

export interface ContradictionWitness {
  fact: string;
  claimed?: FactValue;
  expected?: FactValue;
  difference?: number;
  route: string;
  status: 'CONTRADICTED' | 'VERIFIED' | 'UNDERDETERMINED' | 'PRECONDITION_FAILED';
  reason: string;
}

export interface ConsistencyReport {
  overallStatus: ConsistencyStatus;
  witnesses: ContradictionWitness[];
  verifiedFacts: string[];
  contradictedFacts: string[];
  underdeterminedFacts: string[];
  crossRouteChecksCount: number;
}

export interface ConsistencyCheckInput {
  trustedFacts: FactMap;
  agentAssertions: FactMap;
}

export class ConsistencyEngine {
  private nav: DeterministicNavigator;
  private tolerance: number;

  constructor(tolerance: number = 1e-4) {
    this.nav = new DeterministicNavigator(CANONICAL_GRAPH);
    this.tolerance = tolerance;
  }

  /**
   * Main consistency verification method.
   * Evaluates agentAssertions against trustedFacts using independent geometric routes.
   * Enforces strict trust boundaries and provenance-aware validation.
   */
  public verify(input: ConsistencyCheckInput): ConsistencyReport {
    const { trustedFacts, agentAssertions } = input;
    const witnesses: ContradictionWitness[] = [];
    const verifiedFacts: string[] = [];
    const contradictedFacts: string[] = [];
    const underdeterminedFacts: string[] = [];
    let crossRouteChecksCount = 0;

    // Check basic input domain validity & non-finite values on trustedFacts & agentAssertions
    const domainErrors = this.checkDomainAndSanity(trustedFacts, agentAssertions);
    if (domainErrors.length > 0) {
      for (const err of domainErrors) {
        witnesses.push(err);
      }
      return {
        overallStatus: 'PRECONDITION_FAILED',
        witnesses,
        verifiedFacts: [],
        contradictedFacts: domainErrors.map((e) => e.fact),
        underdeterminedFacts: [],
        crossRouteChecksCount: 1,
      };
    }

    const assertedKeys = Object.keys(agentAssertions);
    if (assertedKeys.length === 0) {
      return {
        overallStatus: 'CONSISTENT',
        witnesses: [],
        verifiedFacts: [],
        contradictedFacts: [],
        underdeterminedFacts: [],
        crossRouteChecksCount: 0,
      };
    }

    // 0. S10 HARDENING: Trust Boundary Collision Check (Agent cannot silently mutate/override trusted facts)
    const collisionWitnesses = this.checkTrustBoundaryCollisions(trustedFacts, agentAssertions);
    crossRouteChecksCount += collisionWitnesses.length;
    for (const w of collisionWitnesses) {
      witnesses.push(w);
      if (w.status === 'CONTRADICTED') contradictedFacts.push(w.fact);
      else if (w.status === 'VERIFIED') verifiedFacts.push(w.fact);
    }

    // 1. Cross-Representation Check: Angle-to-Side relations (a = 2R sin A, b = 2R sin B, c = 2R sin C)
    const sideAngleWitnesses = this.checkSideAngleRelations(trustedFacts, agentAssertions);
    crossRouteChecksCount += sideAngleWitnesses.length;
    for (const w of sideAngleWitnesses) {
      witnesses.push(w);
      if (w.status === 'CONTRADICTED') contradictedFacts.push(w.fact);
      else if (w.status === 'VERIFIED') verifiedFacts.push(w.fact);
    }

    // 2. Cross-Representation Check: Pythagorean Radial Distance Invariant (d_i^2 + (s_i/2)^2 = R^2)
    // S10 Hardening: Side length must be trusted or verified from trusted facts to prevent circular validation.
    const radialWitnesses = this.checkRadialDistanceInvariants(trustedFacts, agentAssertions);
    crossRouteChecksCount += radialWitnesses.length;
    for (const w of radialWitnesses) {
      witnesses.push(w);
      if (w.status === 'CONTRADICTED') contradictedFacts.push(w.fact);
      else if (w.status === 'VERIFIED') verifiedFacts.push(w.fact);
    }

    // 3. Multi-Path Area Convergence: Heron vs Trigonometric Formula
    const areaWitnesses = this.checkAreaMultiPathConvergence(trustedFacts, agentAssertions);
    crossRouteChecksCount += areaWitnesses.length;
    for (const w of areaWitnesses) {
      witnesses.push(w);
      if (w.status === 'CONTRADICTED') contradictedFacts.push(w.fact);
      else if (w.status === 'VERIFIED') verifiedFacts.push(w.fact);
    }

    // 4. Inradius Carnot Radial Sum Check (for acute triangles: r = d_a + d_b + d_c - R)
    const inradiusWitnesses = this.checkInradiusCarnot(trustedFacts, agentAssertions);
    crossRouteChecksCount += inradiusWitnesses.length;
    for (const w of inradiusWitnesses) {
      witnesses.push(w);
      if (w.status === 'CONTRADICTED') contradictedFacts.push(w.fact);
      else if (w.status === 'VERIFIED') verifiedFacts.push(w.fact);
    }

    // 5. Direct Canonical Navigator Solve against Trusted Facts (Epistemic Isolation)
    for (const key of assertedKeys) {
      // If already evaluated by specialized cross-checks, avoid redundant duplicate witnesses
      if (witnesses.some((w) => w.fact === key)) continue;

      const claimedVal = agentAssertions[key];
      const trace = this.nav.solve(trustedFacts, key);
      crossRouteChecksCount++;

      if (trace.status === 'SUCCESS' && trace.finalValue !== null) {
        if (typeof claimedVal === 'number' && typeof trace.finalValue === 'number') {
          const diff = Math.abs(claimedVal - trace.finalValue);
          const tol = this.getEffectiveTolerance(trace.finalValue);
          if (diff <= tol) {
            verifiedFacts.push(key);
            witnesses.push({
              fact: key,
              claimed: claimedVal,
              expected: trace.finalValue,
              difference: diff,
              route: `Canonical path (${trace.selectedPathIds.join(' -> ')})`,
              status: 'VERIFIED',
              reason: 'Assertion matches independent derivation from trusted premises.',
            });
          } else {
            contradictedFacts.push(key);
            witnesses.push({
              fact: key,
              claimed: claimedVal,
              expected: trace.finalValue,
              difference: diff,
              route: `Canonical path (${trace.selectedPathIds.join(' -> ')})`,
              status: 'CONTRADICTED',
              reason: `Numerical contradiction: claimed ${claimedVal} does not match derived ${trace.finalValue}.`,
            });
          }
        } else if (JSON.stringify(claimedVal) === JSON.stringify(trace.finalValue)) {
          verifiedFacts.push(key);
          witnesses.push({
            fact: key,
            claimed: claimedVal,
            expected: trace.finalValue,
            route: `Canonical path (${trace.selectedPathIds.join(' -> ')})`,
            status: 'VERIFIED',
            reason: 'Assertion matches independent derivation from trusted premises.',
          });
        } else {
          contradictedFacts.push(key);
          witnesses.push({
            fact: key,
            claimed: claimedVal,
            expected: trace.finalValue,
            route: `Canonical path (${trace.selectedPathIds.join(' -> ')})`,
            status: 'CONTRADICTED',
            reason: 'Assertion value mismatch against derived canonical state.',
          });
        }
      } else if (trace.status === 'PRECONDITION_FAILED') {
        contradictedFacts.push(key);
        witnesses.push({
          fact: key,
          claimed: claimedVal,
          route: 'Canonical Navigator',
          status: 'PRECONDITION_FAILED',
          reason: `Geometric precondition failed: ${trace.message ?? 'violated domain constraint'}`,
        });
      } else {
        // Underdetermined: cannot prove or disprove from trusted facts alone
        underdeterminedFacts.push(key);
        witnesses.push({
          fact: key,
          claimed: claimedVal,
          route: 'None (Underdetermined)',
          status: 'UNDERDETERMINED',
          reason: 'Trusted facts are insufficient to independently derive or cross-check this assertion.',
        });
      }
    }

    // Determine overallStatus
    let overallStatus: ConsistencyStatus = 'CONSISTENT';
    if (contradictedFacts.length > 0) {
      overallStatus = 'INCONSISTENT';
    } else if (witnesses.some((w) => w.status === 'PRECONDITION_FAILED')) {
      overallStatus = 'PRECONDITION_FAILED';
    } else if (underdeterminedFacts.length > 0 && verifiedFacts.length === 0) {
      overallStatus = 'UNDERDETERMINED';
    }

    return {
      overallStatus,
      witnesses,
      verifiedFacts: Array.from(new Set(verifiedFacts)),
      contradictedFacts: Array.from(new Set(contradictedFacts)),
      underdeterminedFacts: Array.from(new Set(underdeterminedFacts)),
      crossRouteChecksCount,
    };
  }

  // --------------------------------------------------------------------------
  // Internal Verification & Hardening Routines
  // --------------------------------------------------------------------------

  private getEffectiveTolerance(referenceValue: number): number {
    const absVal = Math.abs(referenceValue);
    if (absVal > 1e3 || (absVal < 1e-2 && absVal > 0)) {
      return Math.max(this.tolerance, absVal * 1e-4);
    }
    return this.tolerance;
  }

  /**
   * S10 HARDENING 1: Trust Boundary Collision Protection
   * If agent asserts a value for a key that is already an immutable trusted fact:
   *  - If claimed matches trusted -> VERIFIED
   *  - If claimed contradicts trusted -> CONTRADICTED
   */
  private checkTrustBoundaryCollisions(trusted: FactMap, asserted: FactMap): ContradictionWitness[] {
    const witnesses: ContradictionWitness[] = [];
    for (const key of Object.keys(asserted)) {
      if (key in trusted) {
        const trustedVal = trusted[key];
        const claimedVal = asserted[key];

        if (typeof trustedVal === 'number' && typeof claimedVal === 'number') {
          const diff = Math.abs(claimedVal - trustedVal);
          const tol = this.getEffectiveTolerance(trustedVal);
          if (diff > tol) {
            witnesses.push({
              fact: key,
              claimed: claimedVal,
              expected: trustedVal,
              difference: diff,
              route: 'Trust Boundary Immutable Collision',
              status: 'CONTRADICTED',
              reason: `Agent attempted to re-assert immutable trusted fact '${key}' with conflicting value (${claimedVal} vs trusted ${trustedVal}).`,
            });
          } else {
            witnesses.push({
              fact: key,
              claimed: claimedVal,
              expected: trustedVal,
              difference: diff,
              route: 'Trust Boundary Concordance',
              status: 'VERIFIED',
              reason: `Agent assertion for '${key}' matches immutable trusted fact.`,
            });
          }
        } else if (JSON.stringify(claimedVal) !== JSON.stringify(trustedVal)) {
          witnesses.push({
            fact: key,
            claimed: claimedVal,
            expected: trustedVal,
            route: 'Trust Boundary Immutable Collision',
            status: 'CONTRADICTED',
            reason: `Agent attempted to re-assert immutable trusted fact '${key}' with conflicting non-numerical value.`,
          });
        } else {
          witnesses.push({
            fact: key,
            claimed: claimedVal,
            expected: trustedVal,
            route: 'Trust Boundary Concordance',
            status: 'VERIFIED',
            reason: `Agent assertion for '${key}' matches immutable trusted fact.`,
          });
        }
      }
    }

    // S12 HARDENING: Check semantic correspondence collisions (e.g. side_a in trusted, chord_BC in asserted)
    const SEMANTIC_CORRESPONDENCES: Record<string, string> = {
      chord_BC: 'side_a',
      side_a: 'chord_BC',
      chord_CA: 'side_b',
      side_b: 'chord_CA',
      chord_AB: 'side_c',
      side_c: 'chord_AB',
    };

    for (const [key, aliasKey] of Object.entries(SEMANTIC_CORRESPONDENCES)) {
      if (key in asserted && !(key in trusted) && aliasKey in trusted) {
        const trustedVal = trusted[aliasKey];
        const claimedVal = asserted[key];
        if (typeof trustedVal === 'number' && typeof claimedVal === 'number') {
          const diff = Math.abs(claimedVal - trustedVal);
          const tol = this.getEffectiveTolerance(trustedVal);
          if (diff > tol) {
            witnesses.push({
              fact: key,
              claimed: claimedVal,
              expected: trustedVal,
              difference: diff,
              route: 'Trust Boundary Semantic Collision',
              status: 'CONTRADICTED',
              reason: `Agent attempted to assert '${key}' contradicting semantically corresponding trusted fact '${aliasKey}' (${claimedVal} vs trusted ${trustedVal}).`,
            });
          }
        }
      }
    }

    return witnesses;
  }

  private checkDomainAndSanity(trusted: FactMap, asserted: FactMap): ContradictionWitness[] {
    const witnesses: ContradictionWitness[] = [];
    const combined: FactMap = { ...trusted, ...asserted };

    // Check for NaN or non-finite numbers
    for (const [k, v] of Object.entries(combined)) {
      if (typeof v === 'number' && (!Number.isFinite(v) || Number.isNaN(v))) {
        witnesses.push({
          fact: k,
          claimed: v,
          route: 'Numerical Sanity Check',
          status: 'PRECONDITION_FAILED',
          reason: `Value for fact '${k}' is non-finite or NaN (${v}).`,
        });
      }
    }

    const r = Number(combined['R']);
    if (!isNaN(r) && r <= 0) {
      witnesses.push({
        fact: 'R',
        claimed: r,
        route: 'Domain Boundary',
        status: 'PRECONDITION_FAILED',
        reason: 'Circumradius R must be strictly positive (R > 0).',
      });
    }

    for (const prefix of ['a', 'b', 'c', 'A', 'B', 'C']) {
      const sideKey = `side_${prefix.toLowerCase()}`;
      const chordKey = `chord_${prefix.toUpperCase()}`;
      const sideVal = Number(combined[sideKey] ?? combined[chordKey]);
      if (!isNaN(sideVal) && !isNaN(r) && r > 0) {
        if (sideVal < 0) {
          witnesses.push({
            fact: sideKey,
            claimed: sideVal,
            route: 'Domain Boundary',
            status: 'PRECONDITION_FAILED',
            reason: `Side length ${sideKey} cannot be negative.`,
          });
        }
        if (sideVal > 2 * r + this.tolerance) {
          witnesses.push({
            fact: sideKey,
            claimed: sideVal,
            expected: 2 * r,
            difference: sideVal - 2 * r,
            route: 'Diameter Upper Bound (s <= 2R)',
            status: 'PRECONDITION_FAILED',
            reason: `Side length ${sideKey}=${sideVal} exceeds circumdiameter 2R=${2 * r}.`,
          });
        }
      }

      const radKey = `radial_distance_${prefix.toLowerCase()}`;
      const radVal = Number(combined[radKey] ?? combined[`d_${prefix.toLowerCase()}`]);
      if (!isNaN(radVal) && !isNaN(r) && r > 0) {
        if (radVal < -this.tolerance || radVal > r + this.tolerance) {
          witnesses.push({
            fact: radKey,
            claimed: radVal,
            expected: `0 <= d <= ${r}`,
            route: 'Radial Distance Domain (0 <= d <= R)',
            status: 'PRECONDITION_FAILED',
            reason: `Radial distance ${radKey}=${radVal} is outside physical interval [0, R].`,
          });
        }
      }
    }

    return witnesses;
  }

  private checkSideAngleRelations(trusted: FactMap, asserted: FactMap): ContradictionWitness[] {
    const witnesses: ContradictionWitness[] = [];
    const r = Number(trusted['R']);
    if (isNaN(r) || r <= 0) return witnesses;

    const pairs = [
      { sideKey: 'side_a', altSide: 'chord_BC', angleKey: 'angle_A', altAngle: 'angle_a' },
      { sideKey: 'side_b', altSide: 'chord_AC', angleKey: 'angle_B', altAngle: 'angle_b' },
      { sideKey: 'side_c', altSide: 'chord_AB', angleKey: 'angle_C', altAngle: 'angle_c' },
    ];

    for (const p of pairs) {
      const angleVal = Number(trusted[p.angleKey] ?? trusted[p.altAngle]);
      const claimedSide = Number(asserted[p.sideKey] ?? asserted[p.altSide]);

      if (!isNaN(angleVal) && !isNaN(claimedSide)) {
        const expectedSide = 2 * r * Math.sin((angleVal * Math.PI) / 180);
        const diff = Math.abs(claimedSide - expectedSide);
        const tol = this.getEffectiveTolerance(expectedSide);
        if (diff > tol) {
          witnesses.push({
            fact: p.sideKey,
            claimed: claimedSide,
            expected: expectedSide,
            difference: diff,
            route: `DP-CHORD-TRIG via R=${r}, ${p.angleKey}=${angleVal}`,
            status: 'CONTRADICTED',
            reason: `Trigonometric mismatch: claimed ${p.sideKey}=${claimedSide} but expected 2R*sin(${angleVal}°)=${expectedSide}.`,
          });
        } else {
          witnesses.push({
            fact: p.sideKey,
            claimed: claimedSide,
            expected: expectedSide,
            difference: diff,
            route: `DP-CHORD-TRIG via R=${r}, ${p.angleKey}=${angleVal}`,
            status: 'VERIFIED',
            reason: `Cross-route verified: claimed side matches 2R*sin(${angleVal}°).`,
          });
        }
      }
    }

    return witnesses;
  }

  /**
   * S10 HARDENING 2: Anti-Circular Radial Distance Verification
   * Side length must be drawn from trusted facts OR derived from trusted facts.
   * If side length is solely an unproven agent assertion that contradicts ground truth,
   * we must verify radial distance against the ground-truth side length, not the agent's false side!
   */
  private checkRadialDistanceInvariants(trusted: FactMap, asserted: FactMap): ContradictionWitness[] {
    const witnesses: ContradictionWitness[] = [];
    const r = Number(trusted['R']);
    if (isNaN(r) || r <= 0) return witnesses;

    const triplets = [
      { radKey: 'radial_distance_a', altRad: 'd_a', sideKey: 'side_a', altSide: 'chord_BC', angleKey: 'angle_A' },
      { radKey: 'radial_distance_b', altRad: 'd_b', sideKey: 'side_b', altSide: 'chord_AC', angleKey: 'angle_B' },
      { radKey: 'radial_distance_c', altRad: 'd_c', sideKey: 'side_c', altSide: 'chord_AB', angleKey: 'angle_C' },
    ];

    for (const t of triplets) {
      const claimedRad = Number(asserted[t.radKey] ?? asserted[t.altRad]);
      if (isNaN(claimedRad)) continue;

      // 1. Try finding true ground-truth side from trusted facts directly or via angle
      let trueSideVal: number | null = null;
      if (trusted[t.sideKey] !== undefined || trusted[t.altSide] !== undefined) {
        trueSideVal = Number(trusted[t.sideKey] ?? trusted[t.altSide]);
      } else if (trusted[t.angleKey] !== undefined) {
        const ang = Number(trusted[t.angleKey]);
        if (!isNaN(ang)) {
          trueSideVal = 2 * r * Math.sin((ang * Math.PI) / 180);
        }
      }

      if (trueSideVal !== null && !isNaN(trueSideVal)) {
        const halfSide = trueSideVal / 2;
        const expectedRad = Math.sqrt(Math.max(0, r * r - halfSide * halfSide));
        const diff = Math.abs(claimedRad - expectedRad);
        const tol = this.getEffectiveTolerance(expectedRad);

        if (diff > tol) {
          witnesses.push({
            fact: t.radKey,
            claimed: claimedRad,
            expected: expectedRad,
            difference: diff,
            route: `DP-CHORD-TO-RADIAL-DIST via R=${r}, true ${t.sideKey}=${trueSideVal}`,
            status: 'CONTRADICTED',
            reason: `Pythagorean contradiction: claimed ${t.radKey}=${claimedRad} contradicts derived ground-truth √(R² - (${t.sideKey}/2)²)=${expectedRad}.`,
          });
        } else {
          witnesses.push({
            fact: t.radKey,
            claimed: claimedRad,
            expected: expectedRad,
            difference: diff,
            route: `DP-CHORD-TO-RADIAL-DIST via R=${r}, true ${t.sideKey}=${trueSideVal}`,
            status: 'VERIFIED',
            reason: `Pythagorean invariant d² + (s/2)² = R² satisfied against ground truth.`,
          });
        }
      } else {
        // No trusted ground-truth side available. If agent asserted side, check internal consistency but mark provenance
        const assertedSide = Number(asserted[t.sideKey] ?? asserted[t.altSide]);
        if (!isNaN(assertedSide)) {
          const halfSide = assertedSide / 2;
          const expectedRadFromAsserted = Math.sqrt(Math.max(0, r * r - halfSide * halfSide));
          const diff = Math.abs(claimedRad - expectedRadFromAsserted);
          if (diff > this.tolerance) {
            witnesses.push({
              fact: t.radKey,
              claimed: claimedRad,
              expected: expectedRadFromAsserted,
              difference: diff,
              route: `Internal Invariant (Unanchored asserted ${t.sideKey}=${assertedSide})`,
              status: 'CONTRADICTED',
              reason: `Internal cluster mismatch: claimed ${t.radKey}=${claimedRad} does not even match asserted side ${assertedSide}.`,
            });
          } else {
            // Self-consistent cluster without external anchor -> UNDERDETERMINED with respect to ground truth
            witnesses.push({
              fact: t.radKey,
              claimed: claimedRad,
              expected: expectedRadFromAsserted,
              difference: diff,
              route: `Internal Invariant (Unanchored asserted ${t.sideKey}=${assertedSide})`,
              status: 'UNDERDETERMINED',
              reason: `Internally consistent with asserted ${t.sideKey}, but lacks independent trusted ground-truth anchor.`,
            });
          }
        }
      }
    }

    return witnesses;
  }

  private checkAreaMultiPathConvergence(trusted: FactMap, asserted: FactMap): ContradictionWitness[] {
    const witnesses: ContradictionWitness[] = [];
    const r = Number(trusted['R']);
    const combined: FactMap = { ...trusted, ...asserted };

    // Trusted or verified ground-truth sides
    let a = Number(trusted['side_a'] ?? trusted['chord_BC']);
    let b = Number(trusted['side_b'] ?? trusted['chord_AC']);
    let c = Number(trusted['side_c'] ?? trusted['chord_AB']);

    const angA = Number(trusted['angle_A'] ?? trusted['angle_a']);
    const angB = Number(trusted['angle_B'] ?? trusted['angle_b']);
    const angC = Number(trusted['angle_C'] ?? trusted['angle_c']);

    // If sides are missing from trusted but angles and R exist, derive true sides
    if (isNaN(a) && !isNaN(r) && !isNaN(angA)) a = 2 * r * Math.sin((angA * Math.PI) / 180);
    if (isNaN(b) && !isNaN(r) && !isNaN(angB)) b = 2 * r * Math.sin((angB * Math.PI) / 180);
    if (isNaN(c) && !isNaN(r) && !isNaN(angC)) c = 2 * r * Math.sin((angC * Math.PI) / 180);

    let kHeron: number | null = null;
    if (!isNaN(a) && !isNaN(b) && !isNaN(c) && a > 0 && b > 0 && c > 0) {
      if (a + b > c && b + c > a && c + a > b) {
        const s = (a + b + c) / 2;
        kHeron = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      }
    }

    let kTrig: number | null = null;
    if (!isNaN(r) && r > 0 && !isNaN(angA) && !isNaN(angB) && !isNaN(angC)) {
      if (Math.abs(angA + angB + angC - 180) <= 1e-3) {
        kTrig =
          2 *
          r *
          r *
          Math.sin((angA * Math.PI) / 180) *
          Math.sin((angB * Math.PI) / 180) *
          Math.sin((angC * Math.PI) / 180);
      }
    }

    // Check cross-route convergence if both routes calculated
    if (kHeron !== null && kTrig !== null) {
      const routeDiff = Math.abs(kHeron - kTrig);
      const tol = this.getEffectiveTolerance(kTrig);
      if (routeDiff > tol) {
        witnesses.push({
          fact: 'triangle_area',
          claimed: `Heron=${kHeron}`,
          expected: `Trig=${kTrig}`,
          difference: routeDiff,
          route: 'Multi-Path Route Convergence (Heron vs Trig Area)',
          status: 'CONTRADICTED',
          reason: `Independent derivation routes diverge: Heron's formula yields ${kHeron} but 2R²sin(A)sin(B)sin(C) yields ${kTrig}.`,
        });
      }
    }

    // Check claimed area if present in asserted facts
    const claimedArea = Number(asserted['triangle_area'] ?? asserted['area']);
    if (!isNaN(claimedArea)) {
      const expectedArea = kTrig ?? kHeron;
      if (expectedArea !== null) {
        const diff = Math.abs(claimedArea - expectedArea);
        const tol = this.getEffectiveTolerance(expectedArea);
        if (diff > tol) {
          witnesses.push({
            fact: 'triangle_area',
            claimed: claimedArea,
            expected: expectedArea,
            difference: diff,
            route: kTrig !== null ? 'Trigonometric Circumradius Route' : "Heron's Formula Route",
            status: 'CONTRADICTED',
            reason: `Claimed triangle area ${claimedArea} contradicts independent calculation ${expectedArea}.`,
          });
        } else {
          witnesses.push({
            fact: 'triangle_area',
            claimed: claimedArea,
            expected: expectedArea,
            difference: diff,
            route: 'Independent Area Route',
            status: 'VERIFIED',
            reason: 'Claimed triangle area matches independent calculation within tolerance.',
          });
        }
      }
    }

    return witnesses;
  }

  private checkInradiusCarnot(trusted: FactMap, asserted: FactMap): ContradictionWitness[] {
    const witnesses: ContradictionWitness[] = [];
    const r = Number(trusted['R']);
    const isAcute = trusted['is_acute'] ?? asserted['is_acute'];

    const claimedInr = Number(asserted['inradius'] ?? asserted['r']);
    if (isNaN(claimedInr) || isNaN(r) || r <= 0) return witnesses;

    const da = Number(trusted['radial_distance_a'] ?? trusted['d_a'] ?? asserted['radial_distance_a'] ?? asserted['d_a']);
    const db = Number(trusted['radial_distance_b'] ?? trusted['d_b'] ?? asserted['radial_distance_b'] ?? asserted['d_b']);
    const dc = Number(trusted['radial_distance_c'] ?? trusted['d_c'] ?? asserted['radial_distance_c'] ?? asserted['d_c']);

    if (!isNaN(da) && !isNaN(db) && !isNaN(dc)) {
      if (isAcute === true) {
        const expectedInr = da + db + dc - r;
        const diff = Math.abs(claimedInr - expectedInr);
        const tol = this.getEffectiveTolerance(expectedInr);
        if (diff > tol) {
          witnesses.push({
            fact: 'inradius',
            claimed: claimedInr,
            expected: expectedInr,
            difference: diff,
            route: 'Carnot Radial Sum r = d_a + d_b + d_c - R',
            status: 'CONTRADICTED',
            reason: `Claimed inradius ${claimedInr} contradicts acute Carnot sum ${expectedInr}.`,
          });
        } else {
          witnesses.push({
            fact: 'inradius',
            claimed: claimedInr,
            expected: expectedInr,
            difference: diff,
            route: 'Carnot Radial Sum r = d_a + d_b + d_c - R',
            status: 'VERIFIED',
            reason: 'Inradius matches Carnot radial sum within tolerance.',
          });
        }
      } else if (isAcute === false) {
        witnesses.push({
          fact: 'inradius',
          claimed: claimedInr,
          route: 'Carnot Radial Sum (Non-Acute)',
          status: 'PRECONDITION_FAILED',
          reason: 'Unsigned Carnot radial sum is invalid for non-acute triangles.',
        });
      }
    }

    return witnesses;
  }
}
