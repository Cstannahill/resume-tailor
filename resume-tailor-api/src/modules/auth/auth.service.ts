import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserDisplayName
} from '../../repositories/users/user.repository.js';
import type { AuthenticatedUser, LoginRequest, RegisterRequest } from './auth.types.js';

const buildAuthResponse = (user: AuthenticatedUser) => ({
  token: signToken({ sub: user.id, email: user.email }),
  user
});

const toAuthenticatedUser = (record: { id: string; email: string; displayName: string | null }): AuthenticatedUser => ({
  id: record.id,
  email: record.email,
  displayName: record.displayName
});

export const registerUser = async (input: RegisterRequest) => {
  const existing = await getUserByEmail(input.email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser(
    {
      email: input.email,
      displayName: input.displayName ?? null
    },
    passwordHash
  );

  return buildAuthResponse(toAuthenticatedUser(user));
};

export const authenticateUser = async (input: LoginRequest) => {
  const record = await getUserByEmail(input.email);
  if (!record || !record.credential) {
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(input.password, record.credential.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  return buildAuthResponse(toAuthenticatedUser(record));
};

export const getCurrentUserProfile = async (userId: string) => {
  const record = await getUserById(userId);
  if (!record) {
    throw new Error('User not found');
  }

  return toAuthenticatedUser(record);
};

export const updateCurrentUser = async (userId: string, displayName?: string | null) => {
  const updated = await updateUserDisplayName(userId, displayName);
  return toAuthenticatedUser(updated);
};
