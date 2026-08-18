import { NextRequest, NextResponse } from 'next/server';
import { completeLesson } from '@/lib/teaching/learning-state';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string; pathId: string; lessonId: string }> }
) {
  try {
    const { caseId, lessonId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId || 'anonymous_detective';

    const progress = await completeLesson(caseId, lessonId, userId);

    return NextResponse.json({
      success: true,
      caseId,
      lessonId,
      progress,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete lesson.', code: 'COMPLETION_ERROR' },
      { status: 500 }
    );
  }
}
