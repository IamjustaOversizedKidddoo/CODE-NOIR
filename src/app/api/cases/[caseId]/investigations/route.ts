import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;

    const list = await prisma.investigation.findMany({
      where: { projectId: caseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        question: true,
        confidence: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      caseId,
      investigations: list,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list investigations.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
