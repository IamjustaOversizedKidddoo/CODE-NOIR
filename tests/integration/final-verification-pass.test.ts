import { describe, it, expect, vi, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { parseGitHubUrl, fetchGitHubRepositoryZipball } from '@/lib/ingestion/github-fetcher';
import {
  runGitHubIngestionPipeline,
  runZipIngestionPipeline,
  runDirectFilesIngestionPipeline,
} from '@/lib/ingestion/pipeline';
import { IngestionSecurityError } from '@/lib/ingestion/security-guard';
import { analyzeReadme } from '@/lib/intelligence/readme-analyzer';
import {
  generateArchitectureFlowDiagram,
  generateInstallationFlowDiagram,
} from '@/lib/investigation/generators/flow-diagram-generator';
import { createValidZipFixture } from '../fixtures/helpers';
import * as fetcherModule from '@/lib/ingestion/github-fetcher';
import AdmZip from 'adm-zip';

describe('Final Comprehensive Acceptance & Regression Pass', () => {
  const createdProjectIds: string[] = [];

  afterAll(async () => {
    for (const id of createdProjectIds) {
      try {
        await prisma.project.delete({ where: { id } });
      } catch {
        // Ignore DB cleanup errors
      }
    }
  });

  // ==========================================
  // 1. COMPLETE GITHUB WORKFLOW TEST
  // ==========================================
  describe('1. Complete GitHub Workflow', () => {
    it('should run complete flow: GitHub URL -> Fetch -> README -> AST -> Architecture -> Installation -> Explanation', async () => {
      // Create a test zip with a full-stack Next.js project
      const zip = new AdmZip();
      zip.addFile(
        'README.md',
        Buffer.from(`# E2E Showcase App\n\nFullstack React & Node application.\n\n## Installation\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\`\`\`bash\nnpm run dev\n\`\`\``)
      );
      zip.addFile(
        'package.json',
        Buffer.from(
          JSON.stringify({
            name: 'showcase-app',
            dependencies: { next: '^15.0.0', react: '^19.0.0' },
            scripts: { dev: 'next dev', build: 'next build' },
          })
        )
      );
      zip.addFile('src/app/page.tsx', Buffer.from(`export default function Home() { return <h1>Showcase</h1>; }`));
      zip.addFile(
        'src/app/api/user/route.ts',
        Buffer.from(`export async function GET() { return Response.json({ status: 'ok' }); }`)
      );
      zip.addFile('prisma/schema.prisma', Buffer.from(`datasource db { provider = "sqlite" url = "file:./dev.db" }`));
      const zipBuf = zip.toBuffer();

      const fetchSpy = vi.spyOn(fetcherModule, 'fetchGitHubRepositoryZipball').mockResolvedValue({
        buffer: zipBuf,
        repoInfo: {
          owner: 'test-org',
          repo: 'showcase-app',
          ref: 'main',
          fullUrl: 'https://github.com/test-org/showcase-app',
        },
      });

      try {
        // Execute End-to-End Pipeline
        const result = await runGitHubIngestionPipeline('https://github.com/test-org/showcase-app');
        expect(result.projectId).toBeDefined();
        createdProjectIds.push(result.projectId);

        // Verify Database project record and analysis
        const project = await prisma.project.findUnique({
          where: { id: result.projectId },
          include: { files: true },
        });

        expect(project).not.toBeNull();
        expect(project?.status).toBe('READY');
        expect(['TypeScript', 'Polyglot']).toContain(project?.primaryLang);
        expect(project?.files.length).toBe(5);

        // Verify Architecture Diagram Generation
        const projectData = {
          name: project!.name,
          primaryLang: project!.primaryLang,
          files: project!.files,
          symbols: [],
          dependencies: [],
          entryPoints: [{ path: 'src/app/page.tsx', reason: 'Next.js Page' }],
          endpoints: [{ method: 'GET', path: '/api/user', framework: 'Next.js' }],
          envVars: [],
          dbEvidence: [{ system: 'Prisma', operation: 'schema' }],
          techProfile: {
            frameworks: [{ name: 'Next.js', confidence: 'CONFIRMED' }],
            databases: [{ name: 'Prisma ORM', confidence: 'CONFIRMED' }],
            manifestsData: { packageJson: { name: 'showcase-app', scripts: { dev: 'next dev', build: 'next build' } } },
          },
          brain: {
            readmeAnalysis: { found: true, dependencyInstructions: ['npm install'], runCommands: ['npm run dev'] },
          },
        };

        const archDiagram = generateArchitectureFlowDiagram(result.projectId, projectData as any);
        expect(archDiagram.nodes.length).toBeGreaterThanOrEqual(4);
        expect(archDiagram.nodes.some((n) => n.type === 'FRONTEND')).toBe(true);
        expect(archDiagram.nodes.some((n) => n.type === 'API')).toBe(true);

        const installDiagram = generateInstallationFlowDiagram(result.projectId, projectData as any);
        expect(installDiagram.nodes.some((n) => n.command === 'npm install')).toBe(true);
        expect(installDiagram.nodes.some((n) => n.command === 'npm run dev')).toBe(true);
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });

  // ==========================================
  // 2. POLYGLOT & MULTI-ECOSYSTEM ADAPTATION
  // ==========================================
  describe('2. Technology Stack & Ecosystem Adaptation', () => {
    it('should detect Python / pip ecosystem and CLI execution commands', () => {
      const projectData = {
        name: 'Python Service',
        primaryLang: 'Python',
        files: [
          { id: '1', path: 'requirements.txt', lineCount: 10 },
          { id: '2', path: 'app.py', lineCount: 50 },
        ],
        techProfile: { manifestsData: {} },
        brain: { readmeAnalysis: { found: false } },
      };

      const installDiagram = generateInstallationFlowDiagram('p1', projectData as any);
      const installNode = installDiagram.nodes.find((n) => n.type === 'INSTALLATION');
      const runNode = installDiagram.nodes.find((n) => n.type === 'EXECUTION');

      expect(installNode?.command).toBe('pip install -r requirements.txt');
      expect(runNode?.command).toBe('python app.py');
    });

    it('should detect Rust / Cargo ecosystem and cargo build commands', () => {
      const projectData = {
        name: 'Rust CLI Tool',
        primaryLang: 'Rust',
        files: [
          { id: '1', path: 'Cargo.toml', lineCount: 20 },
          { id: '2', path: 'src/main.rs', lineCount: 80 },
        ],
        techProfile: { manifestsData: {} },
        brain: { readmeAnalysis: { found: false } },
      };

      const installDiagram = generateInstallationFlowDiagram('p2', projectData as any);
      const installNode = installDiagram.nodes.find((n) => n.type === 'INSTALLATION');
      expect(installNode?.packageManager).toBe('cargo');
      expect(installNode?.command).toBe('cargo build');
    });

    it('should detect Go / go.mod ecosystem and go run commands', () => {
      const projectData = {
        name: 'Go Web API',
        primaryLang: 'Go',
        files: [
          { id: '1', path: 'go.mod', lineCount: 15 },
          { id: '2', path: 'main.go', lineCount: 60 },
        ],
        techProfile: { manifestsData: {} },
        brain: { readmeAnalysis: { found: false } },
      };

      const installDiagram = generateInstallationFlowDiagram('p3', projectData as any);
      const installNode = installDiagram.nodes.find((n) => n.type === 'INSTALLATION');
      const runNode = installDiagram.nodes.find((n) => n.type === 'EXECUTION');

      expect(installNode?.packageManager).toBe('go');
      expect(installNode?.command).toBe('go mod download');
      expect(runNode?.command).toBe('go run main.go');
    });
  });

  // ==========================================
  // 3. INVALID INPUT & SECURITY TESTING
  // ==========================================
  describe('3. Invalid Inputs & Security Guard Enforcement', () => {
    it('should reject malformed or non-GitHub URLs', () => {
      expect(() => parseGitHubUrl('http://github.com/owner/repo')).toThrow(IngestionSecurityError);
      expect(() => parseGitHubUrl('https://evil-site.com/owner/repo')).toThrow(IngestionSecurityError);
      expect(() => parseGitHubUrl('https://github.com/incomplete')).toThrow(IngestionSecurityError);
      expect(() => parseGitHubUrl('')).toThrow(IngestionSecurityError);
    });

    it('should handle non-existent repository 404 error cleanly', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 404, statusText: 'Not Found' })
      );

      try {
        await expect(
          fetchGitHubRepositoryZipball('https://github.com/nonexistent/fake-repo')
        ).rejects.toThrow('Could not locate or download public GitHub repository');
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it('should handle private/forbidden repository 403 error cleanly', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 403, statusText: 'Forbidden' })
      );

      try {
        await expect(
          fetchGitHubRepositoryZipball('https://github.com/private/secret-repo')
        ).rejects.toThrow();
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });

  // ==========================================
  // 4. README & EVIDENCE INTEGRITY
  // ==========================================
  describe('4. README Evidence Extraction & Undocumented Aspects', () => {
    it('should report undocumented aspects when README is missing or incomplete', () => {
      const docFiles = [{ path: 'README.md', content: '# Barebones Repo\n\nNo setup instructions provided.' }];
      const analysis = analyzeReadme(docFiles);

      expect(analysis.found).toBe(true);
      expect(analysis.projectName).toBe('Barebones Repo');
      expect(analysis.undocumentedAspects).toContain('Features List: Not documented in README');
      expect(analysis.undocumentedAspects).toContain('Environment Variables: Not documented in README');
    });

    it('should correctly flag README vs manifest discrepancies in installation diagram', () => {
      const projectData = {
        name: 'Discrepancy App',
        primaryLang: 'TypeScript',
        files: [
          { id: '1', path: 'package-lock.json', lineCount: 100 },
          { id: '2', path: 'package.json', lineCount: 20 },
        ],
        techProfile: {
          manifestsData: {
            packageJson: {
              name: 'discrepancy-app',
              scripts: { dev: 'next dev' }, // missing 'start' and missing 'build'
            },
          },
        },
        brain: {
          readmeAnalysis: {
            found: true,
            dependencyInstructions: ['yarn install'], // README says yarn, but lockfile is package-lock.json
            runCommands: ['npm start'], // README says npm start, but package.json has no 'start' script
            buildCommands: ['npm run build'], // README says build, but no build script in package.json
          },
        },
      };

      const installDiagram = generateInstallationFlowDiagram('p-discrepancy', projectData as any);
      expect(installDiagram.warnings?.length).toBe(3);
      expect(installDiagram.nodes.find((n) => n.type === 'INSTALLATION')?.status).toBe('DISCREPANCY');
      expect(installDiagram.nodes.find((n) => n.type === 'BUILD')?.status).toBe('DISCREPANCY');
      expect(installDiagram.nodes.find((n) => n.type === 'EXECUTION')?.status).toBe('DISCREPANCY');
    });
  });

  // ==========================================
  // 5. EXISTING CODE NOIR FUNCTIONALITY REGRESSION
  // ==========================================
  describe('5. CODE NOIR Existing Functionality Regression', () => {
    it('should support direct ZIP upload ingestion without regressions', async () => {
      const zipBuffer = createValidZipFixture();
      const result = await runZipIngestionPipeline(zipBuffer, { projectName: 'Regression Zip Test' });

      expect(result.projectId).toBeDefined();
      createdProjectIds.push(result.projectId);

      const dbProject = await prisma.project.findUnique({ where: { id: result.projectId } });
      expect(dbProject?.name).toBe('Regression Zip Test');
      expect(dbProject?.status).toBe('READY');
    });

    it('should support direct multi-file folder upload ingestion without regressions', async () => {
      const files = [
        { relativePath: 'package.json', buffer: Buffer.from(JSON.stringify({ name: 'folder-upload' })) },
        { relativePath: 'src/index.js', buffer: Buffer.from('console.log("hello");') },
      ];

      const result = await runDirectFilesIngestionPipeline(files, { projectName: 'Regression Folder Test' });

      expect(result.projectId).toBeDefined();
      createdProjectIds.push(result.projectId);

      const dbProject = await prisma.project.findUnique({ where: { id: result.projectId } });
      expect(dbProject?.name).toBe('Regression Folder Test');
      expect(dbProject?.status).toBe('READY');
    });
  });
});
