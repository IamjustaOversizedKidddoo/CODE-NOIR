import prisma from '../db';
import { assembleEvidencePacket } from './retrieval/evidence-packet';
import { buildGroundingMessages } from './prompts/grounding-prompts';
import { getLLMProvider } from './providers/provider-factory';
import { validateAIResponse } from './schemas/response-schema';
import { validateClaimsAgainstDatabase } from './validation/claim-validator';
import { GroundedAIResponse, EvidencePacket } from './types';

export interface InterrogationResult {
  conversationId: string;
  packet: EvidencePacket;
  response: GroundedAIResponse;
}

export type InterrogationProgressCallback = (step: string, data?: any) => void;

export async function runInterrogationPipeline(
  caseId: string,
  userQuestion: string,
  options?: {
    conversationId?: string;
    recentHistory?: { role: string; content: string }[];
    onProgress?: InterrogationProgressCallback;
  }
): Promise<InterrogationResult> {
  const notify = options?.onProgress || (() => {});

  // 1. Progress: INVESTIGATION_STARTED
  notify('INVESTIGATION_STARTED', { caseId, question: userQuestion });

  // 2. Progress: RETRIEVING_EVIDENCE
  notify('RETRIEVING_EVIDENCE', { step: 'Resolving entities and querying project brain...' });
  const packet = await assembleEvidencePacket(caseId, userQuestion);

  // 3. Progress: READING_SOURCE
  notify('READING_SOURCE', {
    chunksCount: packet.sourceChunks.length,
    entities: packet.resolvedEntities.map((e) => e.name),
  });

  // 4. Build isolated grounding prompts with history
  const messages = buildGroundingMessages(packet, options?.recentHistory);

  // 5. Progress: THINKING
  notify('THINKING', { provider: getLLMProvider().name });

  const provider = getLLMProvider();
  let rawStructuredResponse: GroundedAIResponse;

  try {
    rawStructuredResponse = await provider.generateStructured<GroundedAIResponse>(
      messages,
      validateAIResponse,
      { temperature: 0.2, maxTokens: 4096 }
    );
  } catch (llmErr: any) {
    console.warn(`[AI Engine Retry] LLM generation failed: ${llmErr.message}. Retrying once...`);
    // Safe retry once
    rawStructuredResponse = await provider.generateStructured<GroundedAIResponse>(
      messages,
      validateAIResponse,
      { temperature: 0.1, maxTokens: 4096 }
    );
  }

  // 6. Progress: ANSWERING & Claim Validation
  notify('ANSWERING', { step: 'Validating claims against project database...' });
  const finalResponse = await validateClaimsAgainstDatabase(caseId, rawStructuredResponse);

  // 7. Persist to Database (Conversation & Messages)
  let conversationId = options?.conversationId;
  if (!conversationId) {
    const convo = await prisma.conversation.create({
      data: {
        projectId: caseId,
        title: userQuestion.slice(0, 50),
      },
    });
    conversationId = convo.id;
  }

  // Record user message
  await prisma.message.create({
    data: {
      conversationId,
      role: 'user',
      content: userQuestion,
    },
  });

  // Record assistant message
  await prisma.message.create({
    data: {
      conversationId,
      role: 'assistant',
      content: JSON.stringify(finalResponse),
      evidenceJson: JSON.stringify(packet.resolvedEntities),
    },
  });

  // 8. Progress: COMPLETED
  notify('COMPLETED', { confidence: finalResponse.confidence });

  return {
    conversationId,
    packet,
    response: finalResponse,
  };
}
