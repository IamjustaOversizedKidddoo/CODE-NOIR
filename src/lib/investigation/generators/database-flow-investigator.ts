import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';

export function generateDatabaseFlowInvestigation(
  projectId: string,
  projectData: {
    dbEvidence: { type: string; details: string; line: number; fileId: string }[];
    files: { id: string; path: string }[];
    symbols: { id: string; name: string; fileId: string; startLine: number; endLine: number }[];
    techProfile: any;
  }
): StructuredInvestigation {
  if (!projectData.dbEvidence || projectData.dbEvidence.length === 0) {
    return {
      projectId,
      type: 'DATABASE_FLOW',
      title: 'Database Pipeline Investigation',
      question: 'How does data reach the database?',
      startingEntities: [],
      steps: [],
      evidence: [],
      relationships: [],
      primaryPath: [],
      confidence: 'UNKNOWN',
      uncertainties: ['Database usage cannot be established from static AST evidence in this repository.'],
    };
  }

  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];

  let stepOrder = 1;

  for (const item of projectData.dbEvidence) {
    const file = projectData.files.find((f) => f.id === item.fileId);
    const containingSymbol = projectData.symbols.find(
      (s) => s.fileId === item.fileId && s.startLine <= item.line && s.endLine >= item.line
    );

    const dbEv: InvestigationEvidence = {
      file: file?.path || 'unknown',
      line: item.line,
      symbol: containingSymbol?.name,
      relationship: 'QUERIES_DATABASE',
      reason: `Detected database operation: ${item.type} (${item.details})`,
      confidence: 'CONFIRMED',
    };
    evidence.push(dbEv);

    steps.push({
      order: stepOrder++,
      sourceEntity: {
        type: containingSymbol ? 'SYMBOL' : 'FILE',
        name: containingSymbol ? containingSymbol.name : file?.path || 'Database Access Module',
        path: file?.path,
      },
      targetEntity: { type: 'EXTERNAL_SERVICE', name: 'DATABASE_ENGINE' },
      relationship: 'QUERIES_DATABASE',
      evidence: dbEv,
      confidence: 'CONFIRMED',
      description: `[${containingSymbol ? containingSymbol.name : file?.path}] executes database operation [${item.details}].`,
    });
  }

  return {
    projectId,
    type: 'DATABASE_FLOW',
    title: 'Database Persistence Flow',
    question: 'How does data move to and from the database?',
    startingEntities: steps.map((s) => s.sourceEntity),
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
    uncertainties: ['Dynamic runtime connection pooling, read replicas, and raw transaction isolation levels depend on database server state.'],
  };
}
