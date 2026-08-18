export type SarcasmLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type PersonaTone = 'PROFESSIONAL' | 'LIGHT' | 'DETECTIVE' | 'SARCASTIC' | 'ROAST_MODE' | 'ABSOLUTE_CHAOS';

export type CommentaryType =
  | 'INTRO'
  | 'TRANSITION'
  | 'OBSERVATION'
  | 'SARCASM'
  | 'WARNING'
  | 'DRAMATIC_REVEAL'
  | 'ENCOURAGEMENT'
  | 'RECAP'
  | 'DEAD_END'
  | 'CLUE'
  | 'CONFIRMED'
  | 'UNKNOWN'
  | 'SUCCESS'
  | 'CASE_OPENING'
  | 'CASE_CLOSURE';

export interface PersonaConfig {
  sarcasmLevel: SarcasmLevel;
  detectiveMode: boolean;
  commentaryDensity: 'low' | 'medium' | 'high';
  humorEnabled: boolean;
}

export interface PersonaContext {
  fact: string;
  confidence: 'CONFIRMED' | 'LIKELY' | 'POSSIBLE' | 'UNKNOWN' | 'UNRESOLVED';
  evidence?: {
    file?: string;
    startLine?: number;
    endLine?: number;
    symbolName?: string;
  };
  sourceEntity?: string;
  targetEntity?: string;
  relationship?: string;
  lineCount?: number;
  complexityScore?: number;
  hasCycle?: boolean;
  sarcasmLevel?: SarcasmLevel;
  commentaryType?: CommentaryType;
}

export interface NextLeadSuggestion {
  id: string;
  action: 'FOLLOW_CALLER' | 'FOLLOW_CALLEE' | 'TRACE_DATA' | 'CHECK_BLAST_RADIUS' | 'OPEN_SOURCE' | 'INVESTIGATE_FLOW';
  label: string;
  targetEntity?: string;
  targetPath?: string;
  reason: string;
}

export interface TransformedPersonaOutput {
  detectiveOpening?: string;
  factualExplanation: string;
  detectiveCommentary?: string;
  confidence: 'CONFIRMED' | 'LIKELY' | 'POSSIBLE' | 'UNKNOWN' | 'UNRESOLVED';
  evidenceCitation?: string;
  nextLeads: NextLeadSuggestion[];
  rawFactPreserved: boolean;
}
