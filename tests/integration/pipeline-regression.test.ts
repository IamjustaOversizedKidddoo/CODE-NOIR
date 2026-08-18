import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import { runDirectFilesIngestionPipeline } from '@/lib/ingestion/pipeline';
import { runInvestigation } from '@/lib/investigation/engine';
import { getOrCreateLearningPath } from '@/lib/teaching/engine';
import { processInterrogationMessage } from '@/lib/interrogation/conductor';
import { runInterrogationPipeline } from '@/lib/ai/pipeline';
import { validateAIResponse } from '@/lib/ai/schemas/response-schema';

describe('Targeted Pipeline Regression Suite', () => {
  let caseId: string;

  beforeAll(async () => {
    const baseDir = path.resolve('tests/fixtures/test-project');
    const relativeFiles = [
      'package.json',
      'README.md',
      'src/auth.ts',
      'src/user.ts',
      'src/database.ts'
    ];

    const directInputs = relativeFiles.map(rel => ({
      relativePath: rel,
      buffer: fs.readFileSync(path.join(baseDir, rel))
    }));

    const result = await runDirectFilesIngestionPipeline(directInputs, {
      projectName: 'Regression Test Project'
    });
    caseId = result.projectId;
  });

  afterAll(async () => {
    try {
      await prisma.project.delete({ where: { id: caseId } });
    } catch {}
  });

  it('1. Ingestion: Case, Files, Symbols, CallEdges, Security Findings created', async () => {
    const project = await prisma.project.findUnique({
      where: { id: caseId },
      include: {
        files: true,
        symbols: true,
        dependencies: true,
        findings: true,
        securityFindings: true,
      }
    });

    expect(project).not.toBeNull();
    expect(project?.status).toBe('READY');
    expect(project?.files.length).toBe(5);
    expect(project?.symbols.length).toBeGreaterThanOrEqual(4);

    const authSym = project?.symbols.find((s) => s.name === 'authenticateUser');
    expect(authSym).toBeDefined();

    const callEdges = await prisma.callEdge.findMany({ where: { projectId: caseId } });
    expect(callEdges.length).toBeGreaterThan(0);
  });

  it('2. Symbol Investigation: TRACE CALLERS & CALLEES for authenticateUser', async () => {
    const callFlow = await runInvestigation(caseId, {
      type: 'CALL_FLOW',
      targetEntity: 'authenticateUser',
    });

    expect(callFlow.title).toContain('authenticateUser');
    expect(callFlow.steps.length).toBeGreaterThan(0);
    const calleesStep = callFlow.steps.find((s) => s.targetEntity.name === 'findUser');
    expect(calleesStep).toBeDefined();
  });

  it('3. Investigation Engine: Blast Radius for verifyPassword symbol', async () => {
    const blastFlow = await runInvestigation(caseId, {
      type: 'BLAST_RADIUS',
      targetEntity: 'verifyPassword',
    });

    expect(blastFlow.title).toContain('verifyPassword');
    expect(blastFlow.steps.length).toBeGreaterThan(0);
  });

  it('4. Learning Engine: Learning Path and Lessons created with real symbol evidence', async () => {
    const pathData = await getOrCreateLearningPath(caseId);

    expect(pathData).toBeDefined();
    expect(pathData.modules.length).toBe(4);

    const allLessons = pathData.modules.flatMap((m: any) => m.lessons as any[]);
    expect(allLessons.length).toBeGreaterThan(0);

    const authLesson = allLessons.find((l: any) => l.title.includes('authenticateUser'));
    expect(authLesson).toBeDefined();
    expect(authLesson?.evidence[0]?.file).toBe('src/auth.ts');
  });

  it('5. Response Normalization: Normalizes snake_case keys correctly', () => {
    const rawSnakeCase = {
      answer: 'Test explanation',
      key_points: ['Point 1'],
      next_questions: ['Q1?'],
      related_entities: ['EntityA'],
      claim_classification: { facts: 1, inferences: 0, hypotheses: 0, unknowns: 0 },
      citations: [{ file: 'src/auth.ts', line: 3, reason: 'Test reason' }],
    };

    const normalized = validateAIResponse(rawSnakeCase);
    expect(normalized.validated).toBe(true);
    expect(normalized.keyPoints).toEqual(['Point 1']);
    expect(normalized.nextQuestions).toEqual(['Q1?']);
    expect(normalized.evidence.length).toBe(1);
  });

  it('6. Interrogation: Deterministic Fallback returns symbol-grounded evidence', async () => {
    const processResult = await processInterrogationMessage(caseId, 'What does authenticateUser do?');
    const msg = processResult.response;

    expect(msg.role).toBe('detective');
    expect(msg.content).toContain('authenticateUser');
    expect(msg.content).toContain('src/auth.ts');
    const citations = msg.citations as any[];
    expect(citations && citations.length).toBeGreaterThan(0);
    expect(citations[0].file).toBe('src/auth.ts');
  });

  it('7. Interrogation: Unknown / Impossible historical question handled correctly', async () => {
    const processResult = await processInterrogationMessage(
      caseId,
      'Who originally wrote this function in 2021?'
    );
    const msg = processResult.response;

    expect(msg.content).toContain('NOT ESTABLISHED BY REPOSITORY EVIDENCE');
    expect(msg.confidence).toBe('UNKNOWN');
  });
});
