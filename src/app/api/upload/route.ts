import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema } from '@/lib/db';
import {
  runZipIngestionPipeline,
  runDirectFilesIngestionPipeline,
  runGitHubIngestionPipeline,
  DirectFileInput,
} from '@/lib/ingestion/pipeline';
import { IngestionSecurityError } from '@/lib/ingestion/security-guard';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const contentType = req.headers.get('content-type') || '';
    let githubUrl: string | undefined = undefined;
    let projectName: string | undefined = undefined;
    let singleArchive: File | null = null;
    let multiFiles: File[] = [];
    let multiPaths: string[] = [];

    if (contentType.includes('application/json')) {
      const body = await req.json();
      githubUrl = body.githubUrl;
      projectName = body.projectName;
    } else {
      const formData = await req.formData();
      projectName = (formData.get('projectName') as string | null) || undefined;
      githubUrl = (formData.get('githubUrl') as string | null) || undefined;

      singleArchive = (formData.get('archive') || formData.get('file') || formData.get('zip')) as File | null;
      multiFiles = (formData.getAll('files') as File[]).filter((f) => f && typeof f === 'object' && f.name);
      multiPaths = (formData.getAll('paths') as string[]) || [];
    }

    // Case A: GitHub Repository Link
    if (githubUrl && githubUrl.trim().length > 0) {
      const result = await runGitHubIngestionPipeline(githubUrl.trim(), {
        projectName,
      });

      return NextResponse.json(
        {
          success: true,
          caseId: result.projectId,
          caseNumber: result.caseNumber,
          summary: {
            totalFiles: result.totalFiles,
            includedFiles: result.includedFiles,
            ignoredFiles: result.ignoredFiles,
            totalLines: result.totalLines,
            totalBytes: result.totalBytes,
            primaryLang: result.primaryLang,
          },
        },
        { status: 201 }
      );
    }

    let isZipFile = false;
    let singleBuffer: Buffer | null = null;

    if (singleArchive && singleArchive.size > 0) {
      const arrayBuffer = await singleArchive.arrayBuffer();
      singleBuffer = Buffer.from(arrayBuffer);

      if (singleArchive.name.toLowerCase().endsWith('.zip')) {
        isZipFile = true;
      } else if (singleBuffer.length >= 4) {
        // ZIP magic numbers: PK\x03\x04 or PK\x05\x06
        if (singleBuffer[0] === 0x50 && singleBuffer[1] === 0x4b && (singleBuffer[2] === 0x03 || singleBuffer[2] === 0x05)) {
          isZipFile = true;
        }
      }

      if (!isZipFile && multiFiles.length === 0) {
        // Fallback: single non-ZIP file submitted under archive/file field
        multiFiles = [singleArchive];
        multiPaths = [singleArchive.name];
      }
    }

    // Case B: Single ZIP Archive
    if (isZipFile && singleBuffer && singleArchive) {
      if (singleBuffer.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Submitted archive buffer is empty.',
            code: 'EMPTY_FILE',
          },
          { status: 400 }
        );
      }

      const result = await runZipIngestionPipeline(singleBuffer, {
        projectName: projectName || singleArchive.name.replace(/\.zip$/i, ''),
      });

      return NextResponse.json(
        {
          success: true,
          caseId: result.projectId,
          caseNumber: result.caseNumber,
          summary: {
            totalFiles: result.totalFiles,
            includedFiles: result.includedFiles,
            ignoredFiles: result.ignoredFiles,
            totalLines: result.totalLines,
            totalBytes: result.totalBytes,
            primaryLang: result.primaryLang,
          },
        },
        { status: 201 }
      );
    }

    // Case C: Multi-file Folder Upload
    if (multiFiles.length > 0) {
      const directInputs: DirectFileInput[] = [];

      for (let i = 0; i < multiFiles.length; i++) {
        const file = multiFiles[i];
        // Path precedence: explicitly submitted relative path, or webkitRelativePath, or file name
        const rawRelativePath = multiPaths[i] || (file as any).webkitRelativePath || file.name;
        const arrayBuf = await file.arrayBuffer();
        const buf = Buffer.from(arrayBuf);

        directInputs.push({
          relativePath: rawRelativePath,
          buffer: buf,
        });
      }

      const result = await runDirectFilesIngestionPipeline(directInputs, {
        projectName: projectName || 'Uploaded Project Folder',
      });

      return NextResponse.json(
        {
          success: true,
          caseId: result.projectId,
          caseNumber: result.caseNumber,
          summary: {
            totalFiles: result.totalFiles,
            includedFiles: result.includedFiles,
            ignoredFiles: result.ignoredFiles,
            totalLines: result.totalLines,
            totalBytes: result.totalBytes,
            primaryLang: result.primaryLang,
          },
        },
        { status: 201 }
      );
    }

    // No valid input detected
    return NextResponse.json(
      {
        success: false,
        error: 'No evidence provided. Please enter a public GitHub URL, select a .zip archive, or select a project folder.',
        code: 'NO_FILE_PROVIDED',
      },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[API /api/upload Error]', error);

    const isSecurityError = error instanceof IngestionSecurityError;
    const statusCode = isSecurityError ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to ingest evidence.',
        code: error.code || (isSecurityError ? 'SECURITY_VIOLATION' : 'INGESTION_ERROR'),
      },
      { status: statusCode }
    );
  }
}
