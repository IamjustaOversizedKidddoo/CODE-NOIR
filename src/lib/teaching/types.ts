import { ConfidenceLevel, SourceLocation } from '../types/intelligence';
import { InvestigationType } from '../investigation/types';

export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type ExplanationMode =
  | 'ELI5'
  | 'BEGINNER'
  | 'STANDARD'
  | 'DEVELOPER'
  | 'SENIOR_ENGINEER';

export type QuestionType =
  | 'PREDICTION'
  | 'IDENTIFICATION'
  | 'CONNECTION'
  | 'REASONING'
  | 'IMPACT'
  | 'RECALL'
  | 'APPLICATION';

export type EvaluationStatus =
  | 'CORRECT'
  | 'PARTIALLY_CORRECT'
  | 'INCORRECT'
  | 'INSUFFICIENT_INFORMATION';

export type ConceptCategory =
  | 'LANGUAGE'
  | 'FRAMEWORK'
  | 'ARCHITECTURE'
  | 'SECURITY'
  | 'DATA_FLOW'
  | 'TESTING';

export type ConceptStatus = 'MASTERED' | 'LEARNED' | 'NEEDS_REVIEW' | 'STRUGGLING' | 'UNKNOWN';

export interface ConceptDef {
  id?: string;
  name: string;
  description: string;
  category: ConceptCategory;
  difficulty: DifficultyLevel;
  prerequisites: string[];
  relatedFiles?: string[];
  relatedSymbols?: string[];
  confidence: ConfidenceLevel;
}

export interface InteractiveQuestionDef {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[]; // If multiple choice, otherwise open-ended
  expectedAnswerHint: string;
  explanation: string;
  relatedConceptNames: string[];
  rubric: {
    keyPoints: string[];
    misconceptions: string[];
  };
}

export interface LessonCodeEvidence {
  file: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  snippet: string;
  hash?: string;
}

export type FileGroupClassification =
  | 'MAIN_SUSPECTS'
  | 'SUPPORTING_CAST'
  | 'ARCHIVES'
  | 'COLD_CASES';

export type UniversalFileRole =
  | 'CORE'
  | 'SUPPORTING'
  | 'ENTRY_POINT'
  | 'API'
  | 'DATA'
  | 'CONFIGURATION'
  | 'UTILITY'
  | 'SECURITY'
  | 'TEST'
  | 'DOCUMENTATION'
  | 'GENERATED'
  | 'ASSET'
  | 'BUILD'
  | 'EXPERIMENTAL'
  | 'ORPHANED'
  | 'UNKNOWN';

export interface UniversalFileRecord {
  fileId: string;
  path: string;
  language: string;
  sizeBytes: number;
  lineCount: number;
  primaryRole: UniversalFileRole;
  roles: UniversalFileRole[];
  importanceScore: number;
  entryProximity: number;
  centrality: number;
  knownReferences: number;
  knownDependencies: number;
  callersCount: number;
  calleesCount: number;
  securityRelevance: number;
  testRelevance: number;
  docRelevance: number;
  isGenerated: boolean;
  confidence: ConfidenceLevel;
  subsystemId?: string;
  importanceLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  learningPathStatus?: 'PRIMARY_LEARNING_PATH' | 'SECONDARY_LEARNING_PATH' | 'REFERENCE_ONLY' | 'NOT_YET_INVESTIGATED';
  classificationRationale?: string;
  unconfirmedStatus?: boolean;
}

export interface HierarchicalClusterNode {
  id: string;
  name: string;
  parentSubsystemId?: string;
  primaryRole: UniversalFileRole;
  fileIds: string[];
  filePaths: string[];
  childSubsystems: HierarchicalClusterNode[];
  importanceScore: number;
  totalFilesCount: number;
  summary: string;
}

export interface CurriculumDAGNode {
  lessonId: string;
  fileId?: string;
  filePath?: string;
  title: string;
  level: number;
  importance: number;
  prerequisites: string[];
  dependents: string[];
  isCycleBoundary?: boolean;
  cycleNote?: string;
}

export interface CurriculumDAG {
  nodes: CurriculumDAGNode[];
  entryLessonIds: string[];
  cycles: Array<{ nodeIds: string[]; explanation: string }>;
}

