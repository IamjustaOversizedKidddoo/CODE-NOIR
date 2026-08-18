import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { evaluateLessonAnswer } from '@/lib/teaching/answer-evaluator';
import { updateConceptMastery } from '@/lib/teaching/concept-mastery';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string; pathId: string; lessonId: string }> }
) {
  try {
    const { caseId, lessonId } = await context.params;
    const body = await req.json();
    const { answer, userId } = body;

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, projectId: caseId },
    });

    if (!lesson || !lesson.interactiveQJson) {
      return NextResponse.json(
        { success: false, error: 'Lesson or interactive question not found.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const qDef = JSON.parse(lesson.interactiveQJson);
    const evaluation = await evaluateLessonAnswer(lessonId, answer || '', qDef, userId);

    // Update concept mastery for related concepts
    if (qDef.relatedConceptNames && qDef.relatedConceptNames.length > 0) {
      for (const conceptName of qDef.relatedConceptNames) {
        await updateConceptMastery(caseId, conceptName, evaluation.score, userId);
      }
    }

    return NextResponse.json({
      success: true,
      caseId,
      lessonId,
      evaluation,
    });
  } catch (error: any) {
    console.error('[API Lesson Answer Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to evaluate answer.', code: 'EVALUATION_ERROR' },
      { status: 500 }
    );
  }
}
