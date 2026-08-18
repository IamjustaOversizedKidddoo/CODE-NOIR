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
        primaryLang: true,
        techStack: true,
        manifestsJson: true,
        dbEvidenceJson: true,
        envVarsJson: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Case dossier not found.', code: 'CASE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      caseId,
      caseNumber: project.caseNumber,
      primaryLanguage: project.primaryLang,
      technologyProfile: project.techStack ? JSON.parse(project.techStack) : null,
      manifests: project.manifestsJson ? JSON.parse(project.manifestsJson) : null,
      databaseEvidence: project.dbEvidenceJson ? JSON.parse(project.dbEvidenceJson) : [],
      environmentVariables: project.envVarsJson ? JSON.parse(project.envVarsJson) : [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve technology profile.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
