import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { validateClaimsAgainstDatabase } from '@/lib/ai/validation/claim-validator';
import { GroundedAIResponse } from '@/lib/ai/types';

describe('ClaimValidator: Anti-Hallucination Guard', () => {
  let testProjectId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: {
        caseNumber: 'CASE-2026-VAL1',
        name: 'Validator Test Project',
        status: 'READY',
        storagePath: '',
      },
    });
    testProjectId = project.id;

    const file = await prisma.projectFile.create({
      data: {
        projectId: testProjectId,
        path: 'src/real_file.ts',
        extension: '.ts',
        hash: 'h1',
      },
    });

    await prisma.codeSymbol.create({
      data: {
        projectId: testProjectId,
        fileId: file.id,
        name: 'realFunction',
        kind: 'FUNCTION',
        startLine: 1,
        endLine: 10,
      },
    });
  });

  afterAll(async () => {
    if (testProjectId) {
      try {
        await prisma.project.delete({ where: { id: testProjectId } });
      } catch {}
    }
  });

  it('should preserve valid citations and reject hallucinated files/symbols', async () => {
    const aiResponse: GroundedAIResponse = {
      answer: 'This is an explanation citing real and fake evidence.',
      keyPoints: [],
      evidence: [
        {
          file: 'src/real_file.ts',
          line: 5,
          reason: 'Valid citation',
          confidence: 'CONFIRMED',
        },
        {
          file: 'src/fake_hallucinated_file.ts', // Does not exist
          line: 10,
          reason: 'Hallucinated citation',
          confidence: 'CONFIRMED',
        },
      ],
      confidence: 'CONFIRMED',
      uncertainties: [],
      relatedEntities: [],
      nextQuestions: [],
      claimClassification: { facts: 2, inferences: 0, hypotheses: 0, unknowns: 0 },
      validated: false,
    };

    const validated = await validateClaimsAgainstDatabase(testProjectId, aiResponse);

    // Only real file citation preserved
    expect(validated.evidence.length).toBe(1);
    expect(validated.evidence[0].file).toBe('src/real_file.ts');

    // Warnings generated
    expect(validated.warnings).toBeDefined();
    expect(validated.warnings?.[0]).toContain('fake_hallucinated_file.ts');

    // Confidence downgraded from CONFIRMED -> LIKELY due to warning
    expect(validated.confidence).toBe('LIKELY');
  });
});
