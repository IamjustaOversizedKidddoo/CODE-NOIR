import { ConceptDef } from './types';

export interface ConceptGraphNode {
  name: string;
  concept: ConceptDef;
  dependencies: string[];
}

export function sortConceptsTopologically(concepts: ConceptDef[]): ConceptDef[] {
  const conceptMap = new Map<string, ConceptDef>();
  concepts.forEach((c) => conceptMap.set(c.name, c));

  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const c of concepts) {
    adj.set(c.name, []);
    inDegree.set(c.name, 0);
  }

  // Populate edges
  for (const c of concepts) {
    for (const prereq of c.prerequisites) {
      if (conceptMap.has(prereq)) {
        adj.get(prereq)!.push(c.name);
        inDegree.set(c.name, (inDegree.get(c.name) || 0) + 1);
      }
    }
  }

  // Kahn's Algorithm for Topological Sort
  const queue: string[] = [];
  for (const [name, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(name);
    }
  }

  const sorted: ConceptDef[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    visited.add(current);
    const cObj = conceptMap.get(current);
    if (cObj) sorted.push(cObj);

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor)! === 0 && !visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  // Handle any circular cycle by appending remaining concepts
  for (const c of concepts) {
    if (!visited.has(c.name)) {
      sorted.push(c);
    }
  }

  return sorted;
}
