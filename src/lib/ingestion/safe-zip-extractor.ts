import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import {
  sanitizeRelativePath,
  assertPathInsideJail,
  validateCompressionRatio,
  IngestionSecurityError,
} from './security-guard';
import { IngestionConfig } from './config';

export interface ExtractionResult {
  extractedCount: number;
  totalUncompressedBytes: number;
  targetDirectory: string;
}

/**
 * Safely extracts a ZIP buffer into a target directory with strict limits and rollback on failure.
 */
export async function safelyExtractZip(
  zipBuffer: Buffer,
  targetDirectory: string,
  config: IngestionConfig
): Promise<ExtractionResult> {
  const resolvedTarget = path.resolve(targetDirectory);

  // Prepare clean target directory
  await fs.promises.mkdir(resolvedTarget, { recursive: true });

  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err: any) {
    await fs.promises.rm(resolvedTarget, { recursive: true, force: true });
    throw new IngestionSecurityError(
      `Corrupted or malformed ZIP archive: ${err.message || err}`,
      'CORRUPTED_ARCHIVE'
    );
  }

  const entries = zip.getEntries();

  // 1. Check total entry count
  if (entries.length > config.maxFilesCount) {
    await fs.promises.rm(resolvedTarget, { recursive: true, force: true });
    throw new IngestionSecurityError(
      `Archive contains ${entries.length} files, exceeding limit of ${config.maxFilesCount}.`,
      'EXCESSIVE_FILE_COUNT'
    );
  }

  let totalBytes = 0;
  let extractedFiles = 0;

  try {
    for (const entry of entries) {
      // Check both rawEntryName header and decoded entryName
      const rawHeaderName = (entry as any).rawEntryName
        ? (entry as any).rawEntryName.toString('utf8')
        : entry.entryName;
      const entryName = entry.entryName;

      if (!entryName || entryName.trim() === '' || entryName === '/' || entryName === '\\') {
        continue;
      }

      // Check raw header for path traversal or absolute roots
      if (
        rawHeaderName.includes('..') ||
        rawHeaderName.startsWith('/') ||
        rawHeaderName.startsWith('\\') ||
        /^[a-zA-Z]:[/\\]/.test(rawHeaderName) ||
        rawHeaderName.includes('\0')
      ) {
        throw new IngestionSecurityError(
          `Path traversal or absolute root in archive header: "${rawHeaderName}"`,
          'PATH_TRAVERSAL_DETECTED'
        );
      }

      // Check for symlinks in entry attributes (POSIX symlink bit 0120000 -> 0xA000)
      const isSymlink = (entry.attr >>> 16) & 0o120000;
      if (isSymlink === 0o120000) {
        throw new IngestionSecurityError(
          `Symlink entry rejected in archive: "${entryName}"`,
          'SYMLINK_FORBIDDEN'
        );
      }

      // Sanitize path (throws on ../, absolute paths, null bytes, reserved names)
      const sanitizedRelPath = sanitizeRelativePath(entryName);
      const destinationPath = path.resolve(resolvedTarget, sanitizedRelPath);

      // Verify path strictly resides inside sandbox jail
      assertPathInsideJail(resolvedTarget, destinationPath);

      if (entry.isDirectory) {
        await fs.promises.mkdir(destinationPath, { recursive: true });
        continue;
      }

      const uncompressedSize = entry.header.size;
      const compressedSize = entry.header.compressedSize;

      // Validate compression ratio (zip bomb defense)
      validateCompressionRatio(compressedSize, uncompressedSize, config.maxCompressionRatio);

      totalBytes += uncompressedSize;
      if (totalBytes > config.maxExtractedBytes) {
        throw new IngestionSecurityError(
          `Extracted payload exceeds limit of ${(config.maxExtractedBytes / 1024 / 1024).toFixed(1)} MB.`,
          'EXCESSIVE_EXTRACTED_SIZE'
        );
      }

      // Ensure parent directory exists
      await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

      // Extract file data
      const data = entry.getData();
      await fs.promises.writeFile(destinationPath, data);
      extractedFiles++;
    }

    return {
      extractedCount: extractedFiles,
      totalUncompressedBytes: totalBytes,
      targetDirectory: resolvedTarget,
    };
  } catch (error) {
    // Rollback completely on any error - never leave partial untrusted files
    try {
      await fs.promises.rm(resolvedTarget, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    throw error;
  }
}
