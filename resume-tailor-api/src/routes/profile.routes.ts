import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authenticate.js';
import { handleGenerateDeveloperProfile } from '../modules/profile/profile.controller.js';

const developerProfileSchema = z.object({
  llmProvider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).optional()
});

export const profileRouter = Router();

profileRouter.use(authenticate);
profileRouter.post('/developer-report', validateBody(developerProfileSchema), asyncHandler(handleGenerateDeveloperProfile));

export const registerProfileRoutes = (app: Router) => {
  app.use('/profiles', profileRouter);
};
