import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';

export function generateArchitectureInvestigation(
  projectId: string,
  projectData: {
    name: string;
    primaryLang: string;
    files: { id: string; path: string; lineCount: number }[];
    symbols: { id: string; name: string; kind: string; fileId: string }[];
    dependencies: { sourceFileId: string; targetFileId: string | null; importName?: string }[];
    entryPoints: { path: string; reason: string }[];
    techProfile: any;
    brain: any;
  }
): StructuredInvestigation {
  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];
  const relationships: { source: string; target: string; relationship: string; confidence: any }[] = [];

  // Group files into logical subsystems/directories
  const dirGroups = new Map<string, typeof projectData.files>();
  for (const file of projectData.files) {
    const parts = file.path.split('/');
    const dir = parts.length > 1 ? parts[0] : 'root';
    if (!dirGroups.has(dir)) {
      dirGroups.set(dir, []);
    }
    dirGroups.get(dir)!.push(file);
  }

  let stepOrder = 1;

  // 1. Entry Points Subsystem Step
  if (projectData.entryPoints.length > 0) {
    const primaryEntry = projectData.entryPoints[0];
    const entryEvidence: InvestigationEvidence = {
      file: primaryEntry.path,
      line: 1,
      relationship: 'ENTRY_POINT',
      reason: primaryEntry.reason,
      confidence: 'CONFIRMED',
    };
    evidence.push(entryEvidence);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'SUBSYSTEM', name: 'ENTRY_LAYER' },
      targetEntity: { type: 'FILE', name: primaryEntry.path, path: primaryEntry.path },
      relationship: 'INITIALIZES',
      evidence: entryEvidence,
      confidence: 'CONFIRMED',
      description: `Primary application entry point detected at ${primaryEntry.path} (${primaryEntry.reason}).`,
    });
  }

  // 2. Subsystem Steps
  for (const [dir, files] of dirGroups.entries()) {
    if (dir === 'root' && files.length <= 2) continue;
    const representativeFile = files[0];
    const subEvidence: InvestigationEvidence = {
      file: representativeFile.path,
      line: 1,
      relationship: 'SUBSYSTEM_BOUNDARY',
      reason: `Directory group contains ${files.length} module files.`,
      confidence: 'LIKELY',
    };
    evidence.push(subEvidence);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'SUBSYSTEM', name: dir.toUpperCase() },
      targetEntity: { type: 'FILE', name: representativeFile.path, path: representativeFile.path },
      relationship: 'ORGANIZES',
      evidence: subEvidence,
      confidence: 'LIKELY',
      description: `Subsystem [${dir.toUpperCase()}] encompasses ${files.length} files handling core logic.`,
    });
  }

  // 3. Database / Storage Layer Step
  if (projectData.techProfile?.databases && projectData.techProfile.databases.length > 0) {
    const db = projectData.techProfile.databases[0];
    const dbEvidence: InvestigationEvidence = {
      file: 'schema/config',
      relationship: 'DATA_STORE',
      reason: `Database client/ORM detected: ${db.name}.`,
      confidence: 'CONFIRMED',
    };
    evidence.push(dbEvidence);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'SUBSYSTEM', name: 'CORE_SERVICES' },
      targetEntity: { type: 'EXTERNAL_SERVICE', name: db.name },
      relationship: 'PERSISTS_TO',
      evidence: dbEvidence,
      confidence: 'CONFIRMED',
      description: `Persistence boundary configured with ${db.name}.`,
    });
  }

  const primaryPath = steps.map((s) => s.sourceEntity.name);

  return {
    projectId,
    type: 'ARCHITECTURE',
    title: `Architecture Dossier: ${projectData.name}`,
    question: 'How is the high-level architecture structured?',
    startingEntities: [{ type: 'SUBSYSTEM', name: 'PROJECT_ROOT' }],
    steps,
    evidence,
    relationships,
    primaryPath,
    confidence: 'CONFIRMED',
    uncertainties: ['Dynamic runtime plugin loading cannot be verified from static structure alone.'],
    metadata: {
      subsystemsCount: dirGroups.size,
      totalFiles: projectData.files.length,
      primaryLanguage: projectData.primaryLang,
    },
  };
}
