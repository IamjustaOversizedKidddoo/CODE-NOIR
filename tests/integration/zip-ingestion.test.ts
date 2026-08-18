import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import { readProjectFileById } from '@/lib/ingestion/source-storage';
import { IngestionSecurityError } from '@/lib/ingestion/security-guard';
import {
  createValidZipFixture,
  createTraversalZipFixture,
  createAbsolutePathZipFixture,
  createExcessiveFilesZipFixture,
} from '../fixtures/helpers';

describe('Integration: Safe ZIP Ingestion Pipeline', () => {
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

  it('should successfully ingest a valid project ZIP archive', async () => {
    const validZip = createValidZipFixture();
    const result = await runZipIngestionPipeline(validZip, {
      projectName: 'Crime Victim App Test',
    });

    expect(result.projectId).toBeDefined();
    expect(result.caseNumber).toMatch(/^CASE-\d{4}-[A-Z0-9]{4,8}$/);
    createdProjectIds.push(result.projectId);

    // Verify DB record
    const dbProject = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { files: true, events: true },
    });

    expect(dbProject).not.toBeNull();
    expect(dbProject?.status).toBe('READY');
    expect(dbProject?.progress).toBe(100);
    expect(dbProject?.primaryLang).toBe('TypeScript');
    expect(dbProject?.files.length).toBeGreaterThan(0);

    // Check specific file classifications
    const pkgFile = dbProject?.files.find((f) => f.path === 'package.json');
    expect(pkgFile).toBeDefined();
    expect(pkgFile?.isIgnored).toBe(false);

    const gitFile = dbProject?.files.find((f) => f.path.startsWith('.git'));
    expect(gitFile).toBeUndefined(); // .git directories are skipped during discovery

    const nodeModulesFile = dbProject?.files.find((f) => f.path.startsWith('node_modules'));
    expect(nodeModulesFile).toBeUndefined(); // node_modules directories are skipped during discovery

    const serverFile = dbProject?.files.find((f) => f.path === 'src/server.ts');
    expect(serverFile).toBeDefined();
    expect(serverFile?.isEntry).toBe(true);
    expect(serverFile?.hash).toMatch(/^[a-f0-9]{64}$/);

    // Test secure file reader
    if (serverFile) {
      const readResult = await readProjectFileById(result.projectId, serverFile.id);
      expect(readResult.content).toContain('startServer');
      expect(readResult.hash).toBe(serverFile.hash);
    }
  });

  it('should reject a malicious ZIP containing path traversal (../)', async () => {
    const traversalZip = createTraversalZipFixture();

    await expect(
      runZipIngestionPipeline(traversalZip, { projectName: 'Malicious Traversal Attack' })
    ).rejects.toThrow(IngestionSecurityError);
  });

  it('should reject a malicious ZIP containing absolute paths (/etc/shadow)', async () => {
    const absPathZip = createAbsolutePathZipFixture();

    await expect(
      runZipIngestionPipeline(absPathZip, { projectName: 'Absolute Path Attack' })
    ).rejects.toThrow(IngestionSecurityError);
  });

  it('should reject a ZIP exceeding file count limit when configured', async () => {
    // Custom config limit can be tested
    process.env.MAX_FILES_COUNT = '5';
    const excessiveZip = createExcessiveFilesZipFixture(10);

    await expect(
      runZipIngestionPipeline(excessiveZip, { projectName: 'Excessive Files Attack' })
    ).rejects.toThrow(IngestionSecurityError);

    process.env.MAX_FILES_COUNT = '10000'; // Reset
  });
});
