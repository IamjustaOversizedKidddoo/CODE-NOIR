'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowLeft, ArrowRight, MessageSquareCode, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface CaseBreadcrumbProps {
  caseId: string;
  subsystemName?: string;
  fileOrSymbolName?: string;
  lessonTitle?: string;
  onNextClue?: () => void;
  onAskAI?: () => void;
}

export function CaseBreadcrumb({
  caseId,
  subsystemName = 'Core Subsystem',
  fileOrSymbolName,
  lessonTitle,
  onNextClue,
  onAskAI,
}: CaseBreadcrumbProps) {
  const router = useRouter();

  return (
    <div className="bg-[#FFFFFF] border-b-2 border-[#171717] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-xs">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Link
          href={`/cases/${caseId}`}
          className="text-[#3157D5] hover:underline font-black uppercase text-[11px]"
        >
          CASE DOSSIER
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />

        <span className="text-[#171717] font-bold text-[11px] uppercase bg-[#F5F1E8] px-2 py-0.5 border border-[#171717]">
          {subsystemName}
        </span>

        {fileOrSymbolName && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[#F27661] font-bold text-[11px] font-mono">
              {fileOrSymbolName}
            </span>
          </>
        )}

        {lessonTitle && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-600 truncate max-w-[200px] text-[11px]">
              {lessonTitle}
            </span>
          </>
        )}
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="bg-[#F5F1E8] hover:bg-[#EAE4D8] text-[#171717] px-2.5 py-1 text-[10px] font-black border border-[#171717] flex items-center gap-1 transition"
        >
          <ArrowLeft className="w-3 h-3" /> BACK
        </button>

        {onAskAI && (
          <button
            onClick={onAskAI}
            className="bg-[#3157D5] hover:bg-[#2545B8] text-white px-3 py-1 text-[10px] font-black border border-[#171717] flex items-center gap-1 shadow-[2px_2px_0px_#171717] transition"
          >
            <MessageSquareCode className="w-3 h-3" /> ASK AI
          </button>
        )}

        {onNextClue && (
          <button
            onClick={onNextClue}
            className="bg-[#8ED8B0] hover:bg-[#7BC69E] text-[#171717] px-3 py-1 text-[10px] font-black border border-[#171717] flex items-center gap-1 shadow-[2px_2px_0px_#171717] transition"
          >
            NEXT CLUE <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
