import { describe, it, expect, afterAll } from 'vitest';
import AdmZip from 'adm-zip';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import { GET as getFiles } from '@/app/api/cases/[caseId]/files/route';
import { GET as getFileDetail } from '@/app/api/cases/[caseId]/files/[fileId]/route';
import { GET as getSymbols } from '@/app/api/cases/[caseId]/symbols/route';
import { NextRequest } from 'next/server';

describe('Adversarial QA: API Fuzzing & Negative Inputs', () => {
  let testProjectId: string;
  let testFileId: string;

  afterAll(async () => {
    if (testProjectId) {
      try {
        await prisma.project.delete({ where: { id: testProjectId } });
      } catch {}
    }
  });

  it('1. setup test case for API fuzzing', async () => {
    const zip = new AdmZip();
    zip.addFile('package.json', Buffer.from('{"name": "fuzz-test"}'));
    zip.addFile(
      'src/server.ts',
      Buffer.from(`
// Line 1
export function lineTwo() { return 2; }
// Line 3
export function lineFour() { return 4; }
// Line 5
`)
    );

    const result = await runZipIngestionPipeline(zip.toBuffer(), { projectName: 'API Fuzz Case' });
    testProjectId = result.projectId;

    const file = await prisma.projectFile.findFirst({
      where: { projectId: testProjectId, path: 'src/server.ts' },
    });
    testFileId = file!.id;
  });

  it('2. should handle negative and oversized pagination parameters without crashing', async () => {
    const req = new NextRequest(`http://localhost:3000/api/cases/${testProjectId}/files?page=-5&limit=-100`);
    const res = await getFiles(req, { params: Promise.resolve({ caseId: testProjectId }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(1);
  });

  it('3. should handle non-existent case IDs returning 404', async () => {
    const req = new NextRequest(`http://localhost:3000/api/cases/non_existent_case_cuid/files`);
    const res = await getFiles(req, { params: Promise.resolve({ caseId: 'non_existent_case_cuid' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.code).toBe('CASE_NOT_FOUND');
  });

  it('4. should handle reversed and negative line slicing in file details API safely', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/cases/${testProjectId}/files/${testFileId}?startLine=100&endLine=2`
    );
    const res = await getFileDetail(req, {
      params: Promise.resolve({ caseId: testProjectId, fileId: testFileId }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.file.content).toBeDefined();
  });

  it('5. should handle special regex characters in symbol search queries safely', async () => {
    const req = new NextRequest(`http://localhost:3000/api/cases/${testProjectId}/symbols?search=[+*?^$()`);
    const res = await getSymbols(req, { params: Promise.resolve({ caseId: testProjectId }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.symbols)).toBe(true);
  });
});
