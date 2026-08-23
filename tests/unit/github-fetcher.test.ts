import { describe, it, expect } from 'vitest';
import { parseGitHubUrl } from '@/lib/ingestion/github-fetcher';
import { IngestionSecurityError } from '@/lib/ingestion/security-guard';

describe('GitHub Fetcher: URL Parsing & Validation', () => {
  it('should correctly parse standard public repository URLs', () => {
    const info = parseGitHubUrl('https://github.com/expressjs/express');
    expect(info.owner).toBe('expressjs');
    expect(info.repo).toBe('express');
    expect(info.ref).toBeUndefined();
  });

  it('should handle .git suffix and trailing slash', () => {
    const info = parseGitHubUrl('https://github.com/facebook/react.git/');
    expect(info.owner).toBe('facebook');
    expect(info.repo).toBe('react');
  });

  it('should parse specific branch tree URLs', () => {
    const info = parseGitHubUrl('https://github.com/vercel/next.js/tree/canary');
    expect(info.owner).toBe('vercel');
    expect(info.repo).toBe('next.js');
    expect(info.ref).toBe('canary');
  });

  it('should reject non-GitHub domain URLs', () => {
    expect(() => parseGitHubUrl('https://malicious-site.com/repo')).toThrow(IngestionSecurityError);
    expect(() => parseGitHubUrl('http://github.com/repo')).toThrow(IngestionSecurityError);
  });

  it('should reject malformed or incomplete GitHub URLs', () => {
    expect(() => parseGitHubUrl('https://github.com/onlyowner')).toThrow(IngestionSecurityError);
    expect(() => parseGitHubUrl('')).toThrow(IngestionSecurityError);
  });
});
