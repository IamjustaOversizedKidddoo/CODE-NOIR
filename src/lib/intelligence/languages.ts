import path from 'path';
import { SupportedLanguage } from '../types/intelligence';

export function detectLanguageFromPath(filePath: string): SupportedLanguage {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();

  // Special Filenames
  if (baseName === 'dockerfile' || baseName.startsWith('dockerfile.')) return 'DOCKERFILE';
  if (baseName === 'makefile' || baseName.endsWith('.mk')) return 'SHELL';
  if (baseName === 'cargo.toml') return 'TOML';
  if (baseName === 'pyproject.toml') return 'TOML';

  switch (ext) {
    case '.ts':
    case '.tsx':
    case '.mts':
    case '.cts':
      return 'TYPESCRIPT';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'JAVASCRIPT';
    case '.py':
    case '.pyi':
      return 'PYTHON';
    case '.go':
      return 'GO';
    case '.rs':
      return 'RUST';
    case '.java':
      return 'JAVA';
    case '.cs':
      return 'CSHARP';
    case '.cpp':
    case '.cc':
    case '.cxx':
    case '.c':
    case '.h':
    case '.hpp':
      return 'CPP';
    case '.php':
      return 'PHP';
    case '.rb':
      return 'RUBY';
    case '.kt':
    case '.kts':
      return 'KOTLIN';
    case '.swift':
      return 'SWIFT';
    case '.sql':
      return 'SQL';
    case '.sh':
    case '.bash':
    case '.zsh':
      return 'SHELL';
    case '.tf':
    case '.tfvars':
      return 'TERRAFORM';
    case '.json':
    case '.jsonc':
      return 'JSON';
    case '.yaml':
    case '.yml':
      return 'YAML';
    case '.toml':
      return 'TOML';
    case '.md':
    case '.mdx':
      return 'MARKDOWN';
    default:
      return 'UNSUPPORTED_LANGUAGE';
  }
}
