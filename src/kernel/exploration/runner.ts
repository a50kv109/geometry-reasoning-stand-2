// src/kernel/exploration/runner.ts
// Isolated ExplorationRunner for testing hypotheses without modifying Canonical Graph

import { Hypothesis, ExplorationTrace, FactMap, DerivationPath } from '../types';

export class ExplorationRunner {
  /**
   * Tests a hypothesis against known state in an isolated sandbox.
   * Does NOT modify the canonical graph or the input knowns.
   */
  public testHypothesis(hypothesis: Hypothesis, knowns: FactMap): ExplorationTrace {
    const trace: ExplorationTrace = {
      hypothesisId: hypothesis.id,
      inputsUsed: { ...knowns },
      target: hypothesis.target,
      stepsExecuted: [],
      status: 'UNKNOWN',
      reason: '',
    };

    const sandbox: FactMap = { ...knowns };

    for (const edge of hypothesis.proposedPath) {
      // 1. Check required inputs in sandbox
      for (const req of edge.requires) {
        if (!(req in sandbox) || sandbox[req] === undefined || sandbox[req] === null) {
          trace.status = 'INCONCLUSIVE';
          trace.reason = `Insufficient data: Missing required input '${req}' at step ${edge.id}`;
          return trace;
        }
      }

      // 2. Check preconditions
      if (edge.precondition && !edge.precondition(sandbox)) {
        trace.status = 'FALSIFIED';
        trace.reason = `Precondition contradiction at step ${edge.id}`;
        return trace;
      }

      // 3. Execute step in sandbox
      try {
        const res = edge.operation(sandbox);
        sandbox[edge.provides] = res;
        trace.stepsExecuted.push(`Executed ${edge.id} -> ${edge.provides} = ${String(res)}`);
      } catch (e: any) {
        trace.status = 'FALSIFIED';
        trace.reason = `Mathematical computation failure at step ${edge.id}: ${e?.message || String(e)}`;
        return trace;
      }
    }

    const computedResult = sandbox[hypothesis.target];
    trace.computedResult = computedResult;

    if (computedResult === undefined || computedResult === null) {
      trace.status = 'INCONCLUSIVE';
      trace.reason = `Target '${hypothesis.target}' was not reached by the proposed path.`;
      return trace;
    }

    // Compare with expected value if provided
    if (hypothesis.expectedValue !== undefined) {
      if (typeof computedResult === 'number' && typeof hypothesis.expectedValue === 'number') {
        if (Math.abs(computedResult - hypothesis.expectedValue) < 1e-4) {
          trace.status = 'VERIFIED';
          trace.reason = `Matches expectation: ${computedResult} ≈ ${hypothesis.expectedValue}`;
        } else {
          trace.status = 'FALSIFIED';
          trace.reason = `Result ${computedResult} contradicts expectation ${hypothesis.expectedValue}`;
        }
      } else {
        if (computedResult === hypothesis.expectedValue) {
          trace.status = 'VERIFIED';
          trace.reason = `Matches expectation: ${String(computedResult)}`;
        } else {
          trace.status = 'FALSIFIED';
          trace.reason = `Result ${String(computedResult)} contradicts expectation ${String(hypothesis.expectedValue)}`;
        }
      }
    } else {
      trace.status = 'VERIFIED';
      trace.reason = 'Path executed successfully without contradictions in current test configuration.';
    }

    return trace;
  }
}
