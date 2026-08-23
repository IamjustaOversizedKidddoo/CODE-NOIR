import crypto from 'crypto';
import path from 'path';
import prisma from '../db';
import { getIngestionConfig } from './config';
import { safelyExtractZip } from './safe-zip-extractor';
import { discoverFiles } from './file-discoverer';
import { emitProjectEvent } from '../events/project-events';
import { runCodeIntelligencePipeline } from '../intelligence/engine';
import { runSecurityAudit } from '../security/scanner';
import { IngestionSecurityError, sanitizeRelativePath, assertPathInsideJail } from './security-guard';
import { IngestionResult, DiscoveredFileInfo } from '../types/project';
import { fetchGitHubRepositoryZipball } from './github-fetcher';

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CASE-${year}-${randomSuffix}`;
}

function detectPrimaryLanguage(files: DiscoveredFileInfo[]): string {
  const langCounts: Record<string, number> = {};

  const extToLang: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.cs': 'C#',
    '.php': 'PHP',
    '.rb': 'Ruby',
  };

  for (const f of files) {
    if (f.isIgnored || f.isBinary) continue;
    const lang = extToLang[f.extension];
    if (lang) {
      langCounts[lang] = (langCounts[lang] || 0) + (f.lineCount || 1);
    }
  }

  let topLang = 'Generic / Polyglot';
  let maxLines = 0;
  for (const [lang, lines] of Object.entries(langCounts)) {
    if (lines > maxLines) {
      maxLines = lines;
      topLang = lang;
    }
  }

  return topLang;
}

export interface RunIngestionOptions {
  projectName?: string;
  description?: string;
}

/**
 * Runs the full safe ingestion pipeline for an uploaded ZIP archive buffer.
 */
export async function runZipIngestionPipeline(
  zipBuffer: Buffer,
  options?: RunIngestionOptions
): Promise<IngestionResult> {
  const config = getIngestionConfig();
  const caseNumber = generateCaseNumber();
  const projectName = options?.projectName || `Evidence Archive ${caseNumber}`;

  // 1. Initialize Project Record in DB
  const project = await prisma.project.create({
    data: {
      caseNumber,
      name: projectName,
      description: options?.description || 'Classified Evidence Submission',
      status: 'CREATED',
      statusMessage: 'Case file opened. Initializing vault...',
      progress: 5,
      storagePath: '', // Will update once target path is assigned
    },
  });

  const projectId = project.id;
  const projectDir = path.resolve(config.storageRoot, 'cases', projectId, 'raw');

  await prisma.project.update({
    where: { id: projectId },
    data: { storagePath: path.relative(config.storageRoot, projectDir) },
  });

  try {
    // 2. Emit Case Opened Event
    await emitProjectEvent({
      projectId,
      eventType: 'CASE_OPENED',
      state: 'CREATED',
      message: `[CASE OPENED] Assigned dossier ${caseNumber}. Preparing isolated vault.`,
      progress: 10,
    });

    // 3. Extract Archive with strict sandboxing
    await emitProjectEvent({
      projectId,
      eventType: 'EXTRACTING',
      state: 'EXTRACTING',
      message: `[UNSEALING ARCHIVE] Extracting evidence containers into sandbox...`,
      progress: 25,
    });

    const extractResult = await safelyExtractZip(zipBuffer, projectDir, config);

    // 4. Discover & Inventory Files
    await emitProjectEvent({
      projectId,
      eventType: 'DISCOVERING_EVIDENCE',
      state: 'DISCOVERING',
      message: `[DISCOVERING EVIDENCE] Cataloging evidence, computing hashes, detecting languages...`,
      progress: 50,
    });

    const discoveredFiles = await discoverFiles(projectDir, config);

    const includedFiles = discoveredFiles.filter((f) => !f.isIgnored);
    const ignoredFiles = discoveredFiles.filter((f) => f.isIgnored);
    const totalLines = includedFiles.reduce((acc, f) => acc + f.lineCount, 0);
    const totalBytes = extractResult.totalUncompressedBytes;
    const primaryLang = detectPrimaryLanguage(discoveredFiles);

    await emitProjectEvent({
      projectId,
      eventType: 'EVIDENCE_DISCOVERED',
      state: 'DISCOVERING',
      message: `[EVIDENCE CATALOGED] Identified ${discoveredFiles.length} files (${includedFiles.length} active, ${ignoredFiles.length} filtered). Primary Tech: ${primaryLang}.`,
      progress: 75,
      data: {
        totalFiles: discoveredFiles.length,
        includedFiles: includedFiles.length,
        ignoredFiles: ignoredFiles.length,
        totalLines,
        primaryLang,
      },
    });

    // 5. Batch persist file metadata to Database
    await emitProjectEvent({
      projectId,
      eventType: 'READING_FILES',
      state: 'DISCOVERING',
      message: `[INDEXING VAULT] Storing cryptographic hashes & line metrics...`,
      progress: 85,
    });

    // SQLite batch insertion in chunks of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < discoveredFiles.length; i += CHUNK_SIZE) {
      const chunk = discoveredFiles.slice(i, i + CHUNK_SIZE);
      await prisma.projectFile.createMany({
        data: chunk.map((file) => ({
          projectId,
          path: file.path,
          extension: file.extension,
          sizeBytes: file.sizeBytes,
          lineCount: file.lineCount,
          isBinary: file.isBinary,
          isIgnored: file.isIgnored,
          ignoreReason: file.ignoreReason,
          isEntry: file.isEntry,
          hash: file.hash,
        })),
      });
    }

    // Update project metrics in database
    await prisma.project.update({
      where: { id: projectId },
      data: {
        totalFiles: discoveredFiles.length,
        includedFiles: includedFiles.length,
        ignoredFiles: ignoredFiles.length,
        totalLines,
        totalBytes,
        primaryLang,
      },
    });

    // 6. Run Deterministic Code Intelligence Engine & Security Audit
    await runCodeIntelligencePipeline(projectId);
    try {
      await runSecurityAudit(projectId);
    } catch (secErr) {
      console.warn('[Ingestion Security Audit Non-Fatal Warning]', secErr);
    }

    // 7. Return Final Ingestion & Intelligence Result
    const updatedProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    return {
      projectId,
      caseNumber,
      totalFiles: discoveredFiles.length,
      includedFiles: includedFiles.length,
      ignoredFiles: ignoredFiles.length,
      totalLines,
      totalBytes,
      primaryLang: updatedProject?.primaryLang || primaryLang,
      files: discoveredFiles,
    };
  } catch (error: any) {
    // Record failure in DB and emit error event
    await emitProjectEvent({
      projectId,
      eventType: 'ERROR',
      state: 'ERROR',
      message: `[INGESTION FAILED] ${error.message || error}`,
      progress: 0,
      data: { errorCode: error.code || 'UNKNOWN_ERROR' },
    });

    throw error;
  }
}

export interface DirectFileInput {
  relativePath: string;
  buffer: Buffer;
}

/**
 * Runs the safe ingestion pipeline for an uploaded directory of files.
 */
export async function runDirectFilesIngestionPipeline(
  files: DirectFileInput[],
  options?: RunIngestionOptions
): Promise<IngestionResult> {
  const config = getIngestionConfig();
  const caseNumber = generateCaseNumber();
  const projectName = options?.projectName || `Evidence Folder ${caseNumber}`;

  if (!files || files.length === 0) {
    throw new IngestionSecurityError('No files submitted in project folder.', 'EMPTY_FOLDER');
  }

  if (files.length > config.maxFilesCount) {
    throw new IngestionSecurityError(
      `File count (${files.length}) exceeds maximum limit (${config.maxFilesCount}).`,
      'EXCESSIVE_FILE_COUNT'
    );
  }

  const project = await prisma.project.create({
    data: {
      caseNumber,
      name: projectName,
      description: options?.description || 'Classified Folder Submission',
      status: 'CREATED',
      statusMessage: 'Case file opened. Initializing vault...',
      progress: 5,
      storagePath: '',
    },
  });

  const projectId = project.id;
  const projectDir = path.resolve(config.storageRoot, 'cases', projectId, 'raw');

  await prisma.project.update({
    where: { id: projectId },
    data: { storagePath: path.relative(config.storageRoot, projectDir) },
  });

  try {
    await emitProjectEvent({
      projectId,
      eventType: 'CASE_OPENED',
      state: 'CREATED',
      message: `[CASE OPENED] Assigned dossier ${caseNumber}. Preparing isolated vault.`,
      progress: 10,
    });

    // Write files with strict sandboxing and sanitization
    const fs = await import('fs');
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    let totalBytes = 0;
    for (const item of files) {
      const sanitized = sanitizeRelativePath(item.relativePath);
      const targetPath = path.resolve(projectDir, sanitized);
      assertPathInsideJail(projectDir, targetPath);

      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, item.buffer);
      totalBytes += item.buffer.length;

      if (totalBytes > config.maxExtractedBytes) {
        throw new IngestionSecurityError(
          `Total project size exceeds maximum limit (${config.maxExtractedBytes} bytes).`,
          'SIZE_LIMIT_EXCEEDED'
        );
      }
    }

    // Discover & Inventory Files
    await emitProjectEvent({
      projectId,
      eventType: 'DISCOVERING_EVIDENCE',
      state: 'DISCOVERING',
      message: `[DISCOVERING EVIDENCE] Cataloging evidence, computing hashes, detecting languages...`,
      progress: 50,
    });

    const discoveredFiles = await discoverFiles(projectDir, config);
    const includedFiles = discoveredFiles.filter((f) => !f.isIgnored);
    const ignoredFiles = discoveredFiles.filter((f) => f.isIgnored);
    const totalLines = includedFiles.reduce((acc, f) => acc + f.lineCount, 0);
    const primaryLang = detectPrimaryLanguage(discoveredFiles);

    await emitProjectEvent({
      projectId,
      eventType: 'EVIDENCE_DISCOVERED',
      state: 'DISCOVERING',
      message: `[EVIDENCE CATALOGED] Identified ${discoveredFiles.length} files (${includedFiles.length} active, ${ignoredFiles.length} filtered). Primary Tech: ${primaryLang}.`,
      progress: 75,
      data: {
        totalFiles: discoveredFiles.length,
        includedFiles: includedFiles.length,
        ignoredFiles: ignoredFiles.length,
        totalLines,
        primaryLang,
      },
    });

    const CHUNK_SIZE = 500;
    for (let i = 0; i < discoveredFiles.length; i += CHUNK_SIZE) {
      const chunk = discoveredFiles.slice(i, i + CHUNK_SIZE);
      await prisma.projectFile.createMany({
        data: chunk.map((file) => ({
          projectId,
          path: file.path,
          extension: file.extension,
          sizeBytes: file.sizeBytes,
          lineCount: file.lineCount,
          isBinary: file.isBinary,
          isIgnored: file.isIgnored,
          ignoreReason: file.ignoreReason,
          isEntry: file.isEntry,
          hash: file.hash,
        })),
      });
    }

    // Update project metrics in database
    await prisma.project.update({
      where: { id: projectId },
      data: {
        totalFiles: discoveredFiles.length,
        includedFiles: includedFiles.length,
        ignoredFiles: ignoredFiles.length,
        totalLines,
        totalBytes,
        primaryLang,
      },
    });

    await runCodeIntelligencePipeline(projectId);
    try {
      await runSecurityAudit(projectId);
    } catch (secErr) {
      console.warn('[Ingestion Security Audit Non-Fatal Warning]', secErr);
    }

    const updatedProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    return {
      projectId,
      caseNumber,
      totalFiles: discoveredFiles.length,
      includedFiles: includedFiles.length,
      ignoredFiles: ignoredFiles.length,
      totalLines,
      totalBytes,
      primaryLang: updatedProject?.primaryLang || primaryLang,
      files: discoveredFiles,
    };
  } catch (error: any) {
    await emitProjectEvent({
      projectId,
      eventType: 'ERROR',
      state: 'ERROR',
      message: `[INGESTION FAILED] ${error.message || error}`,
      progress: 0,
      data: { errorCode: error.code || 'UNKNOWN_ERROR' },
    });

    throw error;
  }
}

/**
 * Runs the safe ingestion pipeline for a public GitHub repository URL.
 */
export async function runGitHubIngestionPipeline(
  githubUrl: string,
  options?: RunIngestionOptions
): Promise<IngestionResult> {
  const config = getIngestionConfig();
  const { buffer, repoInfo } = await fetchGitHubRepositoryZipball(githubUrl, config.maxExtractedBytes);

  const projectName = options?.projectName || `${repoInfo.owner}/${repoInfo.repo}`;
  const metadataDesc = `Source: GitHub | Repository: ${repoInfo.owner}/${repoInfo.repo} | URL: ${repoInfo.fullUrl}${repoInfo.ref ? ` | Ref: ${repoInfo.ref}` : ''}`;
  const description = options?.description ? `${options.description} (${metadataDesc})` : metadataDesc;

  return runZipIngestionPipeline(buffer, {
    projectName,
    description,
  });
}


