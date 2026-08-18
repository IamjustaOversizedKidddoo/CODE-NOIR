import { describe, it, expect, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import {
  createTypeScriptProjectFixture,
  createPythonProjectFixture,
  createNextjsProjectFixture,
  createCircularImportsFixture,
  createDatabaseAccessFixture,
  createPromptInjectionFixture,
  createUnsupportedLanguageFixture,
} from '../fixtures/helpers';

describe('Integration: Phase 2 Code Intelligence Pipeline', () => {
  const createdProjectIds: string[] = [];

  afterAll(async () => {
    for (const id of createdProjectIds) {
      try {
        await prisma.project.delete({ where: { id } });
      } catch {
        // ignore cleanup errors
      }
    }
  });

  it('1. should parse TypeScript project and extract symbols, dependencies, and entry points', async () => {
    const zip = createTypeScriptProjectFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'TS Crime Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { symbols: true, dependencies: true, files: true },
    });

    expect(project).not.toBeNull();
    expect(project?.status).toBe('READY');
    expect(project?.symbols.length).toBeGreaterThanOrEqual(4);

    // Verify symbols
    const authServiceSym = project?.symbols.find((s) => s.name === 'AuthService');
    expect(authServiceSym).toBeDefined();
    expect(authServiceSym?.kind).toBe('CLASS');

    const verifyTokenSym = project?.symbols.find((s) => s.name === 'verifyToken');
    expect(verifyTokenSym).toBeDefined();
    expect(verifyTokenSym?.kind).toBe('METHOD');

    // Verify dependencies
    const authDep = project?.dependencies.find((d) => d.importName?.includes('createAuthService'));
    expect(authDep).toBeDefined();
    expect(authDep?.resolutionStatus).toBe('RESOLVED');

    // Verify Technology Profile
    const techProfile = JSON.parse(project?.techStack || '{}');
    expect(techProfile.frameworks.some((f: any) => f.name === 'Express')).toBe(true);

    // Verify Entry Points
    const entryPoints = JSON.parse(project?.entryPoints || '[]');
    expect(entryPoints.some((ep: any) => ep.path === 'src/server.ts')).toBe(true);
  });

  it('2. should parse Python project and extract FastAPI endpoints and env vars', async () => {
    const zip = createPythonProjectFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Python Crime Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { symbols: true },
    });

    expect(project?.symbols.length).toBeGreaterThan(0);

    const endpoints = JSON.parse(project?.endpointsJson || '[]');
    expect(endpoints.some((e: any) => e.path === '/items' && e.method === 'GET')).toBe(true);

    const envVars = JSON.parse(project?.envVarsJson || '[]');
    expect(envVars.some((ev: any) => ev.name === 'DATABASE_URL')).toBe(true);
  });

  it('3. should parse Next.js project with App Router and Route Handlers', async () => {
    const zip = createNextjsProjectFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'NextJS Suspect Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
    });

    const techProfile = JSON.parse(project?.techStack || '{}');
    expect(techProfile.frameworks.some((f: any) => f.name === 'Next.js')).toBe(true);

    const endpoints = JSON.parse(project?.endpointsJson || '[]');
    expect(endpoints.some((e: any) => e.method === 'GET' && e.handlerSymbol === 'GET')).toBe(true);
    expect(endpoints.some((e: any) => e.method === 'POST' && e.handlerSymbol === 'POST')).toBe(true);
  });

  it('4. should process circular dependencies without infinite loops and record cycles', async () => {
    const zip = createCircularImportsFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Circular Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
    });

    expect(project?.status).toBe('READY');
    const brain = JSON.parse(project?.brainJson || '{}');
    expect(brain.statistics.circularDependencyCount).toBeGreaterThan(0);
  });

  it('5. should detect database evidence (Prisma & SQL query calls)', async () => {
    const zip = createDatabaseAccessFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'DB Access Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
    });

    const dbEvidence = JSON.parse(project?.dbEvidenceJson || '[]');
    expect(dbEvidence.length).toBeGreaterThan(0);
    expect(dbEvidence.some((d: any) => d.system === 'Prisma')).toBe(true);
  });

  it('6. should treat prompt injection attempts as safe static data without executing or corrupting pipeline', async () => {
    const zip = createPromptInjectionFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Prompt Injection Defense Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { symbols: true },
    });

    // Pipeline should complete with status READY
    expect(project?.status).toBe('READY');

    // Normal function parsed cleanly
    const normalFunc = project?.symbols.find((s) => s.name === 'normalFunction');
    expect(normalFunc).toBeDefined();
  });

  it('7. should handle unsupported languages gracefully without fake AST symbols', async () => {
    const zip = createUnsupportedLanguageFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Unsupported Languages Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { files: true, symbols: true },
    });

    expect(project?.status).toBe('READY');
    expect(project?.symbols.length).toBe(0); // No faked symbols
    expect(project?.files.every((f) => f.language === 'UNSUPPORTED_LANGUAGE')).toBe(true);
  });
});
