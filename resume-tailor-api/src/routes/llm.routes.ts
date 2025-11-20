import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { handleListOllamaTags, handleListAllModels, handleListProviderModels } from '../modules/llm/llm.controller.js';

export const llmRouter = Router();

llmRouter.get('/ollama/tags', asyncHandler(handleListOllamaTags));
llmRouter.get('/models', asyncHandler(handleListAllModels));
llmRouter.get('/models/:provider', asyncHandler(handleListProviderModels));

export const registerLlmRoutes = (app: Router) => {
  app.use('/llm', llmRouter);
};
