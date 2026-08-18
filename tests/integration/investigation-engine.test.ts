import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import { runInvestigation } from '@/lib/investigation/engine';
import {
  createTypeScriptProjectFixture,
  createPythonProjectFixture,
  createDatabaseProjectFixture,
} from '../fixtures/helpers';

describe('Integration: Phase 4 Investigation Engine', () => {
  let tsProjectId: string;
  let pyProjectId: string;
  let dbProjectId: string;

  beforeAll(async () => {
    // 1. Ingest TS Project
    const tsZip = createTypeScriptProjectFixture();
    const tsRes = await runZipIngestionPipeline(tsZip, { projectName: 'Investigation TS Test' });
    tsProjectId = tsRes.projectId;

    // 2. Ingest Python Project
    const pyZip = createPythonProjectFixture();
    const pyRes = await runZipIngestionPipeline(pyZip, { projectName: 'Investigation Python Test' });
    pyProjectId = pyRes.projectId;

    // 3. Ingest DB Project
    const dbZip = createDatabaseProjectFixture();
    const dbRes = await runZipIngestionPipeline(dbZip, { projectName: 'Investigation DB Test' });
    dbProjectId = dbRes.projectId;
  });

  afterAll(async () => {
    try {
      if (tsProjectId) await prisma.project.delete({ where: { id: tsProjectId } });
      if (pyProjectId) await prisma.project.delete({ where: { id: pyProjectId } });
      if (dbProjectId) await prisma.project.delete({ where: { id: dbProjectId } });
    } catch {}
  });

  it('1. should reconstruct high-level ARCHITECTURE with subsystems and entry points', async () => {
    const inv = await runInvestigation(tsProjectId, { type: 'ARCHITECTURE' });

    expect(inv.type).toBe('ARCHITECTURE');
    expect(inv.id).toBeDefined();
    expect(inv.confidence).toBe('CONFIRMED');
    expect(inv.steps.length).toBeGreaterThan(0);
    expect(inv.evidence.length).toBeGreaterThan(0);
  });

  it('2. should reconstruct STARTUP_FLOW from detected application entry points', async () => {
    const inv = await runInvestigation(tsProjectId, { type: 'STARTUP_FLOW' });

    expect(inv.type).toBe('STARTUP_FLOW');
    expect(inv.startingEntities[0].path).toBe('src/server.ts');
    expect(inv.steps.some((s) => s.relationship === 'INITIALIZES')).toBe(true);
  });

  it('3. should reconstruct CALL_FLOW with static caller/callee paths', async () => {
    const inv = await runInvestigation(tsProjectId, {
      type: 'CALL_FLOW',
      targetEntity: 'createAuthService',
    });

    expect(inv.type).toBe('CALL_FLOW');
    expect(inv.startingEntities[0].name).toBe('createAuthService');
    expect(inv.steps.length).toBeGreaterThan(0);
  });

  it('4. should reconstruct API_FLOW for detected API endpoints', async () => {
    const inv = await runInvestigation(pyProjectId, {
      type: 'API_FLOW',
      targetEntity: '/items',
    });

    expect(inv.type).toBe('API_FLOW');
    expect(inv.startingEntities[0].name).toContain('/items');
    expect(inv.steps.some((s) => s.relationship === 'ROUTES_TO_HANDLER')).toBe(true);
  });

  it('5. should reconstruct DATABASE_FLOW on projects with database operations', async () => {
    const inv = await runInvestigation(dbProjectId, { type: 'DATABASE_FLOW' });

    expect(inv.type).toBe('DATABASE_FLOW');
    expect(inv.confidence).toBe('CONFIRMED');
    expect(inv.steps.some((s) => s.relationship === 'QUERIES_DATABASE')).toBe(true);
  });

  it('6. should reconstruct AUTHENTICATION_FLOW when auth symbols/files exist', async () => {
    const inv = await runInvestigation(tsProjectId, { type: 'AUTHENTICATION_FLOW' });

    expect(inv.type).toBe('AUTHENTICATION_FLOW');
    expect(inv.confidence).toBe('CONFIRMED');
    expect(inv.steps.some((s) => s.relationship === 'EXECUTES_AUTH_LOGIC')).toBe(true);
  });

  it('7. should reconstruct CONFIGURATION_FLOW when environment variables exist', async () => {
    const inv = await runInvestigation(pyProjectId, { type: 'CONFIGURATION_FLOW' });

    expect(inv.type).toBe('CONFIGURATION_FLOW');
    expect(inv.confidence).toBe('CONFIRMED');
    expect(inv.steps.some((s) => s.sourceEntity.name === 'DATABASE_URL')).toBe(true);
  });

  it('8. should compute BLAST_RADIUS for deleted or modified modules', async () => {
    const inv = await runInvestigation(tsProjectId, {
      type: 'BLAST_RADIUS',
      targetEntity: 'src/auth.ts',
    });

    expect(inv.type).toBe('BLAST_RADIUS');
    expect(inv.affectedEntities).toContain('src/server.ts');
  });

  it('9. should build chronological PROJECT_STORY', async () => {
    const inv = await runInvestigation(tsProjectId, { type: 'PROJECT_STORY' });

    expect(inv.type).toBe('PROJECT_STORY');
    expect(inv.steps.length).toBeGreaterThan(0);
    expect(inv.steps[0].description).toContain('The investigation begins');
  });

  it('10. should persist investigations in SQLite database and list them', async () => {
    const dbInvs = await prisma.investigation.findMany({
      where: { projectId: tsProjectId },
    });

    expect(dbInvs.length).toBeGreaterThan(0);
  });
});
