import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import {
  generateLearningPathForProject,
  getOrCreateLearningPath,
  evaluateLessonAnswer,
  completeLesson,
  startPrerequisiteDetour,
  completePrerequisiteDetour,
  updateConceptMastery,
  generateProjectMasteryReport,
  evaluateFinalAssessment,
} from '@/lib/teaching/engine';
import { createTypeScriptProjectFixture } from '../fixtures/helpers';

describe('Integration: Phase 5 Teaching & Curriculum Engine', () => {
  let testProjectId: string;

  beforeAll(async () => {
    const zip = createTypeScriptProjectFixture();
    const result = await runZipIngestionPipeline(zip, { projectName: 'Teaching Engine Case' });
    testProjectId = result.projectId;
  });

  afterAll(async () => {
    try {
      if (testProjectId) await prisma.project.delete({ where: { id: testProjectId } });
    } catch {}
  });

  it('1. should generate a structured learning path with ordered modules and evidence-backed lessons', async () => {
    const path = await generateLearningPathForProject(testProjectId, { difficulty: 'BEGINNER' });

    expect(path.id).toBeDefined();
    expect(path.title).toContain('Teaching Engine Case');
    expect(path.modules.length).toBe(4);

    // Verify level progression
    const allLessons = path.modules.flatMap((m) => m.lessons);
    expect(allLessons.length).toBeGreaterThanOrEqual(6);
    expect(allLessons[0].level).toBe(0); // Level 0: What is this?
    expect(allLessons[1].level).toBe(1); // Level 1: Tech Stack
    expect(allLessons[2].level).toBe(2); // Level 2: Project Structure
    expect(allLessons[3].level).toBe(3); // Level 3: Boot Sequence

    // Verify all lessons contain real evidence citations
    for (const lesson of allLessons) {
      expect(lesson.content.evidence.length).toBeGreaterThan(0);
      expect(lesson.interactiveQuestion).toBeDefined();
    }
  });

  it('2. should persist curriculum in SQLite database and retrieve active path', async () => {
    const fetched = await getOrCreateLearningPath(testProjectId);

    expect(fetched.id).toBeDefined();
    expect(fetched.modules.length).toBe(4);

    const dbLessons = await prisma.lesson.findMany({ where: { projectId: testProjectId } });
    expect(dbLessons.length).toBeGreaterThan(0);

    const dbConcepts = await prisma.concept.findMany({ where: { projectId: testProjectId } });
    expect(dbConcepts.length).toBeGreaterThan(0);
  });

  it('3. should evaluate interactive questions and update concept mastery in SQLite', async () => {
    const firstLesson = await prisma.lesson.findFirst({
      where: { projectId: testProjectId, level: 0 },
    });
    expect(firstLesson).not.toBeNull();

    const qDef = JSON.parse(firstLesson!.interactiveQJson!);
    const evaluation = await evaluateLessonAnswer(
      firstLesson!.id,
      'TypeScript',
      qDef,
      'detective_42'
    );

    expect(evaluation.status).toBe('CORRECT');
    expect(evaluation.score).toBe(1.0);

    // Update concept mastery
    const masteryUpdate = await updateConceptMastery(
      testProjectId,
      'TypeScript & JavaScript Async/Await',
      evaluation.score,
      'detective_42'
    );
    expect(masteryUpdate.status).toBeDefined();
    expect(masteryUpdate.newScore).toBeGreaterThan(0.5);
  });

  it('4. should handle prerequisite detours and return to current lesson position', async () => {
    const firstLesson = await prisma.lesson.findFirst({
      where: { projectId: testProjectId, level: 0 },
    });

    // Start detour
    const detourProgress = await startPrerequisiteDetour(
      testProjectId,
      firstLesson!.id,
      'TypeScript & JavaScript Async/Await',
      'detective_42'
    );
    expect(detourProgress.activeDetour).toBeDefined();
    expect(detourProgress.activeDetour?.conceptName).toBe('TypeScript & JavaScript Async/Await');

    // Complete detour
    const resumedProgress = await completePrerequisiteDetour(testProjectId, 'detective_42');
    expect(resumedProgress.activeDetour).toBeUndefined();
    expect(resumedProgress.currentLessonId).toBe(firstLesson!.id);
  });

  it('5. should advance lesson completion in learner state', async () => {
    const firstLesson = await prisma.lesson.findFirst({
      where: { projectId: testProjectId, level: 0 },
    });

    const progress = await completeLesson(testProjectId, firstLesson!.id, 'detective_42');
    expect(progress.completedLessons).toContain(firstLesson!.id);
  });

  it('6. should evaluate final project assessment and generate multi-dimensional mastery report', async () => {
    const assessmentResult = await evaluateFinalAssessment({
      projectId: testProjectId,
      userId: 'detective_42',
      answers: [
        {
          questionId: 'q1',
          questionTitle: 'Explain the architecture.',
          userAnswer:
            'The project is structured with a central server entry point that delegates to an auth service module with verified token hashing.',
        },
        {
          questionId: 'q2',
          questionTitle: 'Explain the startup flow.',
          userAnswer:
            'Execution begins at src/server.ts, which loads environment variables, creates the auth service instance, mounts health routes, and calls listen.',
        },
      ],
    });

    expect(assessmentResult.passed).toBe(true);
    expect(assessmentResult.scorePercentage).toBeGreaterThanOrEqual(70);
    expect(assessmentResult.masteryReport.dimensionScores.architecture).toBeGreaterThan(0);
    expect(assessmentResult.masteryReport.dimensionScores.runtime).toBeGreaterThan(0);
  });
});
