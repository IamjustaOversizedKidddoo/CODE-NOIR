export type EvaluationCategory =
  | 'FACTUAL_ACCURACY'
  | 'RELATIONSHIP_ACCURACY'
  | 'CITATION_ACCURACY'
  | 'INVESTIGATION_ACCURACY'
  | 'FLOW_ACCURACY'
  | 'TEACHING_ACCURACY'
  | 'ANSWER_EVALUATION'
  | 'SECURITY_PRECISION'
  | 'SECURITY_RECALL'
  | 'HALLUCINATION_RATE'
  | 'PERSONA_FACT_PRESERVATION'
  | 'AMBIGUITY_HANDLING';

export type RootCauseClassification =
  | 'PARSER_ERROR'
  | 'GRAPH_ERROR'
  | 'RETRIEVAL_ERROR'
  | 'INVESTIGATION_ERROR'
  | 'PROMPT_ERROR'
  | 'AI_HALLUCINATION'
  | 'CITATION_ERROR'
  | 'PERSONA_MUTATION'
  | 'SECURITY_RULE_ERROR'
  | 'EVALUATOR_ERROR';

export interface GroundTruthFact {
  id: string;
  statement: string;
  expectedResult: boolean;
  expectedFile: string;
  expectedStartLine?: number;
  expectedEndLine?: number;
  expectedSymbol?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface GroundTruthRelationship {
  source: string;
  target: string;
  relationship: 'CALLS' | 'IMPORTS' | 'DEPENDS_ON' | 'AUTHENTICATES' | 'AUTHORIZES';
  expectedFile?: string;
}

export interface GroundTruthFlow {
  id: string;
  name: string;
  description: string;
  isVulnerable?: boolean;
  expectedSteps: {
    entity: string;
    file: string;
    action: string;
  }[];
}

export interface GroundTruthSecurityFinding {
  id: string;
  type: string;
  filePath: string;
  startLine: number;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isFalsePositiveExpected: boolean; // True if scanner must NOT flag this as a real vulnerability
  reason: string;
}

export interface FailureDossier {
  failureId: string;
  category: EvaluationCategory;
  questionOrTest: string;
  expected: string;
  actual: string;
  evidence?: string;
  rootCause: RootCauseClassification;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  regressionStatus: 'NEW' | 'PERSISTING' | 'RESOLVED';
}

export interface TruthLabScorecard {
  runId: string;
  timestamp: string;
  overallPassed: boolean;
  metrics: {
    factualAccuracy: number; // 0.0 to 1.0 (100%)
    citationAccuracy: number;
    relationshipPrecision: number;
    relationshipRecall: number;
    relationshipF1: number;
    flowAccuracy: number;
    investigationAccuracy: number;
    teachingAccuracy: number;
    answerEvaluation: number;
    securityPrecision: number;
    securityRecall: number;
    hallucinationRate: number; // Lower is better (0.0% is ideal)
    personaPreservation: number;
    ambiguityHandling: number;
  };
  categoryScores: Record<EvaluationCategory, { passCount: number; failCount: number; passRate: number }>;
  failureDossiers: FailureDossier[];
  benchmarkProjectId?: string;
}

export interface RegressionThresholds {
  minFactualAccuracy: number;
  minCitationAccuracy: number;
  minRelationshipF1: number;
  minSecurityRecall: number;
  minSecurityPrecision: number;
  minPersonaPreservation: number;
  maxHallucinationRate: number;
}

export const DEFAULT_REGRESSION_THRESHOLDS: RegressionThresholds = {
  minFactualAccuracy: 0.90,
  minCitationAccuracy: 0.90,
  minRelationshipF1: 0.85,
  minSecurityRecall: 0.85,
  minSecurityPrecision: 0.85,
  minPersonaPreservation: 0.98,
  maxHallucinationRate: 0.05,
};
