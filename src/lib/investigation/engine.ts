import prisma from '../db';
import { InvestigationType, StructuredInvestigation } from './types';
import { generateArchitectureInvestigation } from './generators/architecture-investigator';
import { generateStartupInvestigation } from './generators/startup-investigator';
import { generateCallFlowInvestigation } from './generators/call-flow-investigator';
import { generateApiFlowInvestigation } from './generators/api-flow-investigator';
import { generateDatabaseFlowInvestigation } from './generators/database-flow-investigator';
import { generateAuthenticationInvestigation } from './generators/auth-investigator';
import { generateConfigurationInvestigation } from './generators/config-investigator';
import { generateExternalServiceInvestigation } from './generators/external-service-investigator';
import { generateBlastRadiusInvestigation } from './generators/blast-radius-investigator';
import { generateComponentRelationshipInvestigation } from './generators/component-relationship-investigator';
import { generateProjectStoryInvestigation } from './generators/project-story-investigator';

export type InvestigationProgressCallback = (step: string, data?: any) => void;

export async function runInvestigation(
  projectId: string,
  options: {
    type?: InvestigationType;
    query?: string;
    targetEntity?: string;
    onProgress?: InvestigationProgressCallback;
  }
): Promise<StructuredInvestigation> {
  const notify = options.onProgress || (() => {});
  notify('INVESTIGATION_STARTED', { projectId, options });

  // 1. Fetch complete project data from database
  notify('COLLECTING_EVIDENCE', { step: 'Querying project vault...' });
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      files: { where: { isIgnored: false } },
      symbols: true,
      dependencies: true,
      findings: true,
    },
  });

  if (!project) {
    throw new Error(`Project case "${projectId}" not found.`);
  }

  const callEdges = await prisma.callEdge.findMany({
    where: {
      caller: { projectId },
    },
  });

  const techProfile = project.techStack ? JSON.parse(project.techStack) : {};
  const entryPoints = project.entryPoints ? JSON.parse(project.entryPoints) : [];
  const endpoints = project.endpointsJson ? JSON.parse(project.endpointsJson) : [];
  const envVars = project.envVarsJson ? JSON.parse(project.envVarsJson) : [];
  const dbEvidence = project.dbEvidenceJson ? JSON.parse(project.dbEvidenceJson) : [];
  const brain = project.brainJson ? JSON.parse(project.brainJson) : {};

  const projectPayload = {
    name: project.name,
    primaryLang: project.primaryLang || 'TypeScript',
    files: project.files.map((f) => ({ id: f.id, path: f.path, lineCount: f.lineCount })),
    symbols: project.symbols.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      fileId: s.fileId,
      startLine: s.startLine,
      endLine: s.endLine,
    })),
    dependencies: project.dependencies.map((d) => ({
      sourceFileId: d.sourceFileId,
      targetFileId: d.targetFileId,
      importName: d.importName || undefined,
    })),
    callEdges: callEdges.map((c) => ({
      callerId: c.callerId,
      calleeId: c.calleeId,
      calleeName: c.calleeName,
      line: c.line,
      fileId: c.fileId,
    })),
    entryPoints,
    endpoints,
    envVars,
    dbEvidence,
    techProfile,
    brain,
  };

  // 2. Determine investigation type
  let investigationType = options.type;
  if (!investigationType && options.query) {
    const q = options.query.toLowerCase();
    if (q.includes('story') || q.includes('narrate')) investigationType = 'PROJECT_STORY';
    else if (q.includes('start') || q.includes('boot')) investigationType = 'STARTUP_FLOW';
    else if (q.includes('delete') || q.includes('remove') || q.includes('blast')) investigationType = 'BLAST_RADIUS';
    else if (q.includes('auth') || q.includes('login') || q.includes('token')) investigationType = 'AUTHENTICATION_FLOW';
    else if (q.includes('database') || q.includes('sql') || q.includes('query')) investigationType = 'DATABASE_FLOW';
    else if (q.includes('api') || q.includes('endpoint') || q.includes('route')) investigationType = 'API_FLOW';
    else if (q.includes('config') || q.includes('env') || q.includes('variable')) investigationType = 'CONFIGURATION_FLOW';
    else if (q.includes('external') || q.includes('service') || q.includes('sdk')) investigationType = 'EXTERNAL_SERVICE_FLOW';
    else if (q.includes('call') || q.includes('who calls')) investigationType = 'CALL_FLOW';
    else if (q.includes('component') || q.includes('frontend') || q.includes('ui')) investigationType = 'COMPONENT_RELATIONSHIP';
    else investigationType = 'ARCHITECTURE';
  } else if (!investigationType) {
    investigationType = 'ARCHITECTURE';
  }

  notify('BUILDING_INVESTIGATION', { type: investigationType });

  // 3. Dispatch to generator
  let investigation: StructuredInvestigation;
  const target = options.targetEntity || options.query || '';

  switch (investigationType) {
    case 'ARCHITECTURE':
      investigation = generateArchitectureInvestigation(projectId, projectPayload);
      break;
    case 'STARTUP_FLOW':
      investigation = generateStartupInvestigation(projectId, projectPayload);
      break;
    case 'CALL_FLOW':
      investigation = generateCallFlowInvestigation(projectId, target || projectPayload.symbols[0]?.name || 'main', projectPayload);
      break;
    case 'API_FLOW':
      investigation = generateApiFlowInvestigation(projectId, target || (endpoints[0]?.path ?? '/'), projectPayload);
      break;
    case 'DATABASE_FLOW':
      investigation = generateDatabaseFlowInvestigation(projectId, projectPayload);
      break;
    case 'AUTHENTICATION_FLOW':
      investigation = generateAuthenticationInvestigation(projectId, projectPayload);
      break;
    case 'CONFIGURATION_FLOW':
      investigation = generateConfigurationInvestigation(projectId, projectPayload);
      break;
    case 'EXTERNAL_SERVICE_FLOW':
      investigation = generateExternalServiceInvestigation(projectId, projectPayload);
      break;
    case 'BLAST_RADIUS':
      investigation = generateBlastRadiusInvestigation(projectId, target || projectPayload.files[0]?.path || '', projectPayload);
      break;
    case 'COMPONENT_RELATIONSHIP':
      investigation = generateComponentRelationshipInvestigation(projectId, projectPayload);
      break;
    case 'PROJECT_STORY':
    default:
      investigation = generateProjectStoryInvestigation(projectId, projectPayload);
      break;
  }

  // 4. Persist Investigation record in database
  notify('VALIDATING_PATH', { stepsCount: investigation.steps.length });
  const dbInvestigation = await prisma.investigation.create({
    data: {
      projectId,
      type: investigation.type,
      title: investigation.title,
      question: investigation.question,
      startingEntities: JSON.stringify(investigation.startingEntities),
      stepsJson: JSON.stringify(investigation.steps),
      evidenceJson: JSON.stringify(investigation.evidence),
      relationshipsJson: JSON.stringify(investigation.relationships),
      primaryPathJson: JSON.stringify(investigation.primaryPath),
      alternativePathsJson: JSON.stringify(investigation.alternativePaths || []),
      confidence: investigation.confidence,
      uncertaintiesJson: JSON.stringify(investigation.uncertainties),
      affectedEntities: JSON.stringify(investigation.affectedEntities || []),
      externalServices: JSON.stringify(investigation.externalServices || []),
      metadataJson: JSON.stringify(investigation.metadata || {}),
    },
  });

  investigation.id = dbInvestigation.id;
  investigation.generatedAt = dbInvestigation.createdAt.toISOString();

  notify('COMPLETED', { id: investigation.id, confidence: investigation.confidence });
  return investigation;
}
