import { NextRequest, NextResponse } from 'next/server';
import { runInvestigation } from '@/lib/investigation/engine';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await req.json();
    const { type, query, targetEntity } = body;

    const investigation = await runInvestigation(caseId, {
      type,
      query,
      targetEntity,
    });

    return NextResponse.json({
      success: true,
      caseId,
      investigation,
    });
  } catch (error: any) {
    console.error('[API /api/cases/[caseId]/investigate Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Investigation generation failed.', code: 'INVESTIGATION_ERROR' },
      { status: 500 }
    );
  }
}
