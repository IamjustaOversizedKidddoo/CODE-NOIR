import { SarcasmLevel, NextLeadSuggestion } from '../persona/types';

export type InterrogationIntent =
  | 'EXPLAIN'
  | 'PROJECT_OVERVIEW'
  | 'LEARNING'
  | 'EXPLANATION'
  | 'FOLLOW_UP'
  | 'WHY'
  | 'HOW'
  | 'DEBUGGING'
  | 'ARCHITECTURE'
  | 'DEPENDENCY'
  | 'SECURITY'
  | 'DATA_FLOW'
  | 'CALL_FLOW'
  | 'FILE'
  | 'FUNCTION'
  | 'CONCEPT'
  | 'CONFUSION'
  | 'HELP'
  | 'CASUAL'
  | 'GREETING'
  | 'OFF_TOPIC'
  | 'UNKNOWN'
  | 'DELETE'
  | 'WHO_CALLS'
  | 'WHAT_CALLS'
  | 'SOURCE'
  | 'EVIDENCE'
  | 'TEACH'
  | 'CHECKPOINT'
  | 'SIMPLIFY'
  | 'DEEPEN'
  | 'COMPARE'
  | 'EXPLAIN_EVERYTHING'
  | 'IM_LOST'
  | 'ROAST'
  | 'EXPLAIN_SERIOUSLY'
  | 'EXPLAIN_LIKE_12'
  | 'EXPLAIN_LIKE_ENGINEER'
  | 'AMBIGUOUS';

export interface InvestigationTrailStep {
  stepNumber: number;
  entityName: string;
  entityType: 'FILE' | 'FUNCTION' | 'CLASS' | 'MODULE' | 'SUBSYSTEM' | 'ENDPOINT';
  filePath?: string;
  actionTaken: string;
  evidenceCount?: number;
  timestamp: string;
}

export interface InterrogationEntity {
  name: string;
  type: 'FILE' | 'FUNCTION' | 'CLASS' | 'MODULE' | 'SUBSYSTEM' | 'ENDPOINT';
  filePath?: string;
  startLine?: number;
  endLine?: number;
  symbolId?: string;
  fileId?: string;
}

export interface InterrogationMessage {
  id: string;
  role: 'user' | 'detective';
  content: string;
  detectiveOpening?: string;
  detectiveCommentary?: string;
  confidence?: 'CONFIRMED' | 'LIKELY' | 'POSSIBLE' | 'UNKNOWN' | 'UNRESOLVED';
  intent?: InterrogationIntent;
  targetEntity?: InterrogationEntity;
  citations?: {
    file: string;
    startLine?: number;
    endLine?: number;
    symbolName?: string;
    snippet?: string;
  }[];
  blastRadius?: {
    directlyAffected: string[];
    indirectlyAffected: string[];
  };
  teachingDetour?: {
    conceptName: string;
    lessonId?: string;
    primerText?: string;
  };
  checkpointQuestion?: {
    prompt: string;
    options?: string[];
    explanation?: string;
  };
  nextLeads: NextLeadSuggestion[];
  ambiguityChoices?: {
    id: string;
    name: string;
    filePath: string;
    kind: string;
  }[];
  timestamp: string;
}

export interface InterrogationSessionState {
  sessionId: string;
  caseId: string;
  userId: string;
  currentEntity?: InterrogationEntity;
  currentInvestigation?: string;
  currentTopic?: string;
  currentFile?: string;
  currentSymbol?: string;
  currentLesson?: string;
  recentlyDiscussedConcepts?: string[];
  recentlyShownEvidence?: string[];
  learningLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  leadStack: InvestigationTrailStep[];
  messages: InterrogationMessage[];
  sarcasmLevel: SarcasmLevel;
  explanationDepth: 'QUICK' | 'STANDARD' | 'DEEP' | 'FORENSIC';
  createdAt: string;
  updatedAt: string;
}
