import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import { processInterrogationMessage } from '@/lib/interrogation/conductor';
import { createTypeScriptProjectFixture } from '../fixtures/helpers';

describe('Integration: Phase 8 Interrogation System 2.0 & Golden Conversation Chain', () => {
  let testProjectId: string;

  beforeAll(async () => {
    const zip = createTypeScriptProjectFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Interrogation Golden Case' });
    testProjectId = result.projectId;
  });

  afterAll(async () => {
    try {
      if (testProjectId) await prisma.project.delete({ where: { id: testProjectId } });
    } catch {}
  });

  it('Golden Test 1: User asks "Explain createAuthService"', async () => {
    const { session, response } = await processInterrogationMessage(
      testProjectId,
      'Explain createAuthService',
      { userId: 'detective_gold' }
    );

    expect(response.content).toContain('createAuthService');
    expect(response.confidence).toBe('CONFIRMED');
    expect(session.currentEntity?.name).toBe('createAuthService');
    expect(response.citations?.length).toBeGreaterThan(0);
  });

  it('Golden Test 2: User asks follow-up "Who calls it?" (Pronoun resolution to createAuthService)', async () => {
    const { session, response } = await processInterrogationMessage(
      testProjectId,
      'Who calls it?',
      { userId: 'detective_gold' }
    );

    expect(response.intent).toBe('WHO_CALLS');
    expect(response.content).toContain('createAuthService');
    expect(session.leadStack.length).toBeGreaterThan(1);
  });

  it('Golden Test 3: User asks follow-up "What does that call?" (Pronoun resolution to caller entity)', async () => {
    const { session, response } = await processInterrogationMessage(
      testProjectId,
      'What does that call?',
      { userId: 'detective_gold' }
    );

    expect(response.intent).toBe('WHAT_CALLS');
    expect(session.leadStack.length).toBeGreaterThan(1);
  });

  it('Golden Test 4: User asks "Show me the code"', async () => {
    const { response } = await processInterrogationMessage(
      testProjectId,
      'Show me the code',
      { userId: 'detective_gold' }
    );

    expect(response.intent).toBe('SOURCE');
    expect(response.citations?.length).toBeGreaterThan(0);
    expect(response.citations?.[0].file).toBeDefined();
  });

  it('Golden Test 5: User asks "What happens if I delete it?" (Blast radius computation)', async () => {
    const { response } = await processInterrogationMessage(
      testProjectId,
      'What happens if I delete it?',
      { userId: 'detective_gold' }
    );

    expect(response.intent).toBe('DELETE');
    expect(response.blastRadius).toBeDefined();
    expect(response.content.toLowerCase()).toContain('impact');
  });

  it('Golden Test 6: User says "I don\'t understand the dependency" (Teaching detour)', async () => {
    const { response } = await processInterrogationMessage(
      testProjectId,
      "I don't understand the dependency",
      { userId: 'detective_gold' }
    );

    expect(response.intent).toBe('TEACH');
    expect(response.teachingDetour).toBeDefined();
    expect(response.teachingDetour?.conceptName).toBeDefined();
  });

  it('Golden Test 7: User says "Okay, test me." (Interactive Checkpoint)', async () => {
    const { response } = await processInterrogationMessage(
      testProjectId,
      'Okay, test me.',
      { userId: 'detective_gold' }
    );

    expect(response.intent).toBe('CHECKPOINT');
    expect(response.checkpointQuestion).toBeDefined();
    expect(response.checkpointQuestion?.prompt).toBeDefined();
  });
});
