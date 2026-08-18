import { describe, it, expect, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import {
  createGoServiceFixture,
  createRustCLIFixture,
  createJavaSpringFixture,
  createMonorepoFixture,
  createDocConflictFixture,
} from '../fixtures/helpers';

describe('Integration: Phase 11 Universal Repository Engine & Polyglot Stacks', () => {
  const createdProjectIds: string[] = [];

  afterAll(async () => {
    for (const id of createdProjectIds) {
      try {
        await prisma.project.delete({ where: { id } });
      } catch {}
    }
  });

  it('1. should ingest and parse Go service extracting symbols and Gin framework', async () => {
    const zip = createGoServiceFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Go Gin Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { symbols: true },
    });

    expect(project?.primaryLang).toBe('Go');
    expect(project?.symbols.some((s) => s.name === 'HandleGetSuspects')).toBe(true);
    expect(project?.symbols.some((s) => s.name === 'SuspectRecord')).toBe(true);
  });

  it('2. should ingest and parse Rust CLI extracting symbols and Cargo package manager', async () => {
    const zip = createRustCLIFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Rust CLI Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { symbols: true },
    });

    expect(project?.primaryLang).toBe('Rust');
    expect(project?.symbols.some((s) => s.name === 'execute_investigation')).toBe(true);
    expect(project?.symbols.some((s) => s.name === 'CliArgs')).toBe(true);
  });

  it('3. should ingest and parse Java Spring Boot service extracting classes and annotations', async () => {
    const zip = createJavaSpringFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Java Spring Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
      include: { symbols: true },
    });

    expect(project?.primaryLang).toBe('Java');
    expect(project?.symbols.some((s) => s.name === 'CrimeController')).toBe(true);
  });

  it('4. should detect Monorepo layout with multiple workspaces and polyglot technologies', async () => {
    const zip = createMonorepoFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Polyglot Monorepo Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
    });

    const brain = JSON.parse(project?.brainJson || '{}');
    expect(brain.technology.isMonorepo).toBe(true);
    expect(brain.technology.projectTypes).toContain('MONOREPO');
    expect(brain.technology.workspaces).toContain('apps/');
    expect(brain.technology.workspaces).toContain('packages/');
  });

  it('5. should detect evidence conflicts between README assertions and code reality', async () => {
    const zip = createDocConflictFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Conflict Case' });
    createdProjectIds.push(result.projectId);

    const project = await prisma.project.findUnique({
      where: { id: result.projectId },
    });

    const brain = JSON.parse(project?.brainJson || '{}');
    expect(brain.conflicts).toBeDefined();
    expect(brain.conflicts.length).toBeGreaterThanOrEqual(1);
    expect(brain.conflicts.some((c: any) => c.type === 'DATABASE_SPECIFICATION_CONFLICT')).toBe(true);
  });
});
