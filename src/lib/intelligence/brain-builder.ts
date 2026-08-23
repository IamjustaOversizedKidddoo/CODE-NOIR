import path from 'path';
import {
  ProjectBrain,
  ProjectBrainSubsystem,
  TechnologyProfile,
  DetectedEntryPoint,
  FileAnalysisResult,
  DirectedProjectGraph,
  ReadmeAnalysis,
} from '../types/intelligence';

export function buildProjectBrain(
  projectIdentity: {
    caseNumber: string;
    name: string;
    totalFiles: number;
    totalLines: number;
    primaryLanguage: string;
  },
  technology: TechnologyProfile,
  entryPoints: DetectedEntryPoint[],
  analyses: FileAnalysisResult[],
  graph: DirectedProjectGraph,
  dependenciesCount: number,
  unresolvedImports: number,
  ambiguousImports: number,
  conflicts: any[] = [],
  readmeAnalysis?: ReadmeAnalysis
): ProjectBrain {

  // 1. Group files by top-level subsystems / directories
  const directoryMap = new Map<string, { name: string; files: string[]; symbolCount: number }[]>();

  let totalSymbols = 0;
  let totalEndpoints = 0;
  let totalEnvVars = 0;
  let supportedFilesCount = 0;

  for (const analysis of analyses) {
    totalSymbols += analysis.symbols.length;
    totalEndpoints += analysis.endpoints.length;
    totalEnvVars += analysis.envVars.length;

    if (analysis.language !== 'UNSUPPORTED_LANGUAGE') {
      supportedFilesCount++;
    }

    const normalized = analysis.path.replace(/\\/g, '/');
    const segments = normalized.split('/');
    const topDir = segments.length > 1 ? segments[0] : 'root';
    const subModule = segments.length > 2 ? segments[1] : path.basename(normalized, path.extname(normalized));

    if (!directoryMap.has(topDir)) {
      directoryMap.set(topDir, []);
    }

    const submodules = directoryMap.get(topDir)!;
    let existingSub = submodules.find((s) => s.name === subModule);
    if (!existingSub) {
      existingSub = { name: subModule, files: [], symbolCount: 0 };
      submodules.push(existingSub);
    }

    existingSub.files.push(analysis.path);
    existingSub.symbolCount += analysis.symbols.length;
  }

  const subsystems: ProjectBrainSubsystem[] = Array.from(directoryMap.entries()).map(
    ([directory, modules]) => ({
      directory,
      modules,
    })
  );

  // Size Tier
  let sizeTier: 'TINY' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE' = 'MEDIUM';
  if (projectIdentity.totalFiles < 20) sizeTier = 'TINY';
  else if (projectIdentity.totalFiles <= 100) sizeTier = 'SMALL';
  else if (projectIdentity.totalFiles <= 500) sizeTier = 'MEDIUM';
  else if (projectIdentity.totalFiles <= 2000) sizeTier = 'LARGE';
  else sizeTier = 'VERY_LARGE';

  // Analysis Coverage
  const filesCoveredPct = projectIdentity.totalFiles > 0 ? (supportedFilesCount / projectIdentity.totalFiles) * 100 : 100;
  const unsupportedAreas: string[] = [];
  if (filesCoveredPct < 100) {
    unsupportedAreas.push(`Contains unsupported / binary files (${projectIdentity.totalFiles - supportedFilesCount} files).`);
  }

  return {
    identity: {
      ...projectIdentity,
      sizeTier,
    },
    technology,
    entryPoints,
    subsystems,
    statistics: {
      totalSymbols,
      totalDependencies: dependenciesCount,
      totalCallEdges: graph.edges.filter((e) => e.relationship === 'CALLS').length,
      unresolvedImports,
      ambiguousImports,
      circularDependencyCount: graph.cycles.length,
      endpointsCount: totalEndpoints,
      envVarsCount: totalEnvVars,
    },
    coverage: {
      filesCoveredPct: Math.round(filesCoveredPct),
      symbolsCoveredPct: totalSymbols > 0 ? 100 : 0,
      relationshipsCoveredPct: dependenciesCount > 0 ? 100 : 0,
      apiCoveredPct: totalEndpoints > 0 ? 100 : 0,
      securityCoveredPct: 100,
      unsupportedAreas,
    },
    conflicts,
    readmeAnalysis,
  };
}

