import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqProvider } from '@/lib/ai/providers/groq-provider';
import { GeminiProvider } from '@/lib/ai/providers/gemini-provider';
import { FallbackProvider } from '@/lib/ai/providers/fallback-provider';
import { getLLMProvider } from '@/lib/ai/providers/provider-factory';

describe('Dual AI Provider: Groq & Gemini Integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('1. GroqProvider should format request and return generated text', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Grounded Groq detective response.' } }],
      }),
    } as any);

    const provider = new GroqProvider('fake_groq_key', 'llama-3.3-70b-versatile');
    const result = await provider.generateText([{ role: 'user', content: 'What is this function?' }]);

    expect(result).toBe('Grounded Groq detective response.');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake_groq_key',
        }),
      })
    );
  });

  it('2. GroqProvider should normalize 429 rate limit errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    } as any);

    const provider = new GroqProvider('fake_groq_key');
    await expect(
      provider.generateText([{ role: 'user', content: 'hello' }])
    ).rejects.toThrow(/AI_RATE_LIMITED/);
  });

  it('3. GeminiProvider should format contents and return generated text', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Grounded Gemini response.' }] } }],
      }),
    } as any);

    const provider = new GeminiProvider('fake_gemini_key', 'gemini-2.5-flash');
    const result = await provider.generateText([{ role: 'user', content: 'Explain this module.' }]);

    expect(result).toBe('Grounded Gemini response.');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('4. FallbackProvider should switch from primary to secondary provider when primary fails', async () => {
    const primary = {
      id: 'groq',
      name: 'Groq',
      generateText: vi.fn().mockRejectedValue(new Error('Rate limit 429')),
      generateStructured: vi.fn().mockRejectedValue(new Error('Rate limit 429')),
      streamText: vi.fn(),
    };

    const secondary = {
      id: 'gemini',
      name: 'Gemini',
      generateText: vi.fn().mockResolvedValue('Fallback Gemini answer'),
      generateStructured: vi.fn().mockResolvedValue({ status: 'ok' }),
      streamText: vi.fn(),
    };

    const fallback = new FallbackProvider(primary as any, secondary as any);
    const result = await fallback.generateText([{ role: 'user', content: 'test' }]);

    expect(result).toBe('Fallback Gemini answer');
    expect(primary.generateText).toHaveBeenCalled();
    expect(secondary.generateText).toHaveBeenCalled();
  });

  it('5. FallbackProvider should fall back to deterministic mock when both fail', async () => {
    const primary = {
      id: 'groq',
      name: 'Groq',
      generateText: vi.fn().mockRejectedValue(new Error('Network error')),
      generateStructured: vi.fn(),
      streamText: vi.fn(),
    };

    const secondary = {
      id: 'gemini',
      name: 'Gemini',
      generateText: vi.fn().mockRejectedValue(new Error('Gemini quota exceeded')),
      generateStructured: vi.fn(),
      streamText: vi.fn(),
    };

    const fallback = new FallbackProvider(primary as any, secondary as any);
    const result = await fallback.generateText([{ role: 'user', content: 'test' }]);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('6. getLLMProvider should instantiate correctly from configuration', () => {
    const groqOnly = getLLMProvider({
      provider: 'groq',
      groqApiKey: 'gsk_test',
      fallbackProvider: undefined,
    });
    expect(groqOnly.id).toBe('groq');

    const geminiOnly = getLLMProvider({
      provider: 'gemini',
      geminiApiKey: 'gemini_test',
      fallbackProvider: undefined,
    });
    expect(geminiOnly.id).toBe('gemini');

    const withFallback = getLLMProvider({
      provider: 'groq',
      groqApiKey: 'gsk_test',
      fallbackProvider: 'gemini',
      geminiApiKey: 'gemini_test',
    });
    expect(withFallback.id).toContain('fallback(groq->gemini)');
  });
});
