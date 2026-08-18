export interface StageTiming {
  stage: string;
  durationMs: number;
  memoryMb: number;
  itemCount?: number;
  metadata?: Record<string, any>;
}

export interface PipelineProfileReport {
  caseId: string;
  totalDurationMs: number;
  peakMemoryMb: number;
  stages: StageTiming[];
  metrics: {
    uploadMs?: number;
    extractionMs?: number;
    languageDetectionMs?: number;
    parsingMs?: number;
    symbolExtractionMs?: number;
    relationshipConstructionMs?: number;
    graphConstructionMs?: number;
    brainGenerationMs?: number;
    securityScanMs?: number;
    investigationGenerationMs?: number;
    curriculumGenerationMs?: number;
    dbWritesMs?: number;
  };
}

export class PipelineProfiler {
  private timings: StageTiming[] = [];
  private activeTimers = new Map<string, { start: number; memStart: number }>();
  private peakMemory = 0;

  public startStage(stage: string): void {
    const mem = this.getMemoryUsageMb();
    if (mem > this.peakMemory) this.peakMemory = mem;
    this.activeTimers.set(stage, {
      start: performance.now(),
      memStart: mem,
    });
  }

  public endStage(stage: string, itemCount?: number, metadata?: Record<string, any>): number {
    const timer = this.activeTimers.get(stage);
    const now = performance.now();
    const mem = this.getMemoryUsageMb();
    if (mem > this.peakMemory) this.peakMemory = mem;

    const durationMs = timer ? Math.round((now - timer.start) * 100) / 100 : 0;
    this.activeTimers.delete(stage);

    this.timings.push({
      stage,
      durationMs,
      memoryMb: mem,
      itemCount,
      metadata,
    });

    return durationMs;
  }

  public async measureAsync<T>(
    stage: string,
    fn: () => Promise<T>,
    itemCount?: number,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startStage(stage);
    try {
      const result = await fn();
      this.endStage(stage, itemCount, metadata);
      return result;
    } catch (err) {
      this.endStage(stage, itemCount, { ...metadata, error: String(err) });
      throw err;
    }
  }

  public getMemoryUsageMb(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
    }
    return 0;
  }

  public generateReport(caseId: string): PipelineProfileReport {
    const totalDurationMs = this.timings.reduce((sum, t) => sum + t.durationMs, 0);
    const metrics: PipelineProfileReport['metrics'] = {};

    for (const t of this.timings) {
      if (t.stage.includes('EXTRACT')) metrics.extractionMs = t.durationMs;
      else if (t.stage.includes('PARSING') || t.stage.includes('PARSE')) metrics.parsingMs = t.durationMs;
      else if (t.stage.includes('MAPPING') || t.stage.includes('RESOLVE')) metrics.relationshipConstructionMs = t.durationMs;
      else if (t.stage.includes('GRAPH')) metrics.graphConstructionMs = t.durationMs;
      else if (t.stage.includes('BRAIN')) metrics.brainGenerationMs = t.durationMs;
      else if (t.stage.includes('SECURITY')) metrics.securityScanMs = t.durationMs;
      else if (t.stage.includes('INVESTIGATION')) metrics.investigationGenerationMs = t.durationMs;
      else if (t.stage.includes('CURRICULUM')) metrics.curriculumGenerationMs = t.durationMs;
      else if (t.stage.includes('DB_WRITE')) metrics.dbWritesMs = t.durationMs;
    }

    return {
      caseId,
      totalDurationMs: Math.round(totalDurationMs * 100) / 100,
      peakMemoryMb: this.peakMemory,
      stages: [...this.timings],
      metrics,
    };
  }
}

export function computePercentiles(values: number[]): { p50: number; p95: number; p99: number; min: number; max: number; avg: number } {
  if (values.length === 0) return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const getP = (p: number) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)];

  return {
    p50: Math.round(getP(50) * 100) / 100,
    p95: Math.round(getP(95) * 100) / 100,
    p99: Math.round(getP(99) * 100) / 100,
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    avg: Math.round((sorted.reduce((s, v) => s + v, 0) / sorted.length) * 100) / 100,
  };
}
