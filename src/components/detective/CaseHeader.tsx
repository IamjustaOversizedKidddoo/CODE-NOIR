'use client';

import React from 'react';
import Link from 'next/link';
import { StatusStamp } from './StatusStamp';
import { DetectiveBriefingTour, ReplayGuideButton } from './DetectiveBriefingTour';
import { Search, FolderTree, Cpu, ArrowLeft } from 'lucide-react';

interface CaseHeaderProps {
  caseId: string;
  caseNumber: string;
  projectName: string;
  primaryLang?: string;
  totalFiles: number;
  totalSymbols: number;
  status: string;
  onOpenSearch?: () => void;
}

export const CaseHeader: React.FC<CaseHeaderProps> = ({
  caseId,
  caseNumber,
  projectName,
  primaryLang = 'TypeScript',
  totalFiles,
  totalSymbols,
  status,
  onOpenSearch,
}) => {
  return (
    <header className="border-b-4 border-[#171717] bg-[#171717] text-[#F5F1E8] px-6 py-4 relative z-20 font-mono">
      <DetectiveBriefingTour />
      {/* Top Banner Ticker */}
      <div className="flex items-center justify-between text-[11px] tracking-widest text-zinc-400 border-b border-zinc-800 pb-2 mb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-[#F4C542] hover:text-[#E0B332] font-black transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>VAULT</span>
          </Link>
          <span>/</span>
          <span className="text-zinc-200 font-black">CODE NOIR // {caseNumber}</span>
          <span>•</span>
          <span className="text-[#F27661] font-black tracking-wider">CRIME SCENE ACTIVE</span>
        </div>
        <div className="flex items-center gap-4 hidden sm:flex">
          <ReplayGuideButton className="text-zinc-300 hover:text-white text-[11px]" />
          <span>•</span>
          <span>CLASSIFIED REPOSITORY DOSSIER</span>
          <span className="text-[#8ED8B0] font-bold">SEC_LEVEL_4</span>
        </div>
      </div>

      {/* Main Header Row */}
      <div data-tour="header-logo" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-sans">
              {projectName}
            </h1>
            <StatusStamp status={status === 'READY' ? 'UNDER_INVESTIGATION' : status} />
            <span className="bg-[#F4C542] text-[#171717] text-xs font-black px-2 py-0.5 border border-[#171717] shadow-[2px_2px_0px_#171717]">
              {primaryLang}
            </span>
          </div>
          <p className="text-xs text-zinc-400 italic">
            &ldquo;Every codebase has a story. Investigate it.&rdquo; — CODE NOIR
          </p>
        </div>

        {/* Real Metrics Ticker & Search Trigger */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#242424] border-2 border-[#171717] p-2 shadow-[2px_2px_0px_#000] text-xs">
            <FolderTree className="w-4 h-4 text-[#F4C542]" />
            <span className="text-zinc-400">FILES:</span>
            <span className="font-bold text-white">{totalFiles}</span>
          </div>

          <div className="flex items-center gap-2 bg-[#242424] border-2 border-[#171717] p-2 shadow-[2px_2px_0px_#000] text-xs">
            <Cpu className="w-4 h-4 text-[#8ED8B0]" />
            <span className="text-zinc-400">SYMBOLS:</span>
            <span className="font-bold text-white">{totalSymbols}</span>
          </div>

          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 bg-[#3157D5] hover:bg-[#2545B8] text-white border-2 border-[#171717] px-3.5 py-2 font-black text-xs shadow-[3px_3px_0px_#171717] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <Search className="w-3.5 h-3.5" />
            <span>SEARCH DOSSIER (⌘K)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
