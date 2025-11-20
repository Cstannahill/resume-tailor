import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validateRequest.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  handleGetResume,
  handleListResumes,
  handleResumeExtraction,
  handleGenerateResumeSection,
  handleImproveResumeSection,
  handleUpdateResumeSection
} from '../modules/resumes/resume.controller.js';

const resumeExtractionSchema = z.object({
  resumeText: z.string().min(50, 'Resume text must include enough detail.'),
  sourceName: z.string().optional(),
  llmProvider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).optional()
});

const sectionContextSchema = z.object({
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  experienceIndex: z.number().int().nonnegative().optional(),
  achievements: z.array(z.string()).optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  notes: z.string().optional()
});

const resumeSectionGenerateSchema = z.object({
  context: sectionContextSchema,
  llmProvider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).optional(),
  tone: z.string().optional()
});

const resumeSectionImproveSchema = z.object({
  context: sectionContextSchema,
  currentContent: z.union([z.string(), z.array(z.any()), z.record(z.any())]),
  instructions: z.string().optional(),
  llmProvider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).optional()
});

const resumeSectionUpdateSchema = z.object({
  content: z.union([z.string(), z.array(z.any()), z.record(z.any())])
});

export const resumeRouter = Router();

resumeRouter.use(authenticate);
resumeRouter.post('/ingest', validateBody(resumeExtractionSchema), asyncHandler(handleResumeExtraction));
resumeRouter.get('/', asyncHandler(handleListResumes));
resumeRouter.get('/:resumeId', asyncHandler(handleGetResume));
resumeRouter.post(
  '/:resumeId/sections/:section/generate',
  validateBody(resumeSectionGenerateSchema),
  asyncHandler(handleGenerateResumeSection)
);
resumeRouter.post(
  '/:resumeId/sections/:section/improve',
  validateBody(resumeSectionImproveSchema),
  asyncHandler(handleImproveResumeSection)
);
resumeRouter.patch(
  '/:resumeId/sections/:section',
  validateBody(resumeSectionUpdateSchema),
  asyncHandler(handleUpdateResumeSection)
);

export const registerResumeRoutes = (app: Router) => {
  app.use('/resumes', resumeRouter);
};
