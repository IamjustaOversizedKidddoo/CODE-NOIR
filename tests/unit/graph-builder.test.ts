import { describe, it, expect } from 'vitest';
import { buildProjectGraph, calculateBlastRadius } from '@/lib/intelligence/graph-builder';

describe('GraphBuilder: Directed Multigraph, Cycles, and Blast Radius', () => {
  it('should detect circular dependency chains without infinite recursion', () => {
    const fileIdToPathMap = new Map([
      ['file_a', 'src/a.ts'],
      ['file_b', 'src/b.ts'],
      ['file_c', 'src/c.ts'],
    ]);
    const pathToIdMap = new Map([
      ['src/a.ts', 'file_a'],
      ['src/b.ts', 'file_b'],
      ['src/c.ts', 'file_c'],
    ]);

    const resolvedDependencies = [
      { sourceFileId: 'file_a', targetFileId: 'file_b', importName: 'bFunction' },
      { sourceFileId: 'file_b', targetFileId: 'file_c', importName: 'cFunction' },
      { sourceFileId: 'file_c', targetFileId: 'file_a', importName: 'aFunction' },
    ];

    const graph = buildProjectGraph(
      [],
      fileIdToPathMap,
      pathToIdMap,
      resolvedDependencies,
      new Map()
    );

    expect(graph.nodes.length).toBe(3);
    expect(graph.edges.length).toBe(3);
    expect(graph.cycles.length).toBeGreaterThan(0);
    expect(graph.cycles[0]).toContain('src/a.ts');
  });

  it('should compute blast radius correctly for a modified node', () => {
    const fileIdToPathMap = new Map([
      ['file_core', 'src/core.ts'],
      ['file_auth', 'src/auth.ts'],
      ['file_server', 'src/server.ts'],
    ]);
    const pathToIdMap = new Map([
      ['src/core.ts', 'file_core'],
      ['src/auth.ts', 'file_auth'],
      ['src/server.ts', 'file_server'],
    ]);

    // server -> auth -> core
    const resolvedDependencies = [
      { sourceFileId: 'file_auth', targetFileId: 'file_core' },
      { sourceFileId: 'file_server', targetFileId: 'file_auth' },
    ];

    const graph = buildProjectGraph(
      [],
      fileIdToPathMap,
      pathToIdMap,
      resolvedDependencies,
      new Map()
    );

    const blast = calculateBlastRadius('file_core', graph);

    expect(blast.affectedFiles.length).toBe(2);
    expect(blast.affectedFiles.map((f) => f.path)).toContain('src/auth.ts');
    expect(blast.affectedFiles.map((f) => f.path)).toContain('src/server.ts');
  });
});
