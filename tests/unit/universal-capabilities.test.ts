import { describe, it, expect } from 'vitest';
import { getLanguageCapability } from '@/lib/intelligence/capabilities';
import { classifyProjectCharacteristics } from '@/lib/intelligence/project-classifier';
import { detectEvidenceConflicts } from '@/lib/intelligence/conflict-detector';

describe('Phase 11: Universal Intelligence & Capability Matrix', () => {
  it('1. should return supported, partial, and unsupported capability profiles accurately', () => {
    const tsCap = getLanguageCapability('TYPESCRIPT');
    expect(tsCap.parser).toBe('SUPPORTED');
    expect(tsCap.symbolExtraction).toBe('SUPPORTED');

    const goCap = getLanguageCapability('GO');
    expect(goCap.parser).toBe('PARTIAL');
    expect(goCap.symbolExtraction).toBe('PARTIAL');

    const unsuppCap = getLanguageCapability('UNSUPPORTED_LANGUAGE');
    expect(unsuppCap.parser).toBe('UNSUPPORTED');
  });

  it('2. should classify monorepos, package managers, and size tiers from file structure', () => {
    const files = [
      { path: 'apps/web/package.json' },
      { path: 'apps/web/src/page.tsx' },
      { path: 'apps/api/requirements.txt' },
      { path: 'packages/types/package.json' },
      { path: 'pnpm-workspace.yaml' },
    ];
    const manifests = [
      { path: 'apps/web/package.json', content: '{"dependencies": {"next": "15.0.0"}}' },
      { path: 'apps/api/requirements.txt', content: 'fastapi==0.100.0\n' },
    ];

    const result = classifyProjectCharacteristics(files, manifests, []);

    expect(result.isMonorepo).toBe(true);
    expect(result.projectTypes).toContain('MONOREPO');
    expect(result.projectTypes).toContain('WEB_APPLICATION');
    expect(result.packageManagers.some((p) => p.name === 'pnpm')).toBe(true);
    expect(result.workspaces).toContain('apps/');
    expect(result.workspaces).toContain('packages/');
    expect(result.sizeTier).toBe('TINY');
  });

  it('3. should detect evidence conflicts between documentation claims and actual code configuration', () => {
    const docFiles = [
      {
        path: 'README.md',
        content: 'This application uses PostgreSQL for persistent data and JWT tokens for authentication.',
      },
    ];

    const analyses: any[] = [
      {
        path: 'src/db.ts',
        imports: [{ rawSource: 'cookie-session', importedSymbols: ['default'] }],
        envVars: [{ name: 'DB_PATH', evidence: 'sqlite:///./app.db' }],
        dbEvidence: [{ system: 'SQLite', operation: 'sqlite3.Database', evidence: 'sqlite' }],
      },
    ];

    const techProfile: any = { frameworks: [], runtimes: [], packageManagers: [], databases: [] };

    const conflicts = detectEvidenceConflicts(docFiles, techProfile, analyses);

    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    expect(conflicts.some((c) => c.type === 'DATABASE_SPECIFICATION_CONFLICT')).toBe(true);
    expect(conflicts.some((c) => c.type === 'AUTHENTICATION_STRATEGY_CONFLICT')).toBe(true);
  });
});
