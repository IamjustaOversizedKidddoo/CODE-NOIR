export interface EnvironmentConfigReport {
  isProduction: boolean;
  databaseConfigured: boolean;
  aiProviderConfigured: boolean;
  activeProvider: string;
  fallbackProvider?: string;
  storageDirConfigured: boolean;
  warnings: string[];
  errors: string[];
}

export function validateEnvironment(): EnvironmentConfigReport {
  const isProduction = process.env.NODE_ENV === 'production';
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Database Configuration (Required)
  const databaseUrl = process.env.DATABASE_URL;
  const databaseConfigured = Boolean(databaseUrl && databaseUrl.trim().length > 0);
  if (!databaseConfigured) {
    errors.push(
      'DATABASE_URL is missing. Please define DATABASE_URL in .env (e.g. file:./dev.db) to initialize SQLite / PostgreSQL.'
    );
  }

  // 2. AI Provider Configurations (Groq & Gemini)
  const configuredProvider = (process.env.AI_PROVIDER || '').toLowerCase();
  const fallbackProvider = (process.env.AI_FALLBACK_PROVIDER || '').toLowerCase();

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  let activeProvider = 'mock';
  let aiProviderConfigured = false;

  if (configuredProvider === 'groq') {
    activeProvider = 'groq';
    if (!groqKey) {
      warnings.push(
        'AI_PROVIDER is set to "groq", but GROQ_API_KEY is missing. Falling back to deterministic mode.'
      );
    } else {
      aiProviderConfigured = true;
    }
  } else if (configuredProvider === 'gemini') {
    activeProvider = 'gemini';
    if (!geminiKey) {
      warnings.push(
        'AI_PROVIDER is set to "gemini", but GEMINI_API_KEY is missing. Falling back to deterministic mode.'
      );
    } else {
      aiProviderConfigured = true;
    }
  } else if (groqKey) {
    activeProvider = 'groq';
    aiProviderConfigured = true;
  } else if (geminiKey) {
    activeProvider = 'gemini';
    aiProviderConfigured = true;
  } else {
    warnings.push(
      'Neither GROQ_API_KEY nor GEMINI_API_KEY is set. Full deterministic code intelligence, security scanning, and graph mapping will function normally with deterministic grounded responses.'
    );
  }

  return {
    isProduction,
    databaseConfigured,
    aiProviderConfigured,
    activeProvider,
    fallbackProvider: fallbackProvider || undefined,
    storageDirConfigured: true,
    warnings,
    errors,
  };
}
