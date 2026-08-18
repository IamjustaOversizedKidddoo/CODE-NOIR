import { runTruthLabBenchmark } from '../src/lib/truth-lab/master-runner';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('==================================================');
  console.log('TRUTH LAB // THE DETECTIVE IS NOW THE SUSPECT');
  console.log('Running deterministic benchmark evaluators...');
  console.log('==================================================\n');

  try {
    const scorecard = await runTruthLabBenchmark();

    console.log(`RUN ID: ${scorecard.runId}`);
    console.log(`STATUS: ${scorecard.overallPassed ? '✓ ALL GATES PASSED' : '✗ REGRESSION DETECTED'}\n`);

    console.log('--- METRIC REPORT ---');
    console.log(`Factual Accuracy:       ${(scorecard.metrics.factualAccuracy * 100).toFixed(1)}%`);
    console.log(`Citation Accuracy:      ${(scorecard.metrics.citationAccuracy * 100).toFixed(1)}%`);
    console.log(`Relationship F1:        ${(scorecard.metrics.relationshipF1 * 100).toFixed(1)}%`);
    console.log(`Security Recall:        ${(scorecard.metrics.securityRecall * 100).toFixed(1)}%`);
    console.log(`Security Precision:     ${(scorecard.metrics.securityPrecision * 100).toFixed(1)}%`);
    console.log(`Persona Invariance:     ${(scorecard.metrics.personaPreservation * 100).toFixed(1)}%`);
    console.log(`Ambiguity Handling:     ${(scorecard.metrics.ambiguityHandling * 100).toFixed(1)}%`);
    console.log(`Hallucination Rate:     ${(scorecard.metrics.hallucinationRate * 100).toFixed(1)}%\n`);

    // Save snapshot
    const snapshotDir = path.join(process.cwd(), 'src/lib/truth-lab/snapshots');
    if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });
    fs.writeFileSync(
      path.join(snapshotDir, 'evaluation-v1.json'),
      JSON.stringify(scorecard, null, 2),
      'utf-8'
    );

    if (scorecard.failureDossiers.length > 0) {
      console.log(`\nFailure Dossiers (${scorecard.failureDossiers.length}):`);
      for (const d of scorecard.failureDossiers) {
        console.log(`  [${d.failureId}] ${d.questionOrTest} -> Expected: ${d.expected}, Got: ${d.actual}`);
      }
    }

    if (!scorecard.overallPassed) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal Truth Lab Error:', err);
    process.exit(1);
  }
}

main();
