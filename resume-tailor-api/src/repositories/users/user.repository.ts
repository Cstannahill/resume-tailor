import { prisma } from '../../db/client.js';
import type { CreateUserInput, UserCredentialRecord, UserRecord } from './user.repository.types.js';

export const createUser = async (input: CreateUserInput, passwordHash: string): Promise<UserRecord> => {
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      displayName: input.displayName ?? null,
      credential: {
        create: {
          passwordHash
        }
      }
    }
  });
};

export const getUserByEmail = (email: string): Promise<(UserRecord & { credential: UserCredentialRecord | null }) | null> => {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { credential: true }
  });
};

export const getUserById = (id: string): Promise<UserRecord | null> => {
  return prisma.user.findUnique({
    where: { id }
  });
};

export const updateUserDisplayName = (id: string, displayName?: string | null): Promise<UserRecord> => {
  return prisma.user.update({
    where: { id },
    data: { displayName: displayName ?? null }
  });
};
