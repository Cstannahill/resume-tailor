import type { Request, Response } from 'express';
import type { ApiResponse } from '../../types/http.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  fetchUserSettings,
  listUserProviderKeys,
  removeUserProviderKey,
  setUserProviderKey,
  updateUserSettings
} from './settings.service.js';
import type { ProviderKeyRequest, UpdateSettingsRequest } from './settings.types.js';

export const handleGetSettings = async (req: Request, res: Response<ApiResponse<unknown>>) => {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const settings = await fetchUserSettings(req.user.id);
  res.json({ data: settings });
};

export const handleUpdateSettings = async (
  req: Request<unknown, unknown, UpdateSettingsRequest>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const settings = await updateUserSettings(req.user.id, req.body);
  res.json({ data: settings });
};

export const handleListProviderKeys = async (req: Request, res: Response<ApiResponse<unknown>>) => {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const keys = await listUserProviderKeys(req.user.id);
  res.json({ data: keys });
};

export const handleUpsertProviderKey = async (
  req: Request<unknown, unknown, ProviderKeyRequest>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const result = await setUserProviderKey(req.user.id, req.body);
  res.status(201).json({ data: result });
};

export const handleDeleteProviderKey = async (req: Request<{ provider: string }>, res: Response<ApiResponse<unknown>>) => {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  await removeUserProviderKey(req.user.id, req.params.provider);
  res.status(204).send();
};
