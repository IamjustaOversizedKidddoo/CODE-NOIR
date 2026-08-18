import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        name: true,
        description: true,
        totalFiles: true,
        includedFiles: true,
        ignoredFiles: true,
        totalLines: true,
        totalBytes: true,
        primaryLang: true,
        status: true,
        statusMessage: true,
        progress: true,
        techStack: true,
        entryPoints: true,
        endpointsJson: true,
        envVarsJson: true,
        dbEvidenceJson: true,
        brainJson: true,
        createdAt: true,
        updatedAt: true,
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
      analysis: {
        ...project,
        techStack: project.techStack ? JSON.parse(project.techStack) : null,
        entryPoints: project.entryPoints ? JSON.parse(project.entryPoints) : [],
        endpoints: project.endpointsJson ? JSON.parse(project.endpointsJson) : [],
        envVars: project.envVarsJson ? JSON.parse(project.envVarsJson) : [],
        dbEvidence: project.dbEvidenceJson ? JSON.parse(project.dbEvidenceJson) : [],
        brain: project.brainJson ? JSON.parse(project.brainJson) : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve analysis.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
