export type SecuritySeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SecurityConfidence = 'CONFIRMED' | 'LIKELY' | 'POSSIBLE' | 'UNKNOWN';

export type SecurityFindingStatus = 'OPEN' | 'REVIEWED' | 'FALSE_POSITIVE' | 'RESOLVED' | 'ACCEPTED_RISK';

export type SecurityFindingType =
  | 'SECRET_LEAK'
  | 'SQL_INJECTION'
  | 'COMMAND_INJECTION'
  | 'XSS'
  | 'PATH_TRAVERSAL'
  | 'SSRF'
  | 'DESERIALIZATION'
  | 'AUTH_WEAKNESS'
  | 'AUTHORIZATION_GAP'
  | 'CRYPTO_WEAKNESS'
  | 'INSECURE_TRANSPORT'
  | 'UNVALIDATED_UPLOAD'
  | 'TRUST_BOUNDARY_VIOLATION';

export interface SecurityRemediation {
  whyItMatters: string;
  recommendedFix: string;
  validationSteps: string[];
}

export interface SecurityFindingDef {
  id?: string;
  type: SecurityFindingType;
  title: string;
  description: string;
  severity: SecuritySeverity;
  confidence: SecurityConfidence;
  filePath: string;
  fileId?: string;
  symbolName?: string;
  startLine?: number;
  endLine?: number;
  evidenceSnippet?: string;
  cwe?: string;
  owaspCategory?: string;
  affectedEntities?: string[];
  remediation: SecurityRemediation;
}

export interface SecurityRuleContext {
  projectId: string;
  file: {
    id: string;
    path: string;
    language: string;
    content: string;
  };
  symbols: {
    id: string;
    name: string;
    kind: string;
    startLine: number;
    endLine: number;
  }[];
  dependencies: {
    sourcePath: string;
    targetPath?: string;
    externalPackage?: string;
  }[];
}

export interface SecurityRule {
  id: string;
  name: string;
  category: string;
  scan(context: SecurityRuleContext): SecurityFindingDef[];
}

export interface SecurityAuditReport {
  projectId: string;
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    totalFindings: number;
  };
  coverage: {
    secrets: boolean;
    inputFlows: boolean;
    authentication: boolean;
    authorization: boolean;
    network: boolean;
    filesystem: boolean;
    dependencies: boolean;
  };
  findings: SecurityFindingDef[];
  scannedAt: string;
}
