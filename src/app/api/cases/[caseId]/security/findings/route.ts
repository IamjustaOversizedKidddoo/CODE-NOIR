import { NextRequest, NextResponse } from 'next/server';
import { getSecurityReport } from '@/lib/security/scanner';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const url = new URL(req.url);

    const severity = url.searchParams.get('severity') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const type = url.searchParams.get('type') || undefined;

    const report = await getSecurityReport(caseId, { severity, status, type });

    return NextResponse.json({
      success: true,
      caseId,
      report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch security findings.', code: 'SECURITY_FINDINGS_ERROR' },
      { status: 500 }
    );
  }
}
