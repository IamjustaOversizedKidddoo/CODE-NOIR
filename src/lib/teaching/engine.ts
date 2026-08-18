import prisma from '../db';
import { generateLearningPathForProject } from './curriculum-generator';
import { evaluateLessonAnswer } from './answer-evaluator';
import {
  getLearnerProgress,
  completeLesson,
  startPrerequisiteDetour,
  completePrerequisiteDetour,
} from './learning-state';
import { updateConceptMastery, generateProjectMasteryReport } from './concept-mastery';
import { evaluateFinalAssessment, AssessmentSubmission } from './assessment-evaluator';
import { DifficultyLevel, ExplanationMode } from './types';

export async function getOrCreateLearningPath(
  projectId: string,
  options?: { difficulty?: DifficultyLevel }
) {
  const existingPath = await prisma.learningPath.findFirst({
    where: { projectId },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (existingPath) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        files: { where: { isIgnored: false } },
        symbols: true,
        dependencies: true,
      },
    });

    const entryPoints = project?.entryPoints ? JSON.parse(project.entryPoints) : [];
    const { classifyRepositoryFiles } = await import('./file-classifier');
    const { rankProjectEntities } = await import('./importance-ranker');
    const { buildHierarchicalClusters } = await import('./subsystem-clusterer');
    const { buildCurriculumDAG } = await import('./dependency-dag');

    const { rankedFiles } = rankProjectEntities({
      files: project?.files.map((f) => ({ id: f.id, path: f.path })) || [],
      symbols: project?.symbols.map((s) => ({ id: s.id, name: s.name, fileId: s.fileId, isExported: s.isExported })) || [],
      dependencies: project?.dependencies.map((d) => ({ sourceFileId: d.sourceFileId, targetFileId: d.targetFileId })) || [],
      callEdges: [],
      entryPoints,
      endpoints: [],
      dbEvidence: [],
    });

    const fileGroups = project ? classifyRepositoryFiles(
      project.files.map((f) => ({ id: f.id, path: f.path, isBinary: f.isBinary, isIgnored: f.isIgnored, lineCount: f.lineCount })),
      rankedFiles,
      project.dependencies.map((d) => ({ sourceFileId: d.sourceFileId, targetFileId: d.targetFileId })),
      entryPoints
    ) : undefined;

    const universalRecords = fileGroups?.universalRecords || [];
    const depsList = project?.dependencies.map((d) => ({ sourceFileId: d.sourceFileId, targetFileId: d.targetFileId })) || [];
    const hierarchicalClusters = project ? buildHierarchicalClusters(universalRecords, depsList) : [];
    const curriculumDAG = project ? buildCurriculumDAG(universalRecords, depsList) : undefined;

    const rolesDistribution: Record<string, number> = {};
    universalRecords.forEach((r) => {
      rolesDistribution[r.primaryRole] = (rolesDistribution[r.primaryRole] || 0) + 1;
    });

    const frontDoorEntry = entryPoints[0]?.path || fileGroups?.mainSuspects[0]?.path || project?.files[0]?.path || 'index.ts';

    const orientation = project ? {
      summary: `Repository Dossier: ${project.name} contains ${project.files.length} indexed files (${fileGroups?.mainSuspects.length || 0} core suspects, ${fileGroups?.supportingCast.length || 0} supporting, ${fileGroups?.archives.length || 0} archives, ${fileGroups?.coldCases.length || 0} cold cases across ${hierarchicalClusters.length} dynamic subsystems).`,
      frontDoorEntry,
      multiEntryExplanation: entryPoints.length > 1 ? `Identified ${entryPoints.length} entry gateways. Primary gateway: ${frontDoorEntry}.` : undefined,
      totalFiles: project.files.length,
      coreFilesCount: fileGroups?.mainSuspects.length || 0,
      supportingFilesCount: fileGroups?.supportingCast.length || 0,
      archiveFilesCount: fileGroups?.archives.length || 0,
      coldCasesCount: fileGroups?.coldCases.length || 0,
      hierarchicalClusters,
      rolesDistribution,
    } : undefined;

    return {
      id: existingPath.id,
      projectId: existingPath.projectId,
      title: existingPath.title,
      description: existingPath.description,
      difficulty: existingPath.difficulty as DifficultyLevel,
      estimatedDuration: existingPath.estimatedDuration,
      prerequisites: existingPath.prerequisitesJson ? JSON.parse(existingPath.prerequisitesJson) : [],
      modules: existingPath.modules.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        order: m.order,
        level: m.level,
        difficulty: m.difficulty as DifficultyLevel,
        prerequisites: m.prerequisitesJson ? JSON.parse(m.prerequisitesJson) : [],
        lessons: m.lessons.map((l) => ({
          id: l.id,
          level: l.level,
          order: l.order,
          title: l.title,
          objective: l.objective,
          type: l.type,
          difficulty: l.difficulty as DifficultyLevel,
          prerequisites: l.prerequisitesJson ? JSON.parse(l.prerequisitesJson) : [],
          content: JSON.parse(l.contentJson),
          evidence: l.evidenceJson ? JSON.parse(l.evidenceJson) : [],
          investigationType: l.investigationType || undefined,
          interactiveQuestion: l.interactiveQJson ? JSON.parse(l.interactiveQJson) : undefined,
          estimatedMinutes: l.estimatedMinutes,
          isStale: l.isStale,
        })),
      })),
      version: existingPath.version,
      orientation,
      fileGroups,
      curriculumDAG,
      universalFileRecords: universalRecords,
      createdAt: existingPath.createdAt.toISOString(),
    };
  }

  return generateLearningPathForProject(projectId, options);
}

export {
  generateLearningPathForProject,
  evaluateLessonAnswer,
  getLearnerProgress,
  completeLesson,
  startPrerequisiteDetour,
  completePrerequisiteDetour,
  updateConceptMastery,
  generateProjectMasteryReport,
  evaluateFinalAssessment,
};
