import { apiRequest } from "@/lib/api-client";
import type {
  ProviderKeyPayload,
  ProviderKeyRecord,
  UserSettings,
} from "@/types";

export const getUserSettings = () =>
  apiRequest<UserSettings>({
    path: "/settings",
    method: "GET",
  });

export const updateUserSettings = (payload: Partial<UserSettings>) =>
  apiRequest<UserSettings>({
    path: "/settings",
    method: "PUT",
    data: payload,
  });

export const listProviderKeys = () =>
  apiRequest<ProviderKeyRecord[]>({
    path: "/settings/provider-keys",
    method: "GET",
  });

export const upsertProviderKey = (payload: ProviderKeyPayload) =>
  apiRequest<ProviderKeyRecord>({
    path: "/settings/provider-keys",
    method: "PUT",
    data: payload,
  });

export const deleteProviderKey = (provider: string) =>
  apiRequest<void>({
    path: `/settings/provider-keys/${provider}`,
    method: "DELETE",
  });
