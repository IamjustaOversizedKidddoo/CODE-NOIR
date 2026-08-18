import { describe, it, expect } from 'vitest';
import { evaluateIgnoreRules } from '@/lib/ingestion/ignore-rules';

describe('IgnoreRules: Filter & Manifest Preservation', () => {
  it('should ignore standard dependency and build directories', () => {
    expect(evaluateIgnoreRules('node_modules/express/index.js').ignored).toBe(true);
    expect(evaluateIgnoreRules('.git/config').ignored).toBe(true);
    expect(evaluateIgnoreRules('dist/bundle.js').ignored).toBe(true);
    expect(evaluateIgnoreRules('build/output.js').ignored).toBe(true);
    expect(evaluateIgnoreRules('__pycache__/app.cpython-311.pyc').ignored).toBe(true);
    expect(evaluateIgnoreRules('.venv/bin/activate').ignored).toBe(true);
    expect(evaluateIgnoreRules('.DS_Store').ignored).toBe(true);
  });

  it('should preserve critical project manifest files', () => {
    expect(evaluateIgnoreRules('package.json').ignored).toBe(false);
    expect(evaluateIgnoreRules('pyproject.toml').ignored).toBe(false);
    expect(evaluateIgnoreRules('Cargo.toml').ignored).toBe(false);
    expect(evaluateIgnoreRules('go.mod').ignored).toBe(false);
    expect(evaluateIgnoreRules('Dockerfile').ignored).toBe(false);
    expect(evaluateIgnoreRules('docker-compose.yml').ignored).toBe(false);
    expect(evaluateIgnoreRules('README.md').ignored).toBe(false);
    expect(evaluateIgnoreRules('.env.example').ignored).toBe(false);
  });

  it('should ignore oversized files when exceeding limit', () => {
    const result = evaluateIgnoreRules('src/large-dataset.json', {
      sizeBytes: 15 * 1024 * 1024,
      maxSingleFileBytes: 10 * 1024 * 1024,
    });
    expect(result.ignored).toBe(true);
    expect(result.reason).toContain('exceeds limit');
  });
});
