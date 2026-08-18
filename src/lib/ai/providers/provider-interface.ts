import { LLMMessage, LLMGenerateOptions } from '../types';

export interface LLMProvider {
  readonly id: string;
  readonly name: string;

  generateText(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string>;

  generateStructured<T>(
    messages: LLMMessage[],
    schemaValidator: (rawJson: any) => T,
    options?: LLMGenerateOptions
  ): Promise<T>;

  streamText(
    messages: LLMMessage[],
    onChunk: (chunk: string) => void,
    options?: LLMGenerateOptions
  ): Promise<string>;
}
