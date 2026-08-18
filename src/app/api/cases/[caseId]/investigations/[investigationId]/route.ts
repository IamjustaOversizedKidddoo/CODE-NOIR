import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ caseId: string; investigationId: string }> }
) {
  try {
    const { caseId, investigationId } = await context.params;

    const inv = await prisma.investigation.findFirst({
      where: { id: investigationId, projectId: caseId },
    });

    if (!inv) {
      return NextResponse.json(
        { success: false, error: 'Investigation not found.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      caseId,
      investigation: {
        id: inv.id,
        type: inv.type,
        title: inv.title,
        question: inv.question,
        startingEntities: inv.startingEntities ? JSON.parse(inv.startingEntities) : [],
        steps: JSON.parse(inv.stepsJson),
        evidence: JSON.parse(inv.evidenceJson),
        relationships: inv.relationshipsJson ? JSON.parse(inv.relationshipsJson) : [],
        primaryPath: inv.primaryPathJson ? JSON.parse(inv.primaryPathJson) : [],
        alternativePaths: inv.alternativePathsJson ? JSON.parse(inv.alternativePathsJson) : [],
        confidence: inv.confidence,
        uncertainties: inv.uncertaintiesJson ? JSON.parse(inv.uncertaintiesJson) : [],
        affectedEntities: inv.affectedEntities ? JSON.parse(inv.affectedEntities) : [],
        externalServices: inv.externalServices ? JSON.parse(inv.externalServices) : [],
        metadata: inv.metadataJson ? JSON.parse(inv.metadataJson) : {},
        createdAt: inv.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch investigation.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
