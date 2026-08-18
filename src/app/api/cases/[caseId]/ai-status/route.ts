import { NextRequest, NextResponse } from 'next/server';
import { getAIConfig } from '@/lib/ai/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const config = getAIConfig();

    const groqConfigured = Boolean(process.env.GROQ_API_KEY);
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
    const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);

    return NextResponse.json({
      success: true,
      caseId,
      activeProvider: config.provider,
      fallbackProvider: config.fallbackProvider || null,
      providers: {
        groq: {
          configured: groqConfigured,
          status: groqConfigured ? 'READY' : 'NOT_CONFIGURED',
          model: config.groqModel || 'llama-3.1-8b-instant',
        },
        gemini: {
          configured: geminiConfigured,
          status: geminiConfigured ? 'READY' : 'NOT_CONFIGURED',
          model: config.geminiModel || 'gemini-1.5-flash',
        },
        openai: {
          configured: openaiConfigured,
          status: openaiConfigured ? 'READY' : 'NOT_CONFIGURED',
          model: config.model || 'gpt-4o-mini',
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve AI channel status',
      },
      { status: 500 }
    );
  }
}
