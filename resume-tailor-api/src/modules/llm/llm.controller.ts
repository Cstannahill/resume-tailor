import type { Request, Response } from 'express';
import type { ApiResponse } from '../../types/http.js';
import { getOllamaTags } from '../../adapters/llm/ollama.tags.js';
import type { LLMProvider } from '../../adapters/llm/llm.types.js';
import { listAllProviderModels, listProviderModels } from './llm.service.js';
import { HttpError } from '../../middleware/errorHandler.js';

export const handleListOllamaTags = async (_req: Request, res: Response<ApiResponse<unknown>>) => {
  const tags = await getOllamaTags();
  res.json({ data: tags });
};

export const handleListAllModels = async (_req: Request, res: Response<ApiResponse<unknown>>) => {
  const catalog = await listAllProviderModels();
  res.json({ data: catalog });
};

export const handleListProviderModels = async (req: Request<{ provider: string }>, res: Response<ApiResponse<unknown>>) => {
  const provider = req.params.provider as LLMProvider;
  if (!['ollama', 'bedrock', 'google', 'openrouter'].includes(provider)) {
    throw new HttpError(400, `Unsupported provider ${req.params.provider}`);
  }
  const catalog = await listProviderModels(provider);
  res.json({ data: catalog });
};
