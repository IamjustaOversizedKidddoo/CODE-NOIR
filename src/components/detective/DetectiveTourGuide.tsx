'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, X, Compass, HelpCircle, CheckCircle2, Sparkles, Shield, UploadCloud } from 'lucide-react';
import { clsx } from 'clsx';

interface TourStepDef {
  id: string;
  badge: string;
  title: string;
  targetAttr: string;
  detectiveVoice: string;
  explanation: string;
  tip: string;
}

const TOUR_STEPS: TourStepDef[] = [
  {
    id: 'welcome',
    badge: 'STEP 1 OF 7 // WELCOME DETECTIVE',
    title: 'WHAT IS CODE NOIR?',
    targetAttr: 'header-logo',
    detectiveVoice:
      "Welcome to CODE NOIR. Your codebase is the case. We'll help you investigate it, understand how the pieces connect, and learn from the actual source.",
    explanation:
      'CODE NOIR is an AI-powered code investigation and learning environment. You give it a project. It investigates the project. Then it teaches you what it found.',
    tip: 'We reverse engineer exact static AST connections without executing untrusted code.',
  },
  {
    id: 'upload',
    badge: 'STEP 2 OF 7 // EVIDENCE INTAKE',
    title: 'UPLOAD YOUR PROJECT',
    targetAttr: 'upload-dropzone',
    detectiveVoice:
      'Start by giving me the evidence. You can upload a .ZIP archive or an entire project folder. (Sarcastic note: Please don’t upload your entire hard drive. We have standards.)',
    explanation:
      'I’ll inspect the files, import relationships, dependencies, and important components. We filter out clutter like node_modules and build artifacts automatically.',
    tip: 'Supports TypeScript, Python, Go, Rust, Java, Next.js, and polyglot monorepos.',
  },
  {
    id: 'case-brief',
    badge: 'STEP 3 OF 7 // STARTING POINT',
    title: '🕵️ CASE BRIEF',
    targetAttr: 'nav-case-brief',
    detectiveVoice:
      'After investigation, this is your starting point. CASE BRIEF gives you the project’s big picture without throwing hundreds of files at you.',
    explanation:
      'View project file counts, primary language, front-door entry point, and major discovered subsystems before diving into code.',
    tip: 'Don’t worry about 2,000 files—you only need to understand what matters first.',
  },
  {
    id: 'learn',
    badge: 'STEP 4 OF 7 // GUIDED ACADEMY',
    title: '🎓 LEARN',
    targetAttr: 'nav-learn',
    detectiveVoice:
      'This is where we actually learn the code. CODE NOIR chooses important parts of the project and teaches them step by step.',
    explanation:
      'Inspect representative 5–25 line code slices, plain-English metaphors ("Explain Like I’m New"), concept cards, and non-punitive interactive deduction challenges. (No 800-line wall of code. We’re civilized.)',
    tip: 'Wrong quiz answers produce "Not quite, Detective..." with evidence explanations—never insults.',
  },
  {
    id: 'ask',
    badge: 'STEP 5 OF 7 // AI REPOSITORY AGENT',
    title: '🤖 ASK THE DETECTIVE',
    targetAttr: 'nav-ask',
    detectiveVoice:
      'Confused? Interrupt me. You can ask questions about the project at any time: "How does authentication work?", "Who calls this function?", "What happens when the app starts?"',
    explanation:
      'Your AI detective partner answers using real repository evidence and supports Depth Controls: BEGINNER, INTERMEDIATE, and DEEP DIVE.',
    tip: 'If evidence cannot establish an answer, the detective states UNKNOWN instead of fabricating a story.',
  },
  {
    id: 'files',
    badge: 'STEP 6 OF 7 // EVIDENCE LOCKER',
    title: '📁 FILES',
    targetAttr: 'nav-files',
    detectiveVoice:
      'This is the evidence locker. Every file CODE NOIR discovered is stored here. You can search, open, and inspect the raw source.',
    explanation:
      'You usually don’t need to read every file. That’s what the learning path is for. But when you want to verify evidence, everything lives here.',
    tip: 'Search by role tags like CORE, SECURITY, API, DATA, or UNCONFIRMED COLD CASES.',
  },
  {
    id: 'explore',
    badge: 'STEP 7 OF 7 // ADVANCED TERRITORY',
    title: '🔎 EXPLORE',
    targetAttr: 'nav-explore',
    detectiveVoice:
      'This is where you go when curiosity gets dangerous. Inside Explore: 🕸️ Architecture, 🔬 Investigations, and 🛡️ Security Matrix. (Advanced territory. Enter at your own risk.)',
    explanation:
      'These are deeper investigation tools. You don’t need them to learn the project. But once you’re curious about how everything connects, this is where you go.',
    tip: 'Use Explore to calculate blast radius impact before refactoring or deleting modules.',
  },
];

