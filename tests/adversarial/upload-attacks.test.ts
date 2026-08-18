import { describe, it, expect, afterAll } from 'vitest';
import AdmZip from 'adm-zip';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import { sanitizeRelativePath, IngestionSecurityError } from '@/lib/ingestion/security-guard';

describe('Adversarial QA: Ingestion & Upload Attacks', () => {
  const createdProjectIds: string[] = [];

  afterAll(async () => {
    for (const id of createdProjectIds) {
      try {
        await prisma.project.delete({ where: { id } });
      } catch {}
    }
  });

  it('1. should reject encoded path traversal (%2e%2e%2f) cleanly', () => {
    expect(() => sanitizeRelativePath('%2e%2e%2fetc/passwd')).toThrow(IngestionSecurityError);
    expect(() => sanitizeRelativePath('..%2f..%2fsecret.key')).toThrow(IngestionSecurityError);
  });

  it('2. should reject Windows drive letters (C:/ and C:file)', () => {
    expect(() => sanitizeRelativePath('C:/Windows/System32/cmd.exe')).toThrow(IngestionSecurityError);
    expect(() => sanitizeRelativePath('D:malicious.ts')).toThrow(IngestionSecurityError);
  });

  it('3. should reject null bytes in filenames (%00 and \\0)', () => {
    expect(() => sanitizeRelativePath('safe.ts\0.exe')).toThrow(IngestionSecurityError);
    expect(() => sanitizeRelativePath('exploit%00.js')).toThrow(IngestionSecurityError);
  });

  it('4. should reject reserved DOS device names (con, aux, nul, com1)', () => {
    expect(() => sanitizeRelativePath('con.ts')).toThrow(IngestionSecurityError);
    expect(() => sanitizeRelativePath('src/aux.js')).toThrow(IngestionSecurityError);
    expect(() => sanitizeRelativePath('nul')).toThrow(IngestionSecurityError);
  });

  it('5. should handle Unicode & emoji filenames gracefully', async () => {
    const zip = new AdmZip();
    zip.addFile('package.json', Buffer.from('{"name": "unicode-case"}'));
    zip.addFile('src/🚨_suspect.ts', Buffer.from('export const EVIDENCE = "Fingerprint";\n'));
    zip.addFile('src/досье_файл.ts', Buffer.from('export const CASE_NOTE = "Cyrillic Evidence";\n'));

    const result = await runZipIngestionPipeline(zip.toBuffer(), { projectName: 'Unicode Archive' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { files: true, symbols: true },
    });

    expect(project?.status).toBe('READY');
    expect(project?.files.some((f) => f.path.includes('🚨_suspect.ts'))).toBe(true);
    expect(project?.symbols.length).toBeGreaterThanOrEqual(1);
  });

  it('6. should handle mixed line endings (CRLF, LF, CR) and very long lines without crashing', async () => {
    const zip = new AdmZip();
    const longLine = 'const LONG_STRING = "' + 'A'.repeat(50000) + '";\n';
    const crlfContent = 'export function funcCRLF() {\r\n  return "crlf";\r\n}\r\n';
    const crContent = 'export function funcCR() {\r  return "cr";\r}\r';

    zip.addFile('package.json', Buffer.from('{"name": "line-endings-case"}'));
    zip.addFile('src/long.ts', Buffer.from(longLine));
    zip.addFile('src/crlf.ts', Buffer.from(crlfContent));
    zip.addFile('src/cr.ts', Buffer.from(crContent));

    const result = await runZipIngestionPipeline(zip.toBuffer(), { projectName: 'Line Endings Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { files: true, symbols: true },
    });

    expect(project?.status).toBe('READY');
    expect(project?.symbols.some((s) => s.name === 'funcCRLF')).toBe(true);
  });

  it('7. should handle single-file archive and deeply nested directory paths (depth > 12)', async () => {
    const zip = new AdmZip();
    const deepPath = 'a/b/c/d/e/f/g/h/i/j/k/l/deep_suspect.ts';
    zip.addFile(deepPath, Buffer.from('export function deepDetective() { return true; }\n'));

    const result = await runZipIngestionPipeline(zip.toBuffer(), { projectName: 'Deep Path Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { files: true, symbols: true },
    });

    expect(project?.status).toBe('READY');
    expect(project?.files.some((f) => f.path === deepPath)).toBe(true);
    expect(project?.symbols.some((s) => s.name === 'deepDetective')).toBe(true);
  });

  it('8. should ingest folder with nested directories and duplicate basenames in different dirs', async () => {
    const { runDirectFilesIngestionPipeline } = await import('@/lib/ingestion/pipeline');

    const files = [
      { relativePath: 'package.json', buffer: Buffer.from('{"name": "folder-test"}') },
      { relativePath: 'src/server.ts', buffer: Buffer.from('export function startServer() { return "main"; }\n') },
      { relativePath: 'pkg/server.ts', buffer: Buffer.from('export function startServer() { return "pkg"; }\n') },
      { relativePath: 'src/utils/math.ts', buffer: Buffer.from('export const add = (a: number, b: number) => a + b;\n') },
    ];

    const result = await runDirectFilesIngestionPipeline(files, { projectName: 'Folder Test Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { files: true, symbols: true },
    });

    expect(project?.status).toBe('READY');
    expect(project?.files.length).toBe(4);
    expect(project?.files.some((f) => f.path === 'src/server.ts')).toBe(true);
    expect(project?.files.some((f) => f.path === 'pkg/server.ts')).toBe(true);
    expect(project?.symbols.length).toBeGreaterThanOrEqual(2);
  });

  it('9. POST /api/upload should accept ZIP file under archive or file field', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const { NextRequest } = await import('next/server');

    const zip = new AdmZip();
    zip.addFile('package.json', Buffer.from('{"name": "api-zip-test"}'));
    zip.addFile('src/index.ts', Buffer.from('export const APP_VERSION = "1.0.0";\n'));

    const formData = new FormData();
    const file = new File([zip.toBuffer()], 'test-project.zip', { type: 'application/zip' });
    formData.append('archive', file);

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.caseId).toBeDefined();
    createdProjectIds.push(data.caseId);
  });

  it('10. POST /api/upload should accept folder upload with multiple files and paths', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const { NextRequest } = await import('next/server');

    const formData = new FormData();
    formData.append('files', new File(['{"name": "folder-api"}'], 'package.json', { type: 'application/json' }));
    formData.append('paths', 'package.json');

    formData.append('files', new File(['export const isFolder = true;'], 'config.ts', { type: 'text/plain' }));
    formData.append('paths', 'src/config.ts');

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.caseId).toBeDefined();
    createdProjectIds.push(data.caseId);
  });

  it('11. POST /api/upload should return friendly 400 when no files are submitted', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const { NextRequest } = await import('next/server');

    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.code).toBe('NO_FILE_PROVIDED');
  });
});
