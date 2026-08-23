import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import prisma from '../db';
import { getProjectStorageDir } from '../ingestion/source-storage';
import { TypeScriptParser } from './parsers/typescript-parser';
import { PythonParser } from './parsers/python-parser';
import { GenericPolyglotParser } from './parsers/generic-parser';
import { UnsupportedParser } from './parsers/unsupported-parser';
import { analyzeManifests } from './manifest-analyzer';
import { resolveImportPath } from './module-resolver';
import { buildProjectGraph } from './graph-builder';
import { detectEntryPoints } from './entry-point-detector';
import { buildProjectBrain } from './brain-builder';
import { classifyProjectCharacteristics } from './project-classifier';
import { detectEvidenceConflicts } from './conflict-detector';
import { analyzeReadme } from './readme-analyzer';
import { emitProjectEvent } from '../events/project-events';

import { FileAnalysisResult } from '../types/intelligence';
import { AnalysisCache } from '../performance/cache';
import { PipelineProfiler } from '../performance/profiler';

export interface CodeIntelligenceResult {
  projectId: string;
  totalSymbols: number;
  totalDependencies: number;
  totalCallEdges: number;
  entryPointsCount: number;
  cyclesCount: number;
  durationMs?: number;
}

export async function runCodeIntelligencePipeline(
  projectId: string
): Promise<CodeIntelligenceResult> {
  const profiler = new PipelineProfiler();
  profiler.startStage('PIPELINE_INIT');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      files: true,
    },
  });

  if (!project) {
    throw new Error(`Project with ID ${projectId} not found.`);
  }

  // 1. Emit State Transition: PARSING
  await emitProjectEvent({
    projectId,
    eventType: 'PARSING',
    state: 'PARSING',
    message: `[PARSING CODEBASE] Initializing deterministic parallel language parsers...`,
    progress: 30,
  });

  profiler.endStage('PIPELINE_INIT');
  profiler.startStage('PARSING_STAGE');

  const baseDir = getProjectStorageDir(projectId);
  const tsParser = new TypeScriptParser();
  const pyParser = new PythonParser();
  const genericParser = new GenericPolyglotParser();
  const unsupportedParser = new UnsupportedParser();
  const cache = AnalysisCache.getInstance();

  const fileIdToPathMap = new Map<string, string>();
  const pathToIdMap = new Map<string, string>();
  const allFilePathsSet = new Set<string>();

  for (const f of project.files) {
    fileIdToPathMap.set(f.id, f.path);
    pathToIdMap.set(f.path, f.id);
    allFilePathsSet.add(f.path);
  }

  const manifestFiles: { path: string; content: string }[] = [];
  const docFiles: { path: string; content: string }[] = [];
  const langLineCounts: Record<string, { fileCount: number; lineCount: number }> = {};

  const filesToParse = project.files.filter((f) => !f.isIgnored && !f.isBinary);

  // 2. Bounded Concurrent File Parsing (Worker Pool = 8)
  const CONCURRENCY_LIMIT = 8;
  const analyses: FileAnalysisResult[] = [];
  let fileIndex = 0;

  async function parseWorker() {
    while (fileIndex < filesToParse.length) {
      const currentIdx = fileIndex++;
      const fileRecord = filesToParse[currentIdx];
      if (!fileRecord) break;

      const fullPath = path.resolve(baseDir, fileRecord.path);
      let content = '';
      try {
        content = await fs.promises.readFile(fullPath, 'utf8');
      } catch {
        continue;
      }

      // Check if manifest or documentation
      const baseName = path.basename(fileRecord.path).toLowerCase();
      if (
        ['package.json', 'tsconfig.json', 'requirements.txt', 'pyproject.toml', 'cargo.toml', 'go.mod', 'dockerfile'].includes(
          baseName
        )
      ) {
        manifestFiles.push({ path: fileRecord.path, content });
      }

      if (baseName.endsWith('.md') || baseName.endsWith('.txt')) {
        docFiles.push({ path: fileRecord.path, content });
      }

      // Check cache first
      let analysis = cache.getAnalysis(fileRecord.hash);

      if (!analysis) {
        let parser = unsupportedParser;
        if (tsParser.canParse(fileRecord.path)) {
          parser = tsParser;
        } else if (pyParser.canParse(fileRecord.path)) {
          parser = pyParser;
        } else if (genericParser.canParse(fileRecord.path)) {
          parser = genericParser;
        }

        analysis = await parser.parse(fileRecord.id, fileRecord.path, content);
        cache.setAnalysis(fileRecord.hash, analysis);
      } else {
        // re-bind to current fileId
        analysis = { ...analysis, fileId: fileRecord.id };
      }

      analyses.push(analysis);

      const langKey = analysis.language;
      if (!langLineCounts[langKey]) {
        langLineCounts[langKey] = { fileCount: 0, lineCount: 0 };
      }
      langLineCounts[langKey].fileCount++;
      langLineCounts[langKey].lineCount += fileRecord.lineCount;
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, filesToParse.length) }, () => parseWorker());
  await Promise.all(workers);

  profiler.endStage('PARSING_STAGE', analyses.length);
  profiler.startStage('CLASSIFICATION_STAGE');

  // 3. Analyze Manifests & Classify Characteristics
  const languageMetrics = Object.entries(langLineCounts).map(([name, data]) => ({
    name,
    fileCount: data.fileCount,
    lineCount: data.lineCount,
  }));

  const { profile, pathAliases, manifestsData } = analyzeManifests(manifestFiles, languageMetrics);

  const classification = classifyProjectCharacteristics(project.files, manifestFiles, analyses);
  profile.projectTypes = classification.projectTypes;
  profile.architectures = classification.architectures;
  profile.isMonorepo = classification.isMonorepo;
  profile.workspaces = classification.workspaces;

  classification.frameworks.forEach((fw) => {
    if (!profile.frameworks.some((f) => f.name === fw.name)) {
      profile.frameworks.push(fw);
    }
  });
  classification.packageManagers.forEach((pm) => {
    if (!profile.packageManagers.some((p) => p.name === pm.name)) {
      profile.packageManagers.push(pm);
    }
  });

  // 4. Detect Evidence Conflicts
  const conflicts = detectEvidenceConflicts(docFiles, profile, analyses);

  profiler.endStage('CLASSIFICATION_STAGE');
  profiler.startStage('MAPPING_STAGE');

  // 5. Emit State Transition: MAPPING
  await emitProjectEvent({
    projectId,
    eventType: 'MAPPING',
    state: 'MAPPING',
    message: `[MAPPING CONNECTIONS] Cross-referencing imports, exports, and call hierarchies...`,
    progress: 60,
  });

  // 6. Resolve Imports and Build Dependencies
  interface ResolvedDepItem {
    sourceFileId: string;
    targetFileId?: string;
    externalPackage?: string;
    importName?: string;
    importType: string;
    resolutionStatus: string;
    confidence: string;
    evidenceLine?: number;
  }

  const resolvedDependencies: ResolvedDepItem[] = [];
  let unresolvedCount = 0;
  let ambiguousCount = 0;

  for (const analysis of analyses) {
    for (const imp of analysis.imports) {
      const resolved = resolveImportPath(
        analysis.path,
        imp.rawSource,
        allFilePathsSet,
        pathAliases
      );

      const targetFileId = resolved.targetFilePath ? pathToIdMap.get(resolved.targetFilePath) : undefined;

      if (resolved.resolutionStatus === 'UNRESOLVED') unresolvedCount++;
      if (resolved.resolutionStatus === 'AMBIGUOUS') ambiguousCount++;

      resolvedDependencies.push({
        sourceFileId: analysis.fileId,
        targetFileId,
        externalPackage: resolved.externalPackage,
        importName: imp.importedSymbols.join(', '),
        importType: imp.importType,
        resolutionStatus: resolved.resolutionStatus,
        confidence: resolved.confidence,
        evidenceLine: imp.line,
      });
    }
  }

  profiler.endStage('MAPPING_STAGE', resolvedDependencies.length);
  profiler.startStage('DB_PERSISTENCE_STAGE');

  // 7. Bulk Persist Symbols into DB (Batching 500)
  const symbolMap = new Map<string, { id: string; name: string; fileId: string; kind: string }>();
  const symbolsToInsert: any[] = [];

  for (const analysis of analyses) {
    for (const sym of analysis.symbols) {
      const symId = crypto.randomUUID();
      symbolsToInsert.push({
        id: symId,
        projectId,
        fileId: analysis.fileId,
        name: sym.name,
        qualifiedName: sym.qualifiedName || sym.name,
        kind: sym.kind,
        startLine: sym.location.startLine,
        endLine: sym.location.endLine,
        startCol: sym.location.startCol,
        endCol: sym.location.endCol,
        complexity: sym.complexity,
        isExported: sym.isExported,
        confidence: sym.confidence,
        language: analysis.language,
      });
      symbolMap.set(symId, {
        id: symId,
        name: sym.name,
        fileId: analysis.fileId,
        kind: sym.kind,
      });
    }
  }

  const BATCH_SIZE = 500;
  for (let i = 0; i < symbolsToInsert.length; i += BATCH_SIZE) {
    const chunk = symbolsToInsert.slice(i, i + BATCH_SIZE);
    await prisma.codeSymbol.createMany({
      data: chunk,
    });
  }

  // 8. Bulk Persist Dependencies
  for (let i = 0; i < resolvedDependencies.length; i += BATCH_SIZE) {
    const chunk = resolvedDependencies.slice(i, i + BATCH_SIZE);
    await prisma.dependency.createMany({
      data: chunk.map((d) => ({
        projectId,
        sourceFileId: d.sourceFileId,
        targetFileId: d.targetFileId,
        externalPackage: d.externalPackage,
        importName: d.importName,
        importType: d.importType,
        resolutionStatus: d.resolutionStatus,
        confidence: d.confidence,
        evidenceLine: d.evidenceLine,
      })),
    });
  }

  profiler.endStage('DB_PERSISTENCE_STAGE');
  profiler.startStage('GRAPH_BUILDING_STAGE');

  // 9. Build Directed Graph and Call Edges
  const graph = buildProjectGraph(
    analyses,
    fileIdToPathMap,
    pathToIdMap,
    resolvedDependencies,
    symbolMap
  );

  // Bulk Persist Call Edges
  const callEdgesToSave = graph.edges.filter((e) => e.relationship === 'CALLS');
  const edgesToInsert: any[] = [];

  for (const edge of callEdgesToSave) {
    const callerSym = symbolMap.get(edge.source);
    const calleeSym = symbolMap.get(edge.target);
    if (callerSym) {
      edgesToInsert.push({
        projectId,
        callerId: edge.source,
        calleeId: calleeSym ? calleeSym.id : null,
        calleeName: calleeSym ? calleeSym.name : edge.target.replace(/^unresolved_/, ''),
        relationship: 'CALLS',
        confidence: edge.confidence,
        fileId: callerSym.fileId,
        line: edge.line || 1,
        evidence: edge.evidence,
      });
    }
  }

  for (let i = 0; i < edgesToInsert.length; i += BATCH_SIZE) {
    const chunk = edgesToInsert.slice(i, i + BATCH_SIZE);
    await prisma.callEdge.createMany({
      data: chunk,
    });
  }

  profiler.endStage('GRAPH_BUILDING_STAGE');
  profiler.startStage('BRAIN_GENERATION_STAGE');

  // 10. Detect Entry Points
  const entryPoints = detectEntryPoints(
    project.files,
    analyses,
    manifestsData.packageJson?.main,
    manifestsData.packageJson?.scripts
  );

  // Mark entry files in database
  for (const ep of entryPoints) {
    const fileId = pathToIdMap.get(ep.path);
    if (fileId) {
      await prisma.projectFile.update({
        where: { id: fileId },
        data: { isEntry: true },
      });
    }
  }

  // 11. Collect Aggregate Endpoints, Env Vars, DB Evidence
  const allEndpoints = analyses.flatMap((a) => a.endpoints);
  const allEnvVars = analyses.flatMap((a) => a.envVars);
  const allDbEvidence = analyses.flatMap((a) => a.dbEvidence);

  // 12. Analyze Primary README & Build Project Brain
  const readmeAnalysis = analyzeReadme(docFiles);

  const brain = buildProjectBrain(
    {
      caseNumber: project.caseNumber,
      name: project.name,
      totalFiles: project.totalFiles,
      totalLines: project.totalLines,
      primaryLanguage: profile.languages[0]?.name || 'Polyglot',
    },
    profile,
    entryPoints,
    analyses,
    graph,
    resolvedDependencies.length,
    unresolvedCount,
    ambiguousCount,
    conflicts,
    readmeAnalysis
  );


  profiler.endStage('BRAIN_GENERATION_STAGE');
  profiler.startStage('FINAL_DB_UPDATE');

  // 13. Update Project Database Record with Brain & Analysis Telemetry
  const topLangKey = profile.languages.sort((a, b) => b.lineCount - a.lineCount)[0]?.name || 'TYPESCRIPT';
  const displayLang =
    topLangKey === 'TYPESCRIPT'
      ? 'TypeScript'
      : topLangKey === 'PYTHON'
      ? 'Python'
      : topLangKey === 'JAVASCRIPT'
      ? 'JavaScript'
      : topLangKey === 'GO'
      ? 'Go'
      : topLangKey === 'RUST'
      ? 'Rust'
      : topLangKey === 'JAVA'
      ? 'Java'
      : 'Polyglot';

  await prisma.project.update({
    where: { id: projectId },
    data: {
      primaryLang: displayLang,
      techStack: JSON.stringify(profile),
      manifestsJson: JSON.stringify(manifestsData),
      entryPoints: JSON.stringify(entryPoints),
      envVarsJson: JSON.stringify(allEnvVars),
      endpointsJson: JSON.stringify(allEndpoints),
      dbEvidenceJson: JSON.stringify(allDbEvidence),
      brainJson: JSON.stringify(brain),
      status: 'READY',
      statusMessage: `Deterministic code intelligence complete. Extracted ${symbolMap.size} symbols across ${analyses.length} files.`,
      progress: 100,
    },
  });

  profiler.endStage('FINAL_DB_UPDATE');
  const report = profiler.generateReport(projectId);

  // 14. Emit Completion Event
  await emitProjectEvent({
    projectId,
    eventType: 'READY',
    state: 'READY',
    message: `[INTELLIGENCE COMPLETE] Case ${project.caseNumber} graph constructed. ${symbolMap.size} symbols, ${resolvedDependencies.length} dependencies, ${callEdgesToSave.length} call edges indexed in ${report.totalDurationMs}ms.`,
    progress: 100,
    data: {
      totalSymbols: symbolMap.size,
      totalDependencies: resolvedDependencies.length,
      totalCallEdges: callEdgesToSave.length,
      entryPointsCount: entryPoints.length,
      cyclesCount: graph.cycles.length,
      durationMs: report.totalDurationMs,
    },
  });

  return {
    projectId,
    totalSymbols: symbolMap.size,
    totalDependencies: resolvedDependencies.length,
    totalCallEdges: callEdgesToSave.length,
    entryPointsCount: entryPoints.length,
    cyclesCount: graph.cycles.length,
    durationMs: report.totalDurationMs,
  };
}
