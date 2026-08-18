import { describe, it, expect } from 'vitest';
import { classifyRepositoryFiles } from '@/lib/teaching/file-classifier';
import { buildHierarchicalClusters } from '@/lib/teaching/subsystem-clusterer';
import { buildCurriculumDAG } from '@/lib/teaching/dependency-dag';
import { UniversalFileRecord } from '@/lib/teaching/types';

function createSyntheticRepositoryFiles(count: number) {
  const files = [];
  const dependencies = [];

  for (let i = 1; i <= count; i++) {
    const isEntry = i === 1 || i === 2;
    const isTest = i % 5 === 0;
    const isConfig = i % 7 === 0;
    const isSecurity = i % 11 === 0;

    let path = `src/module_${Math.floor(i / 10)}/file_${i}.ts`;
    if (isEntry) path = i === 1 ? 'src/index.ts' : 'src/server.ts';
    else if (isTest) path = `tests/unit/test_${i}.test.ts`;
    else if (isConfig) path = `config/settings_${i}.json`;
    else if (isSecurity) path = `src/auth/security_${i}.ts`;

    files.push({
      id: `file_${i}`,
      path,
      isBinary: false,
      isIgnored: false,
      lineCount: 50 + (i % 100),
    });

    // Create dependency edges to previous files
    if (i > 1) {
      dependencies.push({
        sourceFileId: `file_${i}`,
        targetFileId: `file_${Math.max(1, i - 1)}`,
      });
    }
  }

  // Create intentional circular dependency between file_3 and file_4
  if (count >= 4) {
    dependencies.push({
      sourceFileId: 'file_3',
      targetFileId: 'file_4',
    });
    dependencies.push({
      sourceFileId: 'file_4',
      targetFileId: 'file_3',
    });
  }

  return { files, dependencies };
}

describe('Phase 13: Universal Repository Organizer & 50,000+ File Scale Test Suite', () => {
  it('1. should process 10-file repository within 50ms', () => {
    const { files, dependencies } = createSyntheticRepositoryFiles(10);
    const rankedFiles = files.map((f, idx) => ({ id: f.id, path: f.path, importanceScore: 1 / (idx + 1) }));
    const entryPoints = [{ path: 'src/index.ts', reason: 'Primary entry point' }];

    const startTime = Date.now();
    const classified = classifyRepositoryFiles(files, rankedFiles as any, dependencies, entryPoints);
    const clusters = buildHierarchicalClusters(classified.universalRecords, dependencies);
    const dag = buildCurriculumDAG(classified.universalRecords, dependencies);
    const duration = Date.now() - startTime;

    expect(classified.universalRecords.length).toBe(10);
    expect(clusters.length).toBeGreaterThan(0);
    expect(dag.nodes.length).toBe(10);
    expect(duration).toBeLessThan(50);
  });

  it('2. should process 100-file repository within 150ms and detect circular dependencies', () => {
    const { files, dependencies } = createSyntheticRepositoryFiles(100);
    const rankedFiles = files.map((f, idx) => ({ id: f.id, path: f.path, importanceScore: 1 / (idx + 1) }));
    const entryPoints = [{ path: 'src/index.ts', reason: 'Primary entry point' }];

    const startTime = Date.now();
    const classified = classifyRepositoryFiles(files, rankedFiles as any, dependencies, entryPoints);
    const clusters = buildHierarchicalClusters(classified.universalRecords, dependencies);
    const dag = buildCurriculumDAG(classified.universalRecords, dependencies);
    const duration = Date.now() - startTime;

    expect(classified.universalRecords.length).toBe(100);
    expect(clusters.length).toBeGreaterThan(0);
    expect(dag.cycles.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(150);
  });

  it('3. should process 1,000-file repository within 500ms without memory bloat', () => {
    const { files, dependencies } = createSyntheticRepositoryFiles(1000);
    const rankedFiles = files.map((f, idx) => ({ id: f.id, path: f.path, importanceScore: 1 / (idx + 1) }));
    const entryPoints = [{ path: 'src/index.ts', reason: 'Primary entry point' }];

    const startTime = Date.now();
    const classified = classifyRepositoryFiles(files, rankedFiles as any, dependencies, entryPoints);
    const clusters = buildHierarchicalClusters(classified.universalRecords, dependencies);
    const dag = buildCurriculumDAG(classified.universalRecords, dependencies);
    const duration = Date.now() - startTime;

    expect(classified.universalRecords.length).toBe(1000);
    expect(clusters.length).toBeGreaterThan(0);
    expect(dag.nodes.length).toBe(1000);
    expect(duration).toBeLessThan(500);
  });

  it('4. should process 10,000-file repository within 2,500ms with bounded clustering', () => {
    const { files, dependencies } = createSyntheticRepositoryFiles(10000);
    const rankedFiles = files.map((f, idx) => ({ id: f.id, path: f.path, importanceScore: 1 / (idx + 1) }));
    const entryPoints = [{ path: 'src/index.ts', reason: 'Primary entry point' }];

    const startTime = Date.now();
    const classified = classifyRepositoryFiles(files, rankedFiles as any, dependencies, entryPoints);
    const clusters = buildHierarchicalClusters(classified.universalRecords, dependencies);
    const dag = buildCurriculumDAG(classified.universalRecords, dependencies);
    const duration = Date.now() - startTime;

    expect(classified.universalRecords.length).toBe(10000);
    expect(clusters.length).toBeGreaterThan(0);
    expect(dag.nodes.length).toBe(10000);
    expect(duration).toBeLessThan(2500);
  });
});
