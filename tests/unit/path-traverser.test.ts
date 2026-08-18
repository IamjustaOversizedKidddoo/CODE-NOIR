import { describe, it, expect } from 'vitest';
import { traverseGraphPaths, GraphEdgeInput } from '@/lib/investigation/traversal/path-traverser';

describe('PathTraverser: Cycle-Safe Bounded Path Traversal', () => {
  it('should traverse linear paths deterministically', () => {
    const edges: GraphEdgeInput[] = [
      { source: 'A', target: 'B', relationship: 'CALLS' },
      { source: 'B', target: 'C', relationship: 'CALLS' },
      { source: 'C', target: 'D', relationship: 'CALLS' },
    ];

    const result = traverseGraphPaths('A', edges, { maxDepth: 10, maxNodes: 50, maxPaths: 5 });

    expect(result.primaryPath).toEqual(['A', 'B', 'C', 'D']);
    expect(result.truncated).toBe(false);
    expect(result.cyclesDetected.length).toBe(0);
  });

  it('should detect cycles and terminate without infinite recursion', () => {
    const cyclicEdges: GraphEdgeInput[] = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'A' }, // Circular reference A -> B -> C -> A
    ];

    const result = traverseGraphPaths('A', cyclicEdges, { maxDepth: 10, maxNodes: 50, maxPaths: 5 });

    expect(result.primaryPath).toEqual(['A', 'B', 'C']);
    expect(result.cyclesDetected.length).toBeGreaterThan(0);
    expect(result.cyclesDetected[0]).toEqual(['A', 'B', 'C', 'A']);
  });

  it('should discover multiple branching paths (primary vs alternative)', () => {
    const branchingEdges: GraphEdgeInput[] = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'D' },
      { source: 'A', target: 'C' },
      { source: 'C', target: 'D' },
    ];

    const result = traverseGraphPaths('A', branchingEdges, { maxDepth: 10, maxNodes: 50, maxPaths: 5 });

    expect(result.primaryPath).toEqual(['A', 'B', 'D']);
    expect(result.alternativePaths.length).toBe(1);
    expect(result.alternativePaths[0]).toEqual(['A', 'C', 'D']);
  });

  it('should handle large graphs (5,000 nodes/edges) efficiently and truncate within limits', () => {
    const largeEdges: GraphEdgeInput[] = [];
    for (let i = 1; i <= 5000; i++) {
      largeEdges.push({ source: `N${i}`, target: `N${i + 1}` });
    }

    const result = traverseGraphPaths('N1', largeEdges, { maxDepth: 10, maxNodes: 100, maxPaths: 5 });

    expect(result.primaryPath.length).toBe(10);
    expect(result.truncated).toBe(true);
    expect(result.visitedNodes.size).toBeLessThanOrEqual(100);
  });
});
