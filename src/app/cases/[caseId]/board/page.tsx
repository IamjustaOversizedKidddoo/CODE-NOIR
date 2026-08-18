'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CaseHeader } from '@/components/detective/CaseHeader';
import { DetectiveSidebar } from '@/components/detective/DetectiveSidebar';
import { CaseBreadcrumb } from '@/components/detective/CaseBreadcrumb';
import { CrimeSceneBoard } from '@/components/detective/CrimeSceneBoard';
import { GlobalSearchModal } from '@/components/detective/GlobalSearchModal';

export default function CrimeSceneBoardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const caseId = params?.caseId as string;

  const [project, setProject] = useState<any>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!caseId) return;

    async function loadData() {
      try {
        const [projRes, graphRes] = await Promise.all([
          fetch(`/api/cases/${caseId}`),
          fetch(`/api/cases/${caseId}/graph`),
        ]);
        const pData = await projRes.json();
        const gData = await graphRes.json();

        if (pData.success) setProject(pData.project);
        if (gData.success) setGraphData(gData.graph);
      } catch (err) {
        console.error('Failed to load board data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [caseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] text-[#171717] font-mono flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-[#3157D5] border-t-transparent animate-spin" />
        <span className="text-sm font-black tracking-widest text-[#171717]">
          // ASSEMBLING CRIME SCENE PINBOARD & EVIDENCE YARN...
        </span>
      </div>
    );
  }

  // Format real repository nodes with grid positions for CrimeSceneBoard
  const formattedNodes =
    graphData?.nodes?.map((n: any, idx: number) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      return {
        id: n.id,
        name: n.name,
        path: n.path,
        type: n.isEntry
          ? 'ENTRY_POINT'
          : n.type === 'SYMBOL'
          ? 'SERVICE'
          : 'CORE_MODULE',
        subsystem: n.path?.split('/')[0]?.toUpperCase() || 'CORE',
        importanceScore: n.isEntry ? 95 : n.type === 'FILE' ? 80 : 65,
        confidence: 'CONFIRMED',
        x: 80 + col * 300,
        y: 60 + row * 180,
      };
    }) || [];

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
        subsystemName="ARCHITECTURE GRAPH"
        fileOrSymbolName={searchParams?.get('highlight') || searchParams?.get('file') || undefined}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <DetectiveSidebar caseId={caseId} />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-[#F5F1E8]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#3157D5] font-black uppercase tracking-widest block">
                VISUAL ARCHITECTURE BOARD // EVIDENCE MAP
              </span>
              <h2 className="text-xl font-black text-[#171717] uppercase">CRIME SCENE RECONSTRUCTION</h2>
            </div>
            <div className="stamp-classified text-xs bg-[#F27661] text-white border-[#F27661]">
              PINBOARD PINNED
            </div>
          </div>

          <CrimeSceneBoard
            caseId={caseId}
            nodes={formattedNodes}
            edges={graphData?.edges || []}
          />
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
