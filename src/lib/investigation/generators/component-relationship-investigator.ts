import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';

export function generateComponentRelationshipInvestigation(
  projectId: string,
  projectData: {
    files: { id: string; path: string }[];
    symbols: { id: string; name: string; kind: string; fileId: string; startLine: number }[];
    dependencies: { sourceFileId: string; targetFileId: string | null; importName?: string }[];
    endpoints: { method: string; path: string; handlerName: string; fileId: string }[];
  }
): StructuredInvestigation {
  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];
  let stepOrder = 1;

  // Find UI components / pages
  const uiFiles = projectData.files.filter((f) => /\.(tsx|jsx|vue|svelte)$/i.test(f.path) || /components|pages|app/i.test(f.path));
  const serviceFiles = projectData.files.filter((f) => /service|controller|manager|api/i.test(f.path));

  for (const ui of uiFiles.slice(0, 5)) {
    // Check if UI imports a service
    const uiDeps = projectData.dependencies.filter((d) => d.sourceFileId === ui.id);
    for (const dep of uiDeps) {
      const targetService = serviceFiles.find((s) => s.id === dep.targetFileId);
      if (targetService) {
        const relEv: InvestigationEvidence = {
          file: ui.path,
          line: 1,
          relationship: 'UI_TO_SERVICE_BINDING',
          reason: `Component ${ui.path} binds to backend service ${targetService.path}`,
          confidence: 'CONFIRMED',
        };
        evidence.push(relEv);

        steps.push({
          order: stepOrder++,
          sourceEntity: { type: 'FILE', name: ui.path, path: ui.path },
          targetEntity: { type: 'FILE', name: targetService.path, path: targetService.path },
          relationship: 'CONNECTS_TO_BACKEND_SERVICE',
          evidence: relEv,
          confidence: 'CONFIRMED',
          description: `Frontend component [${ui.path}] interacts with service layer [${targetService.path}].`,
        });
      }
    }
  }

  if (steps.length === 0) {
    return {
      projectId,
      type: 'COMPONENT_RELATIONSHIP',
      title: 'Component Relationships Dossier',
      question: 'How do frontend and backend components connect?',
      startingEntities: [],
      steps: [],
      evidence: [],
      relationships: [],
      primaryPath: [],
      confidence: 'UNKNOWN',
      uncertainties: ['No explicit cross-tier UI component to backend service import linkages were detected.'],
    };
  }

  return {
    projectId,
    type: 'COMPONENT_RELATIONSHIP',
    title: 'Cross-Component Linkages',
    question: 'How do UI components connect to backend layers?',
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
    uncertainties: ['Dynamic client-side fetch calls passing arbitrary URL strings cannot always be linked to backend route handlers without static type contracts.'],
  };
}
