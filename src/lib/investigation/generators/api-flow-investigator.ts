import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';

export function generateApiFlowInvestigation(
  projectId: string,
  targetRouteOrMethod: string,
  projectData: {
    endpoints: { method: string; path: string; handlerName: string; line: number; fileId: string }[];
    files: { id: string; path: string }[];
    symbols: { id: string; name: string; fileId: string; startLine: number }[];
    callEdges: { callerId: string; calleeName: string; line: number }[];
  }
): StructuredInvestigation {
  const matchedEndpoint = projectData.endpoints.find(
    (ep) =>
      ep.path.toLowerCase().includes(targetRouteOrMethod.toLowerCase()) ||
      `${ep.method} ${ep.path}`.toLowerCase().includes(targetRouteOrMethod.toLowerCase()) ||
      ep.handlerName.toLowerCase().includes(targetRouteOrMethod.toLowerCase())
  );

  if (!matchedEndpoint) {
    return {
      projectId,
      type: 'API_FLOW',
      title: `API Flow: ${targetRouteOrMethod}`,
      question: `How does the API endpoint for ${targetRouteOrMethod} work?`,
      startingEntities: [{ type: 'ENDPOINT', name: targetRouteOrMethod }],
      steps: [],
      evidence: [],
      relationships: [],
      primaryPath: [],
      confidence: 'UNKNOWN',
      uncertainties: [`No API endpoint matching "${targetRouteOrMethod}" was detected in the project AST.`],
    };
  }

  const endpointFile = projectData.files.find((f) => f.id === matchedEndpoint.fileId);
  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];

  let stepOrder = 1;

  // Step 1: HTTP Entry
  const epEv: InvestigationEvidence = {
    file: endpointFile?.path || 'unknown',
    line: matchedEndpoint.line,
    relationship: 'HTTP_ENDPOINT',
    reason: `Declared endpoint: ${matchedEndpoint.method} ${matchedEndpoint.path}`,
    confidence: 'CONFIRMED',
  };
  evidence.push(epEv);

  steps.push({
    order: stepOrder++,
    sourceEntity: { type: 'ENDPOINT', name: `${matchedEndpoint.method} ${matchedEndpoint.path}` },
    targetEntity: { type: 'SYMBOL', name: matchedEndpoint.handlerName, path: endpointFile?.path },
    relationship: 'ROUTES_TO_HANDLER',
    evidence: epEv,
    confidence: 'CONFIRMED',
    description: `Incoming HTTP request to [${matchedEndpoint.method} ${matchedEndpoint.path}] routes to handler [${matchedEndpoint.handlerName}].`,
  });

  // Step 2: Handler downstream calls
  const handlerSymbol = projectData.symbols.find(
    (s) => s.fileId === matchedEndpoint.fileId && s.name === matchedEndpoint.handlerName
  );

  if (handlerSymbol) {
    const handlerCalls = projectData.callEdges.filter((e) => e.callerId === handlerSymbol.id);
    for (const call of handlerCalls) {
      const callEv: InvestigationEvidence = {
        file: endpointFile?.path || 'unknown',
        line: call.line,
        symbol: handlerSymbol.name,
        relationship: 'CALLS_SERVICE',
        reason: `Handler calls ${call.calleeName} on line ${call.line}`,
        confidence: 'CONFIRMED',
      };
      evidence.push(callEv);

      steps.push({
        order: stepOrder++,
        sourceEntity: { type: 'SYMBOL', name: handlerSymbol.name, path: endpointFile?.path },
        targetEntity: { type: 'SYMBOL', name: call.calleeName },
        relationship: 'INVOKES_BUSINESS_LOGIC',
        evidence: callEv,
        confidence: 'CONFIRMED',
        description: `Handler delegates request processing to [${call.calleeName}].`,
      });
    }
  }

  // Step 3: Response return
  const respEv: InvestigationEvidence = {
    file: endpointFile?.path || 'unknown',
    line: matchedEndpoint.line,
    relationship: 'RETURNS_RESPONSE',
    reason: 'Handler completes and returns HTTP status payload.',
    confidence: 'CONFIRMED',
  };
  evidence.push(respEv);

  steps.push({
    order: stepOrder++,
    sourceEntity: { type: 'SYMBOL', name: matchedEndpoint.handlerName, path: endpointFile?.path },
    targetEntity: { type: 'ENDPOINT', name: 'HTTP_RESPONSE' },
    relationship: 'RETURNS_RESPONSE',
    evidence: respEv,
    confidence: 'CONFIRMED',
    description: `Response serialization completes and sends payload back to client.`,
  });

  return {
    projectId,
    type: 'API_FLOW',
    title: `API Request Pipeline: ${matchedEndpoint.method} ${matchedEndpoint.path}`,
    question: `How does the ${matchedEndpoint.method} ${matchedEndpoint.path} endpoint process requests?`,
    startingEntities: [{ type: 'ENDPOINT', name: `${matchedEndpoint.method} ${matchedEndpoint.path}`, path: endpointFile?.path }],
    steps,
    evidence,
    relationships: steps.map((s) => ({
      source: s.sourceEntity.name,
      target: s.targetEntity.name,
      relationship: s.relationship,
      confidence: s.confidence,
    })),
    primaryPath: steps.map((s) => s.sourceEntity.name),
    confidence: 'CONFIRMED',
    uncertainties: ['Dynamic HTTP headers and authorization token validation depend on runtime request state.'],
  };
}
