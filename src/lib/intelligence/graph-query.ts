import { DirectedProjectGraph, GraphEdge, GraphNode } from '../types/intelligence';

export class IndexedGraphIndex {
  private nodeMap = new Map<string, GraphNode>();
  private forwardAdj = new Map<string, GraphEdge[]>(); // source -> edges
  private reverseAdj = new Map<string, GraphEdge[]>(); // target -> edges

  constructor(graph: DirectedProjectGraph) {
    for (const node of graph.nodes) {
      this.nodeMap.set(node.id, node);
    }
    for (const edge of graph.edges) {
      if (!this.forwardAdj.has(edge.source)) {
        this.forwardAdj.set(edge.source, []);
      }
      this.forwardAdj.get(edge.source)!.push(edge);

      if (!this.reverseAdj.has(edge.target)) {
        this.reverseAdj.set(edge.target, []);
      }
      this.reverseAdj.get(edge.target)!.push(edge);
    }
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodeMap.get(id);
  }

  public getCallers(symbolId: string): { edge: GraphEdge; callerNode?: GraphNode }[] {
    const edges = (this.reverseAdj.get(symbolId) || []).filter((e) => e.relationship === 'CALLS');
    return edges.map((edge) => ({
      edge,
      callerNode: this.nodeMap.get(edge.source),
    }));
  }

  public getCallees(symbolId: string): { edge: GraphEdge; calleeNode?: GraphNode }[] {
    const edges = (this.forwardAdj.get(symbolId) || []).filter((e) => e.relationship === 'CALLS');
    return edges.map((edge) => ({
      edge,
      calleeNode: this.nodeMap.get(edge.target),
    }));
  }

  public getFileDependencies(fileId: string): { edge: GraphEdge; targetNode?: GraphNode }[] {
    const edges = (this.forwardAdj.get(fileId) || []).filter((e) => e.relationship === 'IMPORTS' || e.relationship === 'DEPENDS_ON');
    return edges.map((edge) => ({
      edge,
      targetNode: this.nodeMap.get(edge.target),
    }));
  }

  public computeBlastRadius(
    startId: string,
    maxDepth: number = 5
  ): {
    affectedIds: string[];
    depths: Record<string, number>;
    totalAffected: number;
  } {
    const visited = new Set<string>();
    const depths: Record<string, number> = {};
    const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];

    visited.add(startId);
    depths[startId] = 0;

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      // Check both callers and dependents (anything that relies on this entity)
      const incoming = this.reverseAdj.get(id) || [];
      for (const edge of incoming) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          depths[edge.source] = depth + 1;
          queue.push({ id: edge.source, depth: depth + 1 });
        }
      }
    }

    const affectedIds = Array.from(visited).filter((id) => id !== startId);

    return {
      affectedIds,
      depths,
      totalAffected: affectedIds.length,
    };
  }
}
