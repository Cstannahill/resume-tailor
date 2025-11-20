import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  handleGetConversation,
  handleStartConversation,
  handleSubmitAnswer
} from '../modules/conversations/conversation.controller.js';

const startConversationSchema = z.object({
  personaTopic: z.string().min(1),
  focusAreas: z.array(z.string()).optional(),
  llmProvider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).optional()
});

const submitAnswerSchema = z.object({
  userAnswer: z.string().min(1),
  thoughtProcess: z.string().optional(),
  llmProvider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).optional()
});

export const conversationRouter = Router();

conversationRouter.use(authenticate);
conversationRouter.post('/session', validateBody(startConversationSchema), asyncHandler(handleStartConversation));
conversationRouter.post(
  '/session/:sessionId/respond',
  validateBody(submitAnswerSchema),
  asyncHandler(handleSubmitAnswer)
);
conversationRouter.get('/session/:sessionId', asyncHandler(handleGetConversation));

export const registerConversationRoutes = (app: Router) => {
  app.use('/conversations', conversationRouter);
};
