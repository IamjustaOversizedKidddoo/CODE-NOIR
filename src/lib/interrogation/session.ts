import prisma from '../db';
import {
  InterrogationSessionState,
  InvestigationTrailStep,
  InterrogationMessage,
  InterrogationEntity,
} from './types';

const sessionStore = new Map<string, InterrogationSessionState>();

export async function getOrCreateInterrogationSession(
  caseId: string,
  userId: string = 'detective_user'
): Promise<InterrogationSessionState> {
  const sessionKey = `${caseId}_${userId}`;

  let session = sessionStore.get(sessionKey);
  if (session) return session;

  // Retrieve initial entry point from project
  const project = await prisma.project.findUnique({
    where: { id: caseId },
    include: {
      files: { where: { isEntry: true } },
    },
  });

  const entryFile = project?.files?.[0];
  const initialEntity: InterrogationEntity | undefined = entryFile
    ? {
        name: entryFile.path,
        type: 'FILE',
        filePath: entryFile.path,
        fileId: entryFile.id,
      }
    : undefined;

  session = {
    sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    caseId,
    userId,
    currentEntity: initialEntity,
    currentFile: initialEntity?.filePath,
    currentTopic: 'ORIENTATION',
    recentlyDiscussedConcepts: [],
    recentlyShownEvidence: [],
    learningLevel: 'BEGINNER',
    leadStack: initialEntity
      ? [
          {
            stepNumber: 1,
            entityName: initialEntity.name,
            entityType: initialEntity.type,
            filePath: initialEntity.filePath,
            actionTaken: 'CASE OPENED // INITIAL ENTRY POINT IDENTIFIED',
            timestamp: new Date().toISOString(),
          },
        ]
      : [],
    messages: [],
    sarcasmLevel: 2,
    explanationDepth: 'STANDARD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  sessionStore.set(sessionKey, session);
  return session;
}

export function pushInvestigationTrailStep(
  session: InterrogationSessionState,
  step: {
    entityName: string;
    entityType: 'FILE' | 'FUNCTION' | 'CLASS' | 'MODULE' | 'SUBSYSTEM' | 'ENDPOINT';
    filePath?: string;
    actionTaken: string;
  }
): InterrogationSessionState {
  const nextStepNum = session.leadStack.length + 1;
  const newStep: InvestigationTrailStep = {
    stepNumber: nextStepNum,
    entityName: step.entityName,
    entityType: step.entityType,
    filePath: step.filePath,
    actionTaken: step.actionTaken,
    timestamp: new Date().toISOString(),
  };

  session.leadStack.push(newStep);
  session.currentEntity = {
    name: step.entityName,
    type: step.entityType,
    filePath: step.filePath,
  };
  session.updatedAt = new Date().toISOString();

  sessionStore.set(`${session.caseId}_${session.userId}`, session);
  return session;
}

export function backtrackInvestigationStep(
  session: InterrogationSessionState
): InterrogationSessionState {
  if (session.leadStack.length > 1) {
    session.leadStack.pop();
    const prevStep = session.leadStack[session.leadStack.length - 1];
    session.currentEntity = {
      name: prevStep.entityName,
      type: prevStep.entityType,
      filePath: prevStep.filePath,
    };
  }
  session.updatedAt = new Date().toISOString();
  sessionStore.set(`${session.caseId}_${session.userId}`, session);
  return session;
}

export function resetInvestigationTrail(
  session: InterrogationSessionState
): InterrogationSessionState {
  session.leadStack = session.leadStack.slice(0, 1);
  session.currentEntity = session.leadStack[0]
    ? {
        name: session.leadStack[0].entityName,
        type: session.leadStack[0].entityType,
        filePath: session.leadStack[0].filePath,
      }
    : undefined;
  session.updatedAt = new Date().toISOString();
  sessionStore.set(`${session.caseId}_${session.userId}`, session);
  return session;
}
