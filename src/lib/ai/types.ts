import { ConfidenceLevel, SourceLocation } from '../types/intelligence';

export type QuestionType =
  | 'PROJECT_OVERVIEW'
  | 'ARCHITECTURE'
  | 'FILE_EXPLANATION'
  | 'SYMBOL_EXPLANATION'
  | 'CALL_FLOW'
  | 'DATA_FLOW'
  | 'DEPENDENCY'
  | 'ENTRY_POINT'
  | 'RUNTIME_FLOW'
  | 'SECURITY'
  | 'WHY_EXISTS'
  | 'BLAST_RADIUS'
  | 'MODIFICATION_IMPACT'
  | 'PROJECT_STORY'
  | 'GENERAL_CODEBASE';

export type FactCategory = 'FACT' | 'INFERENCE' | 'HYPOTHESIS' | 'UNKNOWN';

export interface ResolvedEntity {
  type: 'FILE' | 'SYMBOL' | 'MULTIPLE_CANDIDATES' | 'UNKNOWN';
  name: string;
  fileId?: string;
  filePath?: string;
  symbolId?: string;
  symbolKind?: string;
  candidates?: { id: string; name: string; path: string; kind?: string }[];
}

export interface SemanticSourceChunk {
  fileId: string;
  path: string;
  symbolId?: string;
  symbolName?: string;
  startLine: number;
  endLine: number;
  content: string;
  relevance: number; // 1 = Highest (exact target), 5 = Background
  hash: string;
}

export interface EvidencePacket {
  caseId: string;
  caseNumber: string;
  question: string;
  questionType: QuestionType;
  resolvedEntities: ResolvedEntity[];
  deterministicFacts: {
    technology: {
      primaryLanguage: string;
      frameworks: string[];
      runtimes: string[];
      databases: string[];
    };
    entryPoints: { path: string; reason: string }[];
    totalFiles: number;
    totalSymbols: number;
    totalLines: number;
    cyclesCount: number;
  };
  sourceChunks: SemanticSourceChunk[];
  graphContext: {
    callers: { callerName: string; file: string; line: number }[];
    callees: { calleeName: string; line: number }[];
    dependencies: { source: string; target: string; importName?: string }[];
    blastRadius?: { affectedFiles: string[]; affectedSymbols: string[]; total: number };
  };
  retrievalReason: string;
  evidenceConfidence: ConfidenceLevel;
}

export interface GroundedEvidenceItem {
  file: string;
  line?: number;
  symbol?: string;
  reason: string;
  confidence: ConfidenceLevel;
}

export interface GroundedAIResponse {
  answer: string;
  keyPoints: string[];
  evidence: GroundedEvidenceItem[];
  confidence: ConfidenceLevel;
  uncertainties: string[];
  relatedEntities: string[];
  nextQuestions: string[];
  claimClassification: {
    facts: number;
    inferences: number;
    hypotheses: number;
    unknowns: number;
  };
  validated: boolean;
  warnings?: string[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  timeoutMs?: number;
}
