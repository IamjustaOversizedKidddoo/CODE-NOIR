import prisma from '../../db';
import { GroundedAIResponse, GroundedEvidenceItem } from '../types';

export async function validateClaimsAgainstDatabase(
  caseId: string,
  response: GroundedAIResponse
): Promise<GroundedAIResponse> {
  const [projectFiles, projectSymbols] = await Promise.all([
    prisma.projectFile.findMany({
      where: { projectId: caseId },
      select: { path: true },
    }),
    prisma.codeSymbol.findMany({
      where: { projectId: caseId },
      select: { name: true },
    }),
  ]);

  const existingFilePaths = new Set(projectFiles.map((f) => f.path.toLowerCase()));
  const existingSymbolNames = new Set(projectSymbols.map((s) => s.name.toLowerCase()));

  const validatedEvidence: GroundedEvidenceItem[] = [];
  const warnings: string[] = [];

  for (const item of response.evidence) {
    const fileExists = existingFilePaths.has(item.file.toLowerCase());
    let symbolExists = true;
    if (item.symbol) {
      symbolExists = existingSymbolNames.has(item.symbol.toLowerCase());
    }

    if (fileExists && symbolExists) {
      validatedEvidence.push(item);
    } else {
      if (!fileExists) {
        warnings.push(`Evidence file citation "${item.file}" could not be verified in static vault.`);
      }
      if (!symbolExists && item.symbol) {
        warnings.push(`Evidence symbol citation "${item.symbol}" could not be verified in static vault.`);
      }
    }
  }

  // If evidence citations were removed due to hallucination, downgrade confidence
  let finalConfidence = response.confidence;
  if (warnings.length > 0) {
    if (finalConfidence === 'CONFIRMED') {
      finalConfidence = 'LIKELY';
    }
  }

  return {
    ...response,
    evidence: validatedEvidence,
    confidence: finalConfidence,
    validated: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
