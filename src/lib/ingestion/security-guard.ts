import path from 'path';

export class IngestionSecurityError extends Error {
  public readonly code: string;
  constructor(message: string, code: string = 'SECURITY_VIOLATION') {
    super(`[CRIME SCENE BREACH] ${message}`);
    this.name = 'IngestionSecurityError';
    this.code = code;
  }
}

/**
 * Sanitizes and validates a relative path inside an archive or uploaded directory.
 * Throws IngestionSecurityError if any path traversal or invalid characters are detected.
 */
export function sanitizeRelativePath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new IngestionSecurityError('Empty or invalid file path in archive.', 'INVALID_PATH');
  }

  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    // Keep raw if invalid URI encoding
  }

  // Check for null bytes in raw and decoded
  if (rawPath.includes('\0') || decoded.includes('\0')) {
    throw new IngestionSecurityError('Null byte detected in path.', 'NULL_BYTE_DETECTED');
  }

  // Normalize forward and backward slashes to standard forward slashes
  const normalized = decoded.replace(/\\/g, '/').trim();

  // Reject absolute paths (UNIX /etc/passwd or Windows C:/... or C:file)
  if (
    path.isAbsolute(normalized) ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.startsWith('//') ||
    normalized.startsWith('\\\\')
  ) {
    throw new IngestionSecurityError(
      `Absolute path or drive reference is forbidden in archive: "${rawPath}"`,
      'ABSOLUTE_PATH_FORBIDDEN'
    );
  }

  // Break path down into segments and check for directory traversal
  const segments = normalized.split('/').filter(Boolean);
  const safeSegments: string[] = [];

  for (const segment of segments) {
    if (segment === '.' || segment === '') {
      continue;
    }
    if (segment === '..') {
      throw new IngestionSecurityError(
        `Path traversal attempt ("..") detected in: "${rawPath}"`,
        'PATH_TRAVERSAL_DETECTED'
      );
    }
    // Disallow reserved DOS device names on Windows (e.g. con, prn, aux, nul, com1, nul.ts)
    const baseNameWithoutExt = segment.replace(/\.[^/.]+$/, '');
    if (
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(segment) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(baseNameWithoutExt)
    ) {
      throw new IngestionSecurityError(
        `Reserved system device name detected: "${segment}"`,
        'RESERVED_DEVICE_NAME'
      );
    }
    safeSegments.push(segment);
  }

  if (safeSegments.length === 0) {
    throw new IngestionSecurityError('Normalized path resolved to empty target.', 'EMPTY_PATH');
  }

  return safeSegments.join('/');
}

/**
 * Ensures that a target path is strictly jailed inside the base directory.
 */
export function assertPathInsideJail(baseDir: string, targetPath: string): void {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);

  // Target must start with resolvedBase + path separator or match resolvedBase
  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(resolvedBase + path.sep)
  ) {
    throw new IngestionSecurityError(
      `Path escaped root sandbox. Base: ${resolvedBase}, Target: ${resolvedTarget}`,
      'SANDBOX_ESCAPE_DETECTED'
    );
  }
}

/**
 * Validates zip entry compression ratio to defend against zip bombs (e.g. 42.zip).
 */
export function validateCompressionRatio(
  compressedSize: number,
  uncompressedSize: number,
  maxRatio: number = 100
): void {
  // If compressed size is 0 or extremely small, but uncompressed is large
  if (uncompressedSize > 1024 * 1024) { // > 1MB
    const ratio = uncompressedSize / Math.max(compressedSize, 1);
    if (ratio > maxRatio) {
      throw new IngestionSecurityError(
        `Excessive compression ratio detected (${Math.round(ratio)}:1 > ${maxRatio}:1). Potential decompression bomb.`,
        'ZIP_BOMB_DETECTED'
      );
    }
  }
}
