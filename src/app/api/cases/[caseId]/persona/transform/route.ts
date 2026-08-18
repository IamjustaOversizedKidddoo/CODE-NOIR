import { NextRequest, NextResponse } from 'next/server';
import { transformFactualResponse } from '@/lib/persona/engine';
import { PersonaContext } from '@/lib/persona/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await req.json();

    const personaContext: PersonaContext = {
      fact: body.fact || '',
      confidence: body.confidence || 'CONFIRMED',
      evidence: body.evidence,
      sourceEntity: body.sourceEntity,
      targetEntity: body.targetEntity,
      relationship: body.relationship,
      lineCount: body.lineCount,
      complexityScore: body.complexityScore,
      hasCycle: body.hasCycle,
      sarcasmLevel: body.sarcasmLevel ?? 2,
    };

    const transformed = transformFactualResponse(personaContext);

    return NextResponse.json({
      success: true,
      caseId,
      result: transformed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Persona transformation failed.', code: 'PERSONA_ERROR' },
      { status: 500 }
    );
  }
}
