import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import { runSecurityAudit, getSecurityReport, updateFindingStatus } from '@/lib/security/scanner';
import { createSecurityVulnerableFixture } from '../fixtures/helpers';

describe('Integration: Phase 9 Security Scanner & Vulnerability Dossier', () => {
  let testProjectId: string;

  beforeAll(async () => {
    const zip = createSecurityVulnerableFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Security Case Test' });
    testProjectId = result.projectId;
  });

  afterAll(async () => {
    try {
      if (testProjectId) await prisma.project.delete({ where: { id: testProjectId } });
    } catch {}
  });

  it('1. should execute static security audit across all ingested repository files', async () => {
    const report = await runSecurityAudit(testProjectId);

    expect(report.projectId).toBe(testProjectId);
    expect(report.summary.totalFindings).toBeGreaterThanOrEqual(3);
    expect(report.coverage.secrets).toBe(true);
    expect(report.coverage.filesystem).toBe(true);
  });

  it('2. should persist findings in SQLite and allow filtered queries', async () => {
    const report = await getSecurityReport(testProjectId);

    expect(report.findings.length).toBeGreaterThanOrEqual(3);
    const finding = report.findings[0];
    expect(finding.filePath).toBeDefined();
    expect(finding.remediation).toBeDefined();
    expect(finding.remediation.recommendedFix).toBeDefined();
  });

  it('3. should support review workflows and allow marking finding as FALSE_POSITIVE', async () => {
    const report = await getSecurityReport(testProjectId);
    const finding = report.findings[0];

    const updated = await updateFindingStatus(
      finding.id!,
      'FALSE_POSITIVE',
      'Test credential in dev environment'
    );

    expect(updated.status).toBe('FALSE_POSITIVE');
    expect(updated.statusReason).toBe('Test credential in dev environment');
  });
});
