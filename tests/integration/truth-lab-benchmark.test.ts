import { describe, it, expect } from 'vitest';
import { runTruthLabBenchmark } from '@/lib/truth-lab/master-runner';

describe('Integration: Phase 10 Truth Lab Benchmark Evaluation Run', () => {
  it('should run full Truth Lab benchmark and pass all regression gates', async () => {
    const scorecard = await runTruthLabBenchmark();

    expect(scorecard.runId).toBeDefined();
    expect(scorecard.overallPassed).toBe(true);
    expect(scorecard.metrics.factualAccuracy).toBeGreaterThanOrEqual(0.90);
    expect(scorecard.metrics.citationAccuracy).toBeGreaterThanOrEqual(0.90);
    expect(scorecard.metrics.relationshipF1).toBeGreaterThanOrEqual(0.85);
    expect(scorecard.metrics.securityRecall).toBeGreaterThanOrEqual(0.85);
    expect(scorecard.metrics.securityPrecision).toBeGreaterThanOrEqual(0.85);
    expect(scorecard.metrics.personaPreservation).toBe(1.0);
    expect(scorecard.metrics.hallucinationRate).toBe(0.0);
    expect(scorecard.metrics.ambiguityHandling).toBe(1.0);
  });
});
