import type { ConversationResponse, ConversationSession } from '@prisma/client';

export type ConversationSessionRecord = ConversationSession & {
  responses: ConversationResponse[];
};

export interface CreateSessionInput {
  userId: string;
  personaTopic: string;
  personaSummary: string;
  currentQuestion?: string | null;
  insights?: Record<string, unknown> | null;
}

export interface UpdateSessionStateInput {
  sessionId: string;
  currentQuestion?: string | null;
  insights?: Record<string, unknown> | null;
}

export interface AddConversationResponseInput {
  sessionId: string;
  question: string;
  userAnswer: string;
  evaluation: string;
  followUpPlan?: string | null;
}
