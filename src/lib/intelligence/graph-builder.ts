import {
  FileAnalysisResult,
  DirectedProjectGraph,
  GraphNode,
  GraphEdge,
  ConfidenceLevel,
} from '../types/intelligence';

export interface BlastRadiusResult {
  targetId: string;
  targetName: string;
  affectedFiles: { path: string; reason: string }[];
  affectedSymbols: { name: string; file: string }[];
  totalAffected: number;
}

export function buildProjectGraph(
  analyses: FileAnalysisResult[],
  fileIdToPathMap: Map<string, string>,
  pathToIdMap: Map<string, string>,
  resolvedDependencies: { sourceFileId: string; targetFileId?: string; importName?: string; line?: number }[],
  symbolMap: Map<string, { id: string; name: string; fileId: string; kind: string }>
): DirectedProjectGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // 1. Add File Nodes
  fileIdToPathMap.forEach((path, id) => {
    nodes.push({
      id,
      type: 'FILE',
      name: path.split('/').pop() || path,
      path,
    });
  });

  // 2. Add Symbol Nodes
  symbolMap.forEach((sym, id) => {
    const filePath = fileIdToPathMap.get(sym.fileId) || '';
    nodes.push({
      id,
      type: 'SYMBOL',
      name: sym.name,
      path: filePath,
      kind: sym.kind,
    });
  });

  // 3. Add Import / Dependency Edges
  resolvedDependencies.forEach((dep, idx) => {
    if (dep.targetFileId) {
      edges.push({
        id: `dep_${idx}_${dep.sourceFileId}_${dep.targetFileId}`,
        source: dep.sourceFileId,
        target: dep.targetFileId,
        relationship: 'IMPORTS',
        confidence: 'CONFIRMED',
        line: dep.line,
        evidence: `Import statement for "${dep.importName || '*'}"`,
      });
    }
  });

  // 4. Add Call Edges between Symbols
  let callEdgeIdx = 0;
  for (const analysis of analyses) {
    for (const call of analysis.calls) {
      // Find caller symbol ID
      let callerSymbolId: string | undefined;
      if (call.callerSymbolName) {
        for (const [sId, s] of symbolMap.entries()) {
          if (s.fileId === analysis.fileId && s.name === call.callerSymbolName) {
            callerSymbolId = sId;
            break;
          }
        }
      }

      // Find callee symbol ID (within same file or resolved target)
      let calleeSymbolId: string | undefined;
      for (const [sId, s] of symbolMap.entries()) {
        if (s.name === call.calleeName) {
          calleeSymbolId = sId;
          break;
        }
      }

      if (callerSymbolId) {
        edges.push({
          id: `call_${callEdgeIdx++}`,
          source: callerSymbolId,
          target: calleeSymbolId || `unresolved_${call.calleeName}`,
          relationship: call.relationship || 'CALLS',
          confidence: calleeSymbolId ? 'CONFIRMED' : 'LIKELY',
          line: call.line,
          evidence: call.evidence,
        });
      }
    }
  }

  // 5. Detect Circular Dependencies between Files using DFS
  const fileAdjacency = new Map<string, Set<string>>();
  edges
    .filter((e) => e.relationship === 'IMPORTS')
    .forEach((e) => {
      if (!fileAdjacency.has(e.source)) {
        fileAdjacency.set(e.source, new Set());
      }
      fileAdjacency.get(e.source)!.add(e.target);
    });

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];

  function detectCyclesDFS(nodeId: string): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);

    const neighbors = fileAdjacency.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        detectCyclesDFS(neighbor);
      } else if (recursionStack.has(neighbor)) {
        const cycleStartIndex = currentPath.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycleNodeIds = currentPath.slice(cycleStartIndex).concat(neighbor);
          const cyclePaths = cycleNodeIds.map((id) => fileIdToPathMap.get(id) || id);
          cycles.push(cyclePaths);
        }
      }
    }

    recursionStack.delete(nodeId);
    currentPath.pop();
  }

  for (const fileId of fileIdToPathMap.keys()) {
    if (!visited.has(fileId)) {
      detectCyclesDFS(fileId);
    }
  }

  return { nodes, edges, cycles };
}

/**
 * Calculates downstream blast radius for a given file or symbol.
 */
export function calculateBlastRadius(
  targetId: string,
  graph: DirectedProjectGraph
): BlastRadiusResult {
  const affectedFilesMap = new Map<string, string>();
  const affectedSymbolsList: { name: string; file: string }[] = [];

  // Build reverse adjacency list (dependents pointing back to target)
  const reverseAdj = new Map<string, { source: string; rel: string; evidence?: string }[]>();
  for (const edge of graph.edges) {
    if (!reverseAdj.has(edge.target)) {
      reverseAdj.set(edge.target, []);
    }
    reverseAdj.get(edge.target)!.push({
      source: edge.source,
      rel: edge.relationship,
      evidence: edge.evidence,
    });
  }

  const queue: string[] = [targetId];
  const seen = new Set<string>([targetId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const incoming = reverseAdj.get(current) || [];

    for (const edge of incoming) {
      if (!seen.has(edge.source)) {
        seen.add(edge.source);
        queue.push(edge.source);

        const node = graph.nodes.find((n) => n.id === edge.source);
        if (node) {
          if (node.type === 'FILE') {
            affectedFilesMap.set(node.path, `${edge.rel} relationship with target`);
          } else if (node.type === 'SYMBOL') {
            affectedSymbolsList.push({ name: node.name, file: node.path });
            affectedFilesMap.set(node.path, `Contains symbol ${node.name} which depends on target`);
          }
        }
      }
    }
  }

  const targetNode = graph.nodes.find((n) => n.id === targetId);

  return {
    targetId,
    targetName: targetNode?.name || targetId,
    affectedFiles: Array.from(affectedFilesMap.entries()).map(([path, reason]) => ({ path, reason })),
    affectedSymbols: affectedSymbolsList,
    totalAffected: affectedFilesMap.size + affectedSymbolsList.length,
  };
}
