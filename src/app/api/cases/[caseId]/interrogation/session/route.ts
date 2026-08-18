import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateInterrogationSession } from '@/lib/interrogation/session';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId || 'detective_user';

    const session = await getOrCreateInterrogationSession(caseId, userId);

    return NextResponse.json({
      success: true,
      caseId,
      session,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initialize session.', code: 'SESSION_ERROR' },
      { status: 500 }
    );
  }
}
