'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface BenchmarkResult {
  tier: string;
  durationMs: number;
  memoryDeltaMb: number;
  totalFiles: number;
  totalSymbols: number;
  totalDependencies: number;
  primaryLang: string;
  status: string;
}

interface BenchmarkReport {
  timestamp: string;
  summary: {
    totalBenchmarks: number;
    percentiles: {
      p50: number;
      p95: number;
      p99: number;
      min: number;
      max: number;
      avg: number;
    };
    cacheStats: {
      hits: number;
      misses: number;
      size: number;
      hitRatio: number;
    };
  };
  results: BenchmarkResult[];
}

export default function PerformanceLabPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBenchmarks = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/lab/performance/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiers: ['TINY', 'SMALL', 'MEDIUM', 'POLYGLOT', 'MONOREPO'],
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Benchmark execution failed.');
      }
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to complete performance evaluation.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 border-4 border-emerald-500 bg-neutral-950 p-6 shadow-[8px_8px_0px_0px_rgba(16,185,129,1)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-emerald-500 text-black font-black text-xs">
                PERFORMANCE LAB // SPEED ENGINE
              </span>
              <span className="text-neutral-500 text-xs">DIAGNOSTIC TELEMETRY</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-emerald-400">
              PIPELINE SCALABILITY & LATENCY MATRIX
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Deterministic size tier benchmarking, bounded parallel parsing, and cache telemetry.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-neutral-900 border-2 border-neutral-700 text-neutral-300 font-bold hover:bg-neutral-800 transition"
            >
              BACK TO HQ
            </Link>
            <button
              onClick={runBenchmarks}
              disabled={isRunning}
              className={`px-6 py-2 border-2 font-black transition ${
                isRunning
                  ? 'bg-neutral-800 border-neutral-600 text-neutral-500 cursor-not-allowed'
                  : 'bg-emerald-500 border-emerald-400 text-black hover:bg-emerald-400 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.8)]'
              }`}
            >
              {isRunning ? 'RUNNING BENCHMARKS...' : 'EXECUTE BENCHMARK SUITE'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 border-2 border-red-500 bg-red-950 text-red-300">
          <span className="font-bold">BENCHMARK ERROR:</span> {error}
        </div>
      )}

      {/* Latency Percentiles & Cache Metrics */}
      {report && (
        <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-neutral-950 border-2 border-emerald-500/60 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.5)]">
            <div className="text-neutral-400 text-xs font-bold uppercase">P50 Latency (Median)</div>
            <div className="text-3xl font-black text-emerald-400 mt-1">
              {report.summary.percentiles.p50} ms
            </div>
            <div className="text-xs text-neutral-500 mt-1">Min: {report.summary.percentiles.min} ms</div>
          </div>

          <div className="p-4 bg-neutral-950 border-2 border-cyan-500/60 shadow-[4px_4px_0px_0px_rgba(6,182,212,0.5)]">
            <div className="text-neutral-400 text-xs font-bold uppercase">P95 Latency</div>
            <div className="text-3xl font-black text-cyan-400 mt-1">
              {report.summary.percentiles.p95} ms
            </div>
            <div className="text-xs text-neutral-500 mt-1">P99: {report.summary.percentiles.p99} ms</div>
          </div>

          <div className="p-4 bg-neutral-950 border-2 border-yellow-500/60 shadow-[4px_4px_0px_0px_rgba(234,179,8,0.5)]">
            <div className="text-neutral-400 text-xs font-bold uppercase">Cache Hit Ratio</div>
            <div className="text-3xl font-black text-yellow-400 mt-1">
              {Math.round(report.summary.cacheStats.hitRatio * 100)}%
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {report.summary.cacheStats.hits} Hits / {report.summary.cacheStats.misses} Misses
            </div>
          </div>

          <div className="p-4 bg-neutral-950 border-2 border-purple-500/60 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.5)]">
            <div className="text-neutral-400 text-xs font-bold uppercase">Average Throughput</div>
            <div className="text-3xl font-black text-purple-400 mt-1">
              {report.summary.percentiles.avg} ms
            </div>
            <div className="text-xs text-neutral-500 mt-1">Max: {report.summary.percentiles.max} ms</div>
          </div>
        </div>
      )}

      {/* Tier Benchmarks Table */}
      <div className="max-w-7xl mx-auto border-2 border-neutral-800 bg-neutral-950 p-6">
        <h2 className="text-xl font-black text-neutral-200 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 bg-emerald-500 inline-block"></span>
          REPOSITORY SIZE TIER BENCHMARK AUDIT
        </h2>

        {!report && !isRunning && (
          <div className="text-center py-16 text-neutral-500 border border-dashed border-neutral-800">
            <p className="text-lg font-bold mb-2">NO BENCHMARK TELEMETRY LOADED</p>
            <p className="text-sm">Click "EXECUTE BENCHMARK SUITE" to measure end-to-end ingestion and intelligence latency.</p>
          </div>
        )}

        {isRunning && (
          <div className="text-center py-16 text-emerald-400 border border-neutral-800 animate-pulse">
            <p className="text-lg font-black">BENCHMARKING PARALLEL PIPELINE & CACHE LAYERS...</p>
            <p className="text-xs text-neutral-500 mt-2">Measuring upload, extraction, bounded parsing, graph mapping, and bulk DB writes.</p>
          </div>
        )}

        {report && !isRunning && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-neutral-800 text-neutral-400 text-xs uppercase bg-neutral-900/60">
                  <th className="p-3">Size Tier</th>
                  <th className="p-3">Total Files</th>
                  <th className="p-3">Symbols Extracted</th>
                  <th className="p-3">Dependencies</th>
                  <th className="p-3">Language Stack</th>
                  <th className="p-3">Memory Delta</th>
                  <th className="p-3 text-right">Execution Duration</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.results.map((r) => (
                  <tr key={r.tier} className="border-b border-neutral-900 hover:bg-neutral-900/30 transition">
                    <td className="p-3 font-bold text-emerald-400">{r.tier}</td>
                    <td className="p-3 text-neutral-300">{r.totalFiles}</td>
                    <td className="p-3 text-neutral-300">{r.totalSymbols}</td>
                    <td className="p-3 text-neutral-300">{r.totalDependencies}</td>
                    <td className="p-3 text-neutral-400">{r.primaryLang}</td>
                    <td className="p-3 text-neutral-400">+{r.memoryDeltaMb} MB</td>
                    <td className="p-3 text-right font-mono font-bold text-cyan-400">{r.durationMs} ms</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-400 text-xs font-black">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
