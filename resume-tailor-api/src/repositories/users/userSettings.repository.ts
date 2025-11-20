import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client.js';

export interface UserSettingsInput {
  defaultLlmProvider?: string | null;
  notificationPrefs?: Record<string, unknown> | null;
}

export const getUserSettings = (userId: string) => {
  return prisma.userSetting.findUnique({
    where: { userId }
  });
};

export const upsertUserSettings = (userId: string, data: UserSettingsInput) => {
  const prefs = data.notificationPrefs ? (data.notificationPrefs as Prisma.InputJsonValue) : Prisma.JsonNull;
  return prisma.userSetting.upsert({
    where: { userId },
    create: {
      userId,
      defaultLlmProvider: data.defaultLlmProvider ?? null,
      notificationPrefs: prefs
    },
    update: {
      defaultLlmProvider: data.defaultLlmProvider ?? null,
      notificationPrefs: prefs
    }
  });
};
