import type { Request, Response } from 'express';
import type { ApiResponse } from '../../types/http.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { authenticateUser, getCurrentUserProfile, registerUser, updateCurrentUser } from './auth.service.js';
import type { AuthenticatedUser, LoginRequest, RegisterRequest } from './auth.types.js';

export const handleRegister = async (
  req: Request<unknown, unknown, RegisterRequest>,
  res: Response<ApiResponse<unknown>>
) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json({ data: result });
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : 'Unable to register');
  }
};

export const handleLogin = async (req: Request<unknown, unknown, LoginRequest>, res: Response<ApiResponse<unknown>>) => {
  try {
    const result = await authenticateUser(req.body);
    res.json({ data: result });
  } catch (error) {
    throw new HttpError(401, 'Invalid credentials');
  }
};

export const handleGetCurrentUser = async (req: Request, res: Response<ApiResponse<AuthenticatedUser>>) => {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const profile = await getCurrentUserProfile(req.user.id);
  res.json({ data: profile });
};

export const handleUpdateCurrentUser = async (req: Request<unknown, unknown, { displayName?: string }>, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  const updated = await updateCurrentUser(req.user.id, req.body.displayName);
  res.json({ data: updated });
};
