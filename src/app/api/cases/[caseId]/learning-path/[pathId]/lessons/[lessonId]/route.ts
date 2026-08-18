import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ caseId: string; pathId: string; lessonId: string }> }
) {
  try {
    const { caseId, lessonId } = await context.params;

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, projectId: caseId },
    });

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      caseId,
      lesson: {
        id: lesson.id,
        level: lesson.level,
        order: lesson.order,
        title: lesson.title,
        objective: lesson.objective,
        type: lesson.type,
        difficulty: lesson.difficulty,
        prerequisites: lesson.prerequisitesJson ? JSON.parse(lesson.prerequisitesJson) : [],
        content: JSON.parse(lesson.contentJson),
        evidence: lesson.evidenceJson ? JSON.parse(lesson.evidenceJson) : [],
        investigationType: lesson.investigationType || undefined,
        interactiveQuestion: lesson.interactiveQJson ? JSON.parse(lesson.interactiveQJson) : undefined,
        estimatedMinutes: lesson.estimatedMinutes,
        isStale: lesson.isStale,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch lesson.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
