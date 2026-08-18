import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;

    const conversations = await prisma.conversation.findMany({
      where: { projectId: caseId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      caseId,
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        messages: c.messages.map((m) => {
          let parsedContent: any = m.content;
          try {
            parsedContent = JSON.parse(m.content);
          } catch {
            // plain text
          }
          return {
            id: m.id,
            role: m.role,
            content: parsedContent,
            evidence: m.evidenceJson ? JSON.parse(m.evidenceJson) : null,
            createdAt: m.createdAt,
          };
        }),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve conversation.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
