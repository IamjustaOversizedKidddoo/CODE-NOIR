import prisma from '../db';
import { ExplanationMode } from './types';

export interface LearnerProgressState {
  projectId: string;
  learningPathId: string;
  userId: string;
  currentLessonId?: string;
  completedLessons: string[];
  currentLevel: number;
  explanationMode: ExplanationMode;
  overallScore: number;
  activeDetour?: {
    parentLessonId: string;
    conceptName: string;
    detourLessonTitle: string;
  };
}

export async function getLearnerProgress(
  projectId: string,
  userId: string = 'anonymous_detective'
): Promise<LearnerProgressState | null> {
  const record = await prisma.learnerProgress.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!record) return null;

  return {
    projectId: record.projectId,
    learningPathId: record.learningPathId,
    userId: record.userId,
    currentLessonId: record.currentLessonId || undefined,
    completedLessons: JSON.parse(record.completedLessons || '[]'),
    currentLevel: record.currentLevel,
    explanationMode: record.explanationMode as ExplanationMode,
    overallScore: record.overallScore,
    activeDetour: record.activeDetourJson ? JSON.parse(record.activeDetourJson) : undefined,
  };
}

export async function completeLesson(
  projectId: string,
  lessonId: string,
  userId: string = 'anonymous_detective'
): Promise<LearnerProgressState> {
  const current = await getLearnerProgress(projectId, userId);
  const completed = new Set(current?.completedLessons || []);
  completed.add(lessonId);

  // Find next lesson
  const nextLesson = await prisma.lesson.findFirst({
    where: {
      projectId,
      id: { notIn: Array.from(completed) },
    },
    orderBy: { order: 'asc' },
  });

  const pathRecord = await prisma.learningPath.findFirst({ where: { projectId } });
  const learningPathId = current?.learningPathId || pathRecord?.id || '';

  const updated = await prisma.learnerProgress.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {
      completedLessons: JSON.stringify(Array.from(completed)),
      currentLessonId: nextLesson?.id || lessonId,
      currentLevel: nextLesson?.level || 10,
      lastActivityAt: new Date(),
    },
    create: {
      projectId,
      learningPathId,
      userId,
      completedLessons: JSON.stringify(Array.from(completed)),
      currentLessonId: nextLesson?.id || lessonId,
      currentLevel: nextLesson?.level || 10,
      overallScore: 0.0,
    },
  });

  return {
    projectId: updated.projectId,
    learningPathId: updated.learningPathId,
    userId: updated.userId,
    currentLessonId: updated.currentLessonId || undefined,
    completedLessons: Array.from(completed),
    currentLevel: updated.currentLevel,
    explanationMode: updated.explanationMode as ExplanationMode,
    overallScore: updated.overallScore,
    activeDetour: updated.activeDetourJson ? JSON.parse(updated.activeDetourJson) : undefined,
  };
}

export async function startPrerequisiteDetour(
  projectId: string,
  parentLessonId: string,
  conceptName: string,
  userId: string = 'anonymous_detective'
): Promise<LearnerProgressState> {
  const detour = {
    parentLessonId,
    conceptName,
    detourLessonTitle: `Prerequisite Primer: ${conceptName}`,
  };

  const pathRecord = await prisma.learningPath.findFirst({ where: { projectId } });
  const learningPathId = pathRecord?.id || '';

  const updated = await prisma.learnerProgress.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {
      activeDetourJson: JSON.stringify(detour),
      lastActivityAt: new Date(),
    },
    create: {
      projectId,
      learningPathId,
      userId,
      currentLessonId: parentLessonId,
      completedLessons: '[]',
      activeDetourJson: JSON.stringify(detour),
    },
  });

  return {
    projectId: updated.projectId,
    learningPathId: updated.learningPathId,
    userId: updated.userId,
    currentLessonId: updated.currentLessonId || undefined,
    completedLessons: JSON.parse(updated.completedLessons || '[]'),
    currentLevel: updated.currentLevel,
    explanationMode: updated.explanationMode as ExplanationMode,
    overallScore: updated.overallScore,
    activeDetour: detour,
  };
}

export async function completePrerequisiteDetour(
  projectId: string,
  userId: string = 'anonymous_detective'
): Promise<LearnerProgressState> {
  const current = await getLearnerProgress(projectId, userId);
  const parentId = current?.activeDetour?.parentLessonId;
  const pathRecord = await prisma.learningPath.findFirst({ where: { projectId } });
  const learningPathId = current?.learningPathId || pathRecord?.id || '';

  const updated = await prisma.learnerProgress.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {
      activeDetourJson: null,
      currentLessonId: parentId || current?.currentLessonId,
      lastActivityAt: new Date(),
    },
    create: {
      projectId,
      learningPathId,
      userId,
      currentLessonId: parentId,
      completedLessons: '[]',
      activeDetourJson: null,
    },
  });

  return {
    projectId: updated.projectId,
    learningPathId: updated.learningPathId,
    userId: updated.userId,
    currentLessonId: updated.currentLessonId || undefined,
    completedLessons: JSON.parse(updated.completedLessons || '[]'),
    currentLevel: updated.currentLevel,
    explanationMode: updated.explanationMode as ExplanationMode,
    overallScore: updated.overallScore,
    activeDetour: undefined,
  };
}
