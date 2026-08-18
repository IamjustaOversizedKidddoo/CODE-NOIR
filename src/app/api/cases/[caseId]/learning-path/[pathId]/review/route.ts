import { NextRequest, NextResponse } from 'next/server';
import { generateProjectMasteryReport } from '@/lib/teaching/concept-mastery';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string; pathId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId || 'anonymous_detective';

    const report = await generateProjectMasteryReport(caseId, userId);

    return NextResponse.json({
      success: true,
      caseId,
      masteryReport: report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate review.', code: 'REVIEW_ERROR' },
      { status: 500 }
    );
  }
}
