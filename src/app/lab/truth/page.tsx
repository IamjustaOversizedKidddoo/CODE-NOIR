'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertOctagon,
  RefreshCw,
  FileSearch,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Crosshair,
  Award,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function TruthLabDashboard() {
  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    async function loadScorecard() {
      try {
        const res = await fetch('/api/lab/truth/run');
        const data = await res.json();
        if (data.success) {
          setScorecard(data.scorecard);
        }
      } catch (err) {
        console.error('Failed to load scorecard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadScorecard();
  }, []);

  const handleRunEvaluation = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/lab/truth/run', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setScorecard(data.scorecard);
      }
    } catch (err) {
      console.error('Failed to run benchmark:', err);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-amber-400 font-mono flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent animate-spin" />
        <span className="text-sm font-black tracking-widest animate-pulse">
          // RUNNING TRUTH LAB BENCHMARK EVALUATORS...
        </span>
      </div>
    );
  }

  const metrics = scorecard?.metrics || {
    factualAccuracy: 1.0,
    citationAccuracy: 1.0,
    relationshipF1: 1.0,
    flowAccuracy: 1.0,
    securityPrecision: 1.0,
    securityRecall: 1.0,
    hallucinationRate: 0.0,
    personaPreservation: 1.0,
    ambiguityHandling: 1.0,
  };

  const dossiers = scorecard?.failureDossiers || [];
  const categories = scorecard?.categoryScores || {};

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F2EB] font-mono flex flex-col selection:bg-amber-400 selection:text-black">
      {/* Top Banner */}
      <header className="border-b-4 border-black bg-[#121216] p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-red-600 text-black text-[10px] font-black px-2 py-0.5 border border-black uppercase">
                INTERNAL ADVERSARIAL LAB
              </span>
              <span className="text-xs text-neutral-400">{scorecard?.runId}</span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">
              TRUTH LAB // THE DETECTIVE IS NOW THE SUSPECT
            </h1>
            <p className="text-xs text-neutral-400">
              Deterministic evaluation suite measuring factual precision, citation fidelity, relationship recall, and persona invariance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'px-4 py-2 border-2 border-black font-black text-xs uppercase shadow-brutal flex items-center gap-2',
                scorecard?.overallPassed ? 'bg-emerald-500 text-black' : 'bg-red-600 text-white'
              )}
            >
              {scorecard?.overallPassed ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ALL GATES PASSED</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-4 h-4" />
                  <span>REGRESSION DETECTED</span>
                </>
              )}
            </div>

            <button
              onClick={handleRunEvaluation}
              disabled={running}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-black text-xs px-4 py-2 border-2 border-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-2"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', running && 'animate-spin')} />
              <span>{running ? 'EVALUATING...' : 'RUN TRUTH LAB ⚡'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* Metric Cards Grid */}
        <section className="space-y-3">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block">
            CORE EVALUATION METRICS
          </span>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-[#121216] border-2 border-black p-4 rounded shadow-brutal-sm">
              <span className="text-[9px] font-black text-neutral-400 uppercase block">FACTUAL ACCURACY</span>
              <span className="text-2xl font-black text-emerald-400">
                {(metrics.factualAccuracy * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-[#121216] border-2 border-black p-4 rounded shadow-brutal-sm">
              <span className="text-[9px] font-black text-neutral-400 uppercase block">CITATION ACCURACY</span>
              <span className="text-2xl font-black text-emerald-400">
                {(metrics.citationAccuracy * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-[#121216] border-2 border-black p-4 rounded shadow-brutal-sm">
              <span className="text-[9px] font-black text-neutral-400 uppercase block">RELATIONSHIP F1</span>
              <span className="text-2xl font-black text-emerald-400">
                {(metrics.relationshipF1 * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-[#121216] border-2 border-black p-4 rounded shadow-brutal-sm">
              <span className="text-[9px] font-black text-neutral-400 uppercase block">SECURITY RECALL</span>
              <span className="text-2xl font-black text-emerald-400">
                {(metrics.securityRecall * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-[#121216] border-2 border-black p-4 rounded shadow-brutal-sm">
              <span className="text-[9px] font-black text-neutral-400 uppercase block">SECURITY PRECISION</span>
              <span className="text-2xl font-black text-emerald-400">
                {(metrics.securityPrecision * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-[#121216] border-2 border-black p-4 rounded shadow-brutal-sm">
              <span className="text-[9px] font-black text-neutral-400 uppercase block">PERSONA INVARIANCE</span>
              <span className="text-2xl font-black text-emerald-400">
                {(metrics.personaPreservation * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-[#121216] border-2 border-black p-4 rounded shadow-brutal-sm">
              <span className="text-[9px] font-black text-neutral-400 uppercase block">AMBIGUITY HANDLING</span>
              <span className="text-2xl font-black text-emerald-400">
                {(metrics.ambiguityHandling * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-[#121216] border-2 border-black p-4 rounded shadow-brutal-sm">
              <span className="text-[9px] font-black text-neutral-400 uppercase block">HALLUCINATION RATE</span>
              <span className="text-2xl font-black text-blue-400">
                {(metrics.hallucinationRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </section>

        {/* Category Breakdown */}
        <section className="bg-[#121216] border-3 border-black p-6 shadow-brutal space-y-4">
          <h2 className="text-lg font-black text-white uppercase">EVALUATOR CATEGORY BREAKDOWN</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 text-neutral-400 font-black uppercase">
                  <th className="py-2.5 px-3">CATEGORY</th>
                  <th className="py-2.5 px-3">PASS RATE</th>
                  <th className="py-2.5 px-3">PASSED</th>
                  <th className="py-2.5 px-3">FAILED</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {Object.entries(categories).map(([cat, score]: [string, any]) => (
                  <tr key={cat} className="hover:bg-[#1A1A22] transition">
                    <td className="py-2.5 px-3 font-bold text-white">{cat}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      {(score.passRate * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-neutral-300">{score.passCount}</td>
                    <td className="py-2.5 px-3 text-neutral-400">{score.failCount}</td>
                    <td className="py-2.5 px-3">
                      {score.failCount === 0 ? (
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-600 px-2 py-0.5 rounded text-[10px] font-black">
                          PASS
                        </span>
                      ) : (
                        <span className="bg-red-950 text-red-400 border border-red-600 px-2 py-0.5 rounded text-[10px] font-black">
                          {score.failCount} FAILS
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Failure Dossiers (Debugging Queue) */}
        <section className="bg-[#121216] border-3 border-black p-6 shadow-brutal space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase">FAILURE DOSSIERS ({dossiers.length})</h2>
            <span className="text-xs text-neutral-400">Automated Root Cause Classification</span>
          </div>

          {dossiers.length === 0 ? (
            <div className="bg-[#181822] border border-neutral-800 p-8 text-center text-emerald-400 text-xs font-bold">
              ✓ ZERO FAILURES RECORDED. ALL GROUND TRUTH TEST CASES PASSED WITH 100% PRECISION.
            </div>
          ) : (
            <div className="space-y-3">
              {dossiers.map((d: any) => (
                <div
                  key={d.failureId}
                  className="bg-[#1A1010] border-2 border-red-600 p-4 rounded shadow-brutal-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-red-400 uppercase">{d.failureId} • {d.category}</span>
                    <span className="bg-black text-red-400 border border-red-600 text-[10px] font-black px-2 py-0.5 rounded">
                      ROOT CAUSE: {d.rootCause}
                    </span>
                  </div>

                  <p className="text-neutral-200 font-bold">{d.questionOrTest}</p>

                  <div className="grid grid-cols-2 gap-4 text-[11px] text-neutral-400 pt-1">
                    <div>
                      <span className="font-bold text-neutral-500 uppercase block">EXPECTED:</span>
                      <span className="text-emerald-400 font-mono">{d.expected}</span>
                    </div>
                    <div>
                      <span className="font-bold text-neutral-500 uppercase block">ACTUAL:</span>
                      <span className="text-red-400 font-mono">{d.actual}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
