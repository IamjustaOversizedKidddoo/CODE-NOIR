import prisma from '../db';
import { ConceptStatus, ProjectMasteryReport } from './types';

export async function updateConceptMastery(
  projectId: string,
  conceptName: string,
  scoreDelta: number, // 1.0 = correct, 0.5 = partial, 0.0 = incorrect
  userId: string = 'anonymous_detective'
): Promise<{ conceptName: string; newScore: number; status: ConceptStatus }> {
  let concept = await prisma.concept.findUnique({
    where: { projectId_name: { projectId, name: conceptName } },
  });

  if (!concept) {
    concept = await prisma.concept.create({
      data: {
        projectId,
        name: conceptName,
        description: `Project-specific concept: ${conceptName}`,
        category: 'ARCHITECTURE',
        difficulty: 'BEGINNER',
      },
    });
  }

  const existingMastery = await prisma.conceptMastery.findUnique({
    where: {
      conceptId_userId: {
        conceptId: concept.id,
        userId,
      },
    },
  });

  const totalAttempts = (existingMastery?.totalAttempts || 0) + 1;
  const correctAttempts = (existingMastery?.correctAttempts || 0) + (scoreDelta >= 0.9 ? 1 : 0);

  // Exponential moving average for score
  const prevScore = existingMastery?.score || 0.5;
  const newScore = Math.max(0.0, Math.min(1.0, prevScore * 0.6 + scoreDelta * 0.4));

  let status: ConceptStatus = 'LEARNED';
  if (newScore >= 0.85 && totalAttempts >= 2) status = 'MASTERED';
  else if (newScore < 0.4 && totalAttempts >= 2) status = 'STRUGGLING';
  else if (newScore < 0.65) status = 'NEEDS_REVIEW';

  await prisma.conceptMastery.upsert({
    where: {
      conceptId_userId: {
        conceptId: concept.id,
        userId,
      },
    },
    update: {
      score: newScore,
      status,
      correctAttempts,
      totalAttempts,
      lastTestedAt: new Date(),
    },
    create: {
      conceptId: concept.id,
      userId,
      score: newScore,
      status,
      correctAttempts,
      totalAttempts,
    },
  });

  return {
    conceptName,
    newScore,
    status,
  };
}

export async function generateProjectMasteryReport(
  projectId: string,
  userId: string = 'anonymous_detective'
): Promise<ProjectMasteryReport> {
  const [concepts, masteries, lessons, progress] = await Promise.all([
    prisma.concept.findMany({ where: { projectId } }),
    prisma.conceptMastery.findMany({
      where: { userId, concept: { projectId } },
      include: { concept: true },
    }),
    prisma.lesson.findMany({ where: { projectId } }),
    prisma.learnerProgress.findUnique({ where: { projectId_userId: { projectId, userId } } }),
  ]);

  const completedLessonIds = new Set<string>(
    progress?.completedLessons ? JSON.parse(progress.completedLessons) : []
  );

  const mastered: string[] = [];
  const needsReview: string[] = [];
  const struggling: string[] = [];

  let totalScoreSum = 0;
  for (const m of masteries) {
    totalScoreSum += m.score;
    if (m.status === 'MASTERED') mastered.push(m.concept.name);
    else if (m.status === 'NEEDS_REVIEW') needsReview.push(m.concept.name);
    else if (m.status === 'STRUGGLING') struggling.push(m.concept.name);
  }

  const avgConceptScore = masteries.length > 0 ? (totalScoreSum / masteries.length) * 100 : 75;
  const lessonCompletionRatio = lessons.length > 0 ? completedLessonIds.size / lessons.length : 0;
  const overallScore = Math.round(avgConceptScore * 0.5 + lessonCompletionRatio * 50);

  return {
    projectId,
    userId,
    overallScore,
    dimensionScores: {
      architecture: Math.min(100, Math.round(overallScore * 1.05)),
      coreModules: Math.min(100, Math.round(overallScore * 0.95)),
      runtime: Math.min(100, Math.round(overallScore * 1.0)),
      dataFlow: Math.min(100, Math.round(overallScore * 0.9)),
      dependencies: Math.min(100, Math.round(overallScore * 1.1)),
      security: Math.min(100, Math.round(overallScore * 0.98)),
      concepts: Math.round(avgConceptScore),
    },
    masteredConcepts: mastered,
    needsReviewConcepts: needsReview,
    strugglingConcepts: struggling,
    completedLessonsCount: completedLessonIds.size,
    totalLessonsCount: lessons.length,
    isReadyForProduction: overallScore >= 70,
    generatedAt: new Date().toISOString(),
  };
}
