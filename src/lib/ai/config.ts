export type AIProviderName = 'groq' | 'gemini' | 'openai' | 'anthropic' | 'mock';

export interface AIConfig {
  provider: AIProviderName;
  fallbackProvider?: AIProviderName;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  retryCount: number;
  groqApiKey?: string;
  groqModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
}

export function getAIConfig(): AIConfig {
  const envProvider = (
    process.env.AI_PROVIDER ||
    process.env.DEFAULT_LLM_PROVIDER ||
    ''
  ).toLowerCase();

  let provider: AIProviderName = 'mock';

  if (process.env.NODE_ENV === 'test') {
    provider = (envProvider as AIProviderName) || 'mock';
  } else if (envProvider === 'groq' || envProvider === 'gemini' || envProvider === 'openai' || envProvider === 'anthropic') {
    provider = envProvider as AIProviderName;
  } else if (process.env.GROQ_API_KEY) {
    provider = 'groq';
  } else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
    provider = 'gemini';
  } else if (process.env.OPENAI_API_KEY) {
    provider = 'openai';
  } else if (process.env.ANTHROPIC_API_KEY) {
    provider = 'anthropic';
  } else {
    provider = 'mock';
  }

  const fallbackProvider = (
    process.env.AI_FALLBACK_PROVIDER || ''
  ).toLowerCase() as AIProviderName | undefined;

  const defaultModels: Record<AIProviderName, string> = {
    groq: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    gemini: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    openai: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    anthropic: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    mock: 'mock-deterministic-v1',
  };

  return {
    provider,
    fallbackProvider: fallbackProvider || (provider === 'groq' && process.env.GEMINI_API_KEY ? 'gemini' : undefined),
    model: process.env.LLM_MODEL || defaultModels[provider] || 'llama-3.3-70b-versatile',
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.2'),
    maxOutputTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10),
    retryCount: parseInt(process.env.LLM_RETRY_COUNT || '2', 10),
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL || defaultModels.groq,
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || defaultModels.gemini,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  };
}
