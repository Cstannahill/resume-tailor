import { encryptSecret } from '../../utils/encryption.js';
import { getUserSettings, upsertUserSettings } from '../../repositories/users/userSettings.repository.js';
import { deleteProviderKey, listProviderKeys, upsertProviderKey } from '../../repositories/users/userProviderKey.repository.js';
import type { ProviderKeyRequest, UpdateSettingsRequest } from './settings.types.js';

export const fetchUserSettings = async (userId: string) => {
  const settings = await getUserSettings(userId);
  return settings ?? { userId, defaultLlmProvider: null, notificationPrefs: null };
};

export const updateUserSettings = async (userId: string, input: UpdateSettingsRequest) => {
  return upsertUserSettings(userId, {
    defaultLlmProvider: input.defaultLlmProvider ?? null,
    notificationPrefs: input.notificationPrefs ?? null
  });
};

export const listUserProviderKeys = async (userId: string) => {
  const records = await listProviderKeys(userId);
  return records.map((record) => ({
    id: record.id,
    provider: record.provider,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    configured: true
  }));
};

export const setUserProviderKey = async (userId: string, input: ProviderKeyRequest) => {
  const encryptedKey = encryptSecret(input.apiKey);
  await upsertProviderKey(userId, {
    provider: input.provider,
    encryptedKey,
    metadata: input.metadata ?? null
  });
  return { provider: input.provider, configured: true };
};

export const removeUserProviderKey = async (userId: string, provider: string) => {
  await deleteProviderKey(userId, provider);
};
