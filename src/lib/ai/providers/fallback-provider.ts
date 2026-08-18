import { LLMMessage, LLMGenerateOptions } from '../types';
import { LLMProvider } from './provider-interface';
import { MockLLMProvider } from './mock-provider';

export class FallbackProvider implements LLMProvider {
  public readonly id: string;
  public readonly name: string;
  private primary: LLMProvider;
  private secondary?: LLMProvider;
  private deterministicFallback: LLMProvider;

  constructor(primary: LLMProvider, secondary?: LLMProvider) {
    this.primary = primary;
    this.secondary = secondary;
    this.deterministicFallback = new MockLLMProvider();
    this.id = `fallback(${primary.id}${secondary ? `->${secondary.id}` : ''})`;
    this.name = `${primary.name}${secondary ? ` (Fallback: ${secondary.name})` : ''}`;
  }

  public async generateText(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string> {
    try {
      return await this.primary.generateText(messages, options);
    } catch (primaryErr: any) {
      console.warn(`[AI Primary Failed] ${this.primary.name}: ${primaryErr.message}`);

      if (this.secondary) {
        try {
          console.info(`[AI Fallback Activated] Switching to ${this.secondary.name}...`);
          return await this.secondary.generateText(messages, options);
        } catch (secErr: any) {
          console.warn(`[AI Secondary Failed] ${this.secondary.name}: ${secErr.message}`);
        }
      }

      console.info(`[AI Fallback to Deterministic] Using deterministic engine.`);
      return await this.deterministicFallback.generateText(messages, options);
    }
  }

  public async generateStructured<T>(
    messages: LLMMessage[],
    schemaValidator: (rawJson: any) => T,
    options?: LLMGenerateOptions
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await this.primary.generateStructured<T>(messages, schemaValidator, options);
      if (process.env.NODE_ENV === 'development') {
        console.info(`[AI REQUEST DIAGNOSTIC] Provider: ${this.primary.name} | Status: SUCCESS | Latency: ${Date.now() - startTime}ms | Normalized response: VALID`);
      }
      return result;
    } catch (primaryErr: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[AI REQUEST DIAGNOSTIC] Provider: ${this.primary.name} | Status: FAILURE | Latency: ${Date.now() - startTime}ms | Error: ${primaryErr.message}`);
      }
      console.warn(`[AI Primary Structured Failed] ${this.primary.name}: ${primaryErr.message}`);

      if (this.secondary) {
        const secStartTime = Date.now();
        try {
          console.info(`[AI Fallback Activated] Switching to ${this.secondary.name}...`);
          const secResult = await this.secondary.generateStructured<T>(messages, schemaValidator, options);
          if (process.env.NODE_ENV === 'development') {
            console.info(`[AI REQUEST DIAGNOSTIC] Provider: ${this.secondary.name} | Status: SUCCESS | Latency: ${Date.now() - secStartTime}ms | Normalized response: VALID`);
          }
          return secResult;
        } catch (secErr: any) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[AI REQUEST DIAGNOSTIC] Provider: ${this.secondary.name} | Status: FAILURE | Latency: ${Date.now() - secStartTime}ms | Error: ${secErr.message}`);
          }
          console.warn(`[AI Secondary Structured Failed] ${this.secondary.name}: ${secErr.message}`);
        }
      }

      console.info(`[AI Fallback to Deterministic] Using deterministic structured engine.`);
      return await this.deterministicFallback.generateStructured<T>(messages, schemaValidator, options);
    }
  }

  public async streamText(
    messages: LLMMessage[],
    onChunk: (chunk: string) => void,
    options?: LLMGenerateOptions
  ): Promise<string> {
    try {
      return await this.primary.streamText(messages, onChunk, options);
    } catch (primaryErr: any) {
      console.warn(`[AI Primary Stream Failed] ${this.primary.name}: ${primaryErr.message}`);

      if (this.secondary) {
        try {
          return await this.secondary.streamText(messages, onChunk, options);
        } catch (secErr: any) {
          console.warn(`[AI Secondary Stream Failed] ${this.secondary.name}: ${secErr.message}`);
        }
      }

      return await this.deterministicFallback.streamText(messages, onChunk, options);
    }
  }
}
