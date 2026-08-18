import { describe, it, expect } from 'vitest';
import { classifyInterrogationIntent } from '@/lib/interrogation/intent-dispatcher';

describe('Interrogation 2.0: Intent Classification & Reference Parsing', () => {
  it('should accurately classify specialized interrogation intents', () => {
    expect(classifyInterrogationIntent('Show me the code')).toBe('SOURCE');
    expect(classifyInterrogationIntent('Open source')).toBe('SOURCE');
    expect(classifyInterrogationIntent('What is the evidence?')).toBe('EVIDENCE');
    expect(classifyInterrogationIntent('Who calls it?')).toBe('WHO_CALLS');
    expect(classifyInterrogationIntent('Find callers of auth')).toBe('WHO_CALLS');
    expect(classifyInterrogationIntent('What does that call?')).toBe('WHAT_CALLS');
    expect(classifyInterrogationIntent('What happens if I delete it?')).toBe('DELETE');
    expect(classifyInterrogationIntent('What is the blast radius?')).toBe('DELETE');
    expect(classifyInterrogationIntent("I don't understand this concept")).toBe('TEACH');
    expect(classifyInterrogationIntent('Teach me the concept')).toBe('TEACH');
    expect(classifyInterrogationIntent('Test me')).toBe('CHECKPOINT');
    expect(classifyInterrogationIntent('Quiz me on this')).toBe('CHECKPOINT');
    expect(classifyInterrogationIntent("Explain like I'm five")).toBe('EXPLAIN_LIKE_12');
    expect(classifyInterrogationIntent('ELI5')).toBe('EXPLAIN_LIKE_12');
    expect(classifyInterrogationIntent('Go deeper into this function')).toBe('DEEPEN');
    expect(classifyInterrogationIntent('Is this secure?')).toBe('SECURITY');
    expect(classifyInterrogationIntent('Why does this exist?')).toBe('WHY');
    expect(classifyInterrogationIntent('what should I learn first?')).toBe('LEARNING');
    expect(classifyInterrogationIntent('how can you help me?')).toBe('HELP');
    expect(classifyInterrogationIntent("I'm confused")).toBe('CONFUSION');
    expect(classifyInterrogationIntent("I'm lost")).toBe('IM_LOST');
    expect(classifyInterrogationIntent('hey')).toBe('CASUAL');
    expect(classifyInterrogationIntent('what happens next?')).toBe('FOLLOW_UP');
    expect(classifyInterrogationIntent('roast this function')).toBe('ROAST');
    expect(classifyInterrogationIntent('explain everything')).toBe('EXPLAIN_EVERYTHING');
  });
});
