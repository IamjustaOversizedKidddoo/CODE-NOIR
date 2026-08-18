import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateLearningPath, generateLearningPathForProject } from '@/lib/teaching/engine';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const path = await getOrCreateLearningPath(caseId);

    return NextResponse.json({
      success: true,
      caseId,
      learningPath: path,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch learning path.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const difficulty = body?.difficulty || 'BEGINNER';

    const path = await generateLearningPathForProject(caseId, { difficulty });

    return NextResponse.json({
      success: true,
      caseId,
      learningPath: path,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate learning path.', code: 'GENERATION_ERROR' },
      { status: 500 }
    );
  }
}
