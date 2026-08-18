'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CaseHeader } from '@/components/detective/CaseHeader';
import { DetectiveSidebar } from '@/components/detective/DetectiveSidebar';
import { CaseBreadcrumb } from '@/components/detective/CaseBreadcrumb';
import { StatusStamp } from '@/components/detective/StatusStamp';
import { SourceInspector } from '@/components/detective/SourceInspector';
import { GlobalSearchModal } from '@/components/detective/GlobalSearchModal';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Bug,
  KeyRound,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function SecurityMatrixPage() {
  const params = useParams();
  const caseId = params?.caseId as string;

  const [project, setProject] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<{ code: string; path: string; startLine?: number; endLine?: number } | null>(null);

  useEffect(() => {
    if (!caseId) return;

    async function loadData() {
      try {
        const [projRes, findRes] = await Promise.all([
          fetch(`/api/cases/${caseId}`),
          fetch(`/api/cases/${caseId}/security/findings`),
        ]);
        const pData = await projRes.json();
        const fData = await findRes.json();

        if (pData.success) setProject(pData.project);
        if (fData.success && fData.report) {
          setReport(fData.report);
          if (fData.report.findings?.length > 0) {
            setSelectedFinding(fData.report.findings[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load security dossier:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [caseId]);

  const handleRunScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/security/scan`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
        if (data.report.findings?.length > 0) {
          setSelectedFinding(data.report.findings[0]);
        }
      }
    } catch (err) {
      console.error('Security scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedFinding) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/security/findings/${selectedFinding.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedFinding((prev: any) => ({ ...prev, status }));
        // Refresh findings list
        const refreshed = await fetch(`/api/cases/${caseId}/security/findings`).then((r) => r.json());
        if (refreshed.success) setReport(refreshed.report);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const loadFileSource = async (filePath: string, startLine?: number, endLine?: number) => {
    try {
      const file = project?.files?.find((f: any) => f.path === filePath);
      if (file) {
        const res = await fetch(`/api/cases/${caseId}/files/${file.id}`);
        const data = await res.json();
        if (data.success) {
          setSourcePreview({
            code: data.file.content || '// Content unavailable',
            path: filePath,
            startLine,
            endLine,
          });
        }
      }
    } catch {
      // Ignore preview load error
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-amber-400 font-mono flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent animate-spin" />
        <span className="text-sm font-black tracking-widest animate-pulse">
          // RUNNING STATIC THREAT MATRIX SCAN...
        </span>
      </div>
    );
  }

  const findings = report?.findings || [];
  const summary = report?.summary || { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 };
  const filteredFindings = findings.filter(
    (f: any) => filterSeverity === 'ALL' || f.severity === filterSeverity
  );

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F2EB] font-mono flex flex-col selection:bg-amber-400 selection:text-black">
      <CaseHeader
        caseId={caseId}
        caseNumber={project?.caseNumber || caseId}
        projectName={project?.name || 'Crime Scene'}
        primaryLang={project?.primaryLang || 'TypeScript'}
        totalFiles={project?.totalFiles || 0}
        totalSymbols={project?.symbols?.length || 0}
        status={project?.status || 'READY'}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <CaseBreadcrumb
        caseId={caseId}
        subsystemName="SECURITY MATRIX"
        fileOrSymbolName={selectedFinding?.filePath}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <DetectiveSidebar caseId={caseId} />

        <main className="flex-1 flex flex-col overflow-hidden bg-[#0D0D11]">
          {/* Top Security Banner & Severity Breakdown */}
          <div className="p-6 border-b-3 border-black bg-[#121216] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block">
                  SECURITY DOSSIER // THREAT MATRIX
                </span>
                <h2 className="text-xl font-black text-white uppercase">STATIC SECURITY AUDIT</h2>
                <p className="text-xs text-neutral-400">
                  Deterministic static analysis only. Claims reflect confirmed static indicators rather than runtime exploitability.
                </p>
              </div>

              <button
                onClick={handleRunScan}
                disabled={scanning}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs px-5 py-2.5 border-2 border-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-2"
              >
                <RefreshCw className={clsx('w-3.5 h-3.5', scanning && 'animate-spin')} />
                <span>{scanning ? 'SCANNING...' : 'RE-SCAN REPOSITORY ⚡'}</span>
              </button>
            </div>

            {/* Severity Counters Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="bg-[#1A1010] border-2 border-red-600 p-3 rounded shadow-brutal-sm">
                <span className="text-[9px] font-black text-red-500 uppercase block">CRITICAL</span>
                <span className="text-xl font-black text-white">{summary.criticalCount}</span>
              </div>
              <div className="bg-[#1A1410] border-2 border-orange-500 p-3 rounded shadow-brutal-sm">
                <span className="text-[9px] font-black text-orange-400 uppercase block">HIGH</span>
                <span className="text-xl font-black text-white">{summary.highCount}</span>
              </div>
              <div className="bg-[#1A1A10] border-2 border-yellow-500 p-3 rounded shadow-brutal-sm">
                <span className="text-[9px] font-black text-yellow-400 uppercase block">MEDIUM</span>
                <span className="text-xl font-black text-white">{summary.mediumCount}</span>
              </div>
              <div className="bg-[#101A15] border-2 border-emerald-500 p-3 rounded shadow-brutal-sm">
                <span className="text-[9px] font-black text-emerald-400 uppercase block">LOW</span>
                <span className="text-xl font-black text-white">{summary.lowCount}</span>
              </div>
              <div className="bg-[#14141A] border-2 border-blue-500 p-3 rounded shadow-brutal-sm">
                <span className="text-[9px] font-black text-blue-400 uppercase block">INFO / PLACEHOLDER</span>
                <span className="text-xl font-black text-white">{summary.infoCount}</span>
              </div>
            </div>
          </div>

          {/* Main Security Matrix Two-Column Layout */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Column: Finding Matrix List & Filter */}
            <aside className="w-full lg:w-96 border-b-2 lg:border-b-0 lg:border-r-3 border-black bg-[#121216] p-4 flex flex-col overflow-y-auto space-y-3 shrink-0">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="text-xs font-black text-white uppercase">FINDINGS ({filteredFindings.length})</span>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-black text-amber-300 border border-neutral-700 text-[10px] font-bold px-2 py-1 rounded focus:outline-none"
                >
                  <option value="ALL">ALL SEVERITIES</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                  <option value="INFO">INFO</option>
                </select>
              </div>

              <div className="space-y-2 flex-1">
                {filteredFindings.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-xs">
                    No static security findings matching current filter.
                  </div>
                ) : (
                  filteredFindings.map((finding: any) => {
                    const isSelected = selectedFinding?.id === finding.id;

                    const severityBadgeColors: Record<string, string> = {
                      CRITICAL: 'bg-red-950 text-red-400 border-red-600',
                      HIGH: 'bg-orange-950 text-orange-400 border-orange-600',
                      MEDIUM: 'bg-yellow-950 text-yellow-300 border-yellow-600',
                      LOW: 'bg-emerald-950 text-emerald-300 border-emerald-600',
                      INFO: 'bg-blue-950 text-blue-300 border-blue-600',
                    };

                    return (
                      <button
                        key={finding.id || finding.title}
                        onClick={() => {
                          setSelectedFinding(finding);
                          loadFileSource(finding.filePath, finding.startLine, finding.endLine);
                        }}
                        className={clsx(
                          'w-full text-left p-3 rounded border-2 transition space-y-1.5 shadow-brutal-sm',
                          isSelected
                            ? 'bg-amber-400 text-black border-black font-black'
                            : 'bg-[#1A1A22] text-neutral-300 border-black hover:border-amber-400 hover:text-white'
                        )}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold truncate">{finding.title}</span>
                          <span
                            className={clsx(
                              'text-[9px] px-1.5 py-0.2 rounded border font-mono uppercase font-black shrink-0 ml-1',
                              isSelected ? 'bg-black text-white border-black' : severityBadgeColors[finding.severity]
                            )}
                          >
                            {finding.severity}
                          </span>
                        </div>

                        <div className={clsx('flex items-center justify-between text-[10px]', isSelected ? 'text-neutral-900' : 'text-neutral-500')}>
                          <span className="truncate">{finding.filePath}</span>
                          {finding.cwe && <span>{finding.cwe}</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Right Column: Finding Dossier & Remediation Inspector */}
            <section className="flex-1 p-6 overflow-y-auto space-y-6">
              {selectedFinding ? (
                <div className="space-y-6 max-w-4xl">
                  {/* Finding Header Card */}
                  <div className="bg-[#121216] border-3 border-black p-5 shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="stamp-classified text-[10px]">{selectedFinding.severity}</span>
                        <StatusStamp status={selectedFinding.status || 'OPEN'} size="sm" />
                      </div>
                      <h3 className="text-xl font-black text-white uppercase">{selectedFinding.title}</h3>
                      <p className="text-xs text-neutral-400">
                        {selectedFinding.filePath}:{selectedFinding.startLine || 1} • {selectedFinding.owaspCategory || 'General Security'}
                      </p>
                    </div>

                    {/* Review Status Toggles */}
                    <div className="flex items-center gap-1.5 bg-black border-2 border-neutral-700 p-1 rounded text-xs">
                      <span className="text-[10px] text-neutral-500 font-bold px-1 uppercase">STATUS:</span>
                      {['OPEN', 'REVIEWED', 'FALSE_POSITIVE', 'RESOLVED'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(st)}
                          className={clsx(
                            'px-2 py-1 rounded text-[10px] font-bold transition',
                            selectedFinding.status === st
                              ? 'bg-amber-400 text-black font-black'
                              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                          )}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sanitized Evidence Snippet */}
                  {selectedFinding.evidenceSnippet && (
                    <div className="bg-[#181822] border-2 border-black p-4 rounded shadow-brutal space-y-2">
                      <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
                        <span>REDACTED EVIDENCE CITATION</span>
                        <span>Line {selectedFinding.startLine || 1}</span>
                      </div>
                      <pre className="bg-black border border-neutral-800 p-3 rounded text-xs text-neutral-200 overflow-x-auto font-mono">
                        {selectedFinding.evidenceSnippet}
                      </pre>
                    </div>
                  )}

                  {/* What We Found & Why It Matters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#15151C] border-2 border-black p-5 shadow-brutal-sm space-y-2">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                        WHAT WE FOUND
                      </span>
                      <p className="text-xs text-neutral-200 leading-relaxed">{selectedFinding.description}</p>
                    </div>

                    <div className="bg-[#15151C] border-2 border-black p-5 shadow-brutal-sm space-y-2">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                        WHY IT MATTERS
                      </span>
                      <p className="text-xs text-neutral-200 leading-relaxed">
                        {selectedFinding.remediation?.whyItMatters || 'Potential attack surface.'}
                      </p>
                    </div>
                  </div>

                  {/* Remediation & Validation Steps */}
                  <div className="bg-[#15151C] border-2 border-black p-5 shadow-brutal-sm space-y-3">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                      RECOMMENDED REMEDIATION
                    </span>
                    <p className="text-xs text-neutral-200 leading-relaxed">
                      {selectedFinding.remediation?.recommendedFix || 'Apply strict parameterization and validation.'}
                    </p>

                    {selectedFinding.remediation?.validationSteps && (
                      <div className="pt-2 border-t border-neutral-800 space-y-1.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                          VERIFICATION STEPS:
                        </span>
                        <ul className="list-disc list-inside text-xs text-neutral-300 space-y-1">
                          {selectedFinding.remediation.validationSteps.map((step: string, idx: number) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Embedded Source Inspector Preview if loaded */}
                  {sourcePreview && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">
                        SURROUNDING CODE EVIDENCE
                      </span>
                      <SourceInspector
                        filePath={sourcePreview.path}
                        code={sourcePreview.code}
                        highlightStartLine={sourcePreview.startLine}
                        highlightEndLine={sourcePreview.endLine}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 text-neutral-500">
                  Select a security finding to inspect vulnerability evidence and remediation guidance.
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        caseId={caseId}
        files={project?.files || []}
        symbols={project?.symbols || []}
      />
    </div>
  );
}
