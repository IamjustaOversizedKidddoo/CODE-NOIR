import { z } from 'zod';
import { GroundedAIResponse } from '../types';

export const GroundedEvidenceItemSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  symbol: z.string().optional(),
  reason: z.string(),
  confidence: z.enum(['CONFIRMED', 'LIKELY', 'POSSIBLE', 'UNKNOWN']).default('CONFIRMED'),
});

export const GroundedAIResponseSchema = z.object({
  answer: z.string(),
  keyPoints: z.array(z.string()).default([]),
  evidence: z.array(GroundedEvidenceItemSchema).default([]),
  confidence: z.enum(['CONFIRMED', 'LIKELY', 'POSSIBLE', 'UNKNOWN']).default('LIKELY'),
  uncertainties: z.array(z.string()).default([]),
  relatedEntities: z.array(z.string()).default([]),
  nextQuestions: z.array(z.string()).default([]),
  claimClassification: z
    .object({
      facts: z.number().default(0),
      inferences: z.number().default(0),
      hypotheses: z.number().default(0),
      unknowns: z.number().default(0),
    })
    .default({ facts: 0, inferences: 0, hypotheses: 0, unknowns: 0 }),
});

function normalizeResponseObject(rawJson: any): any {
  if (!rawJson || typeof rawJson !== 'object') return rawJson;

  const normalized: any = { ...rawJson };

  if ('key_points' in rawJson && !('keyPoints' in rawJson)) {
    normalized.keyPoints = rawJson.key_points;
  }
  if ('next_questions' in rawJson && !('nextQuestions' in rawJson)) {
    normalized.nextQuestions = rawJson.next_questions;
  }
  if ('related_entities' in rawJson && !('relatedEntities' in rawJson)) {
    normalized.relatedEntities = rawJson.related_entities;
  }
  if ('claim_classification' in rawJson && !('claimClassification' in rawJson)) {
    normalized.claimClassification = rawJson.claim_classification;
  }
  if ('citations' in rawJson && !('evidence' in rawJson)) {
    normalized.evidence = rawJson.citations;
  }

  return normalized;
}

export function validateAIResponse(rawJson: any): GroundedAIResponse {
  const normalized = normalizeResponseObject(rawJson);
  const parsed = GroundedAIResponseSchema.parse(normalized);
  return {
    ...parsed,
    validated: true,
  };
}
