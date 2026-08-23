import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id: caseId },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { files: true, symbols: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Case dossier not found in vault.', code: 'CASE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      case: {
        id: project.id,
        caseNumber: project.caseNumber,
        name: project.name,
        description: project.description,
        totalFiles: project.totalFiles || project._count?.files || 0,
        totalSymbols: project._count?.symbols || 0,
        includedFiles: project.includedFiles,
        ignoredFiles: project.ignoredFiles,
        totalLines: project.totalLines,
        totalBytes: project.totalBytes,
        primaryLang: project.primaryLang,
        status: project.status,
        statusMessage: project.statusMessage,
        progress: project.progress,
        brainJson: project.brainJson,
        techStack: project.techStack,
        manifestsJson: project.manifestsJson,
        entryPoints: project.entryPoints,
        envVarsJson: project.envVarsJson,
        endpointsJson: project.endpointsJson,
        dbEvidenceJson: project.dbEvidenceJson,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        recentEvents: project.events,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve case.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
