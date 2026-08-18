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
        entryPoints: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Case dossier not found.', code: 'CASE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const entryPoints = project.entryPoints ? JSON.parse(project.entryPoints) : [];

    return NextResponse.json({
      success: true,
      caseId,
      caseNumber: project.caseNumber,
      totalEntryPoints: entryPoints.length,
      entryPoints,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve entry points.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
