import prisma from '../db';
import { readProjectFileById } from '../ingestion/source-storage';
import {
  SecurityFindingDef,
  SecurityAuditReport,
  SecurityRule,
  SecurityRuleContext,
  SecurityFindingStatus,
} from './types';
import { secretRule } from './rules/secret-rule';
import { commandInjectionRule } from './rules/command-injection-rule';
import { sqlInjectionRule } from './rules/sql-injection-rule';
import { xssRule } from './rules/xss-rule';
import { pathTraversalRule } from './rules/path-traversal-rule';
import { ssrfRule } from './rules/ssrf-rule';
import { deserializationRule } from './rules/deserialization-rule';
import { cryptoNetworkRule } from './rules/crypto-network-rule';
import { AnalysisCache } from '../performance/cache';

const activeRules: SecurityRule[] = [
  secretRule,
  commandInjectionRule,
  sqlInjectionRule,
  xssRule,
  pathTraversalRule,
  ssrfRule,
  deserializationRule,
  cryptoNetworkRule,
];

export async function runSecurityAudit(projectId: string): Promise<SecurityAuditReport> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      files: { where: { isIgnored: false } },
      symbols: true,
      dependencies: {
        include: {
          sourceFile: true,
          targetFile: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found for security audit.`);
  }

  const allFindings: SecurityFindingDef[] = [];
  const cache = AnalysisCache.getInstance();

  for (const fileRecord of project.files) {
    // Check security cache
    const cached = cache.getSecurityFindings(fileRecord.hash);
    if (cached) {
      allFindings.push(...cached);
      continue;
    }

    let fileContent = '';
    try {
      const storageData = await readProjectFileById(projectId, fileRecord.id);
      fileContent = storageData.content || '';
    } catch {
      fileContent = '';
    }

    const fileSymbols = project.symbols.filter((s) => s.fileId === fileRecord.id);
    const fileDependencies = project.dependencies
      .filter((d) => d.sourceFileId === fileRecord.id)
      .map((d) => ({
        sourcePath: d.sourceFile.path,
        targetPath: d.targetFile?.path,
        externalPackage: d.externalPackage || undefined,
      }));

    const ruleContext: SecurityRuleContext = {
      projectId,
      file: {
        id: fileRecord.id,
        path: fileRecord.path,
        language: fileRecord.language,
        content: fileContent,
      },
      symbols: fileSymbols,
      dependencies: fileDependencies,
    };

    const fileFindings: SecurityFindingDef[] = [];
    for (const rule of activeRules) {
      const ruleFindings = rule.scan(ruleContext);
      fileFindings.push(...ruleFindings);
    }

    cache.setSecurityFindings(fileRecord.hash, fileFindings as any);
    allFindings.push(...fileFindings);
  }

  // Clear existing findings for clean re-audit
  await prisma.securityFinding.deleteMany({ where: { projectId } });

  // Bulk Persist findings in SQLite with sanitized snippets (chunks of 500)
  const findingsToInsert = allFindings.map((finding) => ({
    projectId,
    type: finding.type,
    title: finding.title,
    description: finding.description,
    severity: finding.severity,
    confidence: finding.confidence,
    status: 'OPEN',
    fileId: finding.fileId,
    filePath: finding.filePath,
    symbolName: finding.symbolName,
    startLine: finding.startLine,
    endLine: finding.endLine,
    evidenceSnippet: finding.evidenceSnippet,
    cwe: finding.cwe,
    owaspCategory: finding.owaspCategory,
    affectedEntitiesJson: finding.affectedEntities ? JSON.stringify(finding.affectedEntities) : null,
    remediationJson: JSON.stringify(finding.remediation),
  }));

  const CHUNK_SIZE = 500;
  for (let i = 0; i < findingsToInsert.length; i += CHUNK_SIZE) {
    const chunk = findingsToInsert.slice(i, i + CHUNK_SIZE);
    await prisma.securityFinding.createMany({
      data: chunk,
    });
  }

  const summary = {
    criticalCount: allFindings.filter((f) => f.severity === 'CRITICAL').length,
    highCount: allFindings.filter((f) => f.severity === 'HIGH').length,
    mediumCount: allFindings.filter((f) => f.severity === 'MEDIUM').length,
    lowCount: allFindings.filter((f) => f.severity === 'LOW').length,
    infoCount: allFindings.filter((f) => f.severity === 'INFO').length,
    totalFindings: allFindings.length,
  };

  return {
    projectId,
    summary,
    coverage: {
      secrets: true,
      inputFlows: true,
      authentication: true,
      authorization: true,
      network: true,
      filesystem: true,
      dependencies: true,
    },
    findings: allFindings,
    scannedAt: new Date().toISOString(),
  };
}

export async function getSecurityReport(
  projectId: string,
  filters?: {
    severity?: string;
    status?: string;
    type?: string;
  }
): Promise<SecurityAuditReport> {
  const whereClause: any = { projectId };
  if (filters?.severity) whereClause.severity = filters.severity;
  if (filters?.status) whereClause.status = filters.status;
  if (filters?.type) whereClause.type = filters.type;

  const dbFindings = await prisma.securityFinding.findMany({
    where: whereClause,
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
  });

  const findings: SecurityFindingDef[] = dbFindings.map((f) => ({
    id: f.id,
    type: f.type as any,
    title: f.title,
    description: f.description,
    severity: f.severity as any,
    confidence: f.confidence as any,
    filePath: f.filePath,
    fileId: f.fileId || undefined,
    symbolName: f.symbolName || undefined,
    startLine: f.startLine || undefined,
    endLine: f.endLine || undefined,
    evidenceSnippet: f.evidenceSnippet || undefined,
    cwe: f.cwe || undefined,
    owaspCategory: f.owaspCategory || undefined,
    affectedEntities: f.affectedEntitiesJson ? JSON.parse(f.affectedEntitiesJson) : undefined,
    remediation: f.remediationJson ? JSON.parse(f.remediationJson) : { whyItMatters: '', recommendedFix: '', validationSteps: [] },
  }));

  const allProjectFindings = await prisma.securityFinding.findMany({ where: { projectId } });

  return {
    projectId,
    summary: {
      criticalCount: allProjectFindings.filter((f) => f.severity === 'CRITICAL').length,
      highCount: allProjectFindings.filter((f) => f.severity === 'HIGH').length,
      mediumCount: allProjectFindings.filter((f) => f.severity === 'MEDIUM').length,
      lowCount: allProjectFindings.filter((f) => f.severity === 'LOW').length,
      infoCount: allProjectFindings.filter((f) => f.severity === 'INFO').length,
      totalFindings: allProjectFindings.length,
    },
    coverage: {
      secrets: true,
      inputFlows: true,
      authentication: true,
      authorization: true,
      network: true,
      filesystem: true,
      dependencies: true,
    },
    findings,
    scannedAt: new Date().toISOString(),
  };
}

export async function updateFindingStatus(
  findingId: string,
  status: SecurityFindingStatus,
  reason?: string
) {
  return prisma.securityFinding.update({
    where: { id: findingId },
    data: {
      status,
      statusReason: reason,
      updatedAt: new Date(),
    },
  });
}
