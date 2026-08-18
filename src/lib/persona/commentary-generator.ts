import { SarcasmLevel, PersonaContext, TransformedPersonaOutput, NextLeadSuggestion } from './types';

export function getOpeningByTone(type: string, level: SarcasmLevel): string {
  if (level === 0) return '';

  const openings: Record<string, Record<number, string[]>> = {
    CONFIRMED: {
      1: ['Evidence confirmed.', 'The static proof matches.'],
      2: ['We have a match. The paper trail is solid.', 'Corroborated. The AST doesn’t lie.'],
      3: ['Surprise, surprise. The code actually connects.', 'Well, look at that. An abstraction with a purpose.'],
      4: ['Alert the press. Someone actually wired these two components together properly.', 'Confirmed. No smoke and mirrors here.'],
      5: ['STOP THE PRESSES. We found a verified link in this digital maze.', 'HOLY AST COMPILER. The suspect is caught red-handed.'],
    },
    UNKNOWN: {
      1: ['Dead end. Evidence is insufficient.', 'Unresolved dead end trail.'],
      2: ['Dead end. The repository doesn’t give us enough evidence to establish what happens here.', 'The trail goes cold here. Dead end.'],
      3: ['Dead end. And no, we are not inventing an answer just to look clever.', 'Unresolved dead end. A mystery wrapped in an unexported function.'],
      4: ['Absolute dead end. Whoever wrote this left zero breadcrumbs.', 'Dead end. The code swallowed its own alibi.'],
      5: ['TOTAL DIGITAL DEAD END. We hit a brick wall at terminal velocity.', 'EVIDENCE DEAD END. The trail vanishes into the void.'],
    },
    WARNING: {
      1: ['Caution advised on this dependency.', 'Notice potential downstream ripple effects.'],
      2: ['Careful. This is where modifying one line turns into a multi-hour debugging session.', 'Red flag on this interface.'],
      3: ['Warning: This is the kind of function that breaks when you look at it too intensely.', 'Handle with Hazmat gloves.'],
      4: ['DANGER ZONE. Touch this and the entire call tree might spontaneously combust.', 'This module is held together by hope and duct tape.'],
      5: ['DEFCON 1 IMMINENT. Step away from the keyboard before the universe unravels.', 'WEAPONIZED COMPLEXITY DETECTED.'],
    },
  };

  const pool = openings[type]?.[level] || openings['CONFIRMED']?.[level] || ['Interesting.'];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateCodeRoast(context: PersonaContext): string | undefined {
  const level = context.sarcasmLevel ?? 2;
  if (level < 2) return undefined;

  if (context.hasCycle) {
    return 'Circular dependency detected. Component A imports Component B which imports Component A. The digital Ouroboros lives.';
  }

  if (context.lineCount && context.lineCount > 500) {
    return `This file is ${context.lineCount} lines long. At this point it’s less of a source file and more of a hostile takeover.`;
  }

  if (context.lineCount && context.lineCount > 250 && level >= 3) {
    return `Over ${context.lineCount} lines in a single module. Someone really didn't want to create a second file.`;
  }

  if (context.complexityScore && context.complexityScore > 10) {
    return 'The nesting depth here is substantial. At this depth, we are no longer programming; we are spelunking.';
  }

  return undefined;
}

export function generateCodeCompliment(context: PersonaContext): string | undefined {
  if ((context.sarcasmLevel ?? 2) === 0) return undefined;

  if (context.lineCount && context.lineCount < 60 && context.confidence === 'CONFIRMED') {
    return 'Clean, focused module. Someone thought this boundary through.';
  }

  if (context.relationship === 'IMPORTS' && context.confidence === 'CONFIRMED') {
    return 'Explicit import contract. No hidden reflection or magic dynamic loading.';
  }

  return undefined;
}

export function generateMetaphor(concept: string): string | undefined {
  const map: Record<string, string> = {
    DEPENDENCY: 'Think of it as one suspect relying on another suspect for an alibi.',
    CALL_GRAPH: 'Think of it as the chain of messengers passing the payload across the room.',
    ENTRY_POINT: 'That’s the front door to the entire crime scene.',
    DATABASE: 'The evidence archive where records are stored under lock and key.',
    API: 'The public receptionist taking requests at the front desk.',
    AUTHENTICATION: 'The security guard inspecting badges before unlocking the door.',
  };

  return map[concept.toUpperCase()];
}

export function generateNextLeads(context: PersonaContext): NextLeadSuggestion[] {
  const leads: NextLeadSuggestion[] = [];

  if (context.sourceEntity) {
    leads.push({
      id: 'lead_follow_caller',
      action: 'FOLLOW_CALLER',
      label: `TRACE CALLERS OF ${context.sourceEntity}`,
      targetEntity: context.sourceEntity,
      reason: 'Find out who triggers this execution flow.',
    });
  }

  if (context.targetEntity) {
    leads.push({
      id: 'lead_follow_callee',
      action: 'FOLLOW_CALLEE',
      label: `INSPECT TARGET ${context.targetEntity}`,
      targetEntity: context.targetEntity,
      reason: 'Follow downstream execution to next subsystem.',
    });
  }

  if (context.evidence?.file) {
    leads.push({
      id: 'lead_open_source',
      action: 'OPEN_SOURCE',
      label: `OPEN SOURCE (${context.evidence.file})`,
      targetPath: context.evidence.file,
      reason: 'Inspect exact line-by-line AST proof in Evidence Locker.',
    });

    leads.push({
      id: 'lead_blast_radius',
      action: 'CHECK_BLAST_RADIUS',
      label: `CALCULATE BLAST RADIUS FOR ${context.evidence.file}`,
      targetPath: context.evidence.file,
      reason: 'Determine what breaks if this file is modified.',
    });
  }

  return leads.slice(0, 4);
}
