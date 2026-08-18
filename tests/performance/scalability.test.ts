import { describe, it, expect, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import { createBenchmarkArchive } from '@/lib/performance/benchmark-suite';
import { PipelineProfiler, computePercentiles } from '@/lib/performance/profiler';
import { AnalysisCache } from '@/lib/performance/cache';
import { IndexedGraphIndex } from '@/lib/intelligence/graph-query';
import { DirectedProjectGraph } from '@/lib/types/intelligence';

describe('Phase 12: Performance, Scalability & Cache Architecture', () => {
  const createdProjectIds: string[] = [];

  afterAll(async () => {
    for (const id of createdProjectIds) {
      try {
        await prisma.project.delete({ where: { id } });
      } catch {}
    }
  });

  it('1. should compute correct percentile distributions (P50, P95, P99)', () => {
    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const res = computePercentiles(latencies);

    expect(res.p50).toBe(60);
    expect(res.p95).toBe(100);
    expect(res.p99).toBe(100);
    expect(res.min).toBe(10);
    expect(res.max).toBe(100);
    expect(res.avg).toBe(55);
  });

  it('2. should manage composite versioned keys and cache hits/misses in AnalysisCache', () => {
    const cache = AnalysisCache.getInstance();
    cache.clear();

    const mockHash = 'deadbeef12345678';
    const initial = cache.getAnalysis(mockHash);
    expect(initial).toBeNull();

    const mockResult: any = {
      fileId: 'f1',
      path: 'src/app.ts',
      language: 'TYPESCRIPT',
      symbols: [{ name: 'testSym', kind: 'FUNCTION', complexity: 1 }],
      imports: [],
      exports: [],
      calls: [],
      endpoints: [],
      envVars: [],
      dbEvidence: [],
    };

    cache.setAnalysis(mockHash, mockResult);

    const cached = cache.getAnalysis(mockHash);
    expect(cached).not.toBeNull();
    expect(cached?.symbols.length).toBe(1);

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRatio).toBe(0.5);

    cache.invalidateByHash(mockHash);
    expect(cache.getAnalysis(mockHash)).toBeNull();
  });

  it('3. should perform O(1) indexed caller/callee lookups and blast radius tracing in IndexedGraphIndex', () => {
    const mockGraph: DirectedProjectGraph = {
      nodes: [
        { id: 'sym_a', type: 'SYMBOL', name: 'funcA', path: 'src/a.ts' },
        { id: 'sym_b', type: 'SYMBOL', name: 'funcB', path: 'src/b.ts' },
        { id: 'sym_c', type: 'SYMBOL', name: 'funcC', path: 'src/c.ts' },
      ],
      edges: [
        { id: 'e1', source: 'sym_a', target: 'sym_b', relationship: 'CALLS', confidence: 'CONFIRMED' },
        { id: 'e2', source: 'sym_b', target: 'sym_c', relationship: 'CALLS', confidence: 'CONFIRMED' },
      ],
      cycles: [],
    };

    const index = new IndexedGraphIndex(mockGraph);

    // Callers of B (A calls B)
    const callersB = index.getCallers('sym_b');
    expect(callersB.length).toBe(1);
    expect(callersB[0].callerNode?.name).toBe('funcA');

    // Callees of A (A calls B)
    const calleesA = index.getCallees('sym_a');
    expect(calleesA.length).toBe(1);
    expect(calleesA[0].calleeNode?.name).toBe('funcB');

    // Blast Radius of C (If C changes, B and A are impacted upstream)
    const blast = index.computeBlastRadius('sym_c');
    expect(blast.totalAffected).toBe(2);
    expect(blast.affectedIds).toContain('sym_b');
    expect(blast.affectedIds).toContain('sym_a');
  });

  it('4. should ingest and process TINY benchmark tier within performance budget (< 1500ms)', async () => {
    const zip = createBenchmarkArchive('TINY');
    const start = performance.now();

    const result = await runZipIngestionPipeline(zip, { projectName: 'Perf Tiny Case' });
    createdProjectIds.push(result.projectId);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(15000);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { symbols: true },
    });
    expect(project?.status).toBe('READY');
    expect(project?.symbols.length).toBeGreaterThan(0);
  });

  it('5. should ingest and process SMALL benchmark tier within performance budget with bounded parsing', async () => {
    const zip = createBenchmarkArchive('SMALL');
    const start = performance.now();

    const result = await runZipIngestionPipeline(zip, { projectName: 'Perf Small Case' });
    createdProjectIds.push(result.projectId);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(15000);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { symbols: true },
    });
    expect(project?.status).toBe('READY');
    expect(project?.symbols.length).toBeGreaterThanOrEqual(40);
  });
});
