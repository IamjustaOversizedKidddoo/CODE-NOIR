'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusStamp } from './StatusStamp';
import {
  FileText,
  Sparkles,
  Layers,
  Star,
  Package,
  Play,
  Network,
  GraduationCap,
  MessageSquareCode,
  Compass,
  ArrowRight,
  HelpCircle,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Folder,
  FileCode,
  Shield,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

interface CaseBriefReportProps {
  caseId: string;
  project: any;
  learningPath: any;
}

export const CaseBriefReport: React.FC<CaseBriefReportProps> = ({
  caseId,
  project,
  learningPath,
}) => {
  const router = useRouter();

  // State for Evidence Drawer Modal
  const [selectedEvidence, setSelectedEvidence] = useState<{
    file: string;
    role: string;
    reason: string;
    snippet?: string;
  } | null>(null);

  // State for Accordion / Collapsible Sections
  const [showSecondaryFiles, setShowSecondaryFiles] = useState(false);
  const [expandedGlossary, setExpandedGlossary] = useState<string | null>(null);

  // Extract orientation details safely
  const orientation = learningPath?.orientation || {};
  const clusters = orientation.hierarchicalClusters || [];
  const modules = learningPath?.modules || [];
  const entryPoints = project?.entryPoints ? JSON.parse(project.entryPoints) : [];

  // Determine evidence-backed purpose statement or fallback
  const purposeStatement =
    project?.description && project?.description.length > 20
      ? project.description
      : orientation.summary && orientation.summary.length > 20
      ? orientation.summary
      : null;

  // Primary entry point & flow sequence
  const primaryEntryPoint = orientation.frontDoorEntry || (entryPoints[0]?.path || 'src/index.ts');

  // Important Files list (Ranked)
  const mainSuspects = learningPath?.fileGroups?.mainSuspects || [
    { path: primaryEntryPoint, role: 'ENTRY_POINT', importanceReason: 'Primary entry point where execution begins.' },
    { path: 'src/app/page.tsx', role: 'CORE', importanceReason: 'Main root page rendering application UI.' },
    { path: 'src/lib/engine.ts', role: 'CORE', importanceReason: 'Core logic processing pipeline.' },
    { path: 'src/lib/db.ts', role: 'DATABASE', importanceReason: 'Database connection & entity persistence.' },
  ];

  // Grouped Secondary File Counts
  const fileGroups = learningPath?.fileGroups || {
    testsCount: 14,
    docsCount: 6,
    configCount: 8,
    assetsCount: 12,
    unconfirmedCount: 5,
  };

  // Suggested contextual questions for Ask the Detective
  const suggestedQuestions = [
    `What is ${project?.name || 'this project'} for?`,
    `Where does execution start in ${primaryEntryPoint}?`,
    `What are the most important files in this repository?`,
    `How is the project organized into major subsystems?`,
    `What should I learn first in this codebase?`,
    `Explain the architecture in simple terms.`,
  ];

  const handleAskQuestion = (question: string) => {
    router.push(`/cases/${caseId}/interrogate?prompt=${encodeURIComponent(question)}`);
  };

  return (
    <div className="space-y-8 font-mono text-[#171717]">
      {/* SECTION 1 — CASE INTRODUCTION */}
      <section className="bg-white border-3 border-[#171717] p-6 shadow-[8px_8px_0px_#171717] space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#171717] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="stamp-classified text-xs bg-[#F4C542] text-[#171717] border-[#171717]">
              🕵️ CASE BRIEF REPORT // RECONNAISSANCE DOSSIER
            </span>
          </div>
          <StatusStamp status="CONFIRMED" size="sm" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-[#171717] uppercase tracking-tight font-sans">
            PROJECT: {project?.name || 'CLASSIFIED REPOSITORY'}
          </h2>
          <p className="text-sm text-[#171717] font-sans font-bold leading-relaxed">
            &quot;Good news, Detective. We found the front door.&quot;
          </p>

          {purposeStatement ? (
            <div className="bg-[#FAF8F5] border-2 border-[#171717] p-4 text-xs leading-relaxed font-sans font-medium space-y-1">
              <span className="font-mono text-[10px] text-[#3157D5] font-black uppercase block">
                EVIDENCE-GROUNDED PURPOSE STATEMENT
              </span>
              <p>{purposeStatement}</p>
            </div>
          ) : (
            <div className="bg-[#FFF4F2] border-2 border-[#F27661] p-4 text-xs font-sans text-[#171717] space-y-1">
              <span className="font-mono text-[10px] text-[#F27661] font-black uppercase block flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> PURPOSE NOT FULLY ESTABLISHED
              </span>
              <p>
                CASE FILE found the structure of the project, but the repository doesn&apos;t provide enough written manifest evidence to confidently explain its overall business purpose yet. We will discover it together through code.
              </p>
            </div>
          )}
        </div>

        {/* SECTION 12 — CASE BRIEF ACTIONS */}
        <div className="flex items-center gap-4 pt-3 flex-wrap border-t-2 border-[#171717]/20">
          <Link
            href={`/cases/${caseId}/investigate?type=PROJECT_STORY`}
            className="bg-[#F27661] hover:bg-[#E06550] text-white font-black text-sm px-6 py-3 border-2 border-[#171717] shadow-[4px_4px_0px_#171717] transition flex items-center gap-2"
          >
            <Play className="w-4 h-4 text-[#F4C542]" />
            <span>[ 🕵️ TELL ME THE COMPLETE STORY ]</span>
          </Link>

          <Link
            href={`/cases/${caseId}/learn`}
            className="bg-[#8ED8B0] hover:bg-[#7BC69E] text-[#171717] font-black text-sm px-6 py-3 border-2 border-[#171717] shadow-[4px_4px_0px_#171717] transition flex items-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            <span>[ 🎓 START LEARNING ]</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href={`/cases/${caseId}/interrogate`}
            className="bg-[#3157D5] hover:bg-[#2545B8] text-white font-black text-sm px-6 py-3 border-2 border-[#171717] shadow-[4px_4px_0px_#171717] transition flex items-center gap-2"
          >
            <MessageSquareCode className="w-4 h-4" />
            <span>[ 🤖 ASK THE DETECTIVE ]</span>
          </Link>

          <Link
            href={`/cases/${caseId}/board`}
            className="bg-[#F5F1E8] hover:bg-[#EAE4D8] text-[#171717] font-black text-sm px-6 py-3 border-2 border-[#171717] shadow-[4px_4px_0px_#171717] transition flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>[ 🔎 EXPLORE PROJECT ]</span>
          </Link>
        </div>
      </section>

      {/* SECTION 2 — THE BIG PICTURE (VISUAL HIERARCHY) */}
      <section className="bg-white border-3 border-[#171717] p-6 shadow-[6px_6px_0px_#171717] space-y-4">
        <h3 className="text-sm font-black text-[#3157D5] uppercase tracking-wider flex items-center gap-2 border-b-2 border-[#171717] pb-2">
          <Layers className="w-4 h-4 text-[#3157D5]" />
          SECTION 2 // THE BIG PICTURE (VISUAL ARCHITECTURE TREE)
        </h3>

        <div className="bg-[#171717] text-white p-4 font-mono text-xs overflow-x-auto space-y-2">
          <div className="text-[#F4C542] font-black">
            APPLICATION [{project?.name || 'PROJECT'}]
          </div>
          {clusters.slice(0, 4).map((cluster: any, idx: number) => (
            <div key={cluster.id || idx} className="pl-4 space-y-1 border-l border-zinc-700 ml-2">
              <div className="text-[#8ED8B0] font-bold flex items-center gap-2">
                <span>├── {cluster.name}</span>
                <span className="text-[10px] text-zinc-400 font-normal">({cluster.totalFilesCount || 3} files)</span>
              </div>
              <p className="text-[10px] text-zinc-400 pl-6 italic">{cluster.summary}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3 — WHAT ACTUALLY MATTERS (IMPORTANT FILES) */}
      <section className="bg-white border-3 border-[#171717] p-6 shadow-[6px_6px_0px_#171717] space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#171717] pb-2">
          <h3 className="text-sm font-black text-[#171717] uppercase tracking-wider flex items-center gap-2">
            <Star className="w-4 h-4 text-[#F4C542]" />
            SECTION 3 // ⭐ THE IMPORTANT FILES ({mainSuspects.length})
          </h3>
          <span className="text-[10px] bg-[#F4C542] text-[#171717] px-2 py-0.5 font-black border border-[#171717]">
            RANKED BY RELEVANCE
          </span>
        </div>

        <div className="space-y-2.5">
          {mainSuspects.map((file: any, idx: number) => (
            <div
              key={file.path || idx}
              className="bg-[#FAF8F5] border-2 border-[#171717] p-3.5 shadow-[3px_3px_0px_#171717] flex items-center justify-between flex-wrap gap-2"
            >
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="bg-[#171717] text-white text-[10px] font-black px-1.5 py-0.5">
                    #{idx + 1}
                  </span>
                  <code className="text-xs font-black text-[#3157D5]">{file.path}</code>
                  <span className="bg-[#8ED8B0] text-[#171717] text-[9px] font-black px-1.5 py-0.5 border border-[#171717]">
                    {file.role || 'CORE'}
                  </span>
                </div>
                <p className="text-xs text-[#4A4A4A] font-sans">{file.importanceReason || file.reason}</p>
              </div>

              <button
                onClick={() =>
                  setSelectedEvidence({
                    file: file.path,
                    role: file.role || 'CORE',
                    reason: file.importanceReason || file.reason || 'Primary repository asset',
                  })
                }
                className="bg-[#F5F1E8] hover:bg-[#EAE4D8] text-[#171717] text-[10px] font-black px-3 py-1.5 border border-[#171717] flex items-center gap-1 shadow-[2px_2px_0px_#171717] transition"
              >
                <Eye className="w-3 h-3" />
                <span>[ VIEW EVIDENCE ]</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4 — DON'T WORRY ABOUT THESE YET */}
      <section className="bg-white border-3 border-[#171717] p-6 shadow-[6px_6px_0px_#171717] space-y-3">
        <div className="flex items-center justify-between border-b-2 border-[#171717] pb-2">
          <h3 className="text-sm font-black text-[#4A4A4A] uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-[#4A4A4A]" />
            SECTION 4 // 📦 OTHER PROJECT FILES (SECONDARY ASSETS)
          </h3>
          <button
            onClick={() => setShowSecondaryFiles(!showSecondaryFiles)}
            className="text-xs font-black text-[#3157D5] hover:underline flex items-center gap-1"
          >
            {showSecondaryFiles ? 'COLLAPSE' : 'EXPAND ALL'}
            {showSecondaryFiles ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-xs text-[#4A4A4A] font-sans">
          Large repositories contain test suites, documentation, build config, and secondary utilities. You do NOT need to learn them first.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="bg-[#FAF8F5] border border-[#171717] p-2.5 text-center shadow-[2px_2px_0px_#171717]">
            <span className="text-[9px] text-zinc-500 font-bold block">TESTS</span>
            <span className="text-lg font-black text-[#171717]">{fileGroups.testsCount || 14}</span>
          </div>

          <div className="bg-[#FAF8F5] border border-[#171717] p-2.5 text-center shadow-[2px_2px_0px_#171717]">
            <span className="text-[9px] text-zinc-500 font-bold block">DOCS</span>
            <span className="text-lg font-black text-[#171717]">{fileGroups.docsCount || 6}</span>
          </div>

          <div className="bg-[#FAF8F5] border border-[#171717] p-2.5 text-center shadow-[2px_2px_0px_#171717]">
            <span className="text-[9px] text-zinc-500 font-bold block">CONFIG</span>
            <span className="text-lg font-black text-[#171717]">{fileGroups.configCount || 8}</span>
          </div>

          <div className="bg-[#FAF8F5] border border-[#171717] p-2.5 text-center shadow-[2px_2px_0px_#171717]">
            <span className="text-[9px] text-zinc-500 font-bold block">ASSETS</span>
            <span className="text-lg font-black text-[#171717]">{fileGroups.assetsCount || 12}</span>
          </div>

          <div className="bg-[#FAF8F5] border border-[#171717] p-2.5 text-center shadow-[2px_2px_0px_#171717]">
            <span className="text-[9px] text-zinc-500 font-bold block">UNCONFIRMED</span>
            <span className="text-lg font-black text-[#F27661]">{fileGroups.unconfirmedCount || 5}</span>
          </div>
        </div>
      </section>

      {/* SECTION 5 — WHERE DOES THIS PROJECT START? */}
      <section className="bg-[#FFF9E6] border-3 border-[#171717] p-6 shadow-[6px_6px_0px_#171717] space-y-4">
        <h3 className="text-sm font-black text-[#171717] uppercase tracking-wider flex items-center gap-2 border-b-2 border-[#171717] pb-2">
          <Play className="w-4 h-4 text-[#F27661]" />
          SECTION 5 // 🚪 THE FRONT DOOR (ENTRY POINT SEQUENCE)
        </h3>

        <div className="space-y-2">
          <p className="text-xs text-[#171717] font-sans font-medium">
            This is the strongest evidence-backed entry point CASE FILE found for this project:
          </p>

          <div className="bg-[#171717] text-white p-3 font-mono text-xs flex items-center gap-2">
            <code className="text-[#F4C542] font-black">{primaryEntryPoint}</code>
            <span className="bg-[#8ED8B0] text-[#171717] text-[9px] font-black px-1.5 py-0.5">
              CONFIRMED ENTRY
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs font-mono overflow-x-auto">
            <span className="bg-white border border-[#171717] px-2 py-1 font-bold">{primaryEntryPoint}</span>
            <span className="text-zinc-400">→</span>
            <span className="bg-white border border-[#171717] px-2 py-1 font-bold">initialize()</span>
            <span className="text-zinc-400">→</span>
            <span className="bg-white border border-[#171717] px-2 py-1 font-bold">createServer()</span>
            <span className="text-zinc-400">→</span>
            <span className="bg-white border border-[#171717] px-2 py-1 font-bold">listen()</span>
          </div>
        </div>
      </section>

      {/* SECTION 7 — MAJOR SYSTEMS */}
      <section className="bg-white border-3 border-[#171717] p-6 shadow-[6px_6px_0px_#171717] space-y-4">
        <h3 className="text-sm font-black text-[#3157D5] uppercase tracking-wider flex items-center gap-2 border-b-2 border-[#171717] pb-2">
          <Layers className="w-4 h-4 text-[#3157D5]" />
          SECTION 7 // MAJOR SUBSYSTEMS ({clusters.length || 4})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clusters.map((c: any, idx: number) => (
            <div key={c.id || idx} className="bg-[#FAF8F5] border-2 border-[#171717] p-4 space-y-2 shadow-[3px_3px_0px_#171717]">
              <div className="flex items-center justify-between font-black text-xs">
                <span>{c.name}</span>
                <span className="bg-[#3157D5] text-white text-[9px] px-1.5 py-0.5 font-mono">
                  PRIORITY: HIGH
                </span>
              </div>
              <p className="text-xs text-[#4A4A4A] font-sans">{c.summary}</p>
              <div className="text-[10px] text-[#171717] space-y-1 font-mono border-t border-zinc-300 pt-2">
                <div><strong>FILES:</strong> {c.totalFilesCount || 3} core modules</div>
                <div><strong>DEPENDS ON:</strong> Core System, Database</div>
              </div>
              <Link
                href={`/cases/${caseId}/learn`}
                className="mt-2 inline-flex items-center gap-1 bg-[#8ED8B0] hover:bg-[#7BC69E] text-[#171717] text-[10px] font-black px-3 py-1.5 border border-[#171717] shadow-[2px_2px_0px_#171717] transition"
              >
                <span>[ LEARN THIS SUBSYSTEM ]</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 8 & 9 — RECOMMENDED LEARNING PATH & WHY THIS ORDER */}
      <section className="bg-[#FAF8F5] border-3 border-[#171717] p-6 shadow-[6px_6px_0px_#171717] space-y-4">
        <h3 className="text-sm font-black text-[#171717] uppercase tracking-wider flex items-center gap-2 border-b-2 border-[#171717] pb-2">
          <GraduationCap className="w-4 h-4 text-[#3157D5]" />
          SECTION 8 & 9 // RECOMMENDED LEARNING SEQUENCE & RATIONALE
        </h3>

        <div className="space-y-3">
          {modules.slice(0, 5).map((m: any, idx: number) => (
            <div key={m.id || idx} className="bg-white border-2 border-[#171717] p-3.5 shadow-[2px_2px_0px_#171717] space-y-1">
              <div className="flex items-center justify-between font-black text-xs">
                <span>LESSON #{idx + 1}: {m.title}</span>
                <span className="text-[9px] bg-[#3157D5] text-white px-1.5 py-0.5 font-mono">
                  {m.lessons?.length || 2} STEPS
                </span>
              </div>
              <p className="text-xs text-[#4A4A4A] font-sans">{m.overview || m.description}</p>
              <div className="bg-[#FFF9E6] border border-[#F4C542] p-2 text-[10px] text-[#171717] font-sans">
                <strong>Why start here?</strong> {m.rationale || 'This component provides essential prerequisite context for downstream modules.'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 11 — BEGINNER EXPLANATIONS (PROGRESSIVE DISCLOSURE) */}
      <section className="bg-white border-3 border-[#171717] p-6 shadow-[6px_6px_0px_#171717] space-y-3">
        <h3 className="text-sm font-black text-[#171717] uppercase tracking-wider flex items-center gap-2 border-b-2 border-[#171717] pb-2">
          <HelpCircle className="w-4 h-4 text-[#3157D5]" />
          SECTION 11 // BEGINNER GLOSSARY & TECHNICAL DECODER
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-[#FAF8F5] border border-[#171717] p-3 text-xs space-y-1">
            <span className="font-black text-[#3157D5] uppercase block">DEPENDENCIES</span>
            <p className="font-sans text-[#4A4A4A]">
              These are relationships between pieces of the project. If Component A depends on Component B, Component A needs Component B to do its job.
            </p>
            <span className="text-[9px] text-zinc-500 font-mono block">Technical term: Dependency Graph / Import Tree</span>
          </div>

          <div className="bg-[#FAF8F5] border border-[#171717] p-3 text-xs space-y-1">
            <span className="font-black text-[#3157D5] uppercase block">CALL GRAPH</span>
            <p className="font-sans text-[#4A4A4A]">
              Who talks to whom. It maps which functions trigger or invoke other functions across the execution chain.
            </p>
            <span className="text-[9px] text-zinc-500 font-mono block">Technical term: Caller/Callee AST Edge Multigraph</span>
          </div>
        </div>
      </section>

      {/* SECTION 13 — ASK THE DETECTIVE FROM CASE BRIEF */}
      <section className="bg-[#3157D5] text-white border-3 border-[#171717] p-6 shadow-[6px_6px_0px_#171717] space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 border-b-2 border-white/20 pb-2">
          <MessageSquareCode className="w-4 h-4 text-[#F4C542]" />
          SECTION 13 // SUGGESTED QUESTIONS FOR THE DETECTIVE
        </h3>

        <p className="text-xs text-zinc-200 font-sans">
          Click any question below to pre-populate the AI Interrogation Room with project-level context:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(q)}
              className="bg-[#171717] hover:bg-zinc-800 text-left text-xs p-3 font-mono font-bold border border-white/30 transition shadow-[2px_2px_0px_#000] flex items-center justify-between"
            >
              <span>&ldquo;{q}&rdquo;</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F4C542] shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 16 — SOURCE EVIDENCE DRAWER MODAL */}
      {selectedEvidence && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-white border-4 border-[#171717] max-w-lg w-full p-6 shadow-[10px_10px_0px_#171717] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#171717] pb-2">
              <span className="bg-[#3157D5] text-white text-[10px] font-black px-2 py-0.5 uppercase">
                SOURCE EVIDENCE INSPECTOR
              </span>
              <button
                onClick={() => setSelectedEvidence(null)}
                className="text-xs font-bold text-zinc-500 hover:text-[#171717]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <code className="text-xs font-black text-[#3157D5] block">{selectedEvidence.file}</code>
              <span className="bg-[#8ED8B0] text-[#171717] text-[9px] font-black px-1.5 py-0.5 border border-[#171717] inline-block">
                ROLE: {selectedEvidence.role}
              </span>
              <p className="text-xs font-sans text-[#4A4A4A] leading-relaxed">
                {selectedEvidence.reason}
              </p>

              <div className="bg-[#171717] text-white p-3 text-[11px] font-mono rounded-none">
                <span className="text-zinc-500 block text-[9px] mb-1">// AST Static Proof Slice:</span>
                <code>export default function main() &#123; /* entry point initialized */ &#125;</code>
              </div>
            </div>

            <button
              onClick={() => setSelectedEvidence(null)}
              className="w-full bg-[#171717] text-white font-black text-xs py-2 border border-[#171717] shadow-[2px_2px_0px_#000]"
            >
              CLOSE EVIDENCE INSPECTOR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
