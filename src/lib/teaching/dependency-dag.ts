import { CurriculumDAG, CurriculumDAGNode, UniversalFileRecord } from './types';

export function buildCurriculumDAG(
  files: UniversalFileRecord[],
  dependencies: { sourceFileId: string; targetFileId: string | null }[]
): CurriculumDAG {
  const nodes: CurriculumDAGNode[] = [];
  const fileIdToNodeId = new Map<string, string>();
  const lessonIdToNodeMap = new Map<string, CurriculumDAGNode>();

  // 1. Create DAG node for each file in O(N)
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const nodeId = `dag_node_${i + 1}`;
    fileIdToNodeId.set(f.fileId, nodeId);

    const node: CurriculumDAGNode = {
      lessonId: `lesson_${f.fileId}`,
      fileId: f.fileId,
      filePath: f.path,
      title: `Investigating ${f.path}`,
      level: f.primaryRole === 'ENTRY_POINT' ? 0 : f.primaryRole === 'CORE' ? 1 : 2,
      importance: f.importanceScore,
      prerequisites: [],
      dependents: [],
    };

    nodes.push(node);
    lessonIdToNodeMap.set(node.lessonId, node);
  }

  // 2. Map dependencies to DAG edges in O(E)
  for (let i = 0; i < dependencies.length; i++) {
    const d = dependencies[i];
    if (!d.targetFileId) continue;
    const sourceNodeId = fileIdToNodeId.get(d.sourceFileId);
    const targetNodeId = fileIdToNodeId.get(d.targetFileId);

    if (sourceNodeId && targetNodeId && sourceNodeId !== targetNodeId) {
      const sourceLessonId = `lesson_${d.sourceFileId}`;
      const targetLessonId = `lesson_${d.targetFileId}`;
      const sourceNode = lessonIdToNodeMap.get(sourceLessonId);
      const targetNode = lessonIdToNodeMap.get(targetLessonId);

      if (sourceNode && targetNode) {
        if (!sourceNode.prerequisites.includes(targetNode.lessonId)) {
          sourceNode.prerequisites.push(targetNode.lessonId);
        }
        if (!targetNode.dependents.includes(sourceNode.lessonId)) {
          targetNode.dependents.push(sourceNode.lessonId);
        }
      }
    }
  }

  // 3. Detect Circular Dependencies with O(1) Map lookups
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const detectedCycles: Array<{ nodeIds: string[]; explanation: string }> = [];

  function dfsDetectCycle(currLessonId: string, path: string[]) {
    visited.add(currLessonId);
    recStack.add(currLessonId);
    path.push(currLessonId);

    const node = lessonIdToNodeMap.get(currLessonId);
    if (node) {
      for (let i = 0; i < node.prerequisites.length; i++) {
        const prereqId = node.prerequisites[i];
        if (!visited.has(prereqId)) {
          dfsDetectCycle(prereqId, [...path]);
        } else if (recStack.has(prereqId)) {
          const cyclePath = path.slice(path.indexOf(prereqId));
          const cycleNodeNames = cyclePath
            .map((id) => lessonIdToNodeMap.get(id)?.filePath || id)
            .join(' ⇄ ');

          detectedCycles.push({
            nodeIds: cyclePath,
            explanation: `Circular dependency detected between: [${cycleNodeNames}]. Cyclic relationship resolved at boundary.`,
          });

          node.isCycleBoundary = true;
          node.cycleNote = `Circular dependency detected: ${cycleNodeNames}.`;
          node.prerequisites = node.prerequisites.filter((id) => id !== prereqId);
        }
      }
    }

    recStack.delete(currLessonId);
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!visited.has(n.lessonId)) {
      dfsDetectCycle(n.lessonId, []);
    }
  }

  const entryLessonIds = nodes.filter((n) => n.prerequisites.length === 0).map((n) => n.lessonId);

  return {
    nodes,
    entryLessonIds,
    cycles: detectedCycles,
  };
}
