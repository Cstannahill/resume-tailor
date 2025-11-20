import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  handleGetProject,
  handleIndexProject,
  handleListProjects
} from '../modules/projects/projectIndexing.controller.js';

const projectSourceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('local'),
    path: z.string().min(1)
  }),
  z.object({
    kind: z.literal('github'),
    repoUrl: z.string().url(),
    branch: z.string().optional(),
    shallow: z.boolean().optional()
  })
]);

const projectIndexSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  source: projectSourceSchema,
  tags: z.array(z.string()).optional(),
  llmProvider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).optional()
});

export const projectRouter = Router();

projectRouter.post('/index', authenticate, validateBody(projectIndexSchema), asyncHandler(handleIndexProject));
projectRouter.get('/', asyncHandler(handleListProjects));
projectRouter.get('/:projectId', asyncHandler(handleGetProject));

export const registerProjectRoutes = (app: Router) => {
  app.use('/projects', projectRouter);
};
