import prisma from '../db';
import { InterrogationEntity, InterrogationSessionState } from './types';

export interface ReferenceResolutionResult {
  entity?: InterrogationEntity;
  isAmbiguous: boolean;
  candidates: { id: string; name: string; filePath: string; kind: string }[];
  resolvedFrom: 'DIRECT_MENTION' | 'PRONOUN' | 'LEAD_STACK' | 'SESSION_CURRENT' | 'ENTRY_POINT' | 'NONE';
}

export async function resolveConversationalEntity(
  query: string,
  session: InterrogationSessionState
): Promise<ReferenceResolutionResult> {
  const normalized = query.trim().toLowerCase();

  // 1. Check for pronoun or context references: "this", "it", "that", "the function", "the file", "the caller", "the suspect"
  const pronounPatterns = [
    /\b(this|that|it|they)\b/i,
    /\b(the function|the file|the module|the class|the suspect)\b/i,
    /\b(the caller|who calls it|what calls this|the callee)\b/i,
    /\b(the previous one|that dependency|the last one)\b/i,
  ];

  const hasPronoun = pronounPatterns.some((pattern) => pattern.test(normalized));

  // 2. Search for explicit symbol/file mentions in the project database
  const projectSymbols = await prisma.codeSymbol.findMany({
    where: { projectId: session.caseId },
    include: { file: true },
  });

  const projectFiles = await prisma.projectFile.findMany({
    where: { projectId: session.caseId },
  });

  // Check if query explicitly contains a known symbol name (case-insensitive)
  const matchingSymbols: typeof projectSymbols = [];
  for (const s of projectSymbols) {
    const sNameLower = s.name.toLowerCase();
    // match whole word or function call like sName()
    const regex = new RegExp(`\\b${sNameLower}(\\(\\))?\\b`, 'i');
    if (regex.test(normalized)) {
      matchingSymbols.push(s);
    }
  }

  // Check if query explicitly contains a known file path or basename
  const matchingFiles: typeof projectFiles = [];
  for (const f of projectFiles) {
    const fPathLower = f.path.toLowerCase();
    const fBaseLower = f.path.split('/').pop()?.toLowerCase() || '';
    if (normalized.includes(fPathLower) || (fBaseLower.length > 3 && normalized.includes(fBaseLower))) {
      matchingFiles.push(f);
    }
  }

  // Check for ambiguous matches (e.g. multiple functions with same name in different files)
  if (matchingSymbols.length > 1) {
    // Check if they are distinct entities across different files
    const uniqueFiles = new Set(matchingSymbols.map((s) => s.file.path));
    if (uniqueFiles.size > 1) {
      return {
        isAmbiguous: true,
        candidates: matchingSymbols.map((s) => ({
          id: s.id,
          name: s.name,
          filePath: s.file.path,
          kind: s.kind,
        })),
        resolvedFrom: 'DIRECT_MENTION',
      };
    }
  }

  // Exact single symbol match
  if (matchingSymbols.length === 1) {
    const s = matchingSymbols[0];
    return {
      entity: {
        name: s.name,
        type: s.kind === 'CLASS' ? 'CLASS' : 'FUNCTION',
        filePath: s.file.path,
        startLine: s.startLine,
        endLine: s.endLine,
        symbolId: s.id,
        fileId: s.file.id,
      },
      isAmbiguous: false,
      candidates: [],
      resolvedFrom: 'DIRECT_MENTION',
    };
  }

  // Exact single file match
  if (matchingFiles.length === 1) {
    const f = matchingFiles[0];
    return {
      entity: {
        name: f.path,
        type: 'FILE',
        filePath: f.path,
        fileId: f.id,
        startLine: 1,
        endLine: f.lineCount,
      },
      isAmbiguous: false,
      candidates: [],
      resolvedFrom: 'DIRECT_MENTION',
    };
  }

  // 3. Check for pronoun, follow-up, or contextual entity references: "this", "it", "that", "why", "how", "what next", "the function", "the file", "the caller"
  const isFollowUp = /\b(why|how|what next|what happens next|what happens after|explain more|go on|continue)\b/i.test(normalized);

  if (hasPronoun || isFollowUp) {
    if (session.currentEntity) {
      return {
        entity: session.currentEntity,
        isAmbiguous: false,
        candidates: [],
        resolvedFrom: 'SESSION_CURRENT',
      };
    }

    if (session.leadStack.length > 0) {
      const topLead = session.leadStack[session.leadStack.length - 1];
      return {
        entity: {
          name: topLead.entityName,
          type: topLead.entityType,
          filePath: topLead.filePath,
        },
        isAmbiguous: false,
        candidates: [],
        resolvedFrom: 'LEAD_STACK',
      };
    }
  }

  // General conversational or non-entity question — do not force an entity
  return {
    isAmbiguous: false,
    candidates: [],
    resolvedFrom: 'NONE',
  };
}
