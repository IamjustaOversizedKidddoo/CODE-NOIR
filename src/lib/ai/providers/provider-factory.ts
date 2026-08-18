import { AIConfig, getAIConfig, AIProviderName } from '../config';
import { LLMProvider } from './provider-interface';
import { GroqProvider } from './groq-provider';
import { GeminiProvider } from './gemini-provider';
import { OpenAIProvider } from './openai-provider';
import { MockLLMProvider } from './mock-provider';
import { FallbackProvider } from './fallback-provider';

function createSingleProvider(name: AIProviderName, config: AIConfig): LLMProvider {
  if (name === 'groq' && config.groqApiKey) {
    return new GroqProvider(config.groqApiKey, config.groqModel);
  }

  if (name === 'gemini' && config.geminiApiKey) {
    return new GeminiProvider(config.geminiApiKey, config.geminiModel);
  }

  if (name === 'openai' && config.openaiApiKey) {
    return new OpenAIProvider(config.openaiApiKey, config.model);
  }

  return new MockLLMProvider();
}

export function getLLMProvider(customConfig?: Partial<AIConfig>): LLMProvider {
  const config = { ...getAIConfig(), ...customConfig };

  const primary = createSingleProvider(config.provider, config);

  if (config.fallbackProvider && config.fallbackProvider !== config.provider) {
    const secondary = createSingleProvider(config.fallbackProvider, config);
    return new FallbackProvider(primary, secondary);
  }

  return primary;
}
