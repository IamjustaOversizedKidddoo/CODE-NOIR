import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  sanitizeRelativePath,
  assertPathInsideJail,
  validateCompressionRatio,
  IngestionSecurityError,
} from '@/lib/ingestion/security-guard';

describe('SecurityGuard: Path Traversal & Sandbox Jails', () => {
  it('should sanitize safe relative paths correctly', () => {
    expect(sanitizeRelativePath('src/auth/token.ts')).toBe('src/auth/token.ts');
    expect(sanitizeRelativePath('src\\utils\\helper.py')).toBe('src/utils/helper.py');
    expect(sanitizeRelativePath('./components/Button.tsx')).toBe('components/Button.tsx');
  });

  it('should reject ../ path traversal attempts', () => {
    expect(() => sanitizeRelativePath('../../etc/passwd')).toThrow(IngestionSecurityError);
    expect(() => sanitizeRelativePath('src/../../secrets.env')).toThrow(IngestionSecurityError);
    expect(() => sanitizeRelativePath('..\\..\\windows\\system32')).toThrow(IngestionSecurityError);
  });

  it('should reject absolute paths', () => {
    expect(() => sanitizeRelativePath('/etc/passwd')).toThrow(IngestionSecurityError);
    expect(() => sanitizeRelativePath('C:/Windows/System32/cmd.exe')).toThrow(IngestionSecurityError);
    expect(() => sanitizeRelativePath('//network/share/file.txt')).toThrow(IngestionSecurityError);
  });

  it('should reject null bytes in file paths', () => {
    expect(() => sanitizeRelativePath('src/file.ts\0.exe')).toThrow(IngestionSecurityError);
  });

  it('should reject reserved Windows system device names', () => {
    expect(() => sanitizeRelativePath('con/file.txt')).toThrow(IngestionSecurityError);
    expect(() => sanitizeRelativePath('src/nul.ts')).toThrow(IngestionSecurityError);
  });

  it('should enforce strict sandbox jail boundaries', () => {
    const baseJail = path.resolve('./.storage/cases/test-case/raw');
    const safeInside = path.resolve(baseJail, 'src/index.ts');
    const escapedOutside = path.resolve(baseJail, '../compromised.txt');

    expect(() => assertPathInsideJail(baseJail, safeInside)).not.toThrow();
    expect(() => assertPathInsideJail(baseJail, escapedOutside)).toThrow(IngestionSecurityError);
  });

  it('should detect excessive compression ratios for zip bomb defense', () => {
    // 100MB uncompressed from 10KB compressed -> ratio = 10,000:1 (Limit = 100:1)
    expect(() => validateCompressionRatio(10 * 1024, 100 * 1024 * 1024, 100)).toThrow(
      IngestionSecurityError
    );

    // Normal ratio (2MB from 1MB -> 2:1)
    expect(() => validateCompressionRatio(1024 * 1024, 2 * 1024 * 1024, 100)).not.toThrow();
  });
});
