import { NextRequest, NextResponse } from 'next/server';
import { runSecurityAudit } from '@/lib/security/scanner';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const report = await runSecurityAudit(caseId);

    return NextResponse.json({
      success: true,
      caseId,
      report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Security audit failed.', code: 'SECURITY_SCAN_ERROR' },
      { status: 500 }
    );
  }
}
