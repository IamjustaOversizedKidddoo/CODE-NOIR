import { NextRequest, NextResponse } from 'next/server';
import { evaluateFinalAssessment } from '@/lib/teaching/assessment-evaluator';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string; pathId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await req.json();
    const { answers, userId } = body;

    const result = await evaluateFinalAssessment({
      projectId: caseId,
      userId,
      answers: answers || [],
    });

    return NextResponse.json({
      success: true,
      caseId,
      assessment: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Assessment evaluation failed.', code: 'ASSESSMENT_ERROR' },
      { status: 500 }
    );
  }
}
