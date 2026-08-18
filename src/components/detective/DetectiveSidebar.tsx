'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReplayGuideButton } from './DetectiveBriefingTour';
import {
  FileText,
  GraduationCap,
  MessageSquareCode,
  FolderSearch,
  Compass,
  Network,
  Crosshair,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

interface DetectiveSidebarProps {
  caseId: string;
}

export const DetectiveSidebar: React.FC<DetectiveSidebarProps> = ({ caseId }) => {
  const pathname = usePathname();
  const [exploreOpen, setExploreOpen] = useState(
    pathname?.includes('/board') || pathname?.includes('/investigate') || pathname?.includes('/security')
  );

  const mainNavItems = [
    {
      label: '🕵️ CASE BRIEF',
      href: `/cases/${caseId}`,
      icon: FileText,
      badge: 'START',
      tourAttr: 'nav-case-brief',
    },
    {
      label: '🎓 LEARN',
      href: `/cases/${caseId}/learn`,
      icon: GraduationCap,
      badge: 'GUIDED',
      tourAttr: 'nav-learn',
    },
    {
      label: '🤖 ASK DETECTIVE',
      href: `/cases/${caseId}/interrogate`,
      icon: MessageSquareCode,
      badge: 'AI CHAT',
      tourAttr: 'nav-ask',
    },
    {
      label: '📁 FILES',
      href: `/cases/${caseId}/evidence`,
      icon: FolderSearch,
      badge: 'BROWSE',
      tourAttr: 'nav-files',
    },
  ];

  const exploreItems = [
    {
      label: '🕸️ ARCHITECTURE',
      subtitle: 'WHO TALKS TO WHOM?',
      href: `/cases/${caseId}/board`,
      icon: Network,
    },
    {
      label: '🔬 INVESTIGATIONS',
      subtitle: 'HOW IT WORKS',
      href: `/cases/${caseId}/investigate`,
      icon: Crosshair,
    },
    {
      label: '🛡️ SECURITY',
      subtitle: 'THREAT MATRIX',
      href: `/cases/${caseId}/security`,
      icon: ShieldAlert,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-[#171717] border-r-4 border-[#171717] p-4 flex flex-col justify-between shrink-0 font-mono text-white">
      <div className="space-y-5">
        <div>
          <span className="text-[10px] text-[#F4C542] font-black uppercase tracking-widest block mb-2.5">
            PRIMARY NAVIGATION
          </span>
          <nav className="space-y-1.5">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === `/cases/${caseId}`
                  ? pathname === item.href
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={item.tourAttr}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2.5 rounded text-xs font-bold transition border-2',
                    isActive
                      ? 'bg-[#F4C542] text-[#171717] border-[#171717] shadow-[2px_2px_0px_#171717] font-black'
                      : 'border-transparent text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={clsx('w-4 h-4', isActive ? 'text-[#171717]' : 'text-zinc-400')} />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={clsx(
                      'text-[9px] px-1.5 py-0.5 rounded uppercase font-mono tracking-tighter',
                      isActive
                        ? 'bg-[#171717] text-[#F4C542] font-black'
                        : 'bg-zinc-800 text-zinc-400'
                    )}
                  >
                    {item.badge}
                  </span>
                </Link>
              );
            })}

            {/* 🔎 EXPLORE Collapsible Sub-menu */}
            <div className="pt-2 border-t border-zinc-800 space-y-1">
              <button
                data-tour="nav-explore"
                onClick={() => setExploreOpen(!exploreOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-black text-zinc-300 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#3157D5]" />
                  <span>🔎 EXPLORE</span>
                </div>
                {exploreOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
              </button>

              {exploreOpen && (
                <div className="space-y-1 pl-3 border-l-2 border-[#3157D5] ml-2 pt-1">
                  {exploreItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = pathname?.startsWith(sub.href);

                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={clsx(
                          'block px-2.5 py-2 text-xs font-bold transition border border-transparent',
                          isSubActive
                            ? 'bg-[#3157D5] text-white border-white shadow-[2px_2px_0px_#000]'
                            : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <SubIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{sub.label}</span>
                        </div>
                        <span className="text-[9px] text-zinc-400 block font-normal text-left pl-5">
                          {sub.subtitle}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Case Telemetry Box */}
        <div className="bg-[#242424] border-2 border-[#171717] p-3 text-xs space-y-2 shadow-[2px_2px_0px_#000]">
          <div className="flex items-center justify-between text-zinc-300 font-bold text-[10px]">
            <span>SYSTEM INTEGRITY</span>
            <span className="text-[#8ED8B0] font-black">100% OK</span>
          </div>
          <div className="h-1.5 bg-zinc-900 border border-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-[#8ED8B0] w-full" />
          </div>
          <p className="text-[10px] text-zinc-400">Zero dynamic code execution. 100% deterministic static AST proof.</p>
        </div>

        {/* Replay Guide In-App Helper */}
        <div className="pt-1">
          <ReplayGuideButton className="text-zinc-400 hover:text-[#F4C542] text-[11px]" />
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
        CODE NOIR v1.0
      </div>
    </aside>
  );
};
