import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';

export function generateExternalServiceInvestigation(
  projectId: string,
  projectData: {
    files: { id: string; path: string }[];
    dependencies: { sourceFileId: string; targetFileId: string | null; importName?: string }[];
    techProfile: any;
  }
): StructuredInvestigation {
  const externalDeps = projectData.dependencies.filter((d) => d.targetFileId === null && d.importName);
  const knownSdkOrHttp = externalDeps.filter((d) =>
    /axios|fetch|got|request|superagent|stripe|aws|openai|anthropic|google|redis|kafka|amqp|nodemailer/i.test(
      d.importName || ''
    )
  );

  if (knownSdkOrHttp.length === 0 && (!projectData.techProfile?.databases || projectData.techProfile.databases.length === 0)) {
    return {
      projectId,
      type: 'EXTERNAL_SERVICE_FLOW',
      title: 'External Services Dossier',
      question: 'What external APIs and cloud services does this project interact with?',
      startingEntities: [],
      steps: [],
      evidence: [],
      relationships: [],
      primaryPath: [],
      confidence: 'UNKNOWN',
      uncertainties: ['No external SDKs, HTTP client libraries, or cloud service dependencies were detected in package manifests.'],
    };
  }

  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];
  let stepOrder = 1;

  for (const dep of knownSdkOrHttp) {
    const file = projectData.files.find((f) => f.id === dep.sourceFileId);
    const extEv: InvestigationEvidence = {
      file: file?.path || 'unknown',
      line: 1,
      relationship: 'CONNECTS_TO_EXTERNAL_SERVICE',
      reason: `Outbound integration package: ${dep.importName}`,
      confidence: 'CONFIRMED',
    };
    evidence.push(extEv);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'FILE', name: file?.path || 'Service Module', path: file?.path },
      targetEntity: { type: 'EXTERNAL_SERVICE', name: dep.importName || 'External API' },
      relationship: 'SENDS_HTTP_REQUEST',
      evidence: extEv,
      confidence: 'CONFIRMED',
      description: `[${file?.path}] interfaces with external service/SDK [${dep.importName}].`,
    });
  }

  return {
    projectId,
    type: 'EXTERNAL_SERVICE_FLOW',
    title: 'External Integrations & APIs',
    question: 'What external services and third-party systems are integrated?',
    startingEntities: steps.map((s) => s.sourceEntity),
    steps,
    evidence,
    relationships: steps.map((s) => ({
      source: s.sourceEntity.name,
      target: s.targetEntity.name,
      relationship: s.relationship,
      confidence: s.confidence,
    })),
    primaryPath: steps.map((s) => s.targetEntity.name),
    confidence: 'CONFIRMED',
    uncertainties: ['Network availability, API rate limits, and authentication success can only be established at runtime.'],
  };
}
