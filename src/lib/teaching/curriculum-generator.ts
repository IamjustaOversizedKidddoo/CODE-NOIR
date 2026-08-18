import prisma from '../db';
import { StructuredLearningPath, StructuredLearningModule, DifficultyLevel } from './types';
import { rankProjectEntities } from './importance-ranker';
import { extractProjectConcepts } from './concept-extractor';
import { sortConceptsTopologically } from './concept-graph';
import { generateCurriculumLessons } from './lesson-generator';
import { classifyRepositoryFiles } from './file-classifier';
import { buildHierarchicalClusters } from './subsystem-clusterer';
import { buildCurriculumDAG } from './dependency-dag';

export async function generateLearningPathForProject(
  projectId: string,
  options?: {
    difficulty?: DifficultyLevel;
  }
): Promise<StructuredLearningPath> {
  const difficulty = options?.difficulty || 'BEGINNER';

  // 1. Fetch complete project data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      files: { where: { isIgnored: false } },
      symbols: true,
      dependencies: true,
    },
  });

  if (!project) {
    throw new Error(`Project "${projectId}" not found.`);
  }

  const callEdges = await prisma.callEdge.findMany({
    where: { caller: { projectId } },
  });

  const techProfile = project.techStack ? JSON.parse(project.techStack) : {};
  const entryPoints = project.entryPoints ? JSON.parse(project.entryPoints) : [];
  const endpoints = project.endpointsJson ? JSON.parse(project.endpointsJson) : [];
  const envVars = project.envVarsJson ? JSON.parse(project.envVarsJson) : [];
  const dbEvidence = project.dbEvidenceJson ? JSON.parse(project.dbEvidenceJson) : [];

  // 2. Rank Project Entities by Architectural Importance
  const { rankedFiles } = rankProjectEntities({
    files: project.files.map((f) => ({ id: f.id, path: f.path })),
    symbols: project.symbols.map((s) => ({ id: s.id, name: s.name, fileId: s.fileId, isExported: s.isExported })),
    dependencies: project.dependencies.map((d) => ({ sourceFileId: d.sourceFileId, targetFileId: d.targetFileId })),
    callEdges: callEdges.map((c) => ({ callerId: c.callerId, calleeName: c.calleeName })),
    entryPoints,
    endpoints,
    dbEvidence,
  });

  // 3. Extract and Order Concepts Topologically
  const rawConcepts = extractProjectConcepts({
    primaryLang: project.primaryLang || 'TypeScript',
    files: project.files.map((f) => ({ path: f.path })),
    symbols: project.symbols.map((s) => ({ name: s.name, kind: s.kind })),
    techProfile,
    endpoints,
    envVars,
    dbEvidence,
  });

  const orderedConcepts = sortConceptsTopologically(rawConcepts);

  // 4. Persist Concepts in Database
  for (const c of orderedConcepts) {
    await prisma.concept.upsert({
      where: {
        projectId_name: {
          projectId,
          name: c.name,
        },
      },
      update: {
        description: c.description,
        category: c.category,
        difficulty: c.difficulty,
        prerequisitesJson: JSON.stringify(c.prerequisites),
      },
      create: {
        projectId,
        name: c.name,
        description: c.description,
        category: c.category,
        difficulty: c.difficulty,
        prerequisitesJson: JSON.stringify(c.prerequisites),
      },
    });
  }

  // 5. Generate Structured Lessons
  const generatedLessons = generateCurriculumLessons(projectId, {
    name: project.name,
    primaryLang: project.primaryLang || 'TypeScript',
    files: project.files.map((f) => ({ id: f.id, path: f.path, lineCount: f.lineCount })),
    symbols: project.symbols.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      fileId: s.fileId,
      startLine: s.startLine,
      endLine: s.endLine,
    })),
    entryPoints,
    endpoints,
    envVars,
    dbEvidence,
    rankedFiles,
    concepts: orderedConcepts,
  });

  // 6. Group Lessons into Structured Modules
  const mod1Lessons = generatedLessons.filter((l) => l.level <= 1);
  const mod2Lessons = generatedLessons.filter((l) => l.level === 2 || l.level === 3);
  const mod3Lessons = generatedLessons.filter((l) => l.level >= 4 && l.level <= 7);
  const mod4Lessons = generatedLessons.filter((l) => l.level >= 8);

  const modules: StructuredLearningModule[] = [
    {
      title: 'Module 1: Orientation & Arsenal (Levels 0-1)',
      description: 'Understanding the codebase mission, tools, and runtime environment.',
      order: 1,
      level: 0,
      difficulty,
      prerequisites: [],
      lessons: mod1Lessons,
    },
    {
      title: 'Module 2: Architecture & Boot Sequence (Levels 2-3)',
      description: 'Mapping directory layout and tracing how the system starts.',
      order: 2,
      level: 2,
      difficulty,
      prerequisites: ['Basic Package Management'],
      lessons: mod2Lessons,
    },
    {
      title: 'Module 3: Component Wiring & Core Modules (Levels 4-5)',
      description: 'Deep diving into core files, classes, and inter-module dependencies.',
      order: 3,
      level: 4,
      difficulty,
      prerequisites: ['TypeScript & JavaScript Async/Await'],
      lessons: mod3Lessons,
    },
    {
      title: 'Module 4: Data Pipelines & Modification (Levels 8-10)',
      description: 'Tracing full request lifecycles and safely calculating blast radius.',
      order: 4,
      level: 8,
      difficulty,
      prerequisites: ['REST API & Route Handlers'],
      lessons: mod4Lessons,
    },
  ];

  // 7. Persist LearningPath in Prisma Database
  const totalDuration = generatedLessons.reduce((acc, l) => acc + l.estimatedMinutes, 0);

  const dbPath = await prisma.learningPath.create({
    data: {
      projectId,
      title: `Learning Path: Mastering ${project.name}`,
      description: `Complete, evidence-grounded curriculum designed for ${difficulty} level learners.`,
      difficulty,
      estimatedDuration: totalDuration,
      prerequisitesJson: JSON.stringify(orderedConcepts.map((c) => c.name)),
      version: 1,
    },
  });

  // Persist Modules & Lessons
  for (const mod of modules) {
    const dbMod = await prisma.learningModule.create({
      data: {
        learningPathId: dbPath.id,
        title: mod.title,
        description: mod.description,
        order: mod.order,
        level: mod.level,
        difficulty: mod.difficulty,
        prerequisitesJson: JSON.stringify(mod.prerequisites),
      },
    });

    mod.id = dbMod.id;
    mod.learningPathId = dbPath.id;

    for (const l of mod.lessons) {
      const dbLesson = await prisma.lesson.create({
        data: {
          projectId,
          learningPathId: dbPath.id,
          moduleId: dbMod.id,
          level: l.level,
          order: l.order,
          title: l.title,
          objective: l.objective,
          type: l.type,
          difficulty: l.difficulty,
          prerequisitesJson: JSON.stringify(l.prerequisites),
          contentJson: JSON.stringify(l.content),
          evidenceJson: JSON.stringify(l.evidence),
          investigationType: l.investigationType,
          interactiveQJson: JSON.stringify(l.interactiveQuestion),
          estimatedMinutes: l.estimatedMinutes,
        },
      });

      l.id = dbLesson.id;
      l.learningPathId = dbPath.id;
      l.moduleId = dbMod.id;
    }
  }

  // 8. Initialize Learner Progress Record
  await prisma.learnerProgress.upsert({
    where: {
      projectId_userId: {
        projectId,
        userId: 'anonymous_detective',
      },
    },
    update: {
      learningPathId: dbPath.id,
      currentLessonId: generatedLessons[0]?.id,
      completedLessons: '[]',
      currentLevel: 0,
      overallScore: 0.0,
      lastActivityAt: new Date(),
    },
    create: {
      projectId,
      learningPathId: dbPath.id,
      userId: 'anonymous_detective',
      currentLessonId: generatedLessons[0]?.id,
      completedLessons: '[]',
      currentLevel: 0,
      overallScore: 0.0,
    },
  });

  // 9. Deterministically classify repository files and build universal records
  const fileGroups = classifyRepositoryFiles(
    project.files.map((f) => ({
      id: f.id,
      path: f.path,
      isBinary: f.isBinary,
      isIgnored: f.isIgnored,
      lineCount: f.lineCount,
    })),
    rankedFiles,
    project.dependencies.map((d) => ({ sourceFileId: d.sourceFileId, targetFileId: d.targetFileId })),
    entryPoints
  );

  const universalRecords = fileGroups.universalRecords || [];
  const hierarchicalClusters = buildHierarchicalClusters(
    universalRecords,
    project.dependencies.map((d) => ({ sourceFileId: d.sourceFileId, targetFileId: d.targetFileId }))
  );

  const curriculumDAG = buildCurriculumDAG(
    universalRecords,
    project.dependencies.map((d) => ({ sourceFileId: d.sourceFileId, targetFileId: d.targetFileId }))
  );

  const rolesDistribution: Record<string, number> = {};
  universalRecords.forEach((r) => {
    rolesDistribution[r.primaryRole] = (rolesDistribution[r.primaryRole] || 0) + 1;
  });

  const frontDoorEntry = entryPoints[0]?.path || fileGroups.mainSuspects[0]?.path || project.files[0]?.path || 'index.ts';
  const multiEntryExplanation = entryPoints.length > 1
    ? `Identified ${entryPoints.length} entry gateways (${entryPoints.map((e: any) => e.path).join(', ')}). Primary gateway: ${frontDoorEntry}.`
    : undefined;

  const orientation = {
    summary: `Repository Dossier: ${project.name} contains ${project.files.length} indexed files (${fileGroups.mainSuspects.length} core suspects, ${fileGroups.supportingCast.length} supporting, ${fileGroups.archives.length} archives, ${fileGroups.coldCases.length} cold cases across ${hierarchicalClusters.length} dynamic subsystems).`,
    frontDoorEntry,
    multiEntryExplanation,
    totalFiles: project.files.length,
    coreFilesCount: fileGroups.mainSuspects.length,
    supportingFilesCount: fileGroups.supportingCast.length,
    archiveFilesCount: fileGroups.archives.length,
    coldCasesCount: fileGroups.coldCases.length,
    hierarchicalClusters,
    rolesDistribution,
  };

  return {
    id: dbPath.id,
    projectId,
    title: dbPath.title,
    description: dbPath.description,
    difficulty: dbPath.difficulty as DifficultyLevel,
    estimatedDuration: dbPath.estimatedDuration,
    prerequisites: orderedConcepts.map((c) => c.name),
    modules,
    version: dbPath.version,
    orientation,
    fileGroups,
    conceptNotebook: orderedConcepts,
    curriculumDAG,
    universalFileRecords: universalRecords,
    createdAt: dbPath.createdAt.toISOString(),
  };
}
