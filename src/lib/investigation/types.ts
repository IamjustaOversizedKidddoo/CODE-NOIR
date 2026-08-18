import { ConfidenceLevel, SourceLocation } from '../types/intelligence';

export type InvestigationType =
  | 'ARCHITECTURE'
  | 'STARTUP_FLOW'
  | 'RUNTIME_FLOW'
  | 'CALL_FLOW'
  | 'DATA_FLOW'
  | 'API_FLOW'
  | 'DATABASE_FLOW'
  | 'AUTHENTICATION_FLOW'
  | 'DEPENDENCY_FLOW'
  | 'CONFIGURATION_FLOW'
  | 'EXTERNAL_SERVICE_FLOW'
  | 'BLAST_RADIUS'
  | 'COMPONENT_RELATIONSHIP'
  | 'PROJECT_STORY';

export interface InvestigationEntityRef {
  type: 'FILE' | 'SYMBOL' | 'SUBSYSTEM' | 'ENDPOINT' | 'EXTERNAL_SERVICE' | 'ENV_VAR' | 'UNKNOWN';
  id?: string;
  name: string;
  path?: string;
  kind?: string;
}

export interface InvestigationEvidence {
  file: string;
  line?: number;
  symbol?: string;
  relationship: string;
  reason: string;
  confidence: ConfidenceLevel;
}

export interface InvestigationStep {
  order: number;
  sourceEntity: InvestigationEntityRef;
  targetEntity: InvestigationEntityRef;
  relationship: string; // CALLS, IMPORTS, INITIALIZES, PASSES_DATA_TO, QUERIES_DATABASE, AUTHENTICATES, READS_CONFIG, SENDS_HTTP_REQUEST, AFFECTS
  evidence: InvestigationEvidence;
  confidence: ConfidenceLevel;
  location?: SourceLocation;
  description: string;
  metadata?: Record<string, any>;
}

export interface StructuredInvestigation {
  id?: string;
  projectId: string;
  type: InvestigationType;
  title: string;
  question: string;
  startingEntities: InvestigationEntityRef[];
  steps: InvestigationStep[];
  evidence: InvestigationEvidence[];
  relationships: { source: string; target: string; relationship: string; confidence: ConfidenceLevel }[];
  primaryPath: string[];
  alternativePaths?: string[][];
  confidence: ConfidenceLevel;
  uncertainties: string[];
  affectedEntities?: string[];
  externalServices?: { name: string; sourceFile: string; confidence: ConfidenceLevel }[];
  metadata?: Record<string, any>;
  generatedAt?: string;
}

export interface TraversalConfig {
  maxDepth: number;
  maxNodes: number;
  maxPaths: number;
}

export const DEFAULT_TRAVERSAL_CONFIG: TraversalConfig = {
  maxDepth: 10,
  maxNodes: 100,
  maxPaths: 5,
};

export interface TraversalResult {
  primaryPath: string[];
  alternativePaths: string[][];
  visitedNodes: Set<string>;
  traversedEdges: { source: string; target: string; relationship: string; confidence: ConfidenceLevel }[];
  truncated: boolean;
  cyclesDetected: string[][];
}
