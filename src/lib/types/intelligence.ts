export type SupportedLanguage =
  | 'TYPESCRIPT'
  | 'JAVASCRIPT'
  | 'PYTHON'
  | 'GO'
  | 'RUST'
  | 'JAVA'
  | 'CSHARP'
  | 'CPP'
  | 'PHP'
  | 'RUBY'
  | 'KOTLIN'
  | 'SWIFT'
  | 'SQL'
  | 'SHELL'
  | 'TERRAFORM'
  | 'DOCKERFILE'
  | 'JSON'
  | 'YAML'
  | 'TOML'
  | 'MARKDOWN'
  | 'UNSUPPORTED_LANGUAGE';

export type SymbolKind =
  | 'FUNCTION'
  | 'METHOD'
  | 'CLASS'
  | 'INTERFACE'
  | 'TYPE'
  | 'STRUCT'
  | 'ENUM'
  | 'VARIABLE'
  | 'CONSTANT'
  | 'PROPERTY'
  | 'CONSTRUCTOR'
  | 'DECORATOR'
  | 'MODULE';

export type ConfidenceLevel = 'CONFIRMED' | 'LIKELY' | 'POSSIBLE' | 'UNKNOWN';

export type ResolutionStatus = 'RESOLVED' | 'AMBIGUOUS' | 'UNRESOLVED';

export type RelationshipType =
  | 'IMPORTS'
  | 'EXPORTS'
  | 'CALLS'
  | 'EXTENDS'
  | 'IMPLEMENTS'
  | 'USES'
  | 'DEPENDS_ON'
  | 'REFERENCES'
  | 'HTTP_CALL'
  | 'DB_QUERY';

export interface SourceLocation {
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
}

export interface ExtractedSymbol {
  name: string;
  qualifiedName?: string;
  kind: SymbolKind;
  location: SourceLocation;
  signature?: string;
  complexity: number;
  isExported: boolean;
  confidence: ConfidenceLevel;
  parentName?: string;
}

export interface ExtractedImport {
  rawSource: string;
  importedSymbols: string[];
  importType: 'NAMED' | 'DEFAULT' | 'NAMESPACE' | 'SIDE_EFFECT' | 'DYNAMIC' | 'REQUIRE';
  line: number;
  confidence: ConfidenceLevel;
}

export interface ExtractedExport {
  name: string;
  isDefault: boolean;
  isReExport: boolean;
  sourceModule?: string;
  line: number;
}

export interface ExtractedCall {
  calleeName: string;
  callerSymbolName?: string;
  line: number;
  col: number;
  relationship: RelationshipType;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface ExtractedEndpoint {
  method: string;
  path: string;
  line: number;
  handlerSymbol?: string;
  framework: string;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface ExtractedEnvVar {
  name: string;
  line: number;
  evidence: string;
}

export interface ExtractedDbEvidence {
  system: string;
  operation: string;
  line: number;
  evidence: string;
  confidence: ConfidenceLevel;
}

export interface FileAnalysisResult {
  fileId: string;
  path: string;
  language: SupportedLanguage;
  symbols: ExtractedSymbol[];
  imports: ExtractedImport[];
  exports: ExtractedExport[];
  calls: ExtractedCall[];
  endpoints: ExtractedEndpoint[];
  envVars: ExtractedEnvVar[];
  dbEvidence: ExtractedDbEvidence[];
}

export interface DetectedEntryPoint {
  path: string;
  reason: string;
  framework?: string;
  confidence: ConfidenceLevel;
  line?: number;
}

export interface TechnologyProfile {
  languages: { name: string; fileCount: number; lineCount: number; percentage: number }[];
  frameworks: { name: string; confidence: ConfidenceLevel; evidence: string }[];
  runtimes: { name: string; evidence: string }[];
  packageManagers: { name: string; evidence: string }[];
  databases: { name: string; confidence: ConfidenceLevel; evidence: string }[];
  projectTypes?: string[];
  architectures?: string[];
  isMonorepo?: boolean;
  workspaces?: string[];
}

export interface GraphNode {
  id: string;
  type: 'FILE' | 'SYMBOL';
  name: string;
  path: string;
  kind?: string;
  isEntry?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: RelationshipType;
  confidence: ConfidenceLevel;
  line?: number;
  evidence?: string;
}

export interface DirectedProjectGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles: string[][];
}

export interface ProjectBrainSubsystem {
  directory: string;
  modules: {
    name: string;
    files: string[];
    symbolCount: number;
  }[];
}

export interface ReadmeSection {
  title: string;
  content: string;
}

export interface ReadmeAnalysis {
  filePath?: string;
  found: boolean;
  projectName?: string;
  purpose?: string;
  description?: string;
  features: string[];
  techStack: string[];
  prerequisites: string[];
  installationSteps: string[];
  dependencyInstructions: string[];
  configuration: string[];
  environmentVariables: string[];
  databaseSetup: string[];
  runCommands: string[];
  buildCommands: string[];
  testingInstructions: string[];
  deploymentInfo: string[];
  warningsAndNotes: string[];
  sections: ReadmeSection[];
  undocumentedAspects: string[];
}

export interface ProjectBrain {
  identity: {
    caseNumber: string;
    name: string;
    totalFiles: number;
    totalLines: number;
    primaryLanguage: string;
    sizeTier?: 'TINY' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE';
  };
  technology: TechnologyProfile;
  entryPoints: DetectedEntryPoint[];
  subsystems: ProjectBrainSubsystem[];
  statistics: {
    totalSymbols: number;
    totalDependencies: number;
    totalCallEdges: number;
    unresolvedImports: number;
    ambiguousImports: number;
    circularDependencyCount: number;
    endpointsCount: number;
    envVarsCount: number;
  };
  coverage?: {
    filesCoveredPct: number;
    symbolsCoveredPct: number;
    relationshipsCoveredPct: number;
    apiCoveredPct: number;
    securityCoveredPct: number;
    unsupportedAreas: string[];
  };
  conflicts?: {
    id: string;
    type: string;
    docClaim: string;
    codeReality: string;
    docFile: string;
    codeFile: string;
  }[];
  readmeAnalysis?: ReadmeAnalysis;
}

