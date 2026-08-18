import { describe, it, expect, afterAll } from 'vitest';
import AdmZip from 'adm-zip';
import prisma from '@/lib/db';
import { runZipIngestionPipeline } from '@/lib/ingestion/pipeline';
import { runInvestigation } from '@/lib/investigation/engine';
import { getOrCreateLearningPath } from '@/lib/teaching/engine';
import { processInterrogationMessage } from '@/lib/interrogation/conductor';

describe('Core Experience E2E: Repository Investigation & Learning Loop', () => {
  const createdProjectIds: string[] = [];

  afterAll(async () => {
    for (const id of createdProjectIds) {
      try {
        await prisma.project.delete({ where: { id } });
      } catch {}
    }
  });

  it('should execute full end-to-end user workflow on test auth repository', async () => {
    // 1. Create a realistic test repository
    const zip = new AdmZip();
    zip.addFile('package.json', Buffer.from(JSON.stringify({
      name: 'test-auth-app',
      version: '1.0.0',
      dependencies: { 'bcrypt': '^5.0.0', 'jsonwebtoken': '^9.0.0' }
    })));

    zip.addFile('src/database.ts', Buffer.from(`
export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
}

export function findUser(email: string): UserRecord | null {
  return { id: 'u1', email, passwordHash: '$2b$10$hashedpass' };
}
`));

    zip.addFile('src/auth.ts', Buffer.from(`
import { findUser } from './database';

export function verifyPassword(plain: string, hash: string): boolean {
  return plain === 'secret123';
}

export function authenticateUser(email: string, pass: string): boolean {
  const user = findUser(email);
  if (!user) return false;
  return verifyPassword(pass, user.passwordHash);
}
`));

    zip.addFile('src/server.ts', Buffer.from(`
import { authenticateUser } from './auth';

export function handleLoginRequest(reqEmail: string, reqPass: string) {
  return authenticateUser(reqEmail, reqPass);
}

export function main() {
  console.log("Server starting on port 3000");
}
`));

    // 2. Ingest Repository
    const ingestion = await runZipIngestionPipeline(zip.toBuffer(), {
      projectName: 'Auth Security App',
    });
    createdProjectIds.push(ingestion.projectId);

    expect(ingestion.projectId).toBeDefined();
    expect(ingestion.totalFiles).toBe(4);

    // 3. Verify Database Records (Files, Symbols, CallEdges)
    const project = await prisma.project.findUnique({
      where: { id: ingestion.projectId },
      include: { files: true, symbols: true },
    });

    expect(project?.status).toBe('READY');
    expect(project?.files.length).toBe(4);
    expect(project?.symbols.some((s) => s.name === 'authenticateUser')).toBe(true);
    expect(project?.symbols.some((s) => s.name === 'findUser')).toBe(true);
    expect(project?.symbols.some((s) => s.name === 'verifyPassword')).toBe(true);

    // 4. Test Investigation Engine: TRACE CALLERS & CALLEES
    const callFlowInvestigation = await runInvestigation(ingestion.projectId, {
      type: 'CALL_FLOW',
      targetEntity: 'authenticateUser',
    });

    expect(callFlowInvestigation.title).toContain('authenticateUser');
    expect(callFlowInvestigation.steps.length).toBeGreaterThanOrEqual(1);

    // 5. Test Learning Path Generation & Lesson Retrieval
    const learningPath = await getOrCreateLearningPath(ingestion.projectId);
    expect(learningPath.modules.length).toBeGreaterThanOrEqual(2);
    expect(learningPath.modules[0].lessons.length).toBeGreaterThanOrEqual(1);

    const firstLesson = learningPath.modules[0].lessons[0];
    expect(firstLesson.title).toBeDefined();
    expect(firstLesson.content.simpleExplanation).toBeDefined();
    expect(firstLesson.content.technicalExplanation).toBeDefined();

    // 6. Test Interrogation Engine Queries
    // Query A: "Who calls authenticateUser?"
    const whoCallsRes = await processInterrogationMessage(
      ingestion.projectId,
      'Who calls authenticateUser?'
    );
    expect(whoCallsRes.response.content).toContain('handleLoginRequest');
    expect(whoCallsRes.response.citations?.length).toBeGreaterThanOrEqual(1);

    // Query B: "What does authenticateUser call?"
    const whatCallsRes = await processInterrogationMessage(
      ingestion.projectId,
      'What does authenticateUser call?'
    );
    expect(whatCallsRes.response.content).toContain('findUser');
    expect(whatCallsRes.response.content).toContain('verifyPassword');

    // Query C: "What happens if I delete database.ts?"
    const blastRes = await processInterrogationMessage(
      ingestion.projectId,
      'What happens if I delete database.ts?'
    );
    expect(blastRes.response.blastRadius).toBeDefined();
    expect(blastRes.response.blastRadius?.directlyAffected.length).toBeGreaterThanOrEqual(1);

    // Query D: "Who originally wrote this function in 1995?"
    const impossibleRes = await processInterrogationMessage(
      ingestion.projectId,
      'Who originally wrote this function in 1995?'
    );
    expect(impossibleRes.response.confidence).toBe('UNKNOWN');
    expect(impossibleRes.response.content).toContain('NOT ESTABLISHED BY REPOSITORY EVIDENCE');
  });
});