export interface ClassifiedFileInfo {
  fileId: string;
  path: string;
  group: FileGroupClassification;
  primaryRole?: UniversalFileRole;
  roles?: UniversalFileRole[];
  importanceScore: number;
  reason: string;
  knownReferences: number;
  knownDependencies: number;
  confidence: ConfidenceLevel;
}

export interface WhyCareBreakdown {
  whatIsIt: string;
  whatDoesItDo: string;
  whyExists: string;
  whatUsesIt: string;
  whatDoesItUse: string;
  whatBreaksWithoutIt: string;
}

export interface ConceptCardDef {
  name: string;
  category: string;
  whatItIs: string;
  whyExists: string;
  whatDoingHere: string;
}

export interface LocalNeighborhoodNode {
  name: string;
  type: 'FILE' | 'SYMBOL';
  relationship: 'CURRENT' | 'IMPORTS' | 'IMPORTED_BY' | 'CALLS' | 'CALLED_BY';
}

export interface WhatIfScenarioDef {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface PredictNextDef {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface DetectiveNotesDef {
  note: string;
  evidence: string;
  suspicious: string;
  beginnerTip: string;
}

export interface LessonContentPayload {
  level: number; // 0 to 10
  whyMatters: string;
  whatInvestigating: string;
  simpleExplanation: string;
  technicalExplanation: string;
  evidence: LessonCodeEvidence[];
  connections: {
    upstream: string[];
    downstream: string[];
    relatedSubsystems: string[];
  };
  example: string;
  recap: string[];
  completionCriteria: string[];
  caseClue?: string;
  whyCare?: WhyCareBreakdown;
  conceptCard?: ConceptCardDef;
  neighborhood?: LocalNeighborhoodNode[];
  whatIfScenario?: WhatIfScenarioDef;
  predictNext?: PredictNextDef;
  detectiveNotes?: DetectiveNotesDef;
}

export interface StructuredLesson {
  id?: string;
  projectId: string;
  learningPathId?: string;
  moduleId?: string;
  level: number;
  order: number;
  title: string;
  objective: string;
  type: string;
  difficulty: DifficultyLevel;
  prerequisites: string[];
  content: LessonContentPayload;
  evidence: LessonCodeEvidence[];
  investigationType?: InvestigationType;
  interactiveQuestion: InteractiveQuestionDef;
  estimatedMinutes: number;
  isStale?: boolean;
}

export interface StructuredLearningModule {
  id?: string;
  learningPathId?: string;
  title: string;
  description: string;
  order: number;
  level: number;
  difficulty: DifficultyLevel;
  prerequisites: string[];
  lessons: StructuredLesson[];
}

export interface OrientationSummary {
  summary: string;
  frontDoorEntry: string;
  multiEntryExplanation?: string;
  totalFiles: number;
  coreFilesCount: number;
  supportingFilesCount: number;
  archiveFilesCount: number;
  coldCasesCount: number;
  hierarchicalClusters?: HierarchicalClusterNode[];
  rolesDistribution?: Record<string, number>;
}

export interface StructuredLearningPath {
  id?: string;
  projectId: string;
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedDuration: number; // minutes
  prerequisites: string[];
  modules: StructuredLearningModule[];
  version: number;
  orientation?: OrientationSummary;
  fileGroups?: {
    mainSuspects: ClassifiedFileInfo[];
    supportingCast: ClassifiedFileInfo[];
    archives: ClassifiedFileInfo[];
    coldCases: ClassifiedFileInfo[];
  };
  conceptNotebook?: ConceptDef[];
  curriculumDAG?: CurriculumDAG;
  universalFileRecords?: UniversalFileRecord[];
  createdAt?: string;
}

export interface EvaluationResult {
  status: EvaluationStatus;
  score: number; // 0.0 to 1.0
  praise: string;
  missingConcepts: string[];
  explanation: string;
  recommendedDetour?: {
    conceptName: string;
    reason: string;
  };
}

export interface ProjectMasteryReport {
  projectId: string;
  userId: string;
  overallScore: number; // 0% to 100%
  dimensionScores: {
    architecture: number;
    coreModules: number;
    runtime: number;
    dataFlow: number;
    dependencies: number;
    security: number;
    concepts: number;
  };
  masteredConcepts: string[];
  needsReviewConcepts: string[];
  strugglingConcepts: string[];
  completedLessonsCount: number;
  totalLessonsCount: number;
  isReadyForProduction: boolean;
  generatedAt: string;
}
