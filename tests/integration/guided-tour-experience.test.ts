import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import { processInterrogationMessage } from '@/lib/interrogation/conductor';
import { generateLearningPathForProject } from '@/lib/teaching/engine';
import { createTypeScriptProjectFixture } from '../fixtures/helpers';

describe('Integration: Phase 14 Guided Detective Tour & Overhauled Learning Experience', () => {
  let testProjectId: string;

  beforeAll(async () => {
    const zip = createTypeScriptProjectFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Guided Experience Case' });
    testProjectId = result.projectId;
  });

  afterAll(async () => {
    try {
      if (testProjectId) await prisma.project.delete({ where: { id: testProjectId } });
    } catch {}
  });

  it('1. should generate a guided learning path with orientation dossior and file records', async () => {
    const path = await generateLearningPathForProject(testProjectId, { difficulty: 'BEGINNER' });

    expect(path.id).toBeDefined();
    expect(path.orientation).toBeDefined();
    expect(path.orientation?.frontDoorEntry).toBeDefined();
    expect(path.orientation?.totalFiles).toBeGreaterThan(0);
    expect(path.fileGroups?.mainSuspects.length).toBeGreaterThan(0);
    expect(path.curriculumDAG).toBeDefined();
  });

  it('2. should format interrogation responses with structured detective sections and citations', async () => {
    const res = await processInterrogationMessage(testProjectId, 'Who calls authenticateUser?');

    expect(res.response).toBeDefined();
    expect(res.response.content).toBeDefined();
    expect(res.response.confidence).toBeDefined();
    expect(res.response.citations).toBeDefined();
  });

  it('3. should return UNKNOWN when queried for historical or impossible non-code facts', async () => {
    const res = await processInterrogationMessage(
      testProjectId,
      'Who originally wrote this code in 2012?'
    );

    expect(res.response.confidence).toBe('UNKNOWN');
    expect(res.response.content).toContain('NOT ESTABLISHED BY REPOSITORY EVIDENCE');
  });
});
