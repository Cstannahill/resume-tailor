import type { Request, Response } from 'express';
import type { ApiResponse } from '../../types/http.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { analyzeJobDescription } from './jobIntelligence.service.js';
import type { JobDescriptionRequest } from './jobIntelligence.types.js';

export const handleAnalyzeJobDescription = async (
  req: Request<unknown, unknown, JobDescriptionRequest>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }
  const payload: JobDescriptionRequest = {
    ...req.body,
    userId: req.user.id
  };
  const result = await analyzeJobDescription(payload);
  res.json({ data: result });
};
