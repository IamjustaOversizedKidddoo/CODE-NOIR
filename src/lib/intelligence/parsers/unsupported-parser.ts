import { FileAnalysisResult, SupportedLanguage } from '../../types/intelligence';
import { LanguageParser } from './parser-interface';

export class UnsupportedParser implements LanguageParser {
  public readonly language: SupportedLanguage = 'UNSUPPORTED_LANGUAGE';

  public canParse(_filePath: string): boolean {
    return true; // Fallback parser
  }

  public async parse(
    fileId: string,
    filePath: string,
    _content: string
  ): Promise<FileAnalysisResult> {
    return {
      fileId,
      path: filePath,
      language: 'UNSUPPORTED_LANGUAGE',
      symbols: [],
      imports: [],
      exports: [],
      calls: [],
      endpoints: [],
      envVars: [],
      dbEvidence: [],
    };
  }
}
