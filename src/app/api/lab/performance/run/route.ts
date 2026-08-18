import { NextRequest, NextResponse } from 'next/server';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import { createBenchmarkArchive, BenchmarkTier } from '@/lib/performance/benchmark-suite';
import { PipelineProfiler, computePercentiles } from '@/lib/performance/profiler';
import { AnalysisCache } from '@/lib/performance/cache';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedTiers: BenchmarkTier[] = body.tiers || ['TINY', 'SMALL', 'MEDIUM', 'POLYGLOT', 'MONOREPO'];

    const results: any[] = [];
    const createdProjectIds: string[] = [];
    const profiler = new PipelineProfiler();
    const cache = AnalysisCache.getInstance();

    for (const tier of requestedTiers) {
      profiler.startStage(`TIER_${tier}`);
      const zip = createBenchmarkArchive(tier);

      const memBefore = profiler.getMemoryUsageMb();
      const start = performance.now();

      const ingestionResult = await runZipIngestionPipeline(zip, {
        projectName: `Benchmark ${tier}`,
      });
      createdProjectIds.push(ingestionResult.projectId);

      const end = performance.now();
      const memAfter = profiler.getMemoryUsageMb();
      const durationMs = Math.round((end - start) * 100) / 100;

      const project = await prisma.project.findUnique({
        where: { id: ingestionResult.projectId },
        include: { symbols: true, dependencies: true },
      });

      results.push({
        tier,
        durationMs,
        memoryDeltaMb: Math.round((memAfter - memBefore) * 100) / 100,
        totalFiles: project?.totalFiles || 0,
        totalSymbols: project?.symbols.length || 0,
        totalDependencies: project?.dependencies.length || 0,
        primaryLang: project?.primaryLang || 'Unknown',
        status: 'PASS',
      });

      profiler.endStage(`TIER_${tier}`, project?.totalFiles);
    }

    // Clean up created benchmark cases
    for (const id of createdProjectIds) {
      try {
        await prisma.project.delete({ where: { id } });
      } catch {}
    }

    const latencies = results.map((r) => r.durationMs);
    const percentiles = computePercentiles(latencies);
    const cacheStats = cache.getStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalBenchmarks: results.length,
        percentiles,
        cacheStats,
      },
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Benchmark run failed.' },
      { status: 500 }
    );
  }
}
