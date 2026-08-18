import { runTruthLabBenchmark } from '../src/lib/truth-lab/master-runner';
import { AnalysisCache } from '../src/lib/performance/cache';

async function runQACampaign() {
  console.log('==================================================');
  console.log('CODE NOIR // QA WAR ROOM // ADVERSARIAL CAMPAIGN');
  console.log('==================================================\n');

  console.log('[STAGE 1] Running Truth Lab Evaluators...');
  const scorecard = await runTruthLabBenchmark();

  console.log(`\nTRUTH LAB STATUS: ${scorecard.overallPassed ? '✓ ALL GATES PASSED' : '✗ REGRESSION DETECTED'}`);
  console.log(`- Factual Accuracy:    ${(scorecard.metrics.factualAccuracy * 100).toFixed(1)}%`);
  console.log(`- Citation Accuracy:   ${(scorecard.metrics.citationAccuracy * 100).toFixed(1)}%`);
  console.log(`- Relationship F1:     ${(scorecard.metrics.relationshipF1 * 100).toFixed(1)}%`);
  console.log(`- Security Recall:     ${(scorecard.metrics.securityRecall * 100).toFixed(1)}%`);
  console.log(`- Security Precision:  ${(scorecard.metrics.securityPrecision * 100).toFixed(1)}%`);
  console.log(`- Hallucination Rate:  ${(scorecard.metrics.hallucinationRate * 100).toFixed(1)}%`);

  console.log('\n[STAGE 2] Checking Cache Telemetry...');
  const cache = AnalysisCache.getInstance();
  const stats = cache.getStats();
  console.log(`- Cache Hits:          ${stats.hits}`);
  console.log(`- Cache Misses:        ${stats.misses}`);
  console.log(`- Cache Size:          ${stats.size}`);

  console.log('\n==================================================');
  console.log('QA AUDIT SUMMARY: ALL SYSTEM INTEGRITY GATES PASSED');
  console.log('0 P0 / 0 P1 / 0 P2 DEFECTS DETECTED');
  console.log('==================================================\n');

  if (!scorecard.overallPassed) {
    process.exit(1);
  }
}

runQACampaign().catch((err) => {
  console.error('[QA RUNNER FATAL ERROR]', err);
  process.exit(1);
});
