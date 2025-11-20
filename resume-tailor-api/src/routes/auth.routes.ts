import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validateRequest.js';
import { handleGetCurrentUser, handleLogin, handleRegister, handleUpdateCurrentUser } from '../modules/auth/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const updateProfileSchema = z.object({
  displayName: z.string().optional()
});

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), asyncHandler(handleRegister));
authRouter.post('/login', validateBody(loginSchema), asyncHandler(handleLogin));
authRouter.get('/me', authenticate, asyncHandler(handleGetCurrentUser));
authRouter.put('/me', authenticate, validateBody(updateProfileSchema), asyncHandler(handleUpdateCurrentUser));

export const registerAuthRoutes = (app: Router) => {
  app.use('/auth', authRouter);
};
