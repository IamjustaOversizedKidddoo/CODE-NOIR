import fs from 'fs';
import path from 'path';
import prisma from '../../db';
import { getProjectStorageDir } from '../../ingestion/source-storage';
import { classifyQuestion } from './classifier';
import { resolveEntitiesFromPrompt } from './entity-resolver';
import { budgetSourceChunks } from './context-budgeter';
import { calculateBlastRadius } from '../../intelligence/graph-builder';
import { EvidencePacket, SemanticSourceChunk, ResolvedEntity } from '../types';

export async function assembleEvidencePacket(
  caseId: string,
  userQuestion: string
): Promise<EvidencePacket> {
  const project = await prisma.project.findUnique({
    where: { id: caseId },
    include: {
      files: { where: { isIgnored: false } },
      symbols: true,
      dependencies: { where: { targetFileId: { not: null } } },
      findings: true,
    },
  });

  if (!project) {
    throw new Error(`Project case "${caseId}" not found in vault.`);
  }

  const baseDir = getProjectStorageDir(caseId);
  const questionType = classifyQuestion(userQuestion);

  // 1. Resolve Entities from Prompt
  const resolvedEntities = resolveEntitiesFromPrompt(
    userQuestion,
    project.files.map((f) => ({ id: f.id, path: f.path })),
    project.symbols.map((s) => ({
      id: s.id,
      name: s.name,
      fileId: s.fileId,
      kind: s.kind,
      filePath: project.files.find((f) => f.id === s.fileId)?.path,
    }))
  );

  // 2. Deterministic Facts from Brain
  const techProfile = project.techStack ? JSON.parse(project.techStack) : { frameworks: [], runtimes: [], databases: [] };
  const entryPoints = project.entryPoints ? JSON.parse(project.entryPoints) : [];
  const brain = project.brainJson ? JSON.parse(project.brainJson) : null;

  // 3. Source Chunk Assembly & Ranking
  const candidateChunks: SemanticSourceChunk[] = [];

  for (const entity of resolvedEntities) {
    if (entity.type === 'FILE' && entity.fileId && entity.filePath) {
      try {
        const fullPath = path.resolve(baseDir, entity.filePath);
        const fileContent = await fs.promises.readFile(fullPath, 'utf8');
        const fileRecord = project.files.find((f) => f.id === entity.fileId);

        candidateChunks.push({
          fileId: entity.fileId,
          path: entity.filePath,
          startLine: 1,
          endLine: fileRecord?.lineCount || 50,
          content: fileContent.slice(0, 4000), // Targeted slice
          relevance: 1,
          hash: fileRecord?.hash || '',
        });
      } catch {
        // Missing on disk
      }
    } else if (entity.type === 'SYMBOL' && entity.symbolId && entity.fileId && entity.filePath) {
      const symRecord = project.symbols.find((s) => s.id === entity.symbolId);
      const fileRecord = project.files.find((f) => f.id === entity.fileId);

      if (symRecord && fileRecord) {
        try {
          const fullPath = path.resolve(baseDir, entity.filePath);
          const fileContent = await fs.promises.readFile(fullPath, 'utf8');
          const lines = fileContent.split(/\r?\n/);
          const snippet = lines.slice(symRecord.startLine - 1, symRecord.endLine).join('\n');

          candidateChunks.push({
            fileId: entity.fileId,
            path: entity.filePath,
            symbolId: symRecord.id,
            symbolName: symRecord.name,
            startLine: symRecord.startLine,
            endLine: symRecord.endLine,
            content: snippet,
            relevance: 1,
            hash: fileRecord.hash,
          });
        } catch {
          // File slice error
        }
      }
    }
  }

  // If question is about Entry Points or Architecture and no direct file chunks, pull entry file chunks
  if (candidateChunks.length === 0 && entryPoints.length > 0) {
    const primaryEntry = entryPoints[0];
    const entryFileRecord = project.files.find((f) => f.path === primaryEntry.path);
    if (entryFileRecord) {
      try {
        const fullPath = path.resolve(baseDir, entryFileRecord.path);
        const content = await fs.promises.readFile(fullPath, 'utf8');
        candidateChunks.push({
          fileId: entryFileRecord.id,
          path: entryFileRecord.path,
          startLine: 1,
          endLine: entryFileRecord.lineCount,
          content: content.slice(0, 3000),
          relevance: 2,
          hash: entryFileRecord.hash,
        });
      } catch {}
    }
  }

  const budgetedChunks = budgetSourceChunks(candidateChunks);

  // 4. Graph Context Extraction (Callers, Callees, Dependencies, Blast Radius)
  const callers: { callerName: string; file: string; line: number }[] = [];
  const callees: { calleeName: string; line: number }[] = [];
  const dependencies: { source: string; target: string; importName?: string }[] = [];

  const matchedSymbol = resolvedEntities.find((e) => e.type === 'SYMBOL');
  if (matchedSymbol?.symbolId) {
    const callEdgesIn = await prisma.callEdge.findMany({
      where: { calleeId: matchedSymbol.symbolId },
      include: { caller: true },
    });
    const callEdgesOut = await prisma.callEdge.findMany({
      where: { callerId: matchedSymbol.symbolId },
    });

    callEdgesIn.forEach((edge) => {
      const file = project.files.find((f) => f.id === edge.fileId)?.path || '';
      callers.push({ callerName: edge.caller.name, file, line: edge.line });
    });

    callEdgesOut.forEach((edge) => {
      callees.push({ calleeName: edge.calleeName, line: edge.line });
    });
  }

  // 5. Blast Radius if Delete / Modification question
  let blastRadius: { affectedFiles: string[]; affectedSymbols: string[]; total: number } | undefined;
  if (questionType === 'BLAST_RADIUS' || questionType === 'MODIFICATION_IMPACT') {
    const targetEntity = resolvedEntities[0];
    if (targetEntity?.fileId) {
      const graphNodes = project.files.map((f) => ({ id: f.id, type: 'FILE' as const, name: f.path, path: f.path }));
      const graphEdges = project.dependencies.map((d) => ({
        id: d.id,
        source: d.sourceFileId,
        target: d.targetFileId!,
        relationship: 'IMPORTS' as const,
        confidence: 'CONFIRMED' as const,
      }));
      const calc = calculateBlastRadius(targetEntity.fileId, { nodes: graphNodes, edges: graphEdges, cycles: [] });
      blastRadius = {
        affectedFiles: calc.affectedFiles.map((f) => f.path),
        affectedSymbols: calc.affectedSymbols.map((s) => s.name),
        total: calc.totalAffected,
      };
    }
  }

  return {
    caseId,
    caseNumber: project.caseNumber,
    question: userQuestion,
    questionType,
    resolvedEntities,
    deterministicFacts: {
      technology: {
        primaryLanguage: project.primaryLang || 'TypeScript',
        frameworks: techProfile.frameworks?.map((f: any) => f.name) || [],
        runtimes: techProfile.runtimes?.map((r: any) => r.name) || [],
        databases: techProfile.databases?.map((d: any) => d.name) || [],
      },
      entryPoints: entryPoints.map((ep: any) => ({ path: ep.path, reason: ep.reason })),
      totalFiles: project.totalFiles,
      totalSymbols: project.symbols.length,
      totalLines: project.totalLines,
      cyclesCount: brain?.statistics?.circularDependencyCount || 0,
    },
    sourceChunks: budgetedChunks,
    graphContext: {
      callers,
      callees,
      dependencies,
      blastRadius,
    },
    retrievalReason: `Classified as ${questionType}. Matched ${resolvedEntities.length} entities and budgeted ${budgetedChunks.length} source code slices.`,
    evidenceConfidence: resolvedEntities.length > 0 || budgetedChunks.length > 0 ? 'CONFIRMED' : 'LIKELY',
  };
}
