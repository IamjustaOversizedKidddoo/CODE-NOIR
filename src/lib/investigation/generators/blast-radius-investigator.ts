import { StructuredInvestigation, InvestigationStep, InvestigationEvidence } from '../types';
import { calculateBlastRadius } from '../../intelligence/graph-builder';

export function generateBlastRadiusInvestigation(
  projectId: string,
  targetNameOrPath: string,
  projectData: {
    files: { id: string; path: string }[];
    symbols: { id: string; name: string; fileId: string }[];
    dependencies: { sourceFileId: string; targetFileId: string | null }[];
    entryPoints: { path: string; reason: string }[];
  }
): StructuredInvestigation {
  // 1. Resolve target file or symbol
  let targetFile = projectData.files.find(
    (f) => f.path.toLowerCase().includes(targetNameOrPath.toLowerCase()) || f.id === targetNameOrPath
  );
  let targetSymbol = projectData.symbols?.find(
    (s) => s.name.toLowerCase() === targetNameOrPath.toLowerCase() || s.id === targetNameOrPath
  );

  if (!targetFile && targetSymbol) {
    targetFile = projectData.files.find((f) => f.id === targetSymbol!.fileId);
  }

  if (!targetFile && !targetSymbol) {
    return {
      projectId,
      type: 'BLAST_RADIUS',
      title: `Blast Radius Assessment: ${targetNameOrPath}`,
      question: `What happens if ${targetNameOrPath} is modified or removed?`,
      startingEntities: [{ type: 'FILE', name: targetNameOrPath }],
      steps: [],
      evidence: [],
      relationships: [],
      primaryPath: [],
      confidence: 'UNKNOWN',
      uncertainties: [`Entity or module "${targetNameOrPath}" was not found in project files or symbols.`],
    };
  }

  const activeTargetFile = targetFile || (projectData.files.length > 0 ? projectData.files[0] : null);
  if (!activeTargetFile) {
    return {
      projectId,
      type: 'BLAST_RADIUS',
      title: `Blast Radius Assessment: ${targetNameOrPath}`,
      question: `What happens if ${targetNameOrPath} is modified or removed?`,
      startingEntities: [{ type: 'FILE', name: targetNameOrPath }],
      steps: [],
      evidence: [],
      relationships: [],
      primaryPath: [],
      confidence: 'UNKNOWN',
      uncertainties: [`No files indexed for blast radius calculation.`],
    };
  }

  const targetName = targetSymbol ? targetSymbol.name : activeTargetFile.path;

  const graphNodes = projectData.files.map((f) => ({
    id: f.id,
    type: 'FILE' as const,
    name: f.path,
    path: f.path,
  }));

  const graphEdges = projectData.dependencies
    .filter((d) => d.targetFileId !== null)
    .map((d, idx) => ({
      id: `dep-${idx}`,
      source: d.sourceFileId,
      target: d.targetFileId!,
      relationship: 'IMPORTS' as const,
      confidence: 'CONFIRMED' as const,
    }));

  const calc = calculateBlastRadius(activeTargetFile.id, {
    nodes: graphNodes,
    edges: graphEdges,
    cycles: [],
  });

  const steps: InvestigationStep[] = [];
  const evidence: InvestigationEvidence[] = [];
  let stepOrder = 1;

  // Step 1: Target entity
  const initialEv: InvestigationEvidence = {
    file: activeTargetFile.path,
    line: 1,
    relationship: 'DELETION_TARGET',
    reason: `Target file being evaluated: ${activeTargetFile.path}`,
    confidence: 'CONFIRMED',
  };
  evidence.push(initialEv);

  steps.push({
    order: stepOrder++,
    sourceEntity: { type: 'FILE', name: activeTargetFile.path, path: activeTargetFile.path },
    targetEntity: { type: 'FILE', name: activeTargetFile.path, path: activeTargetFile.path },
    relationship: 'TARGET_OF_DELETION',
    evidence: initialEv,
    confidence: 'CONFIRMED',
    description: `Assessing blast radius upon removal or modification of [${activeTargetFile.path}].`,
  });

  // Step 2: Direct and Indirect Dependents
  for (const affected of calc.affectedFiles) {
    const isDirect = projectData.dependencies.some((d) => {
      const srcFile = projectData.files.find((f) => f.id === d.sourceFileId);
      return (srcFile?.path === affected.path || d.sourceFileId === affected.path) && d.targetFileId === activeTargetFile.id;
    });

    const affEv: InvestigationEvidence = {
      file: affected.path,
      line: 1,
      relationship: isDirect ? 'DIRECT_DEPENDENT' : 'TRANSITIVE_DEPENDENT',
      reason: isDirect
        ? `Directly imports ${activeTargetFile.path}`
        : `Transitively depends on ${activeTargetFile.path} through import hierarchy`,
      confidence: 'CONFIRMED',
    };
    evidence.push(affEv);

    steps.push({
      order: stepOrder++,
      sourceEntity: { type: 'FILE', name: activeTargetFile.path, path: activeTargetFile.path },
      targetEntity: { type: 'FILE', name: affected.path, path: affected.path },
      relationship: isDirect ? 'BREAKS_DIRECT_DEPENDENT' : 'BREAKS_TRANSITIVE_DEPENDENT',
      evidence: affEv,
      confidence: 'CONFIRMED',
      description: isDirect
        ? `Direct dependent [${affected.path}] will immediately encounter import resolution failures.`
        : `Transitive dependent [${affected.path}] will suffer indirect breakage.`,
    });
  }

  return {
    projectId,
    type: 'BLAST_RADIUS',
    title: `Blast Radius: ${targetSymbol ? targetSymbol.name : activeTargetFile.path} (${calc.totalAffected} dependents affected)`,
    question: `What breaks if ${targetSymbol ? targetSymbol.name : activeTargetFile.path} is removed?`,
    startingEntities: [{ type: targetSymbol ? 'SYMBOL' : 'FILE', name: targetSymbol ? targetSymbol.name : activeTargetFile.path, path: activeTargetFile.path }],
    steps,
    evidence,
    relationships: steps.map((s) => ({
      source: s.sourceEntity.name,
      target: s.targetEntity.name,
      relationship: s.relationship,
      confidence: s.confidence,
    })),
    primaryPath: [activeTargetFile.path, ...calc.affectedFiles.map((f) => f.path)],
    confidence: 'CONFIRMED',
    uncertainties: ['Dynamic runtime reflection or duck-typing dependencies cannot be proven from static imports.'],
    affectedEntities: calc.affectedFiles.map((f) => f.path),
    metadata: {
      directDependentsCount: calc.affectedFiles.length,
      totalAffected: calc.totalAffected,
    },
  };
}
