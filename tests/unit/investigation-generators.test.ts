import { describe, it, expect } from 'vitest';
import { generateArchitectureInvestigation } from '@/lib/investigation/generators/architecture-investigator';
import { generateStartupInvestigation } from '@/lib/investigation/generators/startup-investigator';
import { generateDatabaseFlowInvestigation } from '@/lib/investigation/generators/database-flow-investigator';
import { generateBlastRadiusInvestigation } from '@/lib/investigation/generators/blast-radius-investigator';

describe('InvestigationGenerators: Unit Verification', () => {
  it('should generate architecture investigation grouping directories into subsystems', () => {
    const inv = generateArchitectureInvestigation('p1', {
      name: 'Test Project',
      primaryLang: 'TypeScript',
      files: [
        { id: 'f1', path: 'src/server.ts', lineCount: 50 },
        { id: 'f2', path: 'src/auth/token.ts', lineCount: 30 },
        { id: 'f3', path: 'src/db/client.ts', lineCount: 20 },
      ],
      symbols: [],
      dependencies: [],
      entryPoints: [{ path: 'src/server.ts', reason: 'Server entry point' }],
      techProfile: { databases: [{ name: 'Prisma' }] },
      brain: {},
    });

    expect(inv.type).toBe('ARCHITECTURE');
    expect(inv.steps.length).toBeGreaterThan(0);
    expect(inv.confidence).toBe('CONFIRMED');
    expect(inv.evidence.some((e) => e.file === 'src/server.ts')).toBe(true);
  });

  it('should handle startup investigation with detected entry points', () => {
    const inv = generateStartupInvestigation('p1', {
      name: 'Test Project',
      files: [{ id: 'f1', path: 'src/index.ts', lineCount: 40 }],
      symbols: [
        { id: 's1', name: 'loadConfig', kind: 'FUNCTION', fileId: 'f1', startLine: 5 },
        { id: 's2', name: 'startServer', kind: 'FUNCTION', fileId: 'f1', startLine: 15 },
      ],
      entryPoints: [{ path: 'src/index.ts', reason: 'CLI entry' }],
      dependencies: [],
    });

    expect(inv.type).toBe('STARTUP_FLOW');
    expect(inv.steps.length).toBeGreaterThan(1);
    expect(inv.steps.some((s) => s.relationship === 'LOADS_CONFIGURATION')).toBe(true);
  });

  it('should honestly report UNKNOWN for database flow when no database evidence exists', () => {
    const inv = generateDatabaseFlowInvestigation('p1', {
      dbEvidence: [],
      files: [{ id: 'f1', path: 'src/util.ts' }],
      symbols: [],
      techProfile: {},
    });

    expect(inv.type).toBe('DATABASE_FLOW');
    expect(inv.confidence).toBe('UNKNOWN');
    expect(inv.steps.length).toBe(0);
    expect(inv.uncertainties[0]).toContain('Database usage cannot be established');
  });

  it('should compute blast radius correctly with affected dependents', () => {
    const inv = generateBlastRadiusInvestigation('p1', 'src/auth.ts', {
      files: [
        { id: 'f1', path: 'src/auth.ts' },
        { id: 'f2', path: 'src/server.ts' },
      ],
      symbols: [],
      dependencies: [{ sourceFileId: 'f2', targetFileId: 'f1' }], // server imports auth
      entryPoints: [{ path: 'src/server.ts', reason: 'Server entry' }],
    });

    expect(inv.type).toBe('BLAST_RADIUS');
    expect(inv.affectedEntities).toContain('src/server.ts');
    expect(inv.steps.some((s) => s.relationship === 'BREAKS_DIRECT_DEPENDENT')).toBe(true);
  });
});
