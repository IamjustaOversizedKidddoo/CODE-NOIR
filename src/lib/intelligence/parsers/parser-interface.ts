import { FileAnalysisResult, SupportedLanguage } from '../../types/intelligence';

export interface LanguageParser {
  readonly language: SupportedLanguage;
  canParse(filePath: string): boolean;
  parse(fileId: string, filePath: string, content: string): Promise<FileAnalysisResult>;
}
