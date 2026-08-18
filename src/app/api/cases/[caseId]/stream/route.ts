import { NextRequest } from 'next/server';
import { projectEventBus } from '@/lib/events/project-events';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await context.params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial heartbeat
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', caseId })}\n\n`)
      );

      const eventHandler = (eventData: any) => {
        try {
          const payload = `data: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might be closed
        }
      };

      const eventKey = `project:${caseId}`;
      projectEventBus.on(eventKey, eventHandler);

      req.signal.addEventListener('abort', () => {
        projectEventBus.off(eventKey, eventHandler);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
