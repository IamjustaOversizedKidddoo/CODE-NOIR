import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { updateFindingStatus } from '@/lib/security/scanner';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ caseId: string; findingId: string }> }
) {
  try {
    const { caseId, findingId } = await context.params;

    const finding = await prisma.securityFinding.findFirst({
      where: { id: findingId, projectId: caseId },
    });

    if (!finding) {
      return NextResponse.json(
        { success: false, error: 'Security finding not found.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      caseId,
      finding: {
        ...finding,
        remediation: finding.remediationJson ? JSON.parse(finding.remediationJson) : undefined,
        affectedEntities: finding.affectedEntitiesJson ? JSON.parse(finding.affectedEntitiesJson) : [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve finding.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ caseId: string; findingId: string }> }
) {
  try {
    const { findingId } = await context.params;
    const body = await req.json();
    const { status, reason } = body;

    const updated = await updateFindingStatus(findingId, status, reason);

    return NextResponse.json({
      success: true,
      finding: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update finding.', code: 'UPDATE_ERROR' },
      { status: 500 }
    );
  }
}
