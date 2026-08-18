import { describe, it, expect, beforeEach } from 'vitest';
import { processInterrogationMessage } from '@/lib/interrogation/conductor';
import { resolveConversationalEntity } from '@/lib/interrogation/reference-resolver';
import { getOrCreateInterrogationSession } from '@/lib/interrogation/session';

describe('Conversational AI Engine & Memory QA', () => {
  const caseId = 'test_case_convo_123';

  it('should not force entry point entity on general questions like "how can you help me?"', async () => {
    const session = await getOrCreateInterrogationSession(caseId, 'test_user_1');
    const res = await resolveConversationalEntity('how can you help me?', session);

    expect(res.resolvedFrom).toBe('NONE');
    expect(res.entity).toBeUndefined();
  });

  it('should respond uniquely to "what should I learn first?" and not return generic file count summary', async () => {
    const result = await processInterrogationMessage(caseId, 'what should I learn first?', {
      userId: 'test_user_2',
    });

    expect(result.response.content).toContain("I'd start with");
    expect(result.response.intent).toBe('LEARNING');
  });

  it('should respond appropriately to "how can you help me?" as a mentor', async () => {
    const result = await processInterrogationMessage(caseId, 'how can you help me?', {
      userId: 'test_user_3',
    });

    expect(result.response.content).toContain('flashlight');
    expect(result.response.intent).toBe('HELP');
  });

  it('should handle confusion gracefully with interactive choices', async () => {
    const result = await processInterrogationMessage(caseId, "I'm confused", {
      userId: 'test_user_4',
    });

    expect(result.response.content).toContain('Confusion detected');
    expect(result.response.checkpointQuestion).toBeDefined();
    expect(result.response.checkpointQuestion?.options?.length).toBeGreaterThan(0);
  });

  it('should handle "I\'m lost" by simplifying navigation', async () => {
    const result = await processInterrogationMessage(caseId, "I'm lost", {
      userId: 'test_user_5',
    });

    expect(result.response.content).toContain('simplify');
    expect(result.response.intent).toBe('IM_LOST');
  });

  it('should trigger repetition guard if user asks distinct questions and rawFact matches prior message', async () => {
    const session = await getOrCreateInterrogationSession(caseId, 'test_user_6');
    session.messages = [];

    const res1 = await processInterrogationMessage(caseId, 'what should I learn first?', {
      userId: 'test_user_6',
    });
    const res2 = await processInterrogationMessage(caseId, 'how can you help me?', {
      userId: 'test_user_6',
    });

    expect(res1.response.content).not.toBe(res2.response.content);
  });

  it('should refuse unsupported historical or non-code questions naturally', async () => {
    const result = await processInterrogationMessage(caseId, 'Does this application use quantum computing?', {
      userId: 'test_user_7',
    });

    expect(result.response.content).toContain('NOT ESTABLISHED BY REPOSITORY EVIDENCE');
    expect(result.response.confidence).toBe('UNKNOWN');
  });
});
