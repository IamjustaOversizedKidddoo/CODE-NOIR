import { describe, it, expect } from 'vitest';
import { isOffTopicQuery, classifyInterrogationIntent } from '@/lib/interrogation/intent-dispatcher';
import { processInterrogationMessage } from '@/lib/interrogation/conductor';

describe('Cyber Detective Scope Guard & Folder Analysis QA', () => {
  const caseId = 'test_detective_scope_case_1';

  it('1. Should classify non-project queries as OFF_TOPIC', () => {
    expect(isOffTopicQuery('What is the weather today in London?')).toBe(true);
    expect(isOffTopicQuery('Give me a recipe for chocolate cake')).toBe(true);
    expect(isOffTopicQuery('Who won the world cup?')).toBe(true);
    expect(isOffTopicQuery('Tell me a joke')).toBe(true);

    expect(classifyInterrogationIntent('What is the weather today?')).toBe('OFF_TOPIC');
    expect(classifyInterrogationIntent('Give me a recipe for chocolate cake')).toBe('OFF_TOPIC');
  });

  it('2. Should classify codebase and folder queries properly', () => {
    expect(classifyInterrogationIntent('What does this project do?')).toBe('PROJECT_OVERVIEW');
    expect(classifyInterrogationIntent('Explain this file')).toBe('EXPLAIN');
    expect(classifyInterrogationIntent('Show me the code')).toBe('SOURCE');
    expect(classifyInterrogationIntent('Who calls it?')).toBe('WHO_CALLS');
    expect(classifyInterrogationIntent('What happens if I delete it?')).toBe('DELETE');
  });

  it('3. Should return detective scope boundary refusal on off-topic questions', async () => {
    const result = await processInterrogationMessage(caseId, 'Give me a recipe for chocolate cake', {
      userId: 'detective_qa_user',
    });

    expect(result.response.content).toContain('CASE SCOPE BOUNDARY');
    expect(result.response.content).toContain('strictly bounded to the evidence inside this uploaded case file');
    expect(result.response.intent).toBe('OFF_TOPIC');
  });
});
