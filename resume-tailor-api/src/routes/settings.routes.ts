import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  handleDeleteProviderKey,
  handleGetSettings,
  handleListProviderKeys,
  handleUpdateSettings,
  handleUpsertProviderKey
} from '../modules/settings/settings.controller.js';

const updateSettingsSchema = z.object({
  defaultLlmProvider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).optional(),
  notificationPrefs: z.record(z.any()).optional()
});

const providerKeySchema = z.object({
  provider: z.enum(['ollama', 'bedrock', 'google', 'openrouter']),
  apiKey: z.string().min(8),
  metadata: z.record(z.any()).optional()
});

export const settingsRouter = Router();

settingsRouter.use(authenticate);
settingsRouter.get('/', asyncHandler(handleGetSettings));
settingsRouter.put('/', validateBody(updateSettingsSchema), asyncHandler(handleUpdateSettings));
settingsRouter.get('/provider-keys', asyncHandler(handleListProviderKeys));
settingsRouter.put('/provider-keys', validateBody(providerKeySchema), asyncHandler(handleUpsertProviderKey));
settingsRouter.delete('/provider-keys/:provider', asyncHandler(handleDeleteProviderKey));

export const registerSettingsRoutes = (app: Router) => {
  app.use('/settings', settingsRouter);
};
