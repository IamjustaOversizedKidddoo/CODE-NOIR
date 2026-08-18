import {
  FileAnalysisResult,
  ExtractedSymbol,
  ExtractedImport,
  ExtractedExport,
  ExtractedCall,
  ExtractedEndpoint,
  ExtractedEnvVar,
  ExtractedDbEvidence,
  SupportedLanguage,
} from '../../types/intelligence';
import { detectLanguageFromPath } from '../languages';
import { LanguageParser } from './parser-interface';

export class GenericPolyglotParser implements LanguageParser {
  public readonly language: SupportedLanguage = 'UNSUPPORTED_LANGUAGE';

  public canParse(filePath: string): boolean {
    const lang = detectLanguageFromPath(filePath);
    return [
      'GO',
      'RUST',
      'JAVA',
      'CSHARP',
      'CPP',
      'PHP',
      'RUBY',
      'KOTLIN',
      'SWIFT',
      'SHELL',
      'SQL',
      'DOCKERFILE',
    ].includes(lang);
  }

  public async parse(
    fileId: string,
    filePath: string,
    content: string
  ): Promise<FileAnalysisResult> {
    const language = detectLanguageFromPath(filePath);
    const symbols: ExtractedSymbol[] = [];
    const imports: ExtractedImport[] = [];
    const exports: ExtractedExport[] = [];
    const calls: ExtractedCall[] = [];
    const endpoints: ExtractedEndpoint[] = [];
    const envVars: ExtractedEnvVar[] = [];
    const dbEvidence: ExtractedDbEvidence[] = [];

    const lines = content.split(/\r?\n/);

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Skip comments
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('--')
      ) {
        return;
      }