export function DetectiveTourGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStep];

  useEffect(() => {
    // Check if onboarding tour has been completed previously
    const hasSeenTour = localStorage.getItem('casefile_onboarding_completed');
    if (!hasSeenTour) {
      setIsOpen(true);
    }

    // Global event listener to trigger tour replay from anywhere in app
    const handleReplayEvent = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    window.addEventListener('open-detective-tour', handleReplayEvent);
    return () => window.removeEventListener('open-detective-tour', handleReplayEvent);
  }, []);

  // Update target element bounding rect & scroll target into view
  useEffect(() => {
    if (!isOpen || !step) return;

    const updateRect = () => {
      const el = document.querySelector(`[data-tour="${step.targetAttr}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    const timer = setTimeout(updateRect, 300);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [isOpen, currentStep, step]);

  // Keyboard Navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('casefile_onboarding_completed', 'true');
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem('casefile_onboarding_completed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-mono select-none">
      {/* Semi-transparent Backdrop Overlay */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-xs transition-opacity duration-300" />

      {/* Target Element Highlighting Spotlight Box */}
      {targetRect && (
        <div
          className="absolute border-4 border-[#F4C542] rounded-none shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none transition-all duration-300 animate-pulse"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* Detective Briefing Callout Card */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-auto">
        <div className="bg-[#FFFFFF] border-4 border-[#171717] max-w-xl w-full p-6 shadow-[10px_10px_0px_#171717] space-y-5 text-[#171717]">
          {/* Header Strip */}
          <div className="flex items-center justify-between border-b-2 border-[#171717] pb-3">
            <span className="bg-[#3157D5] text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-wider">
              {step.badge}
            </span>
            <button
              onClick={handleSkip}
              className="text-xs font-bold text-zinc-500 hover:text-[#171717] flex items-center gap-1 transition"
              title="Skip Briefing (Esc)"
            >
              <X className="w-4 h-4" /> SKIP BRIEFING
            </button>
          </div>

          {/* Title & Narrative Body */}
          <div className="space-y-3">
            <h3 className="text-xl md:text-2xl font-black text-[#171717] uppercase tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F4C542]" />
              {step.title}
            </h3>

            {/* Sarcastic Hard-boiled Detective Voice Box */}
            <div className="bg-[#F5F1E8] border-2 border-[#171717] p-3.5 shadow-[3px_3px_0px_#171717]">
              <span className="text-[10px] font-black uppercase text-[#F27661] block mb-1">
                🕵️ LEAD INVESTIGATOR NOTE:
              </span>
              <p className="text-xs md:text-sm font-bold leading-relaxed text-[#171717] italic font-sans">
                &ldquo;{step.detectiveVoice}&rdquo;
              </p>
            </div>

            <p className="text-xs text-[#4A4A4A] leading-relaxed font-sans font-medium">
              {step.explanation}
            </p>

            <div className="bg-[#FFF9E6] border-2 border-[#F4C542] p-3 text-xs text-[#171717] font-sans">
              <strong className="font-mono text-[10px] text-[#3157D5] uppercase block mb-0.5">
                💡 DETECTIVE TIP
              </strong>
              {step.tip}
            </div>
          </div>

          {/* Footer Navigation Buttons */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-[#171717] flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(idx)}
                  className={clsx(
                    'w-3 h-3 border border-[#171717] transition-all',
                    idx === currentStep ? 'bg-[#F4C542]' : 'bg-[#E5E0D8]'
                  )}
                  title={`Step ${idx + 1}: ${s.title}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="bg-[#F5F1E8] hover:bg-[#EAE4D8] text-[#171717] font-black text-xs px-4 py-2 border-2 border-[#171717] shadow-[2px_2px_0px_#171717] flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> PREV
                </button>
              )}
              <button
                onClick={handleNext}
                className="bg-[#3157D5] hover:bg-[#2545B8] text-white font-black text-xs px-5 py-2 border-2 border-[#171717] shadow-[3px_3px_0px_#171717] transition flex items-center gap-1.5"
              >
                <span>{isLastStep ? 'LET\'S GO →' : 'NEXT STEP'}</span>
                {!isLastStep && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Replay Guide Trigger Button for Header / Sidebar / Layouts.
 */
export function ReplayDetectiveGuideButton({ className = '' }: { className?: string }) {
  const triggerReplay = () => {
    window.dispatchEvent(new CustomEvent('open-detective-tour'));
  };

  return (
    <button
      onClick={triggerReplay}
      className={clsx(
        'inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#F4C542] hover:text-white transition underline',
        className
      )}
      title="Replay Interactive Detective Tour"
    >
      <Compass className="w-3.5 h-3.5" />
      <span>🕵️ REPLAY DETECTIVE GUIDE</span>
    </button>
  );
}
