import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateCaseOpeningBriefing } from '@/lib/persona/engine';
import { SarcasmLevel } from '@/lib/persona/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const url = new URL(req.url);
    const sarcasmLevel = parseInt(url.searchParams.get('level') || '2', 10) as SarcasmLevel;

    const project = await prisma.project.findUnique({
      where: { id: caseId },
      include: {
        files: { select: { id: true } },
        symbols: { select: { id: true } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Case not found.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const briefing = generateCaseOpeningBriefing(
      {
        name: project.name,
        caseNumber: project.caseNumber,
        fileCount: project.totalFiles || project.files.length,
        symbolCount: project.symbols.length,
        primaryLang: project.primaryLang || 'TypeScript',
      },
      sarcasmLevel
    );

    return NextResponse.json({
      success: true,
      caseId,
      briefing,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate briefing.', code: 'BRIEFING_ERROR' },
      { status: 500 }
    );
  }
}
