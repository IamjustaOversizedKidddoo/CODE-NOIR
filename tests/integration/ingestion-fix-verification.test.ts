import { describe, it, expect, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { parseGitHubUrl, fetchGitHubRepositoryZipball } from '@/lib/ingestion/github-fetcher';
import { POST } from '@/app/api/upload/route';
import { createValidZipFixture } from '../fixtures/helpers';
import { IngestionSecurityError } from '@/lib/ingestion/security-guard';
import { NextRequest } from 'next/server';

describe('Integration: Ingestion Fix & Verification Pass', () => {
  const createdProjectIds: string[] = [];

  afterAll(async () => {
    for (const id of createdProjectIds) {
      try {
        await prisma.project.delete({ where: { id } });
      } catch {
        // ignore
      }
    }
  });

  describe('1. GitHub URL Parsing Flexibility', () => {
    it('should parse URLs without https:// scheme', () => {
      const parsed = parseGitHubUrl('github.com/expressjs/express');
      expect(parsed.owner).toBe('expressjs');
      expect(parsed.repo).toBe('express');
    });

    it('should reject http:// scheme for security compliance', () => {
      expect(() => parseGitHubUrl('http://github.com/facebook/react')).toThrow(IngestionSecurityError);
    });

    it('should parse web directory URLs and extract branch ref', () => {
      const parsed = parseGitHubUrl('https://github.com/owner/repo/tree/dev/src/components');
      expect(parsed.owner).toBe('owner');
      expect(parsed.repo).toBe('repo');
      expect(parsed.ref).toBe('dev');
    });

    it('should parse web file URLs and extract branch ref', () => {
      const parsed = parseGitHubUrl('https://github.com/owner/repo/blob/main/README.md');
      expect(parsed.owner).toBe('owner');
      expect(parsed.repo).toBe('repo');
      expect(parsed.ref).toBe('main');
    });

    it('should strip trailing .git and slashes', () => {
      const parsed = parseGitHubUrl('https://github.com/pallets/flask.git/');
      expect(parsed.owner).toBe('pallets');
      expect(parsed.repo).toBe('flask');
    });
  });

  describe('2. Real GitHub Repository Zipball Download', () => {
    it('should fetch public GitHub zipball archive', async () => {
      const result = await fetchGitHubRepositoryZipball('https://github.com/octocat/Hello-World');
      expect(result.buffer).toBeDefined();
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.repoInfo.owner).toBe('octocat');
      expect(result.repoInfo.repo).toBe('Hello-World');
    });
  });

  describe('3. /api/upload End-to-End Ingestion API Routes', () => {
    it('should ingest GitHub repository via JSON POST to /api/upload', async () => {
      const req = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl: 'https://github.com/octocat/Hello-World' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.caseId).toBeDefined();
      expect(data.summary.totalFiles).toBeGreaterThan(0);

      createdProjectIds.push(data.caseId);
    });

    it('should ingest ZIP file via FormData POST to /api/upload', async () => {
      const zipBuffer = createValidZipFixture();
      const file = new File([zipBuffer], 'test-app.zip', { type: 'application/zip' });

      const formData = new FormData();
      formData.append('archive', file);
      formData.append('projectName', 'Test Archive App');

      const req = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.caseId).toBeDefined();
      expect(data.summary.includedFiles).toBeGreaterThan(0);

      createdProjectIds.push(data.caseId);
    });

    it('should ingest folder of files via FormData POST to /api/upload', async () => {
      const file1 = new File(['console.log("hello");'], 'index.ts', { type: 'text/plain' });
      const file2 = new File(['{"name": "demo"}'], 'package.json', { type: 'application/json' });

      const formData = new FormData();
      formData.append('projectName', 'Test Folder App');
      formData.append('files', file1);
      formData.append('paths', 'src/index.ts');
      formData.append('files', file2);
      formData.append('paths', 'package.json');

      const req = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.caseId).toBeDefined();
      expect(data.summary.includedFiles).toBe(2);

      createdProjectIds.push(data.caseId);
    });

    it('should return 400 Bad Request when no evidence is submitted', async () => {
      const req = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('NO_FILE_PROVIDED');
    });
  });
});
