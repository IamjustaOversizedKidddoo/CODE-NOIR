import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbInitialized: boolean | undefined;
};

function getResolvedDatabaseUrl(): string {
  if (process.env.VERCEL) {
    return 'file:/tmp/dev.db';
  }

  const rawUrl = process.env.DATABASE_URL?.trim();

  if (!rawUrl) {
    const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
    return `file:${dbPath}`;
  }

  if (rawUrl.startsWith('file:')) {
    const filePath = rawUrl.substring(5);
    if (!path.isAbsolute(filePath)) {
      const normalizedPath = filePath.replace(/^\.\/prisma\//, '').replace(/^\.\//, '');
      const dbPath = path.resolve(process.cwd(), 'prisma', normalizedPath);
      return `file:${dbPath}`;
    }
  }

  return rawUrl;
}

const dbUrl = getResolvedDatabaseUrl();
process.env.DATABASE_URL = dbUrl;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

const SQLITE_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "Project" ("id" TEXT NOT NULL PRIMARY KEY, "caseNumber" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "totalFiles" INTEGER NOT NULL DEFAULT 0, "includedFiles" INTEGER NOT NULL DEFAULT 0, "ignoredFiles" INTEGER NOT NULL DEFAULT 0, "totalLines" INTEGER NOT NULL DEFAULT 0, "totalBytes" INTEGER NOT NULL DEFAULT 0, "primaryLang" TEXT, "techStack" TEXT, "manifestsJson" TEXT, "entryPoints" TEXT, "envVarsJson" TEXT, "endpointsJson" TEXT, "dbEvidenceJson" TEXT, "brainJson" TEXT, "status" TEXT NOT NULL DEFAULT 'CREATED', "statusMessage" TEXT, "progress" INTEGER NOT NULL DEFAULT 0, "storagePath" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "ProjectEvent" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "state" TEXT NOT NULL, "message" TEXT NOT NULL, "progress" INTEGER NOT NULL DEFAULT 0, "data" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ProjectEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "ProjectFile" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "path" TEXT NOT NULL, "extension" TEXT NOT NULL, "language" TEXT NOT NULL DEFAULT 'UNSUPPORTED_LANGUAGE', "sizeBytes" INTEGER NOT NULL DEFAULT 0, "lineCount" INTEGER NOT NULL DEFAULT 0, "isBinary" BOOLEAN NOT NULL DEFAULT false, "isIgnored" BOOLEAN NOT NULL DEFAULT false, "ignoreReason" TEXT, "isEntry" BOOLEAN NOT NULL DEFAULT false, "isSuspicious" BOOLEAN NOT NULL DEFAULT false, "hash" TEXT NOT NULL, "summary" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "CodeSymbol" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "fileId" TEXT NOT NULL, "name" TEXT NOT NULL, "qualifiedName" TEXT, "kind" TEXT NOT NULL, "startLine" INTEGER NOT NULL, "endLine" INTEGER NOT NULL, "startCol" INTEGER NOT NULL DEFAULT 0, "endCol" INTEGER NOT NULL DEFAULT 0, "signature" TEXT, "complexity" INTEGER NOT NULL DEFAULT 1, "isExported" BOOLEAN NOT NULL DEFAULT false, "confidence" TEXT NOT NULL DEFAULT 'CONFIRMED', "language" TEXT, "parentSymbolId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CodeSymbol_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "CodeSymbol_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ProjectFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "CodeSymbol_parentSymbolId_fkey" FOREIGN KEY ("parentSymbolId") REFERENCES "CodeSymbol" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "CallEdge" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "callerId" TEXT NOT NULL, "calleeId" TEXT, "calleeName" TEXT NOT NULL, "relationship" TEXT NOT NULL DEFAULT 'CALLS', "confidence" TEXT NOT NULL DEFAULT 'CONFIRMED', "fileId" TEXT NOT NULL, "line" INTEGER NOT NULL, "evidence" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CallEdge_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "CodeSymbol" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "CallEdge_calleeId_fkey" FOREIGN KEY ("calleeId") REFERENCES "CodeSymbol" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Dependency" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "sourceFileId" TEXT NOT NULL, "targetFileId" TEXT, "externalPackage" TEXT, "importName" TEXT, "importType" TEXT NOT NULL DEFAULT 'NAMED', "resolutionStatus" TEXT NOT NULL DEFAULT 'RESOLVED', "confidence" TEXT NOT NULL DEFAULT 'CONFIRMED', "evidenceLine" INTEGER, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Dependency_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "Dependency_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "ProjectFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "Dependency_targetFileId_fkey" FOREIGN KEY ("targetFileId") REFERENCES "ProjectFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Finding" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "fileId" TEXT, "type" TEXT NOT NULL, "severity" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "roast" TEXT NOT NULL, "lineStart" INTEGER, "lineEnd" INTEGER, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Finding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "Finding_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ProjectFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "LearningPath" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER', "estimatedDuration" INTEGER NOT NULL DEFAULT 60, "prerequisitesJson" TEXT, "version" INTEGER NOT NULL DEFAULT 1, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "LearningPath_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "LearningModule" ("id" TEXT NOT NULL PRIMARY KEY, "learningPathId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "order" INTEGER NOT NULL, "level" INTEGER NOT NULL, "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER', "prerequisitesJson" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LearningModule_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Lesson" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "learningPathId" TEXT, "moduleId" TEXT, "level" INTEGER NOT NULL, "order" INTEGER NOT NULL DEFAULT 1, "title" TEXT NOT NULL, "objective" TEXT NOT NULL, "type" TEXT NOT NULL, "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER', "prerequisitesJson" TEXT, "contentJson" TEXT NOT NULL, "evidenceJson" TEXT, "investigationType" TEXT, "interactiveQJson" TEXT, "estimatedMinutes" INTEGER NOT NULL DEFAULT 5, "isStale" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Lesson_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "Lesson_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule" ("id") ON DELETE SET NULL ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Concept" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL, "category" TEXT NOT NULL, "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER', "prerequisitesJson" TEXT, "relatedFilesJson" TEXT, "relatedSymbolsJson" TEXT, "confidence" TEXT NOT NULL DEFAULT 'CONFIRMED', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "LearnerProgress" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "learningPathId" TEXT NOT NULL, "userId" TEXT NOT NULL DEFAULT 'anonymous_detective', "currentLessonId" TEXT, "completedLessons" TEXT NOT NULL DEFAULT '[]', "activeDetourJson" TEXT, "currentLevel" INTEGER NOT NULL DEFAULT 0, "explanationMode" TEXT NOT NULL DEFAULT 'STANDARD', "overallScore" REAL NOT NULL DEFAULT 0.0, "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "LearnerProgress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "LearnerProgress_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "ConceptMastery" ("id" TEXT NOT NULL PRIMARY KEY, "conceptId" TEXT NOT NULL, "userId" TEXT NOT NULL DEFAULT 'anonymous_detective', "score" REAL NOT NULL DEFAULT 0.0, "status" TEXT NOT NULL DEFAULT 'UNKNOWN', "correctAttempts" INTEGER NOT NULL DEFAULT 0, "totalAttempts" INTEGER NOT NULL DEFAULT 0, "lastTestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "ConceptMastery_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "QuestionAttempt" ("id" TEXT NOT NULL PRIMARY KEY, "lessonId" TEXT NOT NULL, "userId" TEXT NOT NULL DEFAULT 'anonymous_detective', "userAnswer" TEXT NOT NULL, "evaluationStatus" TEXT NOT NULL, "score" REAL NOT NULL, "feedbackJson" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "QuestionAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Conversation" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "title" TEXT NOT NULL DEFAULT 'Interrogation Transcript', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Message" ("id" TEXT NOT NULL PRIMARY KEY, "conversationId" TEXT NOT NULL, "role" TEXT NOT NULL, "content" TEXT NOT NULL, "evidenceJson" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Investigation" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "question" TEXT NOT NULL, "startingEntities" TEXT, "stepsJson" TEXT NOT NULL, "evidenceJson" TEXT NOT NULL, "relationshipsJson" TEXT, "primaryPathJson" TEXT, "alternativePathsJson" TEXT, "confidence" TEXT NOT NULL DEFAULT 'LIKELY', "uncertaintiesJson" TEXT, "affectedEntities" TEXT, "externalServices" TEXT, "metadataJson" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Investigation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "SecurityFinding" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "severity" TEXT NOT NULL, "confidence" TEXT NOT NULL DEFAULT 'CONFIRMED', "status" TEXT NOT NULL DEFAULT 'OPEN', "statusReason" TEXT, "fileId" TEXT, "filePath" TEXT NOT NULL, "symbolId" TEXT, "symbolName" TEXT, "startLine" INTEGER, "endLine" INTEGER, "evidenceSnippet" TEXT, "cwe" TEXT, "owaspCategory" TEXT, "affectedEntitiesJson" TEXT, "remediationJson" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "SecurityFinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "SecurityFinding_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ProjectFile" ("id") ON DELETE SET NULL ON UPDATE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Project_caseNumber_key" ON "Project"("caseNumber")`,
  `CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status")`,
  `CREATE INDEX IF NOT EXISTS "Project_createdAt_idx" ON "Project"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "ProjectEvent_projectId_createdAt_idx" ON "ProjectEvent"("projectId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "ProjectFile_projectId_isIgnored_idx" ON "ProjectFile"("projectId", "isIgnored")`,
  `CREATE INDEX IF NOT EXISTS "ProjectFile_projectId_language_idx" ON "ProjectFile"("projectId", "language")`,
  `CREATE INDEX IF NOT EXISTS "ProjectFile_hash_idx" ON "ProjectFile"("hash")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ProjectFile_projectId_path_key" ON "ProjectFile"("projectId", "path")`,
  `CREATE INDEX IF NOT EXISTS "CodeSymbol_projectId_fileId_idx" ON "CodeSymbol"("projectId", "fileId")`,
  `CREATE INDEX IF NOT EXISTS "CodeSymbol_name_idx" ON "CodeSymbol"("name")`,
  `CREATE INDEX IF NOT EXISTS "CodeSymbol_qualifiedName_idx" ON "CodeSymbol"("qualifiedName")`,
  `CREATE INDEX IF NOT EXISTS "CodeSymbol_kind_idx" ON "CodeSymbol"("kind")`,
  `CREATE INDEX IF NOT EXISTS "CallEdge_callerId_idx" ON "CallEdge"("callerId")`,
  `CREATE INDEX IF NOT EXISTS "CallEdge_calleeId_idx" ON "CallEdge"("calleeId")`,
  `CREATE INDEX IF NOT EXISTS "CallEdge_projectId_relationship_idx" ON "CallEdge"("projectId", "relationship")`,
  `CREATE INDEX IF NOT EXISTS "Dependency_projectId_sourceFileId_idx" ON "Dependency"("projectId", "sourceFileId")`,
  `CREATE INDEX IF NOT EXISTS "Dependency_targetFileId_idx" ON "Dependency"("targetFileId")`,
  `CREATE INDEX IF NOT EXISTS "Dependency_resolutionStatus_idx" ON "Dependency"("resolutionStatus")`,
  `CREATE INDEX IF NOT EXISTS "Finding_projectId_severity_idx" ON "Finding"("projectId", "severity")`,
  `CREATE INDEX IF NOT EXISTS "LearningPath_projectId_difficulty_idx" ON "LearningPath"("projectId", "difficulty")`,
  `CREATE INDEX IF NOT EXISTS "LearningModule_learningPathId_order_idx" ON "LearningModule"("learningPathId", "order")`,
  `CREATE INDEX IF NOT EXISTS "Lesson_projectId_level_idx" ON "Lesson"("projectId", "level")`,
  `CREATE INDEX IF NOT EXISTS "Lesson_learningPathId_order_idx" ON "Lesson"("learningPathId", "order")`,
  `CREATE INDEX IF NOT EXISTS "Concept_projectId_category_idx" ON "Concept"("projectId", "category")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Concept_projectId_name_key" ON "Concept"("projectId", "name")`,
  `CREATE INDEX IF NOT EXISTS "LearnerProgress_learningPathId_idx" ON "LearnerProgress"("learningPathId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LearnerProgress_projectId_userId_key" ON "LearnerProgress"("projectId", "userId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ConceptMastery_conceptId_userId_key" ON "ConceptMastery"("conceptId", "userId")`,
  `CREATE INDEX IF NOT EXISTS "QuestionAttempt_lessonId_userId_idx" ON "QuestionAttempt"("lessonId", "userId")`,
  `CREATE INDEX IF NOT EXISTS "Conversation_projectId_idx" ON "Conversation"("projectId")`,
  `CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "Investigation_projectId_type_idx" ON "Investigation"("projectId", "type")`,
  `CREATE INDEX IF NOT EXISTS "Investigation_projectId_createdAt_idx" ON "Investigation"("projectId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "SecurityFinding_projectId_severity_idx" ON "SecurityFinding"("projectId", "severity")`,
  `CREATE INDEX IF NOT EXISTS "SecurityFinding_projectId_status_idx" ON "SecurityFinding"("projectId", "status")`,
  `CREATE INDEX IF NOT EXISTS "SecurityFinding_projectId_type_idx" ON "SecurityFinding"("projectId", "type")`,
];

let isEnsuringDb = false;

/**
 * Ensures SQLite database tables exist by executing DDL directly if needed.
 * Works natively in Vercel Serverless Functions without CLI binary dependencies.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (globalForPrisma.dbInitialized || isEnsuringDb) return;
  isEnsuringDb = true;

  try {
    // Check if main table exists
    await prisma.$queryRaw`SELECT 1 FROM Project LIMIT 1`;
    globalForPrisma.dbInitialized = true;
  } catch (err: any) {
    const errStr = String(err?.message || err);
    if (
      errStr.includes('does not exist') ||
      errStr.includes('no such table') ||
      errStr.includes('P2021') ||
      errStr.includes('P1014')
    ) {
      console.log('[DB Initializer] SQLite tables missing. Initializing DDL schema via Prisma Client...');
      for (const statement of SQLITE_SCHEMA_STATEMENTS) {
        try {
          await prisma.$executeRawUnsafe(statement);
        } catch (stmtErr: any) {
          console.warn('[DB Initializer DDL Warning]', stmtErr?.message || stmtErr);
        }
      }
      globalForPrisma.dbInitialized = true;
      console.log('[DB Initializer] SQLite database schema initialized successfully.');
    } else {
      globalForPrisma.dbInitialized = true;
    }
  } finally {
    isEnsuringDb = false;
  }
}

export default prisma;
