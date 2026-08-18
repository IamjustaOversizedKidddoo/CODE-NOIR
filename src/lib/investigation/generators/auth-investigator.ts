import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';

export function generateAuthenticationInvestigation(
  projectId: string,
  projectData: {
    files: { id: string; path: string }[];
    symbols: { id: string; name: string; kind: string; fileId: string; startLine: number }[];
    endpoints: { method: string; path: string; handlerName: string; fileId: string; line: number }[];
  }
): StructuredInvestigation {
  // Find auth-related files or symbols
  const authFiles = projectData.files.filter((f) => /auth|login|jwt|token|session|user/i.test(f.path));
  const authSymbols = projectData.symbols.filter((s) =>
    /auth|login|verify|token|password|session|jwt|hash|crypto/i.test(s.name)
  );
  const authEndpoints = projectData.endpoints.filter((ep) =>
    /login|auth|token|session|signup|register/i.test(ep.path)
  );

  if (authFiles.length === 0 && authSymbols.length === 0 && authEndpoints.length === 0) {
    return {
      projectId,
      type: 'AUTHENTICATION_FLOW',
      title: 'Authentication Flow Investigation',
      question: 'How does authentication and authorization work?',
      startingEntities: [],
      steps: [],
      evidence: [],
      relationships: [],
      primaryPath: [],
      confidence: 'UNKNOWN',
      uncertainties: ['No dedicated authentication, password hashing, or token verification logic was detected in static code.'],
    };
  }

  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];
  let stepOrder = 1;

  // Step 1: Login Endpoint / Auth Entry
  if (authEndpoints.length > 0) {
    const ep = authEndpoints[0];
    const file = projectData.files.find((f) => f.id === ep.fileId);
    const epEv: InvestigationEvidence = {
      file: file?.path || 'unknown',
      line: ep.line,
      relationship: 'AUTH_ENDPOINT',
      reason: `Detected authentication route: ${ep.method} ${ep.path}`,
      confidence: 'CONFIRMED',
    };
    evidence.push(epEv);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'ENDPOINT', name: `${ep.method} ${ep.path}`, path: file?.path },
      targetEntity: { type: 'SYMBOL', name: ep.handlerName, path: file?.path },
      relationship: 'INITIATES_AUTH',
      evidence: epEv,
      confidence: 'CONFIRMED',
      description: `Authentication initiates via [${ep.method} ${ep.path}] targeting handler [${ep.handlerName}].`,
    });
  }

  // Step 2: Verification / Token Generation Symbols
  for (const sym of authSymbols.slice(0, 4)) {
    const file = projectData.files.find((f) => f.id === sym.fileId);
    const symEv: InvestigationEvidence = {
      file: file?.path || 'unknown',
      line: sym.startLine,
      symbol: sym.name,
      relationship: 'VERIFIES_CREDENTIALS',
      reason: `Auth verification symbol detected: ${sym.name}`,
      confidence: 'CONFIRMED',
    };
    evidence.push(symEv);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'FILE', name: file?.path || 'Auth Module', path: file?.path },
      targetEntity: { type: 'SYMBOL', name: sym.name, path: file?.path },
      relationship: 'EXECUTES_AUTH_LOGIC',
      evidence: symEv,
      confidence: 'CONFIRMED',
      description: `Executes credential validation and token verification inside [${sym.name}].`,
    });
  }

  return {
    projectId,
    type: 'AUTHENTICATION_FLOW',
    title: 'Authentication & Security Pipeline',
    question: 'How is authentication handled across the codebase?',
    startingEntities: steps.map((s) => s.sourceEntity),
    steps,
    evidence,
    relationships: steps.map((s) => ({
      source: s.sourceEntity.name,
      target: s.targetEntity.name,
      relationship: s.relationship,
      confidence: s.confidence,
    })),
    primaryPath: steps.map((s) => s.targetEntity.name),
    confidence: 'CONFIRMED',
    uncertainties: ['Token expiration policies and cryptographic secret rotation depend on runtime environment variables.'],
  };
}
