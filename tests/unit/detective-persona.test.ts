import { describe, it, expect } from 'vitest';
import {
  transformFactualResponse,
  generateCaseOpeningBriefing,
  generateCaseClosureReport,
  generateFileDossierIntro,
  generateFunctionSubjectIntro,
  generateLessonMissionOpening,
  generateMarginalia,
} from '@/lib/persona/engine';
import { PersonaContext, SarcasmLevel } from '@/lib/persona/types';

describe('Phase 7: Detective Persona & Presentation Layer', () => {
  const baseContext: PersonaContext = {
    fact: 'authenticateUser() delegates token verification to verifyPassword().',
    confidence: 'CONFIRMED',
    evidence: {
      file: 'src/auth/authenticate.ts',
      startLine: 42,
      endLine: 48,
      symbolName: 'authenticateUser',
    },
    sourceEntity: 'authenticateUser',
    targetEntity: 'verifyPassword',
    relationship: 'CALLS',
    sarcasmLevel: 2,
  };

  it('1. should preserve factual truth and entities while applying detective tone', () => {
    const result = transformFactualResponse(baseContext);

    expect(result.rawFactPreserved).toBe(true);
    expect(result.factualExplanation).toBe(baseContext.fact);
    expect(result.confidence).toBe('CONFIRMED');
    expect(result.evidenceCitation).toBe('src/auth/authenticate.ts:42-48');
    expect(result.detectiveOpening).toBeDefined();
    expect(result.nextLeads.length).toBeGreaterThan(0);
  });

  it('2. should support all 6 sarcasm levels (0 to 5) properly', () => {
    const levels: SarcasmLevel[] = [0, 1, 2, 3, 4, 5];

    for (const lvl of levels) {
      const res = transformFactualResponse({ ...baseContext, sarcasmLevel: lvl });
      if (lvl === 0) {
        expect(res.detectiveOpening).toBeUndefined();
      } else {
        expect(res.detectiveOpening).toBeDefined();
      }
      expect(res.factualExplanation).toBe(baseContext.fact);
    }
  });

  it('3. should generate dead-end commentary when confidence is UNKNOWN and never claim confirmed links', () => {
    const unknownContext: PersonaContext = {
      fact: 'Could not resolve handler for route /api/v2/mystery.',
      confidence: 'UNKNOWN',
      sarcasmLevel: 3,
    };

    const res = transformFactualResponse(unknownContext);
    expect(res.confidence).toBe('UNKNOWN');
    expect(res.detectiveOpening?.toLowerCase()).toContain('dead end');
  });

  it('4. should roast giant modules and cyclic dependencies without attacking the human', () => {
    const giantFileContext: PersonaContext = {
      fact: 'GodModule handles routing, persistence, email, and logging.',
      confidence: 'CONFIRMED',
      lineCount: 650,
      hasCycle: true,
      sarcasmLevel: 4,
    };

    const res = transformFactualResponse(giantFileContext);
    expect(res.detectiveCommentary).toContain('Circular dependency');
  });

  it('5. should recognize clean architecture with positive compliments', () => {
    const cleanContext: PersonaContext = {
      fact: 'Tokenizer parses stream into AST tokens.',
      confidence: 'CONFIRMED',
      lineCount: 45,
      relationship: 'IMPORTS',
      sarcasmLevel: 2,
    };

    const res = transformFactualResponse(cleanContext);
    expect(res.detectiveCommentary).toContain('Clean, focused module');
  });

  it('6. should generate dramatic case opening briefings and closure reports', () => {
    const opening = generateCaseOpeningBriefing(
      {
        name: 'Strix Core',
        caseNumber: 'CASE-2026-042',
        fileCount: 24,
        symbolCount: 142,
        primaryLang: 'TypeScript',
      },
      3
    );

    expect(opening).toContain('Strix Core');
    expect(opening).toContain('24 files');

    const closure = generateCaseClosureReport(
      {
        overallScore: 92,
        masteredConcepts: ['AST', 'DI', 'Prisma'],
        completedLessonsCount: 10,
        totalLessonsCount: 10,
      },
      2
    );

    expect(closure).toContain('CASE CLEARED');
    expect(closure).toContain('92%');
  });

  it('7. should generate mission openings and marginalia markers', () => {
    const mission = generateLessonMissionOpening(
      { level: 3, title: 'The Boot Sequence', objective: 'Inspect entry point' },
      2
    );

    expect(mission).toContain('MISSION 03');
    expect(mission).toContain('THE BOOT SEQUENCE');

    const hotspotNote = generateMarginalia('HOTSPOT');
    expect(hotspotNote).toContain('ARCHITECTURAL DENSITY');
  });
});
