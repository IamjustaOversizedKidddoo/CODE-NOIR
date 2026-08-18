import { describe, it, expect } from 'vitest';
import { classifyQuestion } from '@/lib/ai/retrieval/classifier';
import { resolveEntitiesFromPrompt } from '@/lib/ai/retrieval/entity-resolver';
import { budgetSourceChunks } from '@/lib/ai/retrieval/context-budgeter';
import { SemanticSourceChunk } from '@/lib/ai/types';

describe('AIRetrieval: Classification, Entity Resolution, and Budgeting', () => {
  it('should accurately classify diverse inquiry intents', () => {
    expect(classifyQuestion('What is this project?')).toBe('PROJECT_OVERVIEW');
    expect(classifyQuestion('Give me the architecture and subsystems')).toBe('ARCHITECTURE');
    expect(classifyQuestion('Explain auth.ts file')).toBe('FILE_EXPLANATION');
    expect(classifyQuestion('Explain verifyToken function')).toBe('SYMBOL_EXPLANATION');
    expect(classifyQuestion('Who calls startServer?')).toBe('CALL_FLOW');
    expect(classifyQuestion('What happens if I delete auth.ts?')).toBe('BLAST_RADIUS');
    expect(classifyQuestion('Tell me the story of this project')).toBe('PROJECT_STORY');
    expect(classifyQuestion('Where is the entry point?')).toBe('ENTRY_POINT');
  });

  it('should resolve files and symbols with disambiguation on collision', () => {
    const files = [
      { id: 'f1', path: 'src/auth.ts' },
      { id: 'f2', path: 'src/server.ts' },
    ];
    const symbols = [
      { id: 's1', name: 'verifyToken', fileId: 'f1', kind: 'METHOD', filePath: 'src/auth.ts' },
      { id: 's2', name: 'authHelper', fileId: 'f1', kind: 'FUNCTION', filePath: 'src/auth.ts' },
      { id: 's3', name: 'authHelper', fileId: 'f2', kind: 'FUNCTION', filePath: 'src/server.ts' }, // Collision
    ];

    // Single file match
    const resolvedFile = resolveEntitiesFromPrompt('Explain auth.ts', files, symbols);
    expect(resolvedFile.length).toBe(1);
    expect(resolvedFile[0].type).toBe('FILE');
    expect(resolvedFile[0].fileId).toBe('f1');

    // Single symbol match
    const resolvedSym = resolveEntitiesFromPrompt('How does verifyToken work?', files, symbols);
    expect(resolvedSym.length).toBe(1);
    expect(resolvedSym[0].type).toBe('SYMBOL');
    expect(resolvedSym[0].symbolId).toBe('s1');

    // Multiple candidates disambiguation
    const resolvedColl = resolveEntitiesFromPrompt('Explain authHelper', files, symbols);
    expect(resolvedColl.length).toBe(1);
    expect(resolvedColl[0].type).toBe('MULTIPLE_CANDIDATES');
    expect(resolvedColl[0].candidates?.length).toBe(2);
  });

  it('should enforce context budgeting limits and prioritize high-relevance chunks', () => {
    const chunks: SemanticSourceChunk[] = [
      { fileId: 'f1', path: 'src/bg.ts', startLine: 1, endLine: 50, content: 'A'.repeat(5000), relevance: 5, hash: 'h1' },
      { fileId: 'f2', path: 'src/target.ts', startLine: 1, endLine: 20, content: 'B'.repeat(2000), relevance: 1, hash: 'h2' },
      { fileId: 'f3', path: 'src/caller.ts', startLine: 1, endLine: 30, content: 'C'.repeat(3000), relevance: 2, hash: 'h3' },
    ];

    const budgeted = budgetSourceChunks(chunks, { maxTotalChars: 6000, maxChunksCount: 5 });

    // Target (relevance 1) and caller (relevance 2) must be prioritized over background (relevance 5)
    expect(budgeted.length).toBe(2);
    expect(budgeted[0].path).toBe('src/target.ts');
    expect(budgeted[1].path).toBe('src/caller.ts');
  });
});
