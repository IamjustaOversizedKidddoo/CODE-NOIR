import prisma from '../../db';
import { BENCHMARK_FACTS } from '../ground-truth-definitions';
import { FailureDossier } from '../types';

export async function evaluateFactualAccuracy(projectId: string): Promise<{
  passCount: number;
  failCount: number;
  accuracy: number;
  dossiers: FailureDossier[];
}> {
  const dossiers: FailureDossier[] = [];
  let passCount = 0;

  const [files, symbols, callEdges] = await Promise.all([
    prisma.projectFile.findMany({ where: { projectId } }),
    prisma.codeSymbol.findMany({ where: { projectId } }),
    prisma.callEdge.findMany({ where: { projectId } }),
  ]);

  for (const fact of BENCHMARK_FACTS) {
    let actualResult = false;

    if (fact.id === 'FACT-001') {
      const entryFile = files.find((f) => f.path === 'src/index.ts' && f.isEntry);
      actualResult = !!entryFile;
    } else if (fact.id === 'FACT-002') {
      const authSymbol = symbols.find((s) => s.name === 'AuthService' || s.name === 'authenticate');
      const passCall = callEdges.find((c) => c.calleeName === 'verifyPassword');
      actualResult = !!authSymbol && !!passCall;
    } else if (fact.id === 'FACT-003') {
      // verifyPassword executes DB query? Ground truth is FALSE
      const passSymbol = symbols.find((s) => s.name === 'verifyPassword');
      const dbCalls = callEdges.filter((c) => c.callerId === passSymbol?.id && c.relationship === 'DB_QUERY');
      actualResult = dbCalls.length > 0;
    } else if (fact.id === 'FACT-004') {
      const unusedFile = files.find((f) => f.path === 'src/utils/unused.ts');
      const incomingDeps = await prisma.dependency.findMany({
        where: { projectId, targetFileId: unusedFile?.id },
      });
      actualResult = incomingDeps.length === 0;
    }

    if (actualResult === fact.expectedResult) {
      passCount++;
    } else {
      dossiers.push({
        failureId: `FAIL-FACT-${fact.id}`,
        category: 'FACTUAL_ACCURACY',
        questionOrTest: fact.statement,
        expected: String(fact.expectedResult),
        actual: String(actualResult),
        evidence: `${fact.expectedFile}`,
        rootCause: 'RETRIEVAL_ERROR',
        severity: 'HIGH',
        regressionStatus: 'NEW',
      });
    }
  }

  const total = BENCHMARK_FACTS.length;
  const failCount = total - passCount;
  const accuracy = total > 0 ? passCount / total : 1.0;

  return { passCount, failCount, accuracy, dossiers };
}
