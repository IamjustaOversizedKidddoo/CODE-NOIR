import { NextRequest, NextResponse } from 'next/server';
import { processInterrogationMessage } from '@/lib/interrogation/conductor';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await req.json();
    const query = body?.query || '';
    const userId = body?.userId || 'detective_user';

    if (!query.trim()) {
      return NextResponse.json(
        { success: false, error: 'Query cannot be empty.', code: 'INVALID_QUERY' },
        { status: 400 }
      );
    }

    const result = await processInterrogationMessage(caseId, query, { userId });

    return NextResponse.json({
      success: true,
      caseId,
      session: result.session,
      response: result.response,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Interrogation processing failed.', code: 'INTERROGATION_ERROR' },
      { status: 500 }
    );
  }
}
