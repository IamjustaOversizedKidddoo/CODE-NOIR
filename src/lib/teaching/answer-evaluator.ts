import prisma from '../db';
import { InteractiveQuestionDef, EvaluationResult } from './types';

export async function evaluateLessonAnswer(
  lessonId: string,
  userAnswer: string,
  questionDef: InteractiveQuestionDef,
  userId: string = 'anonymous_detective'
): Promise<EvaluationResult> {
  const normalizedAnswer = userAnswer.trim().toLowerCase();
  const expectedHint = questionDef.expectedAnswerHint.toLowerCase();
  const keyPoints = questionDef.rubric.keyPoints.map((k) => k.toLowerCase());

  let status: EvaluationResult['status'] = 'INCORRECT';
  let score = 0.0;
  let praise = '';
  const missingConcepts: string[] = [];

  // Check if answer is completely empty
  if (normalizedAnswer.length < 2) {
    status = 'INSUFFICIENT_INFORMATION';
    score = 0.0;
    praise = 'Your answer is empty or too short.';
  } else {
    // 1. Check exact option match or keyword inclusion
    const isDirectMatch =
      normalizedAnswer === expectedHint ||
      normalizedAnswer.includes(expectedHint) ||
      expectedHint.includes(normalizedAnswer);

    // 2. Count matched key rubric points
    const matchedPoints = keyPoints.filter((kp) => normalizedAnswer.includes(kp));

    if (isDirectMatch || (keyPoints.length > 0 && matchedPoints.length === keyPoints.length)) {
      status = 'CORRECT';
      score = 1.0;
      praise = 'Excellent deduction! Your answer matches the static evidence in the repository.';
    } else if (matchedPoints.length > 0) {
      status = 'PARTIALLY_CORRECT';
      score = 0.6;
      praise = 'You identified some key aspects correctly.';
      keyPoints.forEach((kp) => {
        if (!normalizedAnswer.includes(kp)) missingConcepts.push(kp);
      });
    } else {
      status = 'INCORRECT';
      score = 0.0;
      praise = 'Not quite, Detective. Good suspicion, but the repository evidence points elsewhere. Follow the evidence trail and try again!';
      missingConcepts.push(...questionDef.relatedConceptNames);
    }
  }

  // Determine if a prerequisite detour is recommended
  let recommendedDetour: EvaluationResult['recommendedDetour'];
  if (status === 'INCORRECT' && questionDef.relatedConceptNames.length > 0) {
    recommendedDetour = {
      conceptName: questionDef.relatedConceptNames[0],
      reason: `Learner encountered difficulty on ${questionDef.relatedConceptNames[0]} prerequisite.`,
    };
  }

  const result: EvaluationResult = {
    status,
    score,
    praise,
    missingConcepts,
    explanation: questionDef.explanation,
    recommendedDetour,
  };

  // Persist attempt in database if lesson exists
  try {
    const lessonExists = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (lessonExists) {
      await prisma.questionAttempt.create({
        data: {
          lessonId,
          userId,
          userAnswer,
          evaluationStatus: status,
          score,
          feedbackJson: JSON.stringify(result),
        },
      });
    }
  } catch {
    // Ignore in tests with isolated dummy IDs
  }

  return result;
}
