import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { getUserById } from '../repositories/users/user.repository.js';

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) {
    return next();
  }

  try {
    const token = header.replace(/^Bearer\s+/i, '');
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
  } catch {
    // ignore invalid tokens for optional auth
  }

  next();
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) {
    res.status(401).json({ error: { message: 'Unauthorized' } });
    return;
  }

  try {
    const token = header.replace(/^Bearer\s+/i, '');
    const payload = verifyToken(token);
    const user = await getUserById(payload.sub);
    if (!user) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }
    req.user = { id: user.id, email: user.email, displayName: user.displayName };
    next();
  } catch {
    res.status(401).json({ error: { message: 'Unauthorized' } });
  }
};
