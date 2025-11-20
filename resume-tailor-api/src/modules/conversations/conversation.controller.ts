import type { Request, Response } from 'express';
import type { ApiResponse } from '../../types/http.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  getConversationSession,
  startConversation,
  submitConversationAnswer
} from './conversation.service.js';
import type { ConversationAnswerRequest, ConversationStartRequest } from './conversation.types.js';

type ConversationAnswerBody = Omit<ConversationAnswerRequest, 'sessionId' | 'userId'>;

export const handleStartConversation = async (
  req: Request<unknown, unknown, ConversationStartRequest>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const payload: ConversationStartRequest = {
    ...req.body,
    userId: req.user.id
  };
  const result = await startConversation(payload);
  res.status(201).json({ data: result });
};

export const handleSubmitAnswer = async (
  req: Request<{ sessionId: string }, unknown, ConversationAnswerBody>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const result = await submitConversationAnswer({
    ...req.body,
    sessionId: req.params.sessionId,
    userId: req.user.id
  });
  res.json({ data: result });
};

export const handleGetConversation = async (
  req: Request<{ sessionId: string }>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const session = await getConversationSession(req.params.sessionId);
  if (!session) {
    throw new HttpError(404, 'Conversation session not found');
  }

  if (session.userId !== req.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  res.json({ data: session });
};
