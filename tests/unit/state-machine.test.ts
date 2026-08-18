import { describe, it, expect } from 'vitest';
import { validateStateTransition } from '@/lib/types/state-machine';

describe('StateMachine: Project Status Transitions', () => {
  it('should allow valid linear pipeline transitions', () => {
    expect(validateStateTransition('CREATED', 'UPLOADING').valid).toBe(true);
    expect(validateStateTransition('CREATED', 'EXTRACTING').valid).toBe(true);
    expect(validateStateTransition('EXTRACTING', 'DISCOVERING').valid).toBe(true);
    expect(validateStateTransition('DISCOVERING', 'PARSING').valid).toBe(true);
    expect(validateStateTransition('DISCOVERING', 'READY').valid).toBe(true);
    expect(validateStateTransition('PARSING', 'MAPPING').valid).toBe(true);
    expect(validateStateTransition('MAPPING', 'SCANNING').valid).toBe(true);
    expect(validateStateTransition('SCANNING', 'BUILDING_BRAIN').valid).toBe(true);
    expect(validateStateTransition('BUILDING_BRAIN', 'READY').valid).toBe(true);
  });

  it('should reject invalid / jumping state transitions', () => {
    expect(validateStateTransition('CREATED', 'READY').valid).toBe(false);
    expect(validateStateTransition('EXTRACTING', 'MAPPING').valid).toBe(false);
    expect(validateStateTransition('DELETED', 'CREATED').valid).toBe(false);
  });

  it('should permit transitioning to ERROR or DELETED from active states', () => {
    expect(validateStateTransition('EXTRACTING', 'ERROR').valid).toBe(true);
    expect(validateStateTransition('DISCOVERING', 'ERROR').valid).toBe(true);
    expect(validateStateTransition('PARSING', 'DELETED').valid).toBe(true);
  });
});
