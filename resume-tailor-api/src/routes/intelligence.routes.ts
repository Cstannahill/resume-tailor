import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authenticate.js';
import { handleAnalyzeJobDescription } from '../modules/intelligence/jobIntelligence.controller.js';

const jobDescriptionSchema = z.object({
  jobDescription: z.string().min(50),
  llmProvider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).optional()
});

export const intelligenceRouter = Router();

intelligenceRouter.use(authenticate);
intelligenceRouter.post(
  '/job',
  validateBody(jobDescriptionSchema),
  asyncHandler(handleAnalyzeJobDescription)
);

export const registerIntelligenceRoutes = (app: Router) => {
  app.use('/intelligence', intelligenceRouter);
};
