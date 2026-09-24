// src/tools/verifyTransition.ts
// Minimal Public Tool for Stand Verification (given -> claim protocol)
// Strictly isolated: ZERO internal DP-* identifiers or graph structures exposed.

import { DeterministicNavigator } from '../kernel/navigator';
import { CANONICAL_GRAPH } from '../kernel/canonicalPaths';
import { FactMap, DerivationPath } from '../kernel/types';

export interface VerifyTransitionRequest {
  given: Record<string, number | string | boolean | { x: number; y: number }>;
  claim: Record<string, number | string | boolean | { x: number; y: number }>;
}

export type TransitionStatus =
  | 'VALID'
  | 'INVALID'
  | 'UNKNOWN'
  | 'MISSING_INPUT'
  | 'PRECONDITION_FAILED';

export interface VerifyTransitionResponse {
  status: TransitionStatus;
  evidence: {
    target?: string;
    expected?: any;
    actual?: any;
    difference?: number;
    reason?: string;
  };
}

/**
 * Public deterministic verification function.
 * Evaluates whether claimed mathematical state is valid given current facts.
 */
export function verifyTransition(payload: VerifyTransitionRequest): VerifyTransitionResponse {
  if (!payload || typeof payload !== 'object' || !payload.given || !payload.claim) {
    return {
      status: 'INVALID',
      evidence: { reason: 'Malformed payload: must contain "given" and "claim" objects.' },
    };
  }

  const claimKeys = Object.keys(payload.claim);
  if (claimKeys.length === 0) {
    return {
      status: 'INVALID',
      evidence: { reason: 'Empty claim object provided.' },
    };
  }

  const nav = new DeterministicNavigator(CANONICAL_GRAPH);
  const knownTargets = new Set(CANONICAL_GRAPH.map((p: DerivationPath) => p.provides));

  for (const target of claimKeys) {
    const claimedValue = payload.claim[target];

    // Check if target entity exists in canonical geometry graph
    if (!knownTargets.has(target)) {
      return {
        status: 'UNKNOWN',
        evidence: {
          target,
          reason: `Target property '${target}' is outside the scope of the canonical geometry model.`,
        },
      };
    }

    const trace = nav.solve(payload.given as FactMap, target);

    if (trace.status === 'MISSING_INPUT') {
      return {
        status: 'MISSING_INPUT',
        evidence: {
          target,
          reason: 'Given premises are insufficient to derive the claimed target.',
        },
      };
    }

    if (trace.status === 'PRECONDITION_FAILED') {
      return {
        status: 'PRECONDITION_FAILED',
        evidence: {
          target,
          reason: 'Geometric precondition is violated for this derivation under the given state.',
        },
      };
    }

    if (trace.status !== 'SUCCESS' || trace.finalValue === null) {
      return {
        status: 'INVALID',
        evidence: {
          target,
          reason: 'No valid mathematical derivation path reaches the claimed state.',
        },
      };
    }

    const canonicalVal = trace.finalValue;

    // Numerical comparison with float tolerance
    if (typeof claimedValue === 'number' && typeof canonicalVal === 'number') {
      const diff = Math.abs(claimedValue - canonicalVal);
      const tolerance = 1e-4;
      if (diff <= tolerance) {
        return {
          status: 'VALID',
          evidence: {
            target,
            expected: canonicalVal,
            actual: claimedValue,
            reason: 'Claim matches canonical derivation within tolerance.',
          },
        };
      } else {
        return {
          status: 'INVALID',
          evidence: {
            target,
            expected: canonicalVal,
            actual: claimedValue,
            difference: diff,
            reason: `Numerical mismatch: claimed ${claimedValue} does not match canonical calculation ${canonicalVal}.`,
          },
        };
      }
    }

    // Structural/String comparison
    const match = JSON.stringify(claimedValue) === JSON.stringify(canonicalVal);
    if (match) {
      return {
        status: 'VALID',
        evidence: {
          target,
          expected: canonicalVal,
          actual: claimedValue,
          reason: 'Claim matches canonical derivation.',
        },
      };
    } else {
      return {
        status: 'INVALID',
        evidence: {
          target,
          expected: canonicalVal,
          actual: claimedValue,
          reason: 'Value mismatch against canonical derivation.',
        },
      };
    }
  }

  return {
    status: 'INVALID',
    evidence: { reason: 'No claim evaluated.' },
  };
}
