import { NextRequest, NextResponse } from 'next/server';
import { runInterrogationPipeline } from '@/lib/ai/pipeline';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await req.json();
    const { question, conversationId } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'A valid interrogation question is required.', code: 'INVALID_QUESTION' },
        { status: 400 }
      );
    }

    const result = await runInterrogationPipeline(caseId, question.trim(), {
      conversationId,
    });

    return NextResponse.json({
      success: true,
      caseId,
      conversationId: result.conversationId,
      response: result.response,
      evidencePacket: {
        questionType: result.packet.questionType,
        resolvedEntities: result.packet.resolvedEntities,
        evidenceConfidence: result.packet.evidenceConfidence,
        sourceChunksCount: result.packet.sourceChunks.length,
      },
    });
  } catch (error: any) {
    console.error('[API /api/cases/[caseId]/interrogate Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Interrogation failed.', code: 'INTERROGATION_ERROR' },
      { status: 500 }
    );
  }
}
