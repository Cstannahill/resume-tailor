import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayload {
  sub: string;
  email: string;
}

const { AUTH_JWT_SECRET } = env;

if (!AUTH_JWT_SECRET) {
  throw new Error('AUTH_JWT_SECRET must be defined');
}

export const signToken = (payload: JwtPayload, expiresIn: SignOptions['expiresIn'] = '1d'): string => {
  return jwt.sign(payload, AUTH_JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, AUTH_JWT_SECRET) as JwtPayload;
};
