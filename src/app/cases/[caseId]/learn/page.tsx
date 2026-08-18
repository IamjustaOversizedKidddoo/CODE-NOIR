'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CaseHeader } from '@/components/detective/CaseHeader';
import { DetectiveSidebar } from '@/components/detective/DetectiveSidebar';
import { StatusStamp } from '@/components/detective/StatusStamp';
import { GlobalSearchModal } from '@/components/detective/GlobalSearchModal';
import { CaseBreadcrumb } from '@/components/detective/CaseBreadcrumb';
import {
  GraduationCap,
  ChevronRight,
  ChevronDown,
  FileCode,
  Lightbulb,
  Sparkles,
  ArrowRight,
  Zap,
  HelpCircle,
  Eye,
  X,
  Compass,
  ListOrdered,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function CyberDetectiveLearningRoomPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.caseId as string;

  const [project, setProject] = useState<any>(null);
  const [learningPath, setLearningPath] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  // Prompt 08 Teaching Engine Controls
  const [explanationMode, setExplanationMode] = useState<'BEGINNER' | 'INTERMEDIATE' | 'DEEP_DIVE'>('BEGINNER');
  const [showIDontGetIt, setShowIDontGetIt] = useState(false);
  const [showExampleMode, setShowExampleMode] = useState(false);
  const [showLineByLine, setShowLineByLine] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  const [showFullFileModal, setShowFullFileModal] = useState(false);

  // Interactive Quiz & Prediction State
  const [selectedQuizOption, setSelectedQuizOption] = useState<string>('');
  const [predictionMade, setPredictionMade] = useState<boolean>(false);

  useEffect(() => {
    if (!caseId) return;

    async function loadData() {
      try {
        const [projRes, pathRes] = await Promise.all([
          fetch(`/api/cases/${caseId}`),
          fetch(`/api/cases/${caseId}/learning-path`),
        ]);
        const pData = await projRes.json();
        const lData = await pathRes.json();

        if (pData.success) {
          setProject(pData.case || pData.project);
        }
        if (lData.success && lData.learningPath) {
          setLearningPath(lData.learningPath);
          const firstLesson = lData.learningPath.modules?.[0]?.lessons?.[0];
          if (firstLesson) setSelectedLesson(firstLesson);
        }
      } catch (err) {
        console.error('Failed to load learning room:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [caseId]);

  const handleSelectLesson = (lesson: any) => {
    setSelectedLesson(lesson);
    setUserAnswer('');
    setEvaluation(null);
    setSelectedQuizOption('');
    setShowIDontGetIt(false);
    setShowExampleMode(false);
    setShowLineByLine(false);
    setPredictionMade(false);
    setShowFullFileModal(false);
  };

  const handleSubmitAnswer = async (overrideAnswer?: string) => {
    const finalAnswer = overrideAnswer || selectedQuizOption || userAnswer;
    if (!selectedLesson || !finalAnswer.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(
        `/api/cases/${caseId}/learning-path/${learningPath.id}/lessons/${selectedLesson.id}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: finalAnswer }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setEvaluation(data.evaluation);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!selectedLesson) return;
    try {
      const res = await fetch(
        `/api/cases/${caseId}/learning-path/${learningPath.id}/lessons/${selectedLesson.id}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await res.json();
      if (data.success && data.progress) {
        setProgress(data.progress);

        const allLessons = learningPath.modules.flatMap((m: any) => m.lessons);
        const currentIndex = allLessons.findIndex((l: any) => l.id === selectedLesson.id);
        if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
          handleSelectLesson(allLessons[currentIndex + 1]);
        }
      }
    } catch (err) {
      console.error('Failed to complete lesson:', err);
    }
  };

  const handleFollowCode = () => {
    const allLessons = learningPath?.modules?.flatMap((m: any) => m.lessons) || [];
    const currentIndex = allLessons.findIndex((l: any) => l.id === selectedLesson?.id);
    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      handleSelectLesson(allLessons[currentIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] text-[#171717] font-mono flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-[#3157D5] border-t-transparent animate-spin" />
        <span className="text-sm font-black tracking-widest text-[#171717]">
          // INITIALIZING GUIDED LEARNING ROOM 2.0...
        </span>
      </div>
    );
  }

  const orientation = learningPath?.orientation || { summary: '', totalFiles: 0, hierarchicalClusters: [] };

  const completedCount = progress?.completedLessons?.length || 0;
  const totalLessons = learningPath?.modules?.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0) || 10;
  const caseProgressPercent = Math.min(100, Math.round((completedCount / totalLessons) * 100));

  const isCaseClosed = completedCount >= totalLessons && totalLessons > 0;

  const currentSnippet = selectedLesson?.evidence?.[0]?.snippet || '';
  const snippetLines = currentSnippet.split('\n');

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#171717] font-mono flex flex-col">
      <CaseHeader
        caseId={caseId}
        caseNumber={project?.caseNumber || caseId}
        projectName={project?.name || 'Universal Codebase'}
        primaryLang={project?.primaryLang || 'TypeScript'}
        totalFiles={project?.totalFiles || orientation.totalFiles || 0}
        totalSymbols={project?.totalSymbols || 0}
        status={project?.status || 'READY'}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <CaseBreadcrumb
        caseId={caseId}
        subsystemName={selectedLesson?.type || 'Core Subsystem'}
        fileOrSymbolName={selectedLesson?.evidence?.[0]?.file}
        lessonTitle={selectedLesson?.title}
        onNextClue={handleCompleteLesson}
        onAskAI={() => {
          const file = selectedLesson?.evidence?.[0]?.file || '';
          router.push(`/cases/${caseId}/interrogate?file=${encodeURIComponent(file)}&q=${encodeURIComponent('Explain ' + file)}`);
        }}
      />

      {/* Toolbar & Global Metrics */}
      <div className="bg-[#171717] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[#8ED8B0] font-black tracking-wider uppercase flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-[#F4C542]" />
            TEACHING ROOM // MODE: {explanationMode}
          </span>
          <div className="h-3 w-px bg-zinc-700" />
          <span className="text-zinc-300">
            PROGRESS: <strong className="text-white">{completedCount}</strong> / {totalLessons} LESSONS ({caseProgressPercent}%)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Depth Selector Pills */}
          <div className="flex bg-zinc-800 p-0.5 border border-zinc-700">
            {['BEGINNER', 'INTERMEDIATE', 'DEEP_DIVE'].map((mode) => (
              <button
                key={mode}
                onClick={() => setExplanationMode(mode as any)}
                className={clsx(
                  'px-2.5 py-0.5 text-[10px] font-black transition',
                  explanationMode === mode
                    ? 'bg-[#3157D5] text-white'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                {mode === 'BEGINNER' ? '🟢 BEGINNER' : mode === 'INTERMEDIATE' ? '🟡 MID' : '🟣 DEEP'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNotebook(!showNotebook)}
            className="bg-[#F4C542] text-[#171717] px-3 py-1 text-[11px] font-black border border-[#F4C542] hover:bg-[#e0b236] transition flex items-center gap-1"
          >
            🧠 NOTEBOOK ({learningPath?.conceptNotebook?.length || 0})
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <DetectiveSidebar caseId={caseId} />

        {/* Universal Repository Workspace */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#F5F1E8]">
          {/* Left Column: Progressive Subsystem Modules List */}
          <aside className="w-full lg:w-96 border-b-3 lg:border-b-0 lg:border-r-3 border-[#171717] bg-[#FFFFFF] p-4 flex flex-col overflow-y-auto space-y-4 shrink-0">
            <div className="bg-[#F5F1E8] border-2 border-[#171717] p-3.5 shadow-[3px_3px_0px_#171717] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#3157D5] font-black uppercase tracking-widest">
                  CURRICULUM MODULES
                </span>
                <span className="bg-[#171717] text-white text-[9px] px-1.5 py-0.5 font-bold">
                  {learningPath?.modules?.length || 0} MODULES
                </span>
              </div>
              <p className="text-xs text-[#171717] leading-relaxed">{orientation.summary}</p>
            </div>

            <div className="space-y-3">
              {learningPath?.modules?.map((mod: any, idx: number) => (
                <div key={mod.id || idx} className="bg-[#FAF8F5] border-2 border-[#171717] p-3 space-y-2 shadow-[2px_2px_0px_#171717]">
                  <div className="flex items-center justify-between font-black text-xs">
                    <span>MODULE {idx + 1}: {mod.title}</span>
                  </div>
                  <div className="space-y-1 pl-2 border-l-2 border-[#171717]">
                    {mod.lessons?.map((l: any) => {
                      const isSelected = selectedLesson?.id === l.id;
                      const isDone = progress?.completedLessons?.includes(l.id);

                      return (
                        <button
                          key={l.id}
                          onClick={() => handleSelectLesson(l)}
                          className={clsx(
                            'w-full text-left p-2 rounded-none text-xs transition border-2 flex items-center justify-between shadow-[2px_2px_0px_#171717]',
                            isSelected
                              ? 'bg-[#F4C542] text-[#171717] border-[#171717] font-black'
                              : isDone
                              ? 'bg-[#EAF8F1] text-[#171717] border-[#8ED8B0]'
                              : 'bg-white text-[#171717] border-[#171717] hover:bg-[#F5F1E8]'
                          )}
                        >
                          <span className="truncate">{l.title}</span>
                          <span className="text-[10px] font-mono shrink-0 ml-1 font-bold">
                            {isDone ? '✓ DONE' : `L${l.level}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Right Workspace: Code-First Lesson Card */}
          <section className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
            {isCaseClosed ? (
              <div className="bg-white border-3 border-[#171717] p-8 shadow-[8px_8px_0px_#171717] max-w-4xl space-y-6 text-center">
                <div className="stamp-classified text-sm bg-[#8ED8B0] text-[#171717] border-[#8ED8B0] inline-block mb-2">
                  🕵️ CASE CLOSED // INVESTIGATION COMPLETE
                </div>
                <h2 className="text-3xl font-black text-[#171717] uppercase">
                  Primary Architecture Mastered!
                </h2>
                <p className="text-sm text-[#4A4A4A] max-w-2xl mx-auto">
                  You have completed the core learning path for <strong>{project?.name}</strong>.
                </p>

                <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
                  <Link
                    href={`/cases/${caseId}/interrogate`}
                    className="bg-[#3157D5] hover:bg-[#2545B8] text-white font-black text-xs px-6 py-3 border-2 border-[#171717] shadow-[4px_4px_0px_#171717] transition"
                  >
                    [ ASK THE DETECTIVE ⚡ ]
                  </Link>
                </div>
              </div>
            ) : selectedLesson ? (
              <div className="max-w-4xl space-y-6">
                {/* 1. 🕵️ CASE CLUE Header */}
                <div className="bg-white border-3 border-[#171717] p-5 shadow-[6px_6px_0px_#171717] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="stamp-classified text-[10px] bg-[#3157D5] text-white border-[#3157D5]">
                        LESSON L0{selectedLesson.level}
                      </span>
                      <span className="text-xs text-[#3157D5] font-black uppercase">
                        {selectedLesson.type}
                      </span>
                    </div>
                    <StatusStamp status="UNDER_INVESTIGATION" size="sm" />
                  </div>
                  <h2 className="text-2xl font-black text-[#171717] uppercase">
                    {selectedLesson.title}
                  </h2>
                  <p className="text-xs text-[#F27661] font-bold">
                    {selectedLesson.content?.caseClue || `🕵️ CASE CLUE: ${selectedLesson.objective}`}
                  </p>
                </div>

                {/* PART 11 — PREDICT BEFORE EXPLAINING */}
                {!predictionMade && (
                  <div className="bg-[#FFF9E6] border-3 border-[#F4C542] p-4 shadow-[4px_4px_0px_#171717] space-y-2">
                    <span className="text-[10px] font-black text-[#3157D5] uppercase tracking-wider block">
                      🎯 ACTIVE LEARNING // PREDICT BEFORE READING
                    </span>
                    <p className="text-xs font-bold text-[#171717]">
                      Based on the objective &quot;{selectedLesson.title}&quot;, what do you predict this code section does first?
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => setPredictionMade(true)}
                        className="bg-white hover:bg-[#F5F1E8] border-2 border-[#171717] px-3 py-1.5 text-xs font-bold text-[#171717] shadow-[2px_2px_0px_#171717]"
                      >
                        A) Validates input & checks permissions
                      </button>
                      <button
                        onClick={() => setPredictionMade(true)}
                        className="bg-white hover:bg-[#F5F1E8] border-2 border-[#171717] px-3 py-1.5 text-xs font-bold text-[#171717] shadow-[2px_2px_0px_#171717]"
                      >
                        B) Executes core database query or call
                      </button>
                      <button
                        onClick={() => setPredictionMade(true)}
                        className="bg-[#3157D5] text-white border-2 border-[#171717] px-3 py-1.5 text-xs font-black shadow-[2px_2px_0px_#171717]"
                      >
                        [ REVEAL EVIDENCE 🔍 ]
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. 💻 THE CODE (Representative 5–25 Line Slice) */}
                {selectedLesson.evidence && selectedLesson.evidence.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-[#171717] font-black uppercase tracking-widest">
                        💻 THE CODE (REPRESENTATIVE 5–25 LINE SLICE)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowLineByLine(!showLineByLine)}
                          className={clsx(
                            'text-[10px] font-black px-2 py-0.5 border border-[#171717] flex items-center gap-1 transition',
                            showLineByLine ? 'bg-[#3157D5] text-white' : 'bg-white text-[#171717] hover:bg-[#F5F1E8]'
                          )}
                        >
                          <ListOrdered className="w-3 h-3" />
                          <span>[ {showLineByLine ? 'NORMAL VIEW' : 'EXPLAIN LINE BY LINE'} ]</span>
                        </button>
                        <button
                          onClick={() => setShowFullFileModal(true)}
                          className="bg-[#F5F1E8] hover:bg-[#EAE4D8] text-[#171717] text-[10px] font-black px-2 py-0.5 border border-[#171717] flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>[ VIEW FULL FILE ]</span>
                        </button>
                      </div>
                    </div>

                    {/* PART 10 — LINE BY LINE EXPLANATION VIEW */}
                    {showLineByLine ? (
                      <div className="bg-[#171717] border-3 border-[#171717] p-4 shadow-[6px_6px_0px_#171717] space-y-2 text-xs font-mono">
                        {snippetLines.map((line: string, i: number) => {
                          const lineNum = (selectedLesson.evidence[0].startLine || 1) + i;
                          return (
                            <div key={i} className="flex items-start gap-3 border-b border-zinc-800 pb-1.5">
                              <span className="text-zinc-500 text-[10px] select-none shrink-0 w-8 text-right font-bold">
                                L{lineNum}
                              </span>
                              <div className="space-y-0.5 flex-1">
                                <code className="text-zinc-200 block">{line}</code>
                                <span className="text-[10px] text-[#8ED8B0] font-sans block">
                                  ↳ {line.includes('if') ? 'Check condition / validation check' : line.includes('await') ? 'Wait for async operation completion' : line.includes('return') ? 'Exit & return execution result' : 'Execute statement'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-[#171717] border-3 border-[#171717] p-4 shadow-[6px_6px_0px_#171717] text-xs font-mono text-zinc-200 overflow-x-auto space-y-3">
                        <pre>{selectedLesson.evidence[0].snippet}</pre>
                        <div className="flex items-center gap-3 pt-2 border-t border-zinc-700 flex-wrap">
                          <button
                            onClick={handleFollowCode}
                            className="bg-[#8ED8B0] hover:bg-[#7BC69E] text-[#171717] text-[10px] font-black px-3 py-1 border border-zinc-500 transition flex items-center gap-1"
                          >
                            <span>[ FOLLOW THIS CODE ➡️ ]</span>
                          </button>
                          <Link
                            href={`/cases/${caseId}/interrogate?file=${encodeURIComponent(selectedLesson.evidence[0].file)}&q=${encodeURIComponent('Explain ' + selectedLesson.evidence[0].file)}`}
                            className="bg-[#F4C542] hover:bg-[#e0b236] text-[#171717] text-[10px] font-black px-3 py-1 border border-zinc-500 transition"
                          >
                            [ 🤖 ASK THE DETECTIVE ]
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. 🧠 WHAT'S HAPPENING? (Depth & Helper Toggles) */}
                <div className="bg-white border-3 border-[#171717] p-5 shadow-[6px_6px_0px_#171717] space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-[#171717] pb-2 flex-wrap gap-2">
                    <span className="text-xs font-black text-[#3157D5] uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-[#F4C542]" />
                      🧠 WHAT&apos;S HAPPENING? ({explanationMode})
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowIDontGetIt(!showIDontGetIt)}
                        className={clsx(
                          'px-2.5 py-1 text-[10px] font-black border border-[#171717] transition',
                          showIDontGetIt ? 'bg-[#F27661] text-white' : 'bg-[#FFF9E6] text-[#171717] hover:bg-[#F4C542]'
                        )}
                      >
                        ❓ I DON&apos;T GET IT
                      </button>
                      <button
                        onClick={() => setShowExampleMode(!showExampleMode)}
                        className={clsx(
                          'px-2.5 py-1 text-[10px] font-black border border-[#171717] transition',
                          showExampleMode ? 'bg-[#3157D5] text-white' : 'bg-[#FAF8F5] text-[#171717] hover:bg-[#FAF8F5]'
                        )}
                      >
                        💡 SHOW ME AN EXAMPLE
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#171717] leading-relaxed font-sans">
                    {explanationMode === 'BEGINNER'
                      ? selectedLesson.content?.simpleExplanation
                      : explanationMode === 'INTERMEDIATE'
                      ? `${selectedLesson.content?.simpleExplanation} Technical edge context: ${selectedLesson.content?.technicalExplanation}`
                      : selectedLesson.content?.technicalExplanation}
                  </p>

                  {/* ❓ ELI5 "I DON'T GET IT" Box */}
                  {showIDontGetIt && (
                    <div className="bg-[#FFF4F2] border-2 border-[#F27661] p-3 text-xs text-[#171717] font-sans space-y-1">
                      <strong className="font-mono text-[10px] text-[#F27661] uppercase block font-black">
                        💡 SIMPLIFIED ELI5 EXPLANATION:
                      </strong>
                      <p>
                        Basically: this function checks whether the person trying to log in is allowed in. If the user doesn&apos;t exist, it stops immediately. Otherwise, it compares their password.
                      </p>
                    </div>
                  )}

                  {/* 💡 REAL-WORLD EXAMPLE / ANALOGY Box */}
                  {showExampleMode && (
                    <div className="bg-[#FFF9E6] border-2 border-[#F4C542] p-3 text-xs text-[#171717] font-sans space-y-1">
                      <strong className="font-mono text-[10px] text-[#3157D5] uppercase block font-black">
                        🛡️ REAL-WORLD SECURITY GUARD ANALOGY:
                      </strong>
                      <p>
                        Imagine this function as an airport security guard. Someone arrives at the gate. The guard checks their ID against the flight manifest. If their name matches, they are allowed onto the plane.
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. 📚 NEW CONCEPT CARD */}
                {selectedLesson.content?.conceptCard && (
                  <div className="bg-[#FFF9E6] border-3 border-[#171717] p-5 shadow-[6px_6px_0px_#171717] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#171717] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#F4C542]" />
                        📚 NEW CONCEPT: {selectedLesson.content.conceptCard.name}
                      </span>
                      <span className="bg-[#F4C542] text-[#171717] text-[10px] font-black px-2 py-0.5 border border-[#171717]">
                        {selectedLesson.content.conceptCard.category}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-[#171717]">
                      <p><strong>WHAT IT IS:</strong> {selectedLesson.content.conceptCard.whatItIs}</p>
                      <p><strong>WHY IT EXISTS:</strong> {selectedLesson.content.conceptCard.whyExists}</p>
                      <p className="text-[#3157D5] font-bold">
                        <strong>WHAT IT&apos;S DOING HERE:</strong> {selectedLesson.content.conceptCard.whatDoingHere}
                      </p>
                    </div>
                  </div>
                )}

                {/* 5. 🎯 YOUR TURN (Interactive Mini Challenges) */}
                {selectedLesson.interactiveQuestion && (
                  <div className="bg-white border-3 border-[#171717] p-6 shadow-[6px_6px_0px_#171717] space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-[#171717] pb-2">
                      <span className="text-xs font-black text-[#3157D5] uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-[#F27661]" />
                        🎯 YOUR TURN // PROVE YOUR DEDUCTION
                      </span>
                      <StatusStamp status="UNDER_INVESTIGATION" size="sm" />
                    </div>

                    <p className="text-sm font-bold text-[#171717]">
                      {selectedLesson.interactiveQuestion.prompt}
                    </p>

                    {selectedLesson.interactiveQuestion.options && (
                      <div className="space-y-2">
                        {selectedLesson.interactiveQuestion.options.map((opt: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedQuizOption(opt);
                              setUserAnswer(opt);
                            }}
                            className={clsx(
                              'w-full text-left p-3 border-2 text-xs transition shadow-[2px_2px_0px_#171717]',
                              selectedQuizOption === opt
                                ? 'bg-[#F4C542] text-[#171717] border-[#171717] font-black'
                                : 'bg-white border-[#171717] text-[#171717] hover:bg-[#F5F1E8]'
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type your explanation or select an option above..."
                        className="flex-1 bg-white border-2 border-[#171717] px-4 py-2.5 text-xs text-[#171717] placeholder-neutral-500 font-mono focus:outline-none focus:ring-2 focus:ring-[#3157D5]"
                      />
                      <button
                        onClick={() => handleSubmitAnswer()}
                        disabled={submitting || !userAnswer.trim()}
                        className="bg-[#3157D5] hover:bg-[#2545B8] disabled:opacity-50 text-white font-black text-xs px-5 py-2.5 border-2 border-[#171717] shadow-[3px_3px_0px_#171717] transition"
                      >
                        {submitting ? 'EVALUATING...' : 'SUBMIT PROOF'}
                      </button>
                    </div>

                    {evaluation && (
                      <div
                        className={clsx(
                          'p-4 border-2 text-xs space-y-2',
                          evaluation.status === 'CORRECT'
                            ? 'bg-[#EAF8F1] border-[#8ED8B0] text-[#171717]'
                            : 'bg-[#FFF9E6] border-[#F4C542] text-[#171717]'
                        )}
                      >
                        <div className="flex items-center justify-between font-black">
                          <span>{evaluation.praise}</span>
                          <span className="text-[10px] uppercase bg-[#171717] text-white px-2 py-0.5 font-mono">
                            STATUS: {evaluation.status}
                          </span>
                        </div>
                        <p className="text-[#4A4A4A]">{evaluation.explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. ➡️ ADVANCE TO NEXT LEAD */}
                <div className="flex items-center justify-between pt-4 border-t-3 border-[#171717]">
                  <button
                    onClick={handleCompleteLesson}
                    className="bg-[#8ED8B0] hover:bg-[#7BC69E] text-[#171717] font-black text-xs px-6 py-3 border-2 border-[#171717] shadow-[4px_4px_0px_#171717] transition flex items-center gap-2"
                  >
                    <span>ADVANCE TO NEXT LEAD ➡️</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-[#4A4A4A]">
                Select a subsystem or lead from the organizer to begin learning.
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Slide-out Concept Notebook Drawer */}
      {showNotebook && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end font-mono">
          <div className="w-full max-w-md bg-white border-l-3 border-[#171717] p-6 h-full overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-[#171717] pb-3">
              <span className="text-sm font-black text-[#171717] uppercase tracking-wider flex items-center gap-2">
                🧠 DETECTIVE CONCEPT NOTEBOOK
              </span>
              <button
                onClick={() => setShowNotebook(false)}
                className="bg-[#171717] text-white px-2 py-1 text-xs font-bold"
              >
                ✕ CLOSE
              </button>
            </div>

            <p className="text-xs text-[#4A4A4A]">
              Concepts unlocked as you advance through repository evidence lessons.
            </p>

            <div className="space-y-3">
              {learningPath?.conceptNotebook?.map((c: any, idx: number) => {
                const isUnlocked = idx <= completedCount + 1;
                const masteryState = idx < completedCount ? 'UNDERSTOOD' : idx === completedCount ? 'PRACTICED' : 'SEEN';

                return (
                  <div
                    key={c.name}
                    className={clsx(
                      'p-3 border-2 text-xs space-y-1 shadow-[2px_2px_0px_#171717]',
                      isUnlocked
                        ? 'bg-[#EAF8F1] border-[#8ED8B0] text-[#171717]'
                        : 'bg-[#F5F1E8] border-zinc-400 text-zinc-500'
                    )}
                  >
                    <div className="flex items-center justify-between font-black">
                      <span>🧠 {c.name}</span>
                      <span className="text-[9px] bg-[#171717] text-white px-1.5 py-0.5 font-bold">
                        {isUnlocked ? `✓ ${masteryState}` : '🔒 LOCKED'}
                      </span>
                    </div>
                    <p className="text-[11px]">{c.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* View Full File Modal */}
      {showFullFileModal && selectedLesson?.evidence?.[0] && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-white border-4 border-[#171717] max-w-2xl w-full p-6 shadow-[10px_10px_0px_#171717] space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b-2 border-[#171717] pb-2 shrink-0">
              <span className="bg-[#3157D5] text-white text-[10px] font-black px-2 py-0.5 uppercase">
                FULL SOURCE INSPECTOR // {selectedLesson.evidence[0].file}
              </span>
              <button
                onClick={() => setShowFullFileModal(false)}
                className="text-xs font-bold text-zinc-500 hover:text-[#171717]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#171717] text-white p-4 text-xs font-mono overflow-y-auto flex-1 border-2 border-[#171717]">
              <pre>{selectedLesson.evidence[0].snippet}</pre>
            </div>

            <button
              onClick={() => setShowFullFileModal(false)}
              className="w-full bg-[#171717] text-white font-black text-xs py-2 border border-[#171717] shadow-[2px_2px_0px_#000] shrink-0"
            >
              CLOSE SOURCE INSPECTOR
            </button>
          </div>
        </div>
      )}

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
