import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';

export function generateStartupInvestigation(
  projectId: string,
  projectData: {
    name: string;
    files: { id: string; path: string; lineCount: number }[];
    symbols: { id: string; name: string; kind: string; fileId: string; startLine: number }[];
    entryPoints: { path: string; reason: string }[];
    dependencies: { sourceFileId: string; targetFileId: string | null }[];
  }
): StructuredInvestigation {
  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];

  if (projectData.entryPoints.length === 0) {
    return {
      projectId,
      type: 'STARTUP_FLOW',
      title: 'Startup Flow Analysis',
      question: 'What happens when this application starts?',
      startingEntities: [],
      steps: [],
      evidence: [],
      relationships: [],
      primaryPath: [],
      confidence: 'UNKNOWN',
      uncertainties: ['No explicit application entry point could be established from static manifests or file conventions.'],
    };
  }

  const primaryEntry = projectData.entryPoints[0];
  const entryFile = projectData.files.find((f) => f.path === primaryEntry.path);
  const entrySymbols = entryFile ? projectData.symbols.filter((s) => s.fileId === entryFile.id) : [];

  let stepOrder = 1;

  // Step 1: Boot from Entry Point
  const step1Ev: InvestigationEvidence = {
    file: primaryEntry.path,
    line: 1,
    relationship: 'ENTRY_POINT',
    reason: primaryEntry.reason,
    confidence: 'CONFIRMED',
  };
  evidence.push(step1Ev);
  steps.push({
    order: stepOrder++,
    sourceEntity: { type: 'FILE', name: primaryEntry.path, path: primaryEntry.path },
    targetEntity: { type: 'FILE', name: primaryEntry.path, path: primaryEntry.path },
    relationship: 'INITIALIZES',
    evidence: step1Ev,
    confidence: 'CONFIRMED',
    description: `Process execution begins at ${primaryEntry.path}.`,
  });

  // Step 2: Configuration / Environment Setup
  const configSymbol = entrySymbols.find((s) => /config|env|init/i.test(s.name));
  if (configSymbol) {
    const confEv: InvestigationEvidence = {
      file: primaryEntry.path,
      line: configSymbol.startLine,
      symbol: configSymbol.name,
      relationship: 'LOADS_CONFIGURATION',
      reason: `Configuration loader symbol detected: ${configSymbol.name}`,
      confidence: 'CONFIRMED',
    };
    evidence.push(confEv);
    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'FILE', name: primaryEntry.path, path: primaryEntry.path },
      targetEntity: { type: 'SYMBOL', name: configSymbol.name, path: primaryEntry.path },
      relationship: 'LOADS_CONFIGURATION',
      evidence: confEv,
      confidence: 'CONFIRMED',
      description: `Loads environment and configuration settings via ${configSymbol.name}.`,
    });
  }

  // Step 3: Main Server / Service Bootstrap
  const serverSymbol = entrySymbols.find((s) => /server|app|start|main|listen/i.test(s.name));
  if (serverSymbol) {
    const srvEv: InvestigationEvidence = {
      file: primaryEntry.path,
      line: serverSymbol.startLine,
      symbol: serverSymbol.name,
      relationship: 'BOOTSTRAPS_SERVICE',
      reason: `Main execution symbol: ${serverSymbol.name}`,
      confidence: 'CONFIRMED',
    };
    evidence.push(srvEv);
    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'SYMBOL', name: serverSymbol.name, path: primaryEntry.path },
      targetEntity: { type: 'SUBSYSTEM', name: 'READY_STATE' },
      relationship: 'ENTERS_READY_STATE',
      evidence: srvEv,
      confidence: 'CONFIRMED',
      description: `Initializes core service listener and transitions into ready state.`,
    });
  }

  const primaryPath = steps.map((s) => s.targetEntity.name);

  return {
    projectId,
    type: 'STARTUP_FLOW',
    title: `Startup Flow: ${primaryEntry.path}`,
    question: 'What happens when this application starts?',
    startingEntities: [{ type: 'FILE', name: primaryEntry.path, path: primaryEntry.path }],
    steps,
    evidence,
    relationships: steps.map((s) => ({
      source: s.sourceEntity.name,
      target: s.targetEntity.name,
      relationship: s.relationship,
      confidence: s.confidence,
    })),
    primaryPath,
    confidence: 'CONFIRMED',
    uncertainties: ['Runtime failure modes (e.g. database connectivity failures during boot) depend on runtime environment.'],
  };
}
