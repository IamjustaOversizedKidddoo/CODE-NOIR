'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CaseHeader } from '@/components/detective/CaseHeader';
import { DetectiveSidebar } from '@/components/detective/DetectiveSidebar';
import { GlobalSearchModal } from '@/components/detective/GlobalSearchModal';
import { CaseBreadcrumb } from '@/components/detective/CaseBreadcrumb';
import { CaseBriefReport } from '@/components/detective/CaseBriefReport';

export default function CaseBriefPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.caseId as string;

  const [project, setProject] = useState<any>(null);
  const [learningPath, setLearningPath] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!caseId) return;

    async function loadCaseData() {
      try {
        const projRes = await fetch(`/api/cases/${caseId}`);
        const data = await projRes.json();
        const projectData = data.case || data.project;
        if (data.success && projectData) {
          setProject(projectData);
        }
      } catch (err) {
        console.error('Failed to load case brief:', err);
      } finally {
        setLoading(false);
      }

      // Asynchronously load learning path in background without locking page render
      try {
        const pathRes = await fetch(`/api/cases/${caseId}/learning-path`);
        const pathData = await pathRes.json();
        if (pathData.success && pathData.learningPath) {
          setLearningPath(pathData.learningPath);
        }
      } catch {
        // Ignore background learning path failure
      }
    }

    loadCaseData();
  }, [caseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] text-[#171717] font-mono flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-[#3157D5] border-t-transparent animate-spin" />
        <span className="text-sm font-black tracking-widest text-[#171717]">
          // RECONSTRUCTING CASE BRIEF DOSSIER...
        </span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] text-[#171717] font-mono p-8 flex flex-col items-center justify-center">
        <div className="stamp-classified text-sm mb-4 bg-[#F27661] text-white border-[#F27661]">
          NO CASE OPEN // NOT FOUND
        </div>
        <p className="text-[#4A4A4A] text-xs">The requested case #{caseId} could not be located in vault.</p>
        <Link href="/" className="mt-4 inline-block underline text-[#3157D5] text-xs font-bold">
          ← Return to Case Vault
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#171717] font-mono flex flex-col">
      {/* Header Bar */}
      <CaseHeader
        caseId={caseId}
        caseNumber={project.caseNumber || caseId}
        projectName={project.name}
        primaryLang={project.primaryLang || 'TypeScript'}
        totalFiles={project.totalFiles || project.files?.length || 0}
        totalSymbols={project.symbols?.length || 0}
        status={project.status}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Guided Location Indicator / Breadcrumbs */}
      <CaseBreadcrumb
        caseId={caseId}
        subsystemName="ORIENT"
        fileOrSymbolName="CASE BRIEF"
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Detective Sidebar Navigation */}
        <DetectiveSidebar caseId={caseId} />

        {/* Case Brief Narrative Report Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-8 bg-[#F5F1E8]">
          <CaseBriefReport
            caseId={caseId}
            project={project}
            learningPath={learningPath}
          />
        </main>
      </div>

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        caseId={caseId}
        files={project.files || []}
        symbols={project.symbols || []}
      />
    </div>
  );
}
