import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';

export function generateConfigurationInvestigation(
  projectId: string,
  projectData: {
    envVars: { name: string; line: number; fileId: string }[];
    files: { id: string; path: string }[];
    symbols: { id: string; name: string; fileId: string }[];
  }
): StructuredInvestigation {
  if (!projectData.envVars || projectData.envVars.length === 0) {
    return {
      projectId,
      type: 'CONFIGURATION_FLOW',
      title: 'Configuration Flow Investigation',
      question: 'How is configuration loaded and distributed?',
      startingEntities: [],
      steps: [],
      evidence: [],
      relationships: [],
      primaryPath: [],
      confidence: 'UNKNOWN',
      uncertainties: ['No environment variable references (e.g. process.env, os.environ) were detected.'],
    };
  }

  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];
  let stepOrder = 1;

  // Deduplicate by env var name
  const uniqueVars = new Map<string, typeof projectData.envVars[0]>();
  for (const ev of projectData.envVars) {
    if (!uniqueVars.has(ev.name)) {
      uniqueVars.set(ev.name, ev);
    }
  }

  for (const [name, ev] of uniqueVars.entries()) {
    const file = projectData.files.find((f) => f.id === ev.fileId);
    const confEv: InvestigationEvidence = {
      file: file?.path || 'unknown',
      line: ev.line,
      relationship: 'READS_CONFIG',
      reason: `Reads environment variable: ${name}`,
      confidence: 'CONFIRMED',
    };
    evidence.push(confEv);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'ENV_VAR', name },
      targetEntity: { type: 'FILE', name: file?.path || 'Config Module', path: file?.path },
      relationship: 'READS_CONFIG',
      evidence: confEv,
      confidence: 'CONFIRMED',
      description: `[${file?.path}] ingests environment setting [${name}].`,
    });
  }

  return {
    projectId,
    type: 'CONFIGURATION_FLOW',
    title: 'Configuration & Environment Settings',
    question: 'How does configuration propagate through the system?',
    startingEntities: steps.map((s) => s.sourceEntity),
    steps,
    evidence,
    relationships: steps.map((s) => ({
      source: s.sourceEntity.name,
      target: s.targetEntity.name,
      relationship: s.relationship,
      confidence: s.confidence,
    })),
    primaryPath: steps.map((s) => s.sourceEntity.name),
    confidence: 'CONFIRMED',
    uncertainties: ['Default fallback values when environment variables are omitted depend on runtime configuration.'],
  };
}
