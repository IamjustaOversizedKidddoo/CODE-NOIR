import {
  SarcasmLevel,
  PersonaContext,
  TransformedPersonaOutput,
  NextLeadSuggestion,
} from './types';
import {
  getOpeningByTone,
  generateCodeRoast,
  generateCodeCompliment,
  generateNextLeads,
} from './commentary-generator';

export function transformFactualResponse(context: PersonaContext): TransformedPersonaOutput {
  const level: SarcasmLevel = context.sarcasmLevel ?? 2;
  const isUnknown = context.confidence === 'UNKNOWN' || context.confidence === 'UNRESOLVED';

  // 1. Detective opening
  const openingType = isUnknown ? 'UNKNOWN' : context.hasCycle ? 'WARNING' : 'CONFIRMED';
  const detectiveOpening = getOpeningByTone(openingType, level);

  // 2. Roast or compliment commentary
  let detectiveCommentary = generateCodeRoast(context);
  if (!detectiveCommentary) {
    detectiveCommentary = generateCodeCompliment(context);
  }

  // 3. Evidence citation formatting
  let evidenceCitation: string | undefined;
  if (context.evidence?.file) {
    evidenceCitation = `${context.evidence.file}${
      context.evidence.startLine ? `:${context.evidence.startLine}` : ''
    }${
      context.evidence.endLine ? `-${context.evidence.endLine}` : ''
    }`;
  }

  // 4. Extract next leads
  const nextLeads = generateNextLeads(context);

  return {
    detectiveOpening: level > 0 ? detectiveOpening : undefined,
    factualExplanation: context.fact,
    detectiveCommentary: level > 0 ? detectiveCommentary : undefined,
    confidence: context.confidence,
    evidenceCitation,
    nextLeads,
    rawFactPreserved: true,
  };
}

export function generateCaseOpeningBriefing(
  project: {
    name: string;
    caseNumber: string;
    fileCount: number;
    symbolCount: number;
    primaryLang: string;
  },
  level: SarcasmLevel = 2
): string {
  if (level === 0) {
    return `Case ${project.caseNumber} opened for ${project.name}. Repository contains ${project.fileCount} files and ${project.symbolCount} symbols in ${project.primaryLang}.`;
  }

  const briefings: Record<number, string> = {
    1: `CODE NOIR dossier opened: ${project.name}. We've indexed ${project.fileCount} files and ${project.symbolCount} symbols in ${project.primaryLang}. Let's begin the static audit.`,
    2: `Alright, detective. Someone uploaded "${project.name}" and apparently expects us to reconstruct it.\n\nWe have ${project.fileCount} files, ${project.symbolCount} AST symbols, and zero room for guesswork.\n\nLet's follow the evidence.`,
    3: `CASE DOSSIER OPENED // ${project.name}\n\nWe're staring at ${project.fileCount} files and ${project.symbolCount} code symbols written in ${project.primaryLang}.\n\nTime to find out what this codebase is doing and why nobody documented it.`,
    4: `CRIME SCENE SECURED: ${project.name}\n\n${project.fileCount} files and ${project.symbolCount} symbols to interrogate. Hopefully whoever architected this left some alibis in the imports. Let's dig in.`,
    5: `🚨 EMERGENCY CASE FILE LOADED: ${project.name} 🚨\n\n${project.fileCount} FILES. ${project.symbolCount} SYMBOLS. ONE DIGITAL CRIME SCENE.\n\nBrace yourself. We're about to tear through the AST multigraph.`,
  };

  return briefings[level] || briefings[2];
}

export function generateCaseClosureReport(
  report: {
    overallScore: number;
    masteredConcepts: string[];
    completedLessonsCount: number;
    totalLessonsCount: number;
  },
  level: SarcasmLevel = 2
): string {
  if (level === 0) {
    return `Project investigation completed. Final comprehension score: ${report.overallScore}%. Mastered concepts: ${report.masteredConcepts.length}.`;
  }

  if (report.overallScore >= 80) {
    return `CASE CLEARED // SUSPECT CODEBASE CONQUERED\n\nYou've reconstructed the architecture, survived the call graphs, and scored ${report.overallScore}%. The codebase has officially run out of hiding spots. Excellent deduction work.`;
  }

  return `CASE INCONCLUSIVE // PARTIAL COMPREHENSION\n\nYou completed ${report.completedLessonsCount}/${report.totalLessonsCount} missions with an overall score of ${report.overallScore}%. The core concepts are taking shape, but some suspect subsystems still warrant further interrogation.`;
}

export function generateFileDossierIntro(
  file: { path: string; lineCount: number; isEntry: boolean },
  level: SarcasmLevel = 2
): string {
  if (level === 0) return `File: ${file.path} (${file.lineCount} lines).`;

  if (file.isEntry) {
    return `SUSPECT IDENTIFIED // FRONT DOOR GATEWAY: "${file.path}"\nThis is where execution begins. All trails lead back to this entry point.`;
  }

  return `SUSPECT IDENTIFIED: "${file.path}"\nContaining ${file.lineCount} lines of static evidence. Let's inspect its call dependencies.`;
}

export function generateFunctionSubjectIntro(
  symbol: { name: string; kind: string; filePath: string },
  level: SarcasmLevel = 2
): string {
  if (level === 0) return `Symbol: ${symbol.name} (${symbol.kind}) in ${symbol.filePath}.`;

  return `MEET THE SUBJECT: \`${symbol.name}()\` [${symbol.kind}]\nLocated at \`${symbol.filePath}\`. Let's trace who invokes it and what it mutates.`;
}

export function generateLessonMissionOpening(
  lesson: { level: number; title: string; objective: string },
  level: SarcasmLevel = 2
): string {
  if (level === 0) return `Lesson ${lesson.level}: ${lesson.title}. Objective: ${lesson.objective}.`;

  return `MISSION 0${lesson.level} // ${lesson.title.toUpperCase()}\n\n"Software rarely explains itself, so we're extracting the truth directly from the source."\n\nObjective: ${lesson.objective}`;
}

export function generateMarginalia(type: 'HOTSPOT' | 'CYCLIC' | 'ENTRY' | 'DEAD_END' | 'MATCH'): string {
  const notes = {
    HOTSPOT: '⚠️ HIGH ARCHITECTURAL DENSITY',
    CYCLIC: '🔄 CIRCULAR DEPENDENCY DETECTED',
    ENTRY: '🚪 SYSTEM FRONT DOOR',
    DEAD_END: '🚫 DEAD END // NO EVIDENCE',
    MATCH: '✓ EVIDENCE CORROBORATED',
  };
  return notes[type] || '📌 NOTE';
}
