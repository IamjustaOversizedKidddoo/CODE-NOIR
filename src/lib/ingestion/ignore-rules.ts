import path from 'path';

export const DEFAULT_IGNORED_DIRS = new Set([
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.venv',
  'venv',
  'env',
  '.env.virtual',
  'target', // Rust/Java target
  'vendor', // Go/PHP vendor
  '.idea',
  '.vscode',
  '.turbo',
  '.cache',
  '.parcel-cache',
  '.storage',
]);

export const DEFAULT_IGNORED_FILES = new Set([
  '.ds_store',
  'thumbs.db',
  'desktop.ini',
  'npm-debug.log',
  'yarn-debug.log',
  'yarn-error.log',
  '.eslintcache',
]);

export const PRESERVED_MANIFEST_FILENAMES = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'pyproject.toml',
  'requirements.txt',
  'pipfile',
  'pipfile.lock',
  'cargo.toml',
  'cargo.lock',
  'go.mod',
  'go.sum',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'makefile',
  'cmakelists.txt',
  'readme.md',
  'readme.txt',
  'readme',
  '.env.example',
  '.gitignore',
  'tsconfig.json',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'vite.config.js',
  'vite.config.ts',
]);

export interface IgnoreDecision {
  ignored: boolean;
  reason?: string;
}

/**
 * Determines whether a file path or directory should be ignored.
 */
export function evaluateIgnoreRules(
  relativePath: string,
  options?: { isBinary?: boolean; sizeBytes?: number; maxSingleFileBytes?: number; isDirectory?: boolean }
): IgnoreDecision {
  const normalized = relativePath.replace(/\\/g, '/');
  const isDir = options?.isDirectory || normalized.endsWith('/');
  const segments = normalized.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return { ignored: false };
  }

  const fileName = (segments[segments.length - 1] || '').toLowerCase();
  const isManifest = PRESERVED_MANIFEST_FILENAMES.has(fileName);

  // Check all parent directories (or all segments if checking a directory)
  const dirSegments = isDir ? segments : segments.slice(0, -1);
  for (const segment of dirSegments) {
    const dir = segment.toLowerCase();
    if (DEFAULT_IGNORED_DIRS.has(dir)) {
      return { ignored: true, reason: `Contained in ignored directory: "${segment}"` };
    }
  }

  if (isDir) {
    if (DEFAULT_IGNORED_DIRS.has(fileName)) {
      return { ignored: true, reason: `Ignored directory: "${fileName}"` };
    }
    return { ignored: false };
  }

  // Check file name
  if (DEFAULT_IGNORED_FILES.has(fileName)) {
    return { ignored: true, reason: `Ignored system/cache file: "${fileName}"` };
  }

  // Check if oversize
  if (options?.sizeBytes && options.maxSingleFileBytes && options.sizeBytes > options.maxSingleFileBytes) {
    return {
      ignored: true,
      reason: `File size (${(options.sizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${(options.maxSingleFileBytes / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check binary status if specified
  if (options?.isBinary && !isManifest) {
    return { ignored: true, reason: 'Compiled binary / media asset' };
  }

  return { ignored: false };
}
