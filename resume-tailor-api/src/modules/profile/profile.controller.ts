import type { Request, Response } from 'express';
import type { ApiResponse } from '../../types/http.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { LLMProvider } from '../../adapters/llm/llm.types.js';
import { generateDeveloperProfile } from './profile.service.js';
import type { GenerateDeveloperProfileRequest } from './profile.service.js';

export const handleGenerateDeveloperProfile = async (
  req: Request<unknown, unknown, { llmProvider?: LLMProvider }>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const requestPayload: GenerateDeveloperProfileRequest = {
    userId: req.user.id,
    ...(req.body?.llmProvider ? { llmProvider: req.body.llmProvider } : {}),
  };
  const report = await generateDeveloperProfile(requestPayload);

  res.json({ data: report });
};
