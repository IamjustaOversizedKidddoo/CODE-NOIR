import { transformFactualResponse } from '../../persona/engine';
import { SarcasmLevel } from '../../persona/types';
import { FailureDossier } from '../types';

export function evaluatePersonaFactPreservation(): {
  accuracy: number;
  dossiers: FailureDossier[];
} {
  const dossiers: FailureDossier[] = [];
  const rawFact = 'Function `authenticateUser()` in `src/auth/service.ts:15-30` delegates password verification to `verifyPassword()`.';
  const confidence = 'CONFIRMED';
  const evidence = {
    file: 'src/auth/service.ts',
    startLine: 15,
    endLine: 30,
    symbolName: 'authenticateUser',
  };

  let preservedCount = 0;
  const levels: SarcasmLevel[] = [0, 1, 2, 3, 4, 5];

  for (const level of levels) {
    const result = transformFactualResponse({
      fact: rawFact,
      confidence,
      evidence,
      sourceEntity: 'authenticateUser',
      sarcasmLevel: level,
    });

    const hasSymbol = result.factualExplanation.includes('authenticateUser');
    const hasFile = result.factualExplanation.includes('src/auth/service.ts');
    const hasConfidence = result.confidence === 'CONFIRMED';

    if (hasSymbol && hasFile && hasConfidence) {
      preservedCount++;
    } else {
      dossiers.push({
        failureId: `FAIL-PERSONA-LVL-${level}`,
        category: 'PERSONA_FACT_PRESERVATION',
        questionOrTest: `Preserve facts across Sarcasm Level ${level}`,
        expected: '100% Fact Invariance',
        actual: 'Facts Altered in Persona Transform',
        rootCause: 'PERSONA_MUTATION',
        severity: 'CRITICAL',
        regressionStatus: 'NEW',
      });
    }
  }

  const accuracy = preservedCount / levels.length;
  return { accuracy, dossiers };
}
