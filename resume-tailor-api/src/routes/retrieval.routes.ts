import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  handleListTailoredAssets,
  handleTailorJobMaterials
} from '../modules/retrieval/retrieval.controller.js';

const tailorSchema = z.object({
  jobTitle: z.string().min(1),
  jobDescription: z.string().min(30),
  resumeId: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
  assetType: z.enum(['resume', 'cover_letter', 'summary']).optional(),
  llmProvider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).optional()
});

export const retrievalRouter = Router();

retrievalRouter.use(authenticate);
retrievalRouter.post('/tailor', validateBody(tailorSchema), asyncHandler(handleTailorJobMaterials));
retrievalRouter.get('/tailored', asyncHandler(handleListTailoredAssets));

export const registerRetrievalRoutes = (app: Router) => {
  app.use('/retrieval', retrievalRouter);
};
