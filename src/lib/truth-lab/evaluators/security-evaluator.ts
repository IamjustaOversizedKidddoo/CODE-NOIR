import prisma from '../../db';
import { BENCHMARK_SECURITY_CASES } from '../ground-truth-definitions';
import { FailureDossier } from '../types';

export async function evaluateSecurityPrecisionRecall(projectId: string): Promise<{
  precision: number;
  recall: number;
  f1: number;
  dossiers: FailureDossier[];
}> {
  const dossiers: FailureDossier[] = [];

  const findings = await prisma.securityFinding.findMany({
    where: { projectId },
  });

  let truePositives = 0;
  let falseNegatives = 0;
  let falsePositives = 0;

  for (const testCase of BENCHMARK_SECURITY_CASES) {
    const matchingFinding = findings.find(
      (f) =>
        f.filePath === testCase.filePath &&
        f.type === testCase.type &&
        Math.abs((f.startLine || 0) - testCase.startLine) <= 4
    );

    if (!testCase.isFalsePositiveExpected) {
      // Must Detect case
      if (matchingFinding) {
        truePositives++;
      } else {
        falseNegatives++;
        dossiers.push({
          failureId: `FAIL-SEC-FN-${testCase.id}`,
          category: 'SECURITY_RECALL',
          questionOrTest: `Detect ${testCase.type} in ${testCase.filePath}`,
          expected: 'DETECTED',
          actual: 'MISSED',
          evidence: `${testCase.filePath}:${testCase.startLine}`,
          rootCause: 'SECURITY_RULE_ERROR',
          severity: 'CRITICAL',
          regressionStatus: 'NEW',
        });
      }
    } else {
      // Must NOT Flag case
      if (matchingFinding && matchingFinding.severity !== 'INFO') {
        falsePositives++;
        dossiers.push({
          failureId: `FAIL-SEC-FP-${testCase.id}`,
          category: 'SECURITY_PRECISION',
          questionOrTest: `Must NOT flag safe pattern in ${testCase.filePath}:${testCase.startLine}`,
          expected: 'NOT_FLAGGED',
          actual: 'FLAGGED_AS_VULNERABILITY',
          evidence: `${testCase.filePath}:${testCase.startLine}`,
          rootCause: 'SECURITY_RULE_ERROR',
          severity: 'HIGH',
          regressionStatus: 'NEW',
        });
      }
    }
  }

  const precision =
    truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 1.0;
  const recall =
    truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 1.0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 1.0;

  return { precision, recall, f1, dossiers };
}
