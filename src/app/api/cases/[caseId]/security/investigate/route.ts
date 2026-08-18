import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { transformFactualResponse } from '@/lib/persona/engine';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await req.json();
    const { findingId, query } = body;

    const finding = await prisma.securityFinding.findFirst({
      where: { id: findingId, projectId: caseId },
    });

    if (!finding) {
      return NextResponse.json(
        { success: false, error: 'Finding not found.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const remediation = finding.remediationJson ? JSON.parse(finding.remediationJson) : {};

    const rawFact = `Static Security Audit: "${finding.title}" (${finding.severity}).\nLocation: ${finding.filePath}:${finding.startLine || 1}.\nDescription: ${finding.description}\nWhy it matters: ${remediation.whyItMatters || 'Potential risk surface.'}\nRecommended Fix: ${remediation.recommendedFix || 'Apply parameterized inputs and input validation.'}`;

    const personaTransformed = transformFactualResponse({
      fact: rawFact,
      confidence: finding.confidence as any,
      evidence: {
        file: finding.filePath,
        startLine: finding.startLine || 1,
        endLine: finding.endLine || 1,
        symbolName: finding.symbolName || undefined,
      },
      sourceEntity: finding.symbolName || finding.filePath,
      hasCycle: false,
      sarcasmLevel: 2,
    });

    return NextResponse.json({
      success: true,
      caseId,
      findingId,
      analysis: {
        rawFact,
        detectiveOpening: personaTransformed.detectiveOpening,
        detectiveCommentary: personaTransformed.detectiveCommentary,
        confidence: finding.confidence,
        remediation,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Security investigation failed.', code: 'SECURITY_INVESTIGATION_ERROR' },
      { status: 500 }
    );
  }
}
