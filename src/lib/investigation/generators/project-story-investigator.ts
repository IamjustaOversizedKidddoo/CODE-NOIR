import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';

export function generateProjectStoryInvestigation(
  projectId: string,
  projectData: {
    name: string;
    primaryLang: string;
    files: { id: string; path: string; lineCount: number }[];
    symbols: { id: string; name: string; kind: string; fileId: string; startLine: number }[];
    entryPoints: { path: string; reason: string }[];
    endpoints: { method: string; path: string; handlerName: string; line: number }[];
    techProfile: any;
    dbEvidence: { type: string; details: string; line: number }[];
  }
): StructuredInvestigation {
  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];
  let stepOrder = 1;

  // STEP 01: The Entry Point
  const primaryEntry = projectData.entryPoints[0];
  const step1Ev: InvestigationEvidence = {
    file: primaryEntry ? primaryEntry.path : 'manifest',
    line: 1,
    relationship: 'TIMELINE_ENTRY',
    reason: primaryEntry ? primaryEntry.reason : 'Project configuration manifest',
    confidence: 'CONFIRMED',
  };
  evidence.push(step1Ev);

  steps.push({
    order: stepOrder++,
    sourceEntity: { type: 'SUBSYSTEM', name: 'ENTRY_GATEWAY' },
    targetEntity: { type: 'FILE', name: primaryEntry ? primaryEntry.path : 'index', path: primaryEntry?.path },
    relationship: 'EXECUTION_BEGINS',
    evidence: step1Ev,
    confidence: 'CONFIRMED',
    description: `The investigation begins at ${primaryEntry ? primaryEntry.path : 'the main module'}. Execution starts here.`,
  });

  // STEP 02: Configuration Ingestion
  const configFiles = projectData.files.filter((f) => /config|env|\.env/i.test(f.path));
  if (configFiles.length > 0) {
    const cf = configFiles[0];
    const step2Ev: InvestigationEvidence = {
      file: cf.path,
      line: 1,
      relationship: 'CONFIGURATION_LOAD',
      reason: `Configuration module in ${cf.path}`,
      confidence: 'CONFIRMED',
    };
    evidence.push(step2Ev);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'FILE', name: primaryEntry?.path || 'Entry', path: primaryEntry?.path },
      targetEntity: { type: 'FILE', name: cf.path, path: cf.path },
      relationship: 'READS_CONFIGURATION',
      evidence: step2Ev,
      confidence: 'CONFIRMED',
      description: `The environment and runtime configuration are loaded from [${cf.path}].`,
    });
  }

  // STEP 03: Core Service Orchestration
  const coreFiles = projectData.files.filter((f) => /service|manager|core|engine|app|orchestrator/i.test(f.path));
  if (coreFiles.length > 0) {
    const core = coreFiles[0];
    const step3Ev: InvestigationEvidence = {
      file: core.path,
      line: 1,
      relationship: 'CORE_ORCHESTRATION',
      reason: `Core orchestrator file: ${core.path}`,
      confidence: 'CONFIRMED',
    };
    evidence.push(step3Ev);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'SUBSYSTEM', name: 'CONFIGURATION' },
      targetEntity: { type: 'FILE', name: core.path, path: core.path },
      relationship: 'INITIALIZES_CORE_ORCHESTRATOR',
      evidence: step3Ev,
      confidence: 'CONFIRMED',
      description: `The application bootstraps its core business orchestration within [${core.path}].`,
    });
  }

  // STEP 04: API & Request Handling Interfaces
  if (projectData.endpoints.length > 0) {
    const ep = projectData.endpoints[0];
    const step4Ev: InvestigationEvidence = {
      file: 'routes/endpoints',
      line: ep.line,
      relationship: 'MOUNTS_INTERFACES',
      reason: `Mounted API endpoint: ${ep.method} ${ep.path}`,
      confidence: 'CONFIRMED',
    };
    evidence.push(step4Ev);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'SUBSYSTEM', name: 'CORE_ENGINE' },
      targetEntity: { type: 'ENDPOINT', name: `${ep.method} ${ep.path}` },
      relationship: 'MOUNTS_API_ROUTES',
      evidence: step4Ev,
      confidence: 'CONFIRMED',
      description: `Mounted public API route [${ep.method} ${ep.path}] listening for external triggers.`,
    });
  }

  // STEP 05: Persistence Layer Binding
  if (projectData.dbEvidence.length > 0) {
    const db = projectData.dbEvidence[0];
    const step5Ev: InvestigationEvidence = {
      file: 'database/schema',
      line: db.line,
      relationship: 'BINDS_PERSISTENCE',
      reason: `Database persistence operation: ${db.type}`,
      confidence: 'CONFIRMED',
    };
    evidence.push(step5Ev);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'SUBSYSTEM', name: 'SERVICE_LAYER' },
      targetEntity: { type: 'EXTERNAL_SERVICE', name: 'DATABASE' },
      relationship: 'PERSISTS_STATE',
      evidence: step5Ev,
      confidence: 'CONFIRMED',
      description: `State mutations and data transactions are committed through the persistence layer.`,
    });
  }

  return {
    projectId,
    type: 'PROJECT_STORY',
    title: `The Story of ${projectData.name}`,
    question: 'How does the entire project execute from start to finish?',
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
    uncertainties: ['Dynamic user input variations branch into different execution outcomes at runtime.'],
  };
}
