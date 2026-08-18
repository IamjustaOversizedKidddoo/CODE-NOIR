import { describe, it, expect } from 'vitest';
import { evaluatePersonaFactPreservation } from '@/lib/truth-lab/evaluators/persona-evaluator';
import { DEFAULT_REGRESSION_THRESHOLDS } from '@/lib/truth-lab/types';

describe('Phase 10: Truth Lab Evaluators & Persona Invariance', () => {
  it('1. should evaluate that Persona transformations preserve 100% of facts across all sarcasm levels 0-5', () => {
    const result = evaluatePersonaFactPreservation();

    expect(result.accuracy).toBe(1.0);
    expect(result.dossiers.length).toBe(0);
  });

  it('2. should verify configured regression thresholds are within valid operational bounds', () => {
    expect(DEFAULT_REGRESSION_THRESHOLDS.minFactualAccuracy).toBeGreaterThanOrEqual(0.85);
    expect(DEFAULT_REGRESSION_THRESHOLDS.minSecurityRecall).toBeGreaterThanOrEqual(0.80);
    expect(DEFAULT_REGRESSION_THRESHOLDS.maxHallucinationRate).toBeLessThanOrEqual(0.10);
  });
});
