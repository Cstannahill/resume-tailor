import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client.js';

export interface ProviderKeyInput {
  provider: string;
  encryptedKey: string;
  metadata?: Record<string, unknown> | null;
}

export const listProviderKeys = (userId: string) => {
  return prisma.userProviderKey.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      createdAt: true,
      updatedAt: true,
      metadata: true
    }
  });
};

export const upsertProviderKey = (userId: string, data: ProviderKeyInput) => {
  const metadata = data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull;
  return prisma.userProviderKey.upsert({
    where: {
      userId_provider: {
        userId,
        provider: data.provider
      }
    },
    create: {
      userId,
      provider: data.provider,
      encryptedKey: data.encryptedKey,
      metadata
    },
    update: {
      encryptedKey: data.encryptedKey,
      metadata
    }
  });
};

export const deleteProviderKey = (userId: string, provider: string) => {
  return prisma.userProviderKey.delete({
    where: {
      userId_provider: {
        userId,
        provider
      }
    }
  });
};

export const getProviderKey = (userId: string, provider: string) => {
  return prisma.userProviderKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider
      }
    }
  });
};
