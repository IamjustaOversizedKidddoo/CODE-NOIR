import prisma from '../../db';
import { BENCHMARK_RELATIONSHIPS } from '../ground-truth-definitions';
import { FailureDossier } from '../types';

export async function evaluateRelationships(projectId: string): Promise<{
  precision: number;
  recall: number;
  f1: number;
  dossiers: FailureDossier[];
}> {
  const dossiers: FailureDossier[] = [];

  const dependencies = await prisma.dependency.findMany({
    where: { projectId },
    include: { sourceFile: true, targetFile: true },
  });

  const detectedPairs = dependencies
    .filter((d) => d.targetFile)
    .map((d) => `${d.sourceFile.path} -> ${d.targetFile!.path}`);

  let truePositives = 0;
  let falseNegatives = 0;

  for (const gt of BENCHMARK_RELATIONSHIPS) {
    const pairStr = `${gt.source} -> ${gt.target}`;
    if (detectedPairs.includes(pairStr)) {
      truePositives++;
    } else {
      falseNegatives++;
      dossiers.push({
        failureId: `FAIL-REL-${gt.source}-${gt.target}`,
        category: 'RELATIONSHIP_ACCURACY',
        questionOrTest: `Relationship: ${pairStr}`,
        expected: 'EXISTS',
        actual: 'NOT_FOUND',
        evidence: `${gt.source}`,
        rootCause: 'GRAPH_ERROR',
        severity: 'HIGH',
        regressionStatus: 'NEW',
      });
    }
  }

  const falsePositives = Math.max(0, detectedPairs.length - truePositives);

  const precision =
    truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 1.0;
  const recall =
    truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 1.0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 1.0;

  return { precision, recall, f1, dossiers };
}
