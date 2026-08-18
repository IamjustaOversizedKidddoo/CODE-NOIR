import { describe, it, expect } from 'vitest';
import { rankProjectEntities } from '@/lib/teaching/importance-ranker';

describe('ImportanceRanker: Architectural Centrality Scoring', () => {
  it('should score entry points, high-dependents, and database files into the CORE tier', () => {
    const files = [
      { id: 'f1', path: 'src/server.ts' },
      { id: 'f2', path: 'src/auth.ts' },
      { id: 'f3', path: 'src/unused_util.ts' },
    ];
    const symbols = [
      { id: 's1', name: 'startServer', fileId: 'f1', isExported: true },
      { id: 's2', name: 'verifyToken', fileId: 'f2', isExported: true },
    ];
    const dependencies = [
      { sourceFileId: 'f1', targetFileId: 'f2' }, // server imports auth
    ];
    const callEdges = [{ callerId: 's1', calleeName: 'verifyToken' }];
    const entryPoints = [{ path: 'src/server.ts' }];
    const endpoints = [{ path: '/api/login', fileId: 'f1' }];
    const dbEvidence = [{ fileId: 'f2' }];

    const result = rankProjectEntities({
      files,
      symbols,
      dependencies,
      callEdges,
      entryPoints,
      endpoints,
      dbEvidence,
    });

    expect(result.rankedFiles.length).toBe(3);
    const serverRank = result.rankedFiles.find((f) => f.path === 'src/server.ts');
    const authRank = result.rankedFiles.find((f) => f.path === 'src/auth.ts');
    const utilRank = result.rankedFiles.find((f) => f.path === 'src/unused_util.ts');

    expect(serverRank?.tier).toBe('CORE');
    expect(serverRank?.score).toBeGreaterThanOrEqual(70);
    expect(authRank?.tier).toBe('IMPORTANT');
    expect(utilRank?.tier).toBe('LOW_IMPORTANCE');
  });
});
