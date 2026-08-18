'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusStamp } from './StatusStamp';
import {
  ChevronRight,
  ArrowDown,
  FileCode,
  CheckCircle2,
  BookOpen,
  MessageSquareCode,
  Compass,
  FileText,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';

export interface TimelineStepItem {
  order: number;
  sourceEntity: { name: string; type?: string; path?: string };
  targetEntity: { name: string; type?: string; path?: string };
  relationship: string;
  confidence: string;
  description: string;
  evidence: {
    file: string;
    line?: number;
    symbol?: string;
    reason: string;
  };
}

interface InvestigationTimelineProps {
  caseId?: string;
  title: string;
  question: string;
  steps: TimelineStepItem[];
  confidence?: string;
  onSelectStep?: (step: TimelineStepItem) => void;
  className?: string;
}

export const InvestigationTimeline: React.FC<InvestigationTimelineProps> = ({
  caseId,
  title,
  question,
  steps = [],
  confidence = 'CONFIRMED',
  onSelectStep,
  className,
}) => {
  const router = useRouter();
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [showImLostModal, setShowImLostModal] = useState<boolean>(false);

  const currentStep = steps[activeStepIndex] || steps[0];

  return (
    <div
      className={clsx(
        'bg-[#FFFFFF] border-4 border-[#171717] shadow-[8px_8px_0px_#171717] p-6 font-mono text-[#171717] space-y-6',
        className
      )}
    >
      {/* Dossier Header */}
      <div className="border-b-3 border-[#171717] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF8F5] p-4 border border-[#171717]">
        <div>
          <span className="text-[10px] text-[#3157D5] font-black uppercase tracking-widest block">
            INVESTIGATION TIMELINE // RECONSTRUCTION
          </span>
          <h2 className="text-xl font-black uppercase text-[#171717]">{title}</h2>
          <p className="text-xs text-[#4A4A4A] mt-1 font-sans font-bold">&ldquo;{question}&rdquo;</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImLostModal(true)}
            className="bg-[#FFF9E6] hover:bg-[#FFF3CC] text-[#171717] text-[10px] font-black px-2.5 py-1 border border-[#171717] shadow-[1px_1px_0px_#171717]"
          >
            [ 🆘 I&apos;M LOST ]
          </button>
          <StatusStamp status={confidence} size="md" />
        </div>
      </div>

      {/* Step Navigation Controls */}
      <div className="flex items-center justify-between bg-[#F5F1E8] border-2 border-[#171717] p-2 text-xs font-black">
        <button
          onClick={() => setActiveStepIndex((prev) => Math.max(prev - 1, 0))}
          disabled={activeStepIndex === 0}
          className="bg-white disabled:opacity-40 border border-[#171717] px-3 py-1 text-[11px]"
        >
          [ ← BACK TO PREVIOUS CLUE ]
        </button>

        <span className="text-[11px] text-[#3157D5]">
          CLUE {activeStepIndex + 1} OF {steps.length}
        </span>

        <button
          onClick={() => setActiveStepIndex((prev) => Math.min(prev + 1, steps.length - 1))}
          disabled={activeStepIndex === steps.length - 1}
          className="bg-[#3157D5] text-white disabled:opacity-40 border border-[#171717] px-3 py-1 text-[11px]"
        >
          [ NEXT CLUE → ]
        </button>
      </div>

      {/* Vertical Timeline & Step Details */}
      <div className="space-y-4 relative">
        {steps.map((step, idx) => {
          const isActive = idx === activeStepIndex;

          return (
            <div key={step.order} className={clsx('relative flex items-start gap-4 transition', isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100')}>
              {/* Step Number Badge */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setActiveStepIndex(idx)}
                  className={clsx(
                    'w-9 h-9 border-2 border-[#171717] flex items-center justify-center font-black shadow-[2px_2px_0px_#171717] transition text-xs',
                    isActive ? 'bg-[#F4C542] text-[#171717]' : 'bg-white text-[#171717]'
                  )}
                >
                  {step.order < 10 ? `0${step.order}` : step.order}
                </button>
                {idx !== steps.length - 1 && <div className="w-0.5 h-12 bg-[#171717] my-1" />}
              </div>

              {/* Step Detail Card */}
              <div
                onClick={() => {
                  setActiveStepIndex(idx);
                  if (onSelectStep) onSelectStep(step);
                }}
                className={clsx(
                  'flex-1 border-3 p-4 shadow-[4px_4px_0px_#171717] cursor-pointer transition space-y-3',
                  isActive ? 'bg-white border-[#171717] ring-2 ring-[#3157D5]' : 'bg-[#FAF8F5] border-[#171717]'
                )}
              >
                {/* Entities & Relationship Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#171717]/20 pb-2">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="bg-[#171717] text-[#F4C542] px-2 py-0.5 font-black text-[11px]">
                      {step.sourceEntity.name}
                    </span>
                    <span className="text-[#F27661] font-black text-[10px] tracking-wider uppercase">
                      —[{step.relationship}]→
                    </span>
                    <span className="bg-[#3157D5] text-white px-2 py-0.5 font-black text-[11px]">
                      {step.targetEntity.name}
                    </span>
                  </div>

                  <StatusStamp status={step.confidence} size="sm" />
                </div>

                {/* Description */}
                <p className="text-xs text-[#171717] font-sans font-medium leading-relaxed">
                  {step.description}
                </p>

                {/* Evidence Rationale ("Why did we move here?") */}
                <div className="bg-[#FFF9E6] border border-[#F4C542] p-2.5 text-[11px] space-y-1 font-sans">
                  <strong className="text-[#3157D5] font-mono text-[9px] uppercase block font-black">
                    WHY THIS STEP MATTERS:
                  </strong>
                  <p className="text-[#171717]">{step.evidence?.reason || 'Corroborated by static AST graph traversal.'}</p>
                </div>

                {/* Evidence Citation & Action CTAs */}
                {step.evidence && (
                  <div className="pt-2 border-t border-[#171717]/20 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5 text-[#3157D5] font-bold">
                      <FileCode className="w-3.5 h-3.5" />
                      <code>
                        {step.evidence.file}
                        {step.evidence.line ? `:${step.evidence.line}` : ''}
                      </code>
                    </div>

                    {caseId && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/cases/${caseId}/learn?file=${encodeURIComponent(step.evidence.file)}`}
                          className="bg-[#3157D5] text-white px-2 py-0.5 font-bold border border-[#171717]"
                        >
                          [ 🎓 LEARN ]
                        </Link>
                        <Link
                          href={`/cases/${caseId}/interrogate?file=${encodeURIComponent(step.evidence.file)}`}
                          className="bg-[#F4C542] text-[#171717] px-2 py-0.5 font-bold border border-[#171717]"
                        >
                          [ 🤖 ASK ]
                        </Link>
                        <Link
                          href={`/cases/${caseId}/evidence?file=${encodeURIComponent(step.evidence.file)}`}
                          className="bg-white text-[#171717] px-2 py-0.5 font-bold border border-[#171717]"
                        >
                          [ 💻 CODE ]
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PART 31 — INVESTIGATION SUMMARY CARD */}
      <div className="bg-[#FAF8F5] border-3 border-[#171717] p-5 shadow-[4px_4px_0px_#171717] space-y-3">
        <div className="flex items-center justify-between border-b-2 border-[#171717] pb-2">
          <span className="text-xs font-black text-[#3157D5] uppercase flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#8ED8B0]" />
            INVESTIGATION RECAP // IN PLAIN ENGLISH
          </span>
          <StatusStamp status="CONFIRMED" size="sm" />
        </div>

        <p className="text-xs text-[#171717] font-sans font-medium leading-relaxed">
          &quot;We started at {steps[0]?.sourceEntity.name || 'entry'}, which triggered {steps[0]?.targetEntity.name || 'subsystem'}, passing control down to {steps[steps.length - 1]?.targetEntity.name || 'the final stage'}.&quot;
        </p>

        {caseId && (
          <div className="flex items-center gap-3 pt-2 border-t border-[#171717]/20 flex-wrap">
            <Link
              href={`/cases/${caseId}/learn`}
              className="bg-[#8ED8B0] text-[#171717] font-black text-xs px-4 py-2 border border-[#171717] shadow-[2px_2px_0px_#171717]"
            >
              [ 🎓 LEARN THIS SYSTEM ]
            </Link>

            <Link
              href={`/cases/${caseId}/interrogate`}
              className="bg-[#3157D5] text-white font-black text-xs px-4 py-2 border border-[#171717] shadow-[2px_2px_0px_#171717]"
            >
              [ 🤖 ASK THE DETECTIVE ]
            </Link>

            <Link
              href={`/cases/${caseId}/board`}
              className="bg-[#F5F1E8] text-[#171717] font-black text-xs px-4 py-2 border border-[#171717] shadow-[2px_2px_0px_#171717]"
            >
              [ 🔎 SHOW ON CRIME SCENE ]
            </Link>
          </div>
        )}
      </div>

      {/* PART 37 — "I'M LOST" MODAL */}
      {showImLostModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-white border-4 border-[#171717] max-w-md w-full p-6 shadow-[10px_10px_0px_#171717] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#171717] pb-2">
              <span className="bg-[#F27661] text-white text-[10px] font-black px-2 py-0.5 uppercase flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> 🆘 DETECTIVE REASSURANCE
              </span>
              <button onClick={() => setShowImLostModal(false)} className="text-xs font-bold text-zinc-500 hover:text-[#171717]">
                [ CLOSE ]
              </button>
            </div>

            <div className="space-y-2 text-xs font-sans text-[#171717]">
              <strong className="font-mono text-[11px] text-[#3157D5] block uppercase font-black">
                DON&apos;T PANIC. HERE IS WHAT WE HAVE FOUND SO FAR:
              </strong>
              <ol className="list-decimal pl-5 space-y-1 font-mono text-[11px]">
                <li>{steps[0]?.description || 'Execution began at application entry point.'}</li>
                <li>{currentStep?.description || 'Passed through intermediate control handlers.'}</li>
                <li>{steps[steps.length - 1]?.description || 'Reached target component.'}</li>
              </ol>
            </div>

            <button
              onClick={() => {
                setActiveStepIndex(0);
                setShowImLostModal(false);
              }}
              className="w-full bg-[#171717] text-white font-black text-xs py-2 border border-[#171717] shadow-[2px_2px_0px_#000]"
            >
              RETURN TO STEP 01 (START)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
