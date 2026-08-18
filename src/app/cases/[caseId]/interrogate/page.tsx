'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { CaseHeader } from '@/components/detective/CaseHeader';
import { DetectiveSidebar } from '@/components/detective/DetectiveSidebar';
import { CaseBreadcrumb } from '@/components/detective/CaseBreadcrumb';
import { StatusStamp } from '@/components/detective/StatusStamp';
import { SourceInspector } from '@/components/detective/SourceInspector';
import { GlobalSearchModal } from '@/components/detective/GlobalSearchModal';
import {
  MessageSquareCode,
  Send,
  Sparkles,
  ShieldCheck,
  FileCode,
  ArrowRight,
  Sliders,
  RotateCcw,
  Footprints,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Cpu,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Compass,
} from 'lucide-react';
import { SarcasmLevel } from '@/lib/persona/types';
import { InterrogationMessage, InterrogationSessionState } from '@/lib/interrogation/types';
import { clsx } from 'clsx';

export default function InterrogationSystemPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const caseId = params?.caseId as string;

  const targetFile = searchParams?.get('file');
  const targetSymbol = searchParams?.get('symbol');
  const initialPrompt = searchParams?.get('prompt') || searchParams?.get('q');

  const [project, setProject] = useState<any>(null);
  const [session, setSession] = useState<InterrogationSessionState | null>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [activeProvider, setActiveProvider] = useState<string>('AUTO');
  const [query, setQuery] = useState(
    initialPrompt ||
      (targetFile ? `Explain file ${targetFile}${targetSymbol ? ' and symbol ' + targetSymbol : ''}` : '')
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inspectSource, setInspectSource] = useState<{
    file: string;
    code: string;
    startLine?: number;
    endLine?: number;
  } | null>(null);

  const [explanationMode, setExplanationMode] = useState<'BEGINNER' | 'INTERMEDIATE' | 'DEEP_DIVE'>('BEGINNER');

  const suggestedQuestions = [
    targetFile ? `What is the primary role of ${targetFile}?` : 'Where does the application actually begin execution?',
    targetSymbol ? `Who calls ${targetSymbol}?` : 'Who calls the authentication and login handlers?',
    'What breaks if we delete the database schema or configuration?',
    'Explain this project like I\'m completely new to coding.',
    'Show me the code evidence.',
    'What should I learn first?',
  ];

  useEffect(() => {
    if (!caseId) return;

    async function loadData() {
      try {
        const [projRes, sessRes, statusRes] = await Promise.all([
          fetch(`/api/cases/${caseId}`),
          fetch(`/api/cases/${caseId}/interrogation/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }),
          fetch(`/api/cases/${caseId}/ai-status`),
        ]);

        const pData = await projRes.json();
        const sData = await sessRes.json();
        const stData = await statusRes.json();

        if (pData.success) setProject(pData.project);
        if (sData.success) setSession(sData.session);
        if (stData.success) setAiStatus(stData);
      } catch (err) {
        console.error('Failed to load interrogation session:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [caseId]);

  const handleSendMessage = async (customText?: string) => {
    const text = customText || query;
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    setQuery('');

    try {
      const res = await fetch(`/api/cases/${caseId}/interrogation/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          providerOverride: activeProvider !== 'AUTO' ? activeProvider : undefined,
          explanationMode,
          context: {
            file: targetFile,
            symbol: targetSymbol,
          },
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSession(data.session);

        const firstCite = data.response?.citations?.[0];
        if (firstCite && firstCite.file) {
          fetchSourceSnippet(firstCite.file, firstCite.startLine, firstCite.endLine);
        }
      }
    } catch (err) {
      console.error('Failed to process message:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchSourceSnippet = async (filePath: string, startLine?: number, endLine?: number) => {
    try {
      const fileRecord = project?.files?.find((f: any) => f.path === filePath);
      if (fileRecord) {
        const res = await fetch(`/api/cases/${caseId}/files/${fileRecord.id}`);
        const data = await res.json();
        if (data.success) {
          setInspectSource({
            file: filePath,
            code: data.file.content || '// Content unavailable in static vault.',
            startLine,
            endLine,
          });
        }
      }
    } catch {
      console.error('Failed to fetch source snippet');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] text-[#171717] font-mono flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-[#3157D5] border-t-transparent animate-spin" />
        <span className="text-sm font-black tracking-widest text-[#171717]">
          // CONNECTING TO AI DETECTIVE REPOSITORY CHANNEL...
        </span>
      </div>
    );
  }

  const messages = session?.messages || [];
  const activeChannelName = aiStatus?.activeProvider?.toUpperCase() || 'GROQ';

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
        subsystemName="ASK THE DETECTIVE"
        fileOrSymbolName={targetFile || targetSymbol || undefined}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <DetectiveSidebar caseId={caseId} />

        {/* Interrogation Workspace */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#F5F1E8]">
          {/* Left Column: AI Diagnostics & Context Clues */}
          <aside className="w-full lg:w-80 border-b-3 lg:border-b-0 lg:border-r-3 border-[#171717] bg-[#FFFFFF] p-4 flex flex-col overflow-y-auto space-y-4 shrink-0">
            {/* DETECTIVE HEADER */}
            <div className="bg-[#FAF8F5] border-2 border-[#171717] p-3.5 shadow-[3px_3px_0px_#171717] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#3157D5] font-black uppercase tracking-widest flex items-center gap-1">
                  🕵️ ASK THE DETECTIVE
                </span>
                <span className="bg-[#8ED8B0] text-[#171717] text-[8px] font-black px-1.5 py-0.5 border border-[#171717]">
                  ● READY
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#4A4A4A] leading-relaxed">
                &quot;I&apos;ve investigated the case. Ask me anything about this repository.&quot;
              </p>
            </div>

            {/* AI UNAVAILABLE FALLBACK */}
            {aiStatus && aiStatus.available === false && (
              <div className="bg-[#FFF0F0] border-2 border-[#171717] p-3.5 shadow-[3px_3px_0px_#171717] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#D9381E]">
                  🔴 DETECTIVE UNAVAILABLE
                </div>
                <p className="text-[11px] font-mono text-[#171717]">
                  Detective AI is currently unavailable. The repository evidence is still here, so you can continue exploring.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => router.push(`/cases/${caseId}/learn`)}
                    className="bg-[#3157D5] text-white text-[9px] font-black px-2 py-1 border border-[#171717] shadow-[1px_1px_0px_#171717]"
                  >
                    [ CONTINUE LEARNING ]
                  </button>
                  <button
                    onClick={() => router.push(`/cases/${caseId}/evidence`)}
                    className="bg-white text-[#171717] text-[9px] font-black px-2 py-1 border border-[#171717]"
                  >
                    [ VIEW FILES ]
                  </button>
                </div>
              </div>
            )}

            {/* Depth Selector */}
            <div className="space-y-1">
              <span className="text-[9px] text-[#171717] font-black uppercase block">EXPLANATION DEPTH:</span>
              <div className="grid grid-cols-3 gap-1 text-[9px]">
                {[
                  { id: 'BEGINNER', label: '🌱 SIMPLE' },
                  { id: 'INTERMEDIATE', label: '⚙️ TECHNICAL' },
                  { id: 'DEEP_DIVE', label: '🧠 DEEP DIVE' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setExplanationMode(mode.id as any)}
                    className={clsx(
                      'py-1.5 font-black border border-[#171717] transition text-center',
                      explanationMode === mode.id
                        ? 'bg-[#F27661] text-white shadow-[1px_1px_0px_#171717]'
                        : 'bg-white text-[#171717] hover:bg-[#F5F1E8]'
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Active Context Card */}
            {(targetFile || targetSymbol) && (
              <div className="bg-[#FFF8E7] border-2 border-[#171717] p-3 shadow-[2px_2px_0px_#171717] space-y-1">
                <span className="text-[9px] text-[#F27661] font-black uppercase tracking-widest block">
                  📌 ACTIVE INTERROGATION CONTEXT
                </span>
                {targetFile && <code className="text-xs font-black text-[#171717] block truncate">{targetFile}</code>}
                {targetSymbol && <span className="text-[10px] text-[#3157D5] font-bold block">{targetSymbol}()</span>}
              </div>
            )}
          </aside>

          {/* Center Column: Interactive Conversational Terminal */}
          <section className="flex-1 flex flex-col overflow-hidden bg-[#FAF8F5]">
            {/* Messages Feed */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="py-12 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-12 h-12 bg-[#3157D5] text-white mx-auto flex items-center justify-center border-2 border-[#171717] shadow-[3px_3px_0px_#171717]">
                    <MessageSquareCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-[#171717]">ASK THE DETECTIVE</h3>
                    <p className="text-xs text-[#4A4A4A] mt-1 font-sans">
                      Ask anything about this codebase. Answers are grounded in static AST evidence.
                    </p>
                  </div>

                  {/* Conversation Starter Chips */}
                  <div className="space-y-2 pt-2 text-left">
                    <span className="text-[10px] font-black text-zinc-500 uppercase block tracking-wider">
                      SUGGESTED QUESTIONS:
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {suggestedQuestions.map((qText, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(qText)}
                          className="bg-white hover:bg-[#F5F1E8] border-2 border-[#171717] p-2 text-left text-xs font-mono font-bold text-[#171717] shadow-[2px_2px_0px_#171717] transition"
                        >
                          → {qText}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg: InterrogationMessage, index: number) => {
                  const isUser = msg.role === 'user';

                  return (
                    <div
                      key={msg.id || index}
                      className={clsx(
                        'flex flex-col space-y-2 p-4 border-3 shadow-[4px_4px_0px_#171717]',
                        isUser
                          ? 'bg-[#171717] text-white border-[#171717] ml-6 md:ml-12'
                          : 'bg-white text-[#171717] border-[#171717] mr-6 md:mr-12'
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] font-black uppercase border-b border-current/20 pb-1">
                        <span className={clsx(isUser ? 'text-[#8ED8B0]' : 'text-[#3157D5]')}>
                          {isUser ? '🕵️ REPOSITORY INVESTIGATOR' : '🤖 CASE FILE DETECTIVE'}
                        </span>
                        <span className="opacity-60">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>

                      {/* Message Body */}
                      <div className="text-xs font-mono leading-relaxed whitespace-pre-wrap">{msg.content}</div>

                      {/* Checkpoint Question Choices */}
                      {!isUser && msg.checkpointQuestion?.options && (
                        <div className="mt-3 p-3 bg-[#FAF8F5] border-2 border-[#171717] space-y-2">
                          <span className="text-[10px] font-black text-[#3157D5] uppercase block">
                            ❓ {msg.checkpointQuestion.prompt}
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {msg.checkpointQuestion.options.map((opt, optIdx) => (
                              <button
                                key={optIdx}
                                onClick={() => handleSendMessage(opt)}
                                className="bg-white hover:bg-[#F5F1E8] border border-[#171717] p-2 text-left text-xs font-mono font-bold text-[#171717] shadow-[1px_1px_0px_#171717] transition"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI ACTIONS AFTER ANSWER */}
                      {!isUser && (
                        <div className="pt-2 flex flex-wrap gap-1.5 border-t border-[#171717]/20">
                          <button
                            onClick={() =>
                              router.push(`/cases/${caseId}/learn${targetFile ? '?file=' + encodeURIComponent(targetFile) : ''}`)
                            }
                            className="bg-[#3157D5] hover:bg-[#2545B8] text-white text-[9px] font-black px-2.5 py-1 border border-[#171717] flex items-center gap-1 shadow-[1px_1px_0px_#171717]"
                          >
                            <BookOpen className="w-3 h-3" /> [ 🎓 TEACH ME THIS ]
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/cases/${caseId}/evidence${targetFile ? '?file=' + encodeURIComponent(targetFile) : ''}`)
                            }
                            className="bg-white hover:bg-[#F5F1E8] text-[#171717] text-[9px] font-black px-2.5 py-1 border border-[#171717] flex items-center gap-1"
                          >
                            <FileCode className="w-3 h-3" /> [ 💻 SHOW SOURCE ]
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/cases/${caseId}/investigate${targetFile ? '?file=' + encodeURIComponent(targetFile) : ''}`)
                            }
                            className="bg-[#F27661] text-white text-[9px] font-black px-2.5 py-1 border border-[#171717] flex items-center gap-1 shadow-[1px_1px_0px_#171717]"
                          >
                            <Compass className="w-3 h-3" /> [ 🕵️ INVESTIGATE ]
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <div className="bg-white border-t-3 border-[#171717] p-3 md:p-4 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about the code..."
                  className="flex-1 bg-[#FAF8F5] border-2 border-[#171717] px-3 py-2 text-xs font-mono text-[#171717] placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#3157D5]"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={submitting || !query.trim()}
                  className="bg-[#3157D5] hover:bg-[#2545B8] text-white px-5 py-2 text-xs font-black border-2 border-[#171717] shadow-[2px_2px_0px_#171717] disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> [ SEND ]
                </button>
              </div>
            </div>
          </section>

          {/* Right Column: Source Inspector Preview Drawer */}
          {inspectSource && (
            <aside className="w-full lg:w-96 border-t-3 lg:border-t-0 lg:border-l-3 border-[#171717] bg-[#FFFFFF] p-4 flex flex-col overflow-y-auto space-y-3 shrink-0">
              <div className="flex items-center justify-between border-b-2 border-[#171717] pb-2">
                <span className="text-[10px] text-[#3157D5] font-black uppercase tracking-widest flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5" /> CITATION SOURCE EVIDENCE
                </span>
                <button
                  onClick={() => setInspectSource(null)}
                  className="text-xs font-bold text-zinc-500 hover:text-[#171717]"
                >
                  [ CLOSE ]
                </button>
              </div>
              <SourceInspector
                filePath={inspectSource.file}
                code={inspectSource.code}
                highlightStartLine={inspectSource.startLine}
                highlightEndLine={inspectSource.endLine}
              />
            </aside>
          )}
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
