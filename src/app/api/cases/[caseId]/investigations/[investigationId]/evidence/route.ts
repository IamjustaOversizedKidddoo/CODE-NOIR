import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ caseId: string; investigationId: string }> }
) {
  try {
    const { caseId, investigationId } = await context.params;

    const inv = await prisma.investigation.findFirst({
      where: { id: investigationId, projectId: caseId },
      select: { evidenceJson: true, stepsJson: true },
    });

    if (!inv) {
      return NextResponse.json(
        { success: false, error: 'Investigation not found.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      caseId,
      investigationId,
      evidence: JSON.parse(inv.evidenceJson),
      stepsCount: JSON.parse(inv.stepsJson).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch evidence.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
