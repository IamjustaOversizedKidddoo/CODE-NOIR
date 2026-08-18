import { describe, it, expect } from 'vitest';
import { evaluateLessonAnswer } from '@/lib/teaching/answer-evaluator';
import { InteractiveQuestionDef } from '@/lib/teaching/types';

describe('AnswerEvaluator: Semantic Question Grading & Prerequisite Detour Flagging', () => {
  const sampleQuestion: InteractiveQuestionDef = {
    id: 'q_test_1',
    type: 'REASONING',
    prompt: 'Why are dependencies declared in package.json?',
    expectedAnswerHint: 'deterministic version pinning',
    explanation: 'Package manifests pin versions for reproducible builds.',
    relatedConceptNames: ['Environment & Configuration Management'],
    rubric: {
      keyPoints: ['deterministic', 'version', 'reproducibility'],
      misconceptions: ['faster execution'],
    },
  };

  it('should mark correct answers with high score and positive praise', async () => {
    const evalResult = await evaluateLessonAnswer(
      'lesson_1',
      'To enable deterministic version pinning and reproducible builds',
      sampleQuestion
    );

    expect(evalResult.status).toBe('CORRECT');
    expect(evalResult.score).toBe(1.0);
    expect(evalResult.praise).toContain('Excellent deduction');
  });

  it('should mark partial answers and indicate missing concepts', async () => {
    const evalResult = await evaluateLessonAnswer(
      'lesson_1',
      'It manages the version of packages for the system so we know what is installed',
      sampleQuestion
    );

    expect(evalResult.status).toBe('PARTIALLY_CORRECT');
    expect(evalResult.score).toBeGreaterThan(0);
  });

  it('should mark incorrect answers and recommend a prerequisite detour', async () => {
    const evalResult = await evaluateLessonAnswer(
      'lesson_1',
      'It makes the CPU run at double frequency',
      sampleQuestion
    );

    expect(evalResult.status).toBe('INCORRECT');
    expect(evalResult.score).toBe(0.0);
    expect(evalResult.recommendedDetour).toBeDefined();
    expect(evalResult.recommendedDetour?.conceptName).toBe('Environment & Configuration Management');
  });
});
