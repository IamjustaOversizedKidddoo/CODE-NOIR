import { ConfidenceLevel } from '../../types/intelligence';
import { TraversalConfig, DEFAULT_TRAVERSAL_CONFIG, TraversalResult } from '../types';

export interface GraphEdgeInput {
  source: string;
  target: string;
  relationship?: string;
  confidence?: ConfidenceLevel;
}

export function traverseGraphPaths(
  startNodeId: string,
  edges: GraphEdgeInput[],
  config: TraversalConfig = DEFAULT_TRAVERSAL_CONFIG
): TraversalResult {
  const adj = new Map<string, { target: string; relationship: string; confidence: ConfidenceLevel }[]>();

  for (const edge of edges) {
    if (!adj.has(edge.source)) {
      adj.set(edge.source, []);
    }
    adj.get(edge.source)!.push({
      target: edge.target,
      relationship: edge.relationship || 'DEPENDS_ON',
      confidence: edge.confidence || 'CONFIRMED',
    });
  }

  const allPaths: string[][] = [];
  const visitedGlobal = new Set<string>();
  const traversedEdges: { source: string; target: string; relationship: string; confidence: ConfidenceLevel }[] = [];
  const cyclesDetected: string[][] = [];
  let truncated = false;

  function dfs(currentNode: string, currentPath: string[], visitedInPath: Set<string>, depth: number) {
    if (visitedGlobal.size >= config.maxNodes || allPaths.length >= config.maxPaths) {
      truncated = true;
      return;
    }

    if (depth >= config.maxDepth) {
      truncated = true;
      allPaths.push([...currentPath]);
      return;
    }

    visitedGlobal.add(currentNode);
    const neighbors = adj.get(currentNode) || [];

    if (neighbors.length === 0) {
      allPaths.push([...currentPath]);
      return;
    }

    let branched = false;
    for (const neighbor of neighbors) {
      traversedEdges.push({
        source: currentNode,
        target: neighbor.target,
        relationship: neighbor.relationship,
        confidence: neighbor.confidence,
      });

      if (visitedInPath.has(neighbor.target)) {
        // Cycle detected: record cycle and prevent recursion
        cyclesDetected.push([...currentPath, neighbor.target]);
        continue;
      }

      branched = true;
      visitedInPath.add(neighbor.target);
      dfs(neighbor.target, [...currentPath, neighbor.target], visitedInPath, depth + 1);
      visitedInPath.delete(neighbor.target);
    }

    if (!branched && currentPath.length > 1) {
      allPaths.push([...currentPath]);
    }
  }

  const initialVisited = new Set<string>([startNodeId]);
  dfs(startNodeId, [startNodeId], initialVisited, 1);

  // If no paths found, return single start node
  if (allPaths.length === 0) {
    allPaths.push([startNodeId]);
  }

  // Deduplicate paths
  const uniquePaths: string[][] = [];
  const pathSet = new Set<string>();

  for (const p of allPaths) {
    const key = p.join(' -> ');
    if (!pathSet.has(key)) {
      pathSet.add(key);
      uniquePaths.push(p);
    }
  }

  const primaryPath = uniquePaths[0] || [startNodeId];
  const alternativePaths = uniquePaths.slice(1);

  return {
    primaryPath,
    alternativePaths,
    visitedNodes: visitedGlobal,
    traversedEdges,
    truncated,
    cyclesDetected,
  };
}
