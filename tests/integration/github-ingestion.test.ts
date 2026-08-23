import { describe, it, expect, afterAll, vi } from 'vitest';
import prisma from '@/lib/db';
import { runGitHubIngestionPipeline } from '@/lib/ingestion/pipeline';
import { IngestionSecurityError } from '@/lib/ingestion/security-guard';
import { createValidZipFixture } from '../fixtures/helpers';
import * as fetcherModule from '@/lib/ingestion/github-fetcher';

describe('Integration: GitHub Repository Ingestion Pipeline', () => {
  const createdProjectIds: string[] = [];

  afterAll(async () => {
    // Cleanup created test projects
    for (const id of createdProjectIds) {
      try {
        await prisma.project.delete({ where: { id } });
      } catch {
        // ignore
      }
    }
  });

  it('should successfully ingest a GitHub repository and preserve source metadata', async () => {
    const fakeZipBuffer = createValidZipFixture();

    // Mock fetcher to return fixture zip buffer
    const fetchSpy = vi.spyOn(fetcherModule, 'fetchGitHubRepositoryZipball').mockResolvedValue({
      buffer: fakeZipBuffer,
      repoInfo: {
        owner: 'testowner',
        repo: 'testrepo',
        ref: 'main',
        fullUrl: 'https://github.com/testowner/testrepo',
      },
    });

    const result = await runGitHubIngestionPipeline('https://github.com/testowner/testrepo');

    expect(result.projectId).toBeDefined();
    expect(result.caseNumber).toMatch(/^CASE-\d{4}-[A-Z0-9]{4,8}$/);
    createdProjectIds.push(result.projectId);

    // Verify DB record
    const dbProject = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { files: true },
    });

    expect(dbProject).not.toBeNull();
    expect(dbProject?.name).toBe('testowner/testrepo');
    expect(dbProject?.description).toContain('Source: GitHub');
    expect(dbProject?.description).toContain('URL: https://github.com/testowner/testrepo');
    expect(dbProject?.status).toBe('READY');
    expect(dbProject?.files.length).toBeGreaterThan(0);

    fetchSpy.mockRestore();
  });

  it('should reject invalid or non-GitHub URLs during ingestion', async () => {
    await expect(
      runGitHubIngestionPipeline('https://malicious-domain.com/evil/repo')
    ).rejects.toThrow(IngestionSecurityError);
  });
});
