import { CrimeTape } from '@/components/ui/CrimeTape';
import { EvidenceBadge } from '@/components/ui/EvidenceBadge';
import { CaseDropzone } from '@/components/landing/CaseDropzone';
import { DetectiveBriefingTour, ReplayGuideButton } from '@/components/detective/DetectiveBriefingTour';
import { Cpu, Terminal, BookOpen } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col justify-between relative overflow-hidden bg-black">

      {/* Interactive First-Time Guided Tour */}
      <DetectiveBriefingTour />

      {/* Top Classified Header Bar */}
      <header className="border-b-4 border-zinc-800 bg-zinc-950 text-white px-4 md:px-8 py-3 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-[#F4C542] border border-zinc-700"></span>
            <span className="font-mono font-black text-sm tracking-widest text-[#F4C542]">
              BUREAU OF CODEBASE INVESTIGATION // DIV-04
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ReplayGuideButton className="text-zinc-300 hover:text-white" />
            <span className="text-zinc-600">â€¢</span>
            <span className="font-mono text-xs font-bold text-zinc-400">
              CLEARANCE: TOP SECRET
            </span>
            <div className="stamp-classified text-[10px] py-0.5 px-2 bg-[#F27661] text-white border-[#F27661]">
              EVIDENCE VAULT
            </div>
          </div>
        </div>
      </header>

      {/* Crime Tape Top Banner */}
      <CrimeTape text="CRIME SCENE INVESTIGATION // UNFAMILIAR REPOSITORY DETECTED // RECONSTRUCTING SCENE" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-16 pb-8 w-full relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <EvidenceBadge label="INVESTIGATION ENGINE" variant="coral" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">
              CODE NOIR // 2026 EDITION
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white leading-[0.95] mb-4">
            CODE NOIR
          </h1>
          <p className="font-mono text-lg sm:text-2xl font-black uppercase tracking-wide text-[#3157D5] mb-6">
            Every codebase has a story. Investigate it.
          </p>

          <p className="font-mono text-sm sm:text-base md:text-lg text-zinc-300 font-bold max-w-2xl mx-auto mb-4 leading-relaxed">
            Upload a project. Follow the evidence. Learn how the pieces actually work.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="font-mono text-xs md:text-sm text-[#171717] font-black tracking-wide bg-[#8ED8B0] border-2 border-zinc-700 py-1.5 px-4 inline-block shadow-[3px_3px_0px_#F4C542]">
              &quot;Don&apos;t worry. We won&apos;t judge your code. Much.&quot;
            </div>
            <ReplayGuideButton className="bg-zinc-900 border-2 border-zinc-700 px-3 py-1.5 shadow-[2px_2px_0px_#F4C542] text-white no-underline font-black hover:bg-zinc-800" />
          </div>
        </div>

        {/* Dropzone Evidence Terminal */}
        <CaseDropzone />

        {/* Investigative Pillars / Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
          {/* Card 1: AST Graph */}
          <div className="bg-zinc-900 border-3 border-zinc-700 p-6 shadow-[6px_6px_0px_#F4C542] relative hover:-translate-y-1 transition-all">
            <div className="w-8 h-8 bg-[#3157D5] text-white border-2 border-zinc-700 flex items-center justify-center mb-4 shadow-[2px_2px_0px_#F4C542]">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="font-mono text-xs font-black text-[#3157D5] mb-1">01 // RECONSTRUCTION</div>
            <h3 className="text-lg font-mono font-black uppercase text-white mb-2">
              DETERMINISTIC AST GRAPH
            </h3>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              We never guess file imports or call chains. Deterministic parsers reconstruct exact caller/callee connections, entry points, and blast radii.
            </p>
          </div>

          {/* Card 2: Interrogation Room */}
          <div className="bg-zinc-900 border-3 border-zinc-700 p-6 shadow-[6px_6px_0px_#F4C542] relative hover:-translate-y-1 transition-all">
            <div className="w-8 h-8 bg-[#F4C542] text-[#171717] border-2 border-zinc-700 flex items-center justify-center mb-4 shadow-[2px_2px_0px_#F4C542]">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="font-mono text-xs font-black text-zinc-400 mb-1">02 // INTERROGATION</div>
            <h3 className="text-lg font-mono font-black uppercase text-white mb-2">
              INTERROGATE THE CODE
            </h3>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Conduct structured conversational investigations backed by real source citations, grounded AI, and a sharp detective persona.
            </p>
          </div>

          {/* Card 3: Adaptive Teaching */}
          <div className="bg-zinc-900 border-3 border-zinc-700 p-6 shadow-[6px_6px_0px_#F4C542] relative hover:-translate-y-1 transition-all">
            <div className="w-8 h-8 bg-[#B8A7E8] text-[#171717] border-2 border-zinc-700 flex items-center justify-center mb-4 shadow-[2px_2px_0px_#F4C542]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="font-mono text-xs font-black text-[#3157D5] mb-1">03 // CURRICULUM</div>
            <h3 className="text-lg font-mono font-black uppercase text-white mb-2">
              STEP-BY-STEP COURSE
            </h3>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Transform the repository into an adaptive 0-10 level mastery path with interactive quizzes, architecture breakdowns, and forensic security audits.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-zinc-800 bg-zinc-950 text-white py-6 px-4 md:px-8 mt-16 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#F4C542]">CODE NOIR</span>
            <span className="text-zinc-500">// CODEBASE INVESTIGATION 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <ReplayGuideButton className="text-zinc-300 hover:text-white" />
            <span className="text-zinc-600">â€¢</span>
            <span className="text-zinc-500">
              DETERMINISTIC CODE INTELLIGENCE â€¢ ZERO REPOSITORY HALLUCINATION
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
