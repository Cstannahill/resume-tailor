import { prisma } from '../../db/client.js';
import type {
  AddConversationResponseInput,
  ConversationSessionRecord,
  CreateSessionInput,
  UpdateSessionStateInput
} from './conversation.repository.types.js';

export const createConversationSession = async (input: CreateSessionInput): Promise<ConversationSessionRecord> => {
  const data = {
    userId: input.userId,
    personaTopic: input.personaTopic,
    personaSummary: input.personaSummary,
    currentQuestion: input.currentQuestion ?? null
  };

  if (input.insights !== undefined) {
    Object.assign(data, { insights: input.insights });
  }

  return prisma.conversationSession
    .create({
      data,
      include: { responses: true }
    })
    .then((session) => session as ConversationSessionRecord);
};

export const updateConversationSession = async (
  input: UpdateSessionStateInput
): Promise<ConversationSessionRecord | null> => {
  const data: Record<string, unknown> = {};

  if (input.currentQuestion !== undefined) {
    data.currentQuestion = input.currentQuestion;
  }

  if (input.insights !== undefined) {
    data.insights = input.insights;
  }

  return prisma.conversationSession
    .update({
      where: { id: input.sessionId },
      data,
      include: { responses: true }
    })
    .then((session) => session as ConversationSessionRecord);
};

export const appendConversationResponse = async (
  input: AddConversationResponseInput
): Promise<ConversationSessionRecord> => {
  return prisma.conversationSession
    .update({
      where: { id: input.sessionId },
      data: {
        responses: {
          create: {
            question: input.question,
            userAnswer: input.userAnswer,
            evaluation: input.evaluation,
            followUpPlan: input.followUpPlan ?? null
          }
        }
      },
      include: { responses: true }
    })
    .then((session) => session as ConversationSessionRecord);
};

export const getConversationSessionById = async (sessionId: string): Promise<ConversationSessionRecord | null> => {
  return prisma.conversationSession
    .findUnique({
      where: { id: sessionId },
      include: { responses: true }
    })
    .then((session) => (session ? (session as ConversationSessionRecord) : null));
};
