import { resolveConversationalEntity } from '../../interrogation/reference-resolver';
import { InterrogationSessionState } from '../../interrogation/types';
import { FailureDossier } from '../types';

export async function evaluateAmbiguityHandling(projectId: string): Promise<{
  accuracy: number;
  dossiers: FailureDossier[];
}> {
  const dossiers: FailureDossier[] = [];

  const mockSession: InterrogationSessionState = {
    sessionId: 'test_session',
    caseId: projectId,
    userId: 'truth_lab_tester',
    leadStack: [],
    messages: [],
    sarcasmLevel: 1,
    explanationDepth: 'STANDARD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const resolution = await resolveConversationalEntity('Explain loginHandler', mockSession);

  const isCorrect = resolution.isAmbiguous && resolution.candidates.length >= 2;

  if (!isCorrect) {
    dossiers.push({
      failureId: 'FAIL-AMBIGUITY-001',
      category: 'AMBIGUITY_HANDLING',
      questionOrTest: 'Disambiguate duplicate symbol loginHandler across auth and admin',
      expected: 'isAmbiguous: true with 2 candidates',
      actual: `isAmbiguous: ${resolution.isAmbiguous}, candidates: ${resolution.candidates.length}`,
      rootCause: 'RETRIEVAL_ERROR',
      severity: 'HIGH',
      regressionStatus: 'NEW',
    });
  }

  return { accuracy: isCorrect ? 1.0 : 0.0, dossiers };
}
