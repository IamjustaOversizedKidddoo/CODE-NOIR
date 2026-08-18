import { SemanticSourceChunk } from '../types';

export interface BudgetConfig {
  maxTotalChars: number; // e.g. 15,000 chars of code context
  maxChunksCount: number; // e.g. max 8 chunks
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  maxTotalChars: 15000,
  maxChunksCount: 8,
};

export function budgetSourceChunks(
  candidates: SemanticSourceChunk[],
  config: BudgetConfig = DEFAULT_BUDGET_CONFIG
): SemanticSourceChunk[] {
  // Sort primarily by relevance (1 = highest), then by content length (smaller targeted chunks first)
  const sorted = [...candidates].sort((a, b) => {
    if (a.relevance !== b.relevance) {
      return a.relevance - b.relevance;
    }
    return a.content.length - b.content.length;
  });

  const budgeted: SemanticSourceChunk[] = [];
  let currentChars = 0;

  for (const chunk of sorted) {
    if (budgeted.length >= config.maxChunksCount) break;
    if (currentChars + chunk.content.length > config.maxTotalChars) {
      // If we don't have any chunk yet, include a truncated slice of the first
      if (budgeted.length === 0) {
        budgeted.push({
          ...chunk,
          content: chunk.content.slice(0, config.maxTotalChars) + '\n... [TRUNCATED DUE TO BUDGET LIMIT]',
        });
      }
      break;
    }

    budgeted.push(chunk);
    currentChars += chunk.content.length;
  }

  return budgeted;
}
