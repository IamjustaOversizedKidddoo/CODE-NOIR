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

export class GeminiProvider implements LLMProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model.replace(/^models\//, '');
  }

  private formatMessages(messages: LLMMessage[]) {
    let systemInstruction = '';
    const contents: { role: string; parts: { text: string }[] }[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = (systemInstruction ? systemInstruction + '\n\n' : '') + msg.content;
      } else {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    return { systemInstruction, contents };
  }

  public async generateText(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string> {
    const { systemInstruction, contents } = this.formatMessages(messages);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const payload: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    if (options?.responseFormat === 'json') {
      payload.generationConfig.responseMimeType = 'application/json';
    }

    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs || 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.text();
        if (res.status === 429) {
          throw new Error(`[AI_RATE_LIMITED] Gemini rate limit reached (429): ${errorData}`);
        }
        if (res.status === 400 && errorData.includes('API_KEY_INVALID')) {
          throw new Error(`[AI_AUTHENTICATION_FAILED] Gemini API key invalid (400): ${errorData}`);
        }
        if (res.status === 403) {
          throw new Error(`[AI_AUTHENTICATION_FAILED] Gemini authentication failed (403): ${errorData}`);
        }
        throw new Error(`[AI_PROVIDER_ERROR] Gemini API Error (${res.status}): ${errorData}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`[AI_TIMEOUT] Gemini request timed out after ${timeoutMs}ms.`);
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
      throw new Error(`[AI_INVALID_RESPONSE] Failed to parse JSON from Gemini: ${err.message}`);
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
