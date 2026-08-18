export type ImportanceTier = 'CORE' | 'IMPORTANT' | 'SUPPORTING' | 'LOW_IMPORTANCE';

export interface RankedEntity {
  id: string;
  path: string;
  type: 'FILE' | 'SYMBOL';
  name: string;
  score: number; // 0 to 100
  tier: ImportanceTier;
  signals: {
    isEntryPoint: boolean;
    isApiEndpoint: boolean;
    hasDatabaseAccess: boolean;
    callersCount: number;
    dependentsCount: number;
    exportsCount: number;
  };
}

export function rankProjectEntities(projectData: {
  files: { id: string; path: string }[];
  symbols: { id: string; name: string; fileId: string; isExported?: boolean }[];
  dependencies: { sourceFileId: string; targetFileId: string | null }[];
  callEdges: { callerId: string; calleeName: string }[];
  entryPoints: { path: string }[];
  endpoints: { path: string; fileId: string }[];
  dbEvidence: { fileId: string }[];
}): {
  rankedFiles: RankedEntity[];
  coreFiles: RankedEntity[];
  importantFiles: RankedEntity[];
  supportingFiles: RankedEntity[];
} {
  const entrySet = new Set(projectData.entryPoints.map((ep) => ep.path.toLowerCase()));
  const endpointFileSet = new Set(projectData.endpoints.map((ep) => ep.fileId));
  const dbFileSet = new Set(projectData.dbEvidence.map((db) => db.fileId));

  // Count incoming dependents per file
  const incomingDeps = new Map<string, number>();
  for (const dep of projectData.dependencies) {
    if (dep.targetFileId) {
      incomingDeps.set(dep.targetFileId, (incomingDeps.get(dep.targetFileId) || 0) + 1);
    }
  }

  // Count callers per file
  const symbolToFile = new Map<string, string>();
  for (const sym of projectData.symbols) {
    symbolToFile.set(sym.id, sym.fileId);
  }

  const callersPerFile = new Map<string, number>();
  for (const edge of projectData.callEdges) {
    const fId = symbolToFile.get(edge.callerId);
    if (fId) {
      callersPerFile.set(fId, (callersPerFile.get(fId) || 0) + 1);
    }
  }

  const rankedFiles: RankedEntity[] = [];

  for (const file of projectData.files) {
    let score = 10; // Baseline
    const isEntry = entrySet.has(file.path.toLowerCase());
    const isApi = endpointFileSet.has(file.id);
    const hasDb = dbFileSet.has(file.id);
    const dependentsCount = incomingDeps.get(file.id) || 0;
    const callersCount = callersPerFile.get(file.id) || 0;
    const fileSymbols = projectData.symbols.filter((s) => s.fileId === file.id);
    const exportsCount = fileSymbols.filter((s) => s.isExported).length;

    // Weight signals
    if (isEntry) score += 40;
    if (isApi) score += 25;
    if (hasDb) score += 20;
    score += Math.min(dependentsCount * 8, 30);
    score += Math.min(callersCount * 4, 20);
    score += Math.min(exportsCount * 3, 15);

    // Normalize max 100
    score = Math.min(score, 100);

    let tier: ImportanceTier = 'LOW_IMPORTANCE';
    if (score >= 70) tier = 'CORE';
    else if (score >= 40) tier = 'IMPORTANT';
    else if (score >= 20) tier = 'SUPPORTING';

    rankedFiles.push({
      id: file.id,
      path: file.path,
      type: 'FILE',
      name: file.path.split('/').pop() || file.path,
      score,
      tier,
      signals: {
        isEntryPoint: isEntry,
        isApiEndpoint: isApi,
        hasDatabaseAccess: hasDb,
        callersCount,
        dependentsCount,
        exportsCount,
      },
    });
  }

  // Sort descending by score
  rankedFiles.sort((a, b) => b.score - a.score);

  return {
    rankedFiles,
    coreFiles: rankedFiles.filter((f) => f.tier === 'CORE'),
    importantFiles: rankedFiles.filter((f) => f.tier === 'IMPORTANT'),
    supportingFiles: rankedFiles.filter((f) => f.tier === 'SUPPORTING'),
  };
}
