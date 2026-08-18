import { LLMMessage, LLMGenerateOptions } from '../types';
import { LLMProvider } from './provider-interface';

export class OpenAIProvider implements LLMProvider {
  public readonly id = 'openai';
  public readonly name = 'OpenAI';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini', baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  public async generateText(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string> {
    const payload: any = {
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 4096,
    };

    if (options?.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 30000);

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
        throw new Error(`OpenAI API Error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
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
      const cleanJson = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (err: any) {
      throw new Error(`Failed to parse JSON from OpenAI: ${err.message}. Raw: ${raw.slice(0, 300)}`);
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
