import { QuestionType } from '../types';

export function classifyQuestion(prompt: string): QuestionType {
  const normalized = prompt.trim().toLowerCase();

  // 1. Story / Narrative Mode
  if (
    normalized.includes('story of this project') ||
    normalized.includes('tell me the story') ||
    normalized.includes('narrate')
  ) {
    return 'PROJECT_STORY';
  }

  // 2. Blast Radius / Delete / Modification Impact
  if (
    normalized.includes('what happens if i delete') ||
    normalized.includes('what breaks if i remove') ||
    normalized.includes('blast radius') ||
    normalized.includes('impact of deleting')
  ) {
    return 'BLAST_RADIUS';
  }

  if (normalized.includes('modify') || normalized.includes('change this') || normalized.includes('refactor')) {
    return 'MODIFICATION_IMPACT';
  }

  // 3. Entry Point & Runtime Start
  if (
    normalized.includes('what happens when') &&
    (normalized.includes('starts') || normalized.includes('boots') || normalized.includes('runs'))
  ) {
    return 'RUNTIME_FLOW';
  }

  if (
    normalized.includes('entry point') ||
    normalized.includes('where does execution begin') ||
    normalized.includes('how does it start')
  ) {
    return 'ENTRY_POINT';
  }

  // 4. Call Flow / Callers / Callees
  if (
    normalized.includes('who calls') ||
    normalized.includes('what calls') ||
    normalized.includes('callers of')
  ) {
    return 'CALL_FLOW';
  }

  if (
    normalized.includes('what does this call') ||
    normalized.includes('callees') ||
    normalized.includes('what functions are called')
  ) {
    return 'CALL_FLOW';
  }

  // 5. Why Questions
  if (normalized.startsWith('why does') || normalized.startsWith('why is') || normalized.includes('why was')) {
    return 'WHY_EXISTS';
  }

  // 6. File vs Symbol Explanation
  if (
    normalized.includes('file') ||
    normalized.includes('module') ||
    /\.(ts|js|py|tsx|jsx|json|yaml|toml|md)\b/i.test(normalized)
  ) {
    return 'FILE_EXPLANATION';
  }

  if (
    normalized.includes('function') ||
    normalized.includes('method') ||
    normalized.includes('class') ||
    normalized.includes('interface') ||
    normalized.includes('symbol') ||
    normalized.startsWith('explain ')
  ) {
    return 'SYMBOL_EXPLANATION';
  }

  // 7. Architecture & Subsystems
  if (
    normalized.includes('architecture') ||
    normalized.includes('structure') ||
    normalized.includes('how is the project structured') ||
    normalized.includes('subsystems')
  ) {
    return 'ARCHITECTURE';
  }

  // 8. Project Overview
  if (
    normalized.includes('what is this project') ||
    normalized.includes('overview') ||
    normalized.includes('summary of the project') ||
    normalized.includes('what problem does it solve')
  ) {
    return 'PROJECT_OVERVIEW';
  }

  // 9. Dependencies & Tech
  if (
    normalized.includes('technologies') ||
    normalized.includes('tech stack') ||
    normalized.includes('dependencies') ||
    normalized.includes('libraries')
  ) {
    return 'DEPENDENCY';
  }

  // 10. Security
  if (
    normalized.includes('security') ||
    normalized.includes('vulnerabilities') ||
    normalized.includes('threats') ||
    normalized.includes('injection')
  ) {
    return 'SECURITY';
  }

  return 'GENERAL_CODEBASE';
}