      // --- 1. GO PATTERNS ---
      if (language === 'GO') {
        const funcMatch = /^func\s+(\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/i.exec(trimmed);
        if (funcMatch) {
          const name = funcMatch[2];
          symbols.push({
            name,
            kind: 'FUNCTION',
            location: { startLine: lineNum, endLine: lineNum, startCol: 1, endCol: line.length },
            complexity: 1,
            isExported: /^[A-Z]/.test(name),
            confidence: 'LIKELY',
          });
        }

        const structMatch = /^type\s+([a-zA-Z0-9_]+)\s+(struct|interface)/i.exec(trimmed);
        if (structMatch) {
          symbols.push({
            name: structMatch[1],
            kind: structMatch[2].toUpperCase() === 'STRUCT' ? 'STRUCT' : 'INTERFACE',
            location: { startLine: lineNum, endLine: lineNum, startCol: 1, endCol: line.length },
            complexity: 1,
            isExported: /^[A-Z]/.test(structMatch[1]),
            confidence: 'LIKELY',
          });
        }

        const importMatch = /^import\s+["']([^"']+)["']/i.exec(trimmed);
        if (importMatch) {
          imports.push({
            rawSource: importMatch[1],
            importedSymbols: ['*'],
            importType: 'NAMED',
            line: lineNum,
            confidence: 'LIKELY',
          });
        }
      }

      // --- 2. RUST PATTERNS ---
      else if (language === 'RUST') {
        const fnMatch = /^(pub\s+)?(async\s+)?fn\s+([a-zA-Z0-9_]+)\s*\(/i.exec(trimmed);
        if (fnMatch) {
          symbols.push({
            name: fnMatch[3],
            kind: 'FUNCTION',
            location: { startLine: lineNum, endLine: lineNum, startCol: 1, endCol: line.length },
            complexity: 1,
            isExported: !!fnMatch[1],
            confidence: 'LIKELY',
          });
        }

        const structMatch = /^(pub\s+)?(struct|enum|trait)\s+([a-zA-Z0-9_]+)/i.exec(trimmed);
        if (structMatch) {
          symbols.push({
            name: structMatch[3],
            kind: structMatch[2].toUpperCase() === 'STRUCT' ? 'STRUCT' : 'INTERFACE',
            location: { startLine: lineNum, endLine: lineNum, startCol: 1, endCol: line.length },
            complexity: 1,
            isExported: !!structMatch[1],
            confidence: 'LIKELY',
          });
        }

        const useMatch = /^use\s+([^;]+);/i.exec(trimmed);
        if (useMatch) {
          imports.push({
            rawSource: useMatch[1].trim(),
            importedSymbols: ['*'],
            importType: 'NAMED',
            line: lineNum,
            confidence: 'LIKELY',
          });
        }
      }

      // --- 3. JAVA & C# PATTERNS ---
      else if (language === 'JAVA' || language === 'CSHARP') {
        const classMatch = /^(public\s+|private\s+|protected\s+)?(class|interface|enum)\s+([a-zA-Z0-9_]+)/i.exec(trimmed);
        if (classMatch) {
          symbols.push({
            name: classMatch[3],
            kind: classMatch[2].toUpperCase() === 'CLASS' ? 'CLASS' : 'INTERFACE',
            location: { startLine: lineNum, endLine: lineNum, startCol: 1, endCol: line.length },
            complexity: 1,
            isExported: true,
            confidence: 'LIKELY',
          });
        }

        const methodMatch = /^(public|protected|private)\s+([a-zA-Z0-9_<>[\]]+)\s+([a-zA-Z0-9_]+)\s*\(/i.exec(trimmed);
        if (methodMatch && !['if', 'for', 'while', 'switch', 'class'].includes(methodMatch[3])) {
          symbols.push({
            name: methodMatch[3],
            kind: 'METHOD',
            location: { startLine: lineNum, endLine: lineNum, startCol: 1, endCol: line.length },
            complexity: 1,
            isExported: methodMatch[1] === 'public',
            confidence: 'LIKELY',
          });
        }

        const importMatch = /^(import|using)\s+([^;]+);/i.exec(trimmed);
        if (importMatch) {
          imports.push({
            rawSource: importMatch[2].trim(),
            importedSymbols: ['*'],
            importType: 'NAMED',
            line: lineNum,
            confidence: 'LIKELY',
          });
        }
      }

      // --- 4. RUBY & PHP PATTERNS ---
      else if (language === 'RUBY' || language === 'PHP') {
        const funcMatch = /^(def|function)\s+([a-zA-Z0-9_]+)\s*(\(|$)/i.exec(trimmed);
        if (funcMatch) {
          symbols.push({
            name: funcMatch[2],
            kind: 'FUNCTION',
            location: { startLine: lineNum, endLine: lineNum, startCol: 1, endCol: line.length },
            complexity: 1,
            isExported: true,
            confidence: 'LIKELY',
          });
        }

        const classMatch = /^class\s+([a-zA-Z0-9_]+)/i.exec(trimmed);
        if (classMatch) {
          symbols.push({
            name: classMatch[1],
            kind: 'CLASS',
            location: { startLine: lineNum, endLine: lineNum, startCol: 1, endCol: line.length },
            complexity: 1,
            isExported: true,
            confidence: 'LIKELY',
          });
        }
      }

      // --- 5. SHELL SCRIPT PATTERNS ---
      else if (language === 'SHELL') {
        const shFunc = /^(function\s+)?([a-zA-Z0-9_-]+)\s*\(\)\s*\{/i.exec(trimmed);
        if (shFunc) {
          symbols.push({
            name: shFunc[2],
            kind: 'FUNCTION',
            location: { startLine: lineNum, endLine: lineNum, startCol: 1, endCol: line.length },
            complexity: 1,
            isExported: true,
            confidence: 'LIKELY',
          });
        }
      }
    });

    return {
      fileId,
      path: filePath,
      language,
      symbols,
      imports,
      exports,
      calls,
      endpoints,
      envVars,
      dbEvidence,
    };
  }
}
