import { LLMMessage, LLMGenerateOptions } from '../types';
import { LLMProvider } from './provider-interface';

function extractJson(raw: string): any {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  throw new Error(`Failed to parse JSON: ${trimmed.slice(0, 300)}`);
}

export class GroqProvider implements LLMProvider {
  public readonly id = 'groq';
  public readonly name = 'Groq';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(
    apiKey: string,
    model: string = process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    baseUrl: string = 'https://api.groq.com/openai/v1'
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  public async generateText(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string> {
    const payload: any = {
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 4096,
    };

    if (options?.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs || 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 429) {
          throw new Error(`[AI_RATE_LIMITED] Groq rate limit reached (429): ${errorText}`);
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error(`[AI_AUTHENTICATION_FAILED] Groq authentication failed (${res.status}): ${errorText}`);
        }
        throw new Error(`[AI_PROVIDER_ERROR] Groq API Error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`[AI_TIMEOUT] Groq request timed out after ${timeoutMs}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  public async generateStructured<T>(
    messages: LLMMessage[],
    schemaValidator: (rawJson: any) => T,
    options?: LLMGenerateOptions
  ): Promise<T> {
    const raw = await this.generateText(messages, {
      ...options,
      responseFormat: 'json',
    });

    let parsed: any;
    try {
      parsed = extractJson(raw);
    } catch (err: any) {
      throw new Error(`[AI_INVALID_RESPONSE] Failed to parse JSON from Groq: ${err.message}`);
    }

    return schemaValidator(parsed);
  }

  public async streamText(
    messages: LLMMessage[],
    onChunk: (chunk: string) => void,
    options?: LLMGenerateOptions
  ): Promise<string> {
    const fullText = await this.generateText(messages, options);
    onChunk(fullText);
    return fullText;
  }
}
