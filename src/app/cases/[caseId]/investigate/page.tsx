'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CaseHeader } from '@/components/detective/CaseHeader';
import { DetectiveSidebar } from '@/components/detective/DetectiveSidebar';
import { CaseBreadcrumb } from '@/components/detective/CaseBreadcrumb';
import { InvestigationTimeline, TimelineStepItem } from '@/components/detective/InvestigationTimeline';
import { GlobalSearchModal } from '@/components/detective/GlobalSearchModal';
import { Crosshair, Play, HelpCircle, Layers, ShieldCheck, Database, Zap, Cpu, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

export default function InvestigationRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const caseId = params?.caseId as string;
  const initialType = searchParams?.get('type') || 'STARTUP_FLOW';
  const targetSymbol = searchParams?.get('symbol') || searchParams?.get('file') || undefined;

  const [project, setProject] = useState<any>(null);
  const [activeType, setActiveType] = useState<string>(initialType);
  const [investigation, setInvestigation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Beginner-friendly Plain English Questions
  const beginnerQuestions = [
    { type: 'STARTUP_FLOW', icon: Play, question: '🚪 HOW DOES THIS PROJECT START?', desc: 'Follow the application from startup and initialization.' },
    { type: 'CALL_FLOW', icon: Cpu, question: '🗣️ WHO TALKS TO WHOM?', desc: 'Follow function and component call graphs across execution.' },
    { type: 'DATABASE_FLOW', icon: Database, question: '📦 WHERE DOES THE DATA GO?', desc: 'Follow user data through services, ORM, and database storage.' },
    { type: 'API_FLOW', icon: Zap, question: '🌐 HOW DOES A REQUEST TRAVEL?', desc: 'Follow an incoming HTTP API request from entry to response.' },
    { type: 'AUTHENTICATION_FLOW', icon: ShieldCheck, question: '🔐 HOW DOES SECURITY WORK?', desc: 'Inspect token verification, auth boundaries, and session state.' },
    { type: 'BLAST_RADIUS', icon: Crosshair, question: '💥 WHAT BREAKS IF I CHANGE THIS?', desc: 'See what downstream components depend on this module.' },
    { type: 'PROJECT_STORY', icon: Layers, question: '🕵️ TELL ME THE WHOLE STORY', desc: 'Reconstruct the entire chronological execution path of the codebase.' },
  ];

  const advancedTypes = [
    { type: 'STARTUP_FLOW', title: 'STARTUP_FLOW', desc: 'AST entry point graph reconstruction' },
    { type: 'ARCHITECTURE', title: 'ARCHITECTURE', desc: 'Subsystem cluster boundary graph' },
    { type: 'CALL_FLOW', title: 'CALL_FLOW', desc: 'Caller / callee AST edge multigraph' },
    { type: 'API_FLOW', title: 'API_FLOW', desc: 'HTTP route handler dispatch table' },
    { type: 'DATABASE_FLOW', title: 'DATABASE_FLOW', desc: 'SQL / ORM query mutation pipeline' },
    { type: 'AUTHENTICATION_FLOW', title: 'AUTHENTICATION_FLOW', desc: 'Security matrix token verification' },
    { type: 'BLAST_RADIUS', title: 'BLAST_RADIUS', desc: 'Reverse dependency impact matrix' },
    { type: 'PROJECT_STORY', title: 'PROJECT_STORY', desc: 'End-to-end grounded narrative synthesis' },
  ];

  useEffect(() => {
    if (!caseId) return;

    async function loadInitial() {
      try {
        const res = await fetch(`/api/cases/${caseId}`);
        const data = await res.json();
        if (data.success) {
          setProject(data.project);
          runInvestigation(activeType, targetSymbol);
        }
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, [caseId]);

  const runInvestigation = async (type: string, target?: string) => {
    setActiveType(type);
    setRunning(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, targetEntity: target }),
      });
      const data = await res.json();
      if (data.success && data.investigation) {
        setInvestigation(data.investigation);
      }
    } catch (err) {
      console.error('Failed to run investigation:', err);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] text-[#171717] font-mono flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-[#3157D5] border-t-transparent animate-spin" />
        <span className="text-sm font-black tracking-widest text-[#171717]">
          // ENTERING INVESTIGATION ROOM...
        </span>
      </div>
    );
  }

  // Parse steps robustly from investigation object
  const rawSteps =
    investigation?.steps ||
    (investigation?.stepsJson ? JSON.parse(investigation.stepsJson) : []);

  const steps: TimelineStepItem[] = rawSteps.map((s: any, idx: number) => ({
    order: s.order || idx + 1,
    sourceEntity: s.sourceEntity || { name: 'Core Engine' },
    targetEntity: s.targetEntity || { name: 'Subsystem' },
    relationship: s.relationship || 'EXECUTES',
    confidence: s.confidence || 'CONFIRMED',
    description: s.description || '',
    evidence: s.evidence || {
      file: 'Static AST Evidence',
      reason: 'Corroborated by call graph and imports',
    },
  }));

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#171717] font-mono flex flex-col">
      <CaseHeader
        caseId={caseId}
        caseNumber={project?.caseNumber || caseId}
        projectName={project?.name || 'Crime Scene'}
        primaryLang={project?.primaryLang || 'TypeScript'}
        totalFiles={project?.totalFiles || project?.files?.length || 0}
        totalSymbols={project?.symbols?.length || 0}
        status={project?.status || 'READY'}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <CaseBreadcrumb
        caseId={caseId}
        subsystemName="INVESTIGATION ROOM"
        fileOrSymbolName={targetSymbol || activeType}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <DetectiveSidebar caseId={caseId} />

        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#F5F1E8]">
          {/* Left Column: Beginner Plain-English Questions */}
          <aside className="w-full lg:w-96 border-b-3 lg:border-b-0 lg:border-r-3 border-[#171717] bg-[#FFFFFF] p-4 flex flex-col overflow-y-auto space-y-4 shrink-0">
            <div className="border-b-2 border-[#171717] pb-3 space-y-1">
              <span className="text-[10px] text-[#3157D5] font-black uppercase tracking-widest block">
                GUIDED DISCOVERY
              </span>
              <h2 className="text-sm font-black text-[#171717] uppercase">WHAT DO YOU WANT TO KNOW?</h2>
            </div>

            {/* Beginner Questions List */}
            <div className="space-y-2">
              {beginnerQuestions.map((q) => {
                const isSelected = activeType === q.type;
                const IconComponent = q.icon;

                return (
                  <button
                    key={q.type}
                    onClick={() => runInvestigation(q.type, targetSymbol)}
                    disabled={running}
                    className={clsx(
                      'w-full text-left p-3.5 border-2 transition space-y-1 shadow-[3px_3px_0px_#171717] disabled:opacity-60',
                      isSelected
                        ? 'bg-[#F4C542] text-[#171717] border-[#171717] font-black'
                        : 'bg-[#FFFFFF] text-[#171717] border-[#171717] hover:bg-[#F5F1E8]'
                    )}
                  >
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="flex items-center gap-1.5">{q.question}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#3157D5] shrink-0" />
                    </div>
                    <p className="text-[10px] text-[#4A4A4A] font-sans font-medium leading-tight">
                      {q.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Advanced Protocol Toggle */}
            <div className="pt-2 border-t-2 border-[#171717]">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-left text-[10px] font-black text-[#3157D5] hover:underline uppercase"
              >
                {showAdvanced ? '[- HIDE ADVANCED PROTOCOLS]' : '[+ SHOW ADVANCED TECHNICAL PROTOCOLS]'}
              </button>

              {showAdvanced && (
                <div className="mt-2 space-y-1 bg-[#FAF8F5] p-2 border border-[#171717] text-[10px]">
                  {advancedTypes.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => runInvestigation(item.type, targetSymbol)}
                      className="w-full text-left p-1 font-mono hover:bg-[#3157D5] hover:text-white block"
                    >
                      • {item.title} ({item.desc})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Right Column: Active Timeline Rendering */}
          <section className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
            {running ? (
              <div className="text-center py-24 space-y-3">
                <div className="w-8 h-8 border-3 border-[#3157D5] border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-black tracking-widest uppercase text-[#171717]">
                  TRAVERSING AST MULTIGRAPH & GENERATING INVESTIGATION TIMELINE...
                </p>
              </div>
            ) : investigation ? (
              <div className="space-y-6 max-w-4xl">
                <InvestigationTimeline
                  caseId={caseId}
                  title={investigation.title}
                  question={investigation.question}
                  steps={steps}
                  confidence={investigation.confidence}
                />
              </div>
            ) : (
              <div className="text-center py-20 text-[#4A4A4A]">
                Select a question on the left to begin guided investigation.
              </div>
            )}
          </section>
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
