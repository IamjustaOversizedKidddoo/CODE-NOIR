import { describe, it, expect } from 'vitest';
import { resolveImportPath } from '@/lib/intelligence/module-resolver';

describe('ModuleResolver: Cross-File Resolution & Path Aliasing', () => {
  const projectFiles = new Set([
    'src/index.ts',
    'src/auth/token.ts',
    'src/auth/index.ts',
    'src/utils/helpers.ts',
    'src/components/Button.tsx',
    'app/main.py',
    'app/config.py',
  ]);

  const pathAliases = {
    '@/*': ['src/*'],
  };

  it('should resolve relative imports with extension omission', () => {
    const result = resolveImportPath('src/index.ts', './auth/token', projectFiles);
    expect(result.resolutionStatus).toBe('RESOLVED');
    expect(result.targetFilePath).toBe('src/auth/token.ts');
    expect(result.confidence).toBe('CONFIRMED');
  });

  it('should resolve directory index imports', () => {
    const result = resolveImportPath('src/index.ts', './auth', projectFiles);
    expect(result.resolutionStatus).toBe('RESOLVED');
    expect(result.targetFilePath).toBe('src/auth/index.ts');
  });

  it('should resolve tsconfig path aliases (@/* -> src/*)', () => {
    const result = resolveImportPath('src/index.ts', '@/components/Button', projectFiles, pathAliases);
    expect(result.resolutionStatus).toBe('RESOLVED');
    expect(result.targetFilePath).toBe('src/components/Button.tsx');
  });

  it('should mark external package dependencies cleanly as UNRESOLVED', () => {
    const result = resolveImportPath('src/index.ts', 'express', projectFiles);
    expect(result.resolutionStatus).toBe('UNRESOLVED');
    expect(result.externalPackage).toBe('express');
  });
});
