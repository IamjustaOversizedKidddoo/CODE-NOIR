import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';
import { traverseGraphPaths } from '../traversal/path-traverser';

export function generateCallFlowInvestigation(
  projectId: string,
  targetSymbolName: string,
  projectData: {
    symbols: { id: string; name: string; kind: string; fileId: string; startLine: number }[];
    files: { id: string; path: string }[];
    callEdges: { callerId: string; calleeId?: string | null; calleeName: string; line: number; fileId: string }[];
  }
): StructuredInvestigation {
  const targetSymbol = projectData.symbols.find(
    (s) => s.name.toLowerCase() === targetSymbolName.toLowerCase()
  );

  if (!targetSymbol) {
    return {
      projectId,
      type: 'CALL_FLOW',
      title: `Call Flow: ${targetSymbolName}`,
      question: `What is the execution and call path for ${targetSymbolName}?`,
      startingEntities: [{ type: 'SYMBOL', name: targetSymbolName }],
      steps: [],
      evidence: [],
      relationships: [],
      primaryPath: [],
      confidence: 'UNKNOWN',
      uncertainties: [`Symbol "${targetSymbolName}" was not found in indexed project symbols.`],
    };
  }

  const targetFile = projectData.files.find((f) => f.id === targetSymbol.fileId);

  // Map graph edges for traversal
  const graphEdges = projectData.callEdges.map((edge) => {
    const callerSym = projectData.symbols.find((s) => s.id === edge.callerId);
    return {
      source: callerSym?.name || edge.callerId,
      target: edge.calleeName,
      relationship: 'CALLS',
      confidence: 'CONFIRMED' as const,
    };
  });

  const traversal = traverseGraphPaths(targetSymbol.name, graphEdges, {
    maxDepth: 6,
    maxNodes: 25,
    maxPaths: 3,
  });

  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];

  let stepOrder = 1;
  const initialEv: InvestigationEvidence = {
    file: targetFile?.path || 'unknown',
    line: targetSymbol.startLine,
    symbol: targetSymbol.name,
    relationship: 'ROOT_INVOCATION',
    reason: `Target symbol definition in ${targetFile?.path}.`,
    confidence: 'CONFIRMED',
  };
  evidence.push(initialEv);

  steps.push({
    order: stepOrder++,
    sourceEntity: { type: 'SYMBOL', name: targetSymbol.name, path: targetFile?.path },
    targetEntity: { type: 'SYMBOL', name: targetSymbol.name, path: targetFile?.path },
    relationship: 'EXECUTES',
    evidence: initialEv,
    confidence: 'CONFIRMED',
    description: `Execution enters target symbol [${targetSymbol.name}].`,
  });

  // Outgoing calls from target
  const outgoing = projectData.callEdges.filter((e) => e.callerId === targetSymbol.id);
  for (const edge of outgoing) {
    const edgeEv: InvestigationEvidence = {
      file: targetFile?.path || 'unknown',
      line: edge.line,
      symbol: targetSymbol.name,
      relationship: 'CALLS',
      reason: `Direct static call expression on line ${edge.line} targeting ${edge.calleeName}.`,
      confidence: 'CONFIRMED',
    };
    evidence.push(edgeEv);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'SYMBOL', name: targetSymbol.name, path: targetFile?.path },
      targetEntity: { type: 'SYMBOL', name: edge.calleeName },
      relationship: 'CALLS',
      evidence: edgeEv,
      confidence: 'CONFIRMED',
      description: `[${targetSymbol.name}] calls downstream function [${edge.calleeName}].`,
    });
  }

  return {
    projectId,
    type: 'CALL_FLOW',
    title: `Call Hierarchy: ${targetSymbol.name}`,
    question: `What is the execution path of ${targetSymbol.name}?`,
    startingEntities: [{ type: 'SYMBOL', name: targetSymbol.name, path: targetFile?.path }],
    steps,
    evidence,
    relationships: steps.map((s) => ({
      source: s.sourceEntity.name,
      target: s.targetEntity.name,
      relationship: s.relationship,
      confidence: s.confidence,
    })),
    primaryPath: traversal.primaryPath,
    alternativePaths: traversal.alternativePaths,
    confidence: 'CONFIRMED',
    uncertainties: traversal.truncated
      ? ['Call hierarchy traversal was truncated to prevent graph explosion.']
      : [],
    metadata: {
      cyclesDetected: traversal.cyclesDetected.length,
      outgoingCallsCount: outgoing.length,
    },
  };
}
