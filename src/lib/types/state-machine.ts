export const PROJECT_STATUSES = [
  'CREATED',
  'UPLOADING',
  'EXTRACTING',
  'DISCOVERING',
  'PARSING',
  'MAPPING',
  'SCANNING',
  'BUILDING_BRAIN',
  'READY',
  'ERROR',
  'DELETED',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface StateTransitionValidation {
  valid: boolean;
  from: ProjectStatus;
  to: ProjectStatus;
  reason?: string;
}

/**
 * Valid state transition matrix.
 * Enforces logical pipeline progression and prevents invalid jumping.
 */
const VALID_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  CREATED: ['UPLOADING', 'EXTRACTING', 'ERROR', 'DELETED'],
  UPLOADING: ['EXTRACTING', 'ERROR', 'DELETED'],
  EXTRACTING: ['DISCOVERING', 'ERROR', 'DELETED'],
  DISCOVERING: ['PARSING', 'READY', 'ERROR', 'DELETED'], // Can jump to READY if ingestion-only phase
  PARSING: ['MAPPING', 'ERROR', 'DELETED'],
  MAPPING: ['SCANNING', 'ERROR', 'DELETED'],
  SCANNING: ['BUILDING_BRAIN', 'ERROR', 'DELETED'],
  BUILDING_BRAIN: ['READY', 'ERROR', 'DELETED'],
  READY: ['EXTRACTING', 'PARSING', 'ERROR', 'DELETED'], // Allows re-analysis
  ERROR: ['UPLOADING', 'EXTRACTING', 'DELETED'], // Allows retry
  DELETED: [], // Terminal state
};

/**
 * Validates if transition from currentState to targetState is allowed.
 */
export function validateStateTransition(
  currentState: ProjectStatus,
  targetState: ProjectStatus
): StateTransitionValidation {
  if (currentState === targetState) {
    return { valid: true, from: currentState, to: targetState };
  }

  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed || !allowed.includes(targetState)) {
    return {
      valid: false,
      from: currentState,
      to: targetState,
      reason: `Illegal state transition from ${currentState} to ${targetState}. Allowed targets: [${(allowed || []).join(', ')}]`,
    };
  }

  return { valid: true, from: currentState, to: targetState };
}

/**
 * Human-readable detective status logs
 */
export const STATUS_DETECTIVE_TITLES: Record<ProjectStatus, string> = {
  CREATED: 'CASE FILE OPENED',
  UPLOADING: 'RECEIVING EVIDENCE',
  EXTRACTING: 'UNSEALING ARCHIVE CONTAINER',
  DISCOVERING: 'CATALOGING CRIME SCENE EVIDENCE',
  PARSING: 'DECONSTRUCTING SYNTAX & AST',
  MAPPING: 'CONNECTING SUSPECT DEPENDENCY THREADS',
  SCANNING: 'SCANNING FOR THREATS & INCIDENTS',
  BUILDING_BRAIN: 'ASSEMBLING CLASSIFIED DOSSIER',
  READY: 'INVESTIGATION READY FOR INTERROGATION',
  ERROR: 'INCIDENT OCCURRED / EVIDENCE COMPROMISED',
  DELETED: 'CASE PURGED FROM VAULT',
};
