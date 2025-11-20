import type { LLMProvider } from "./llm";

export interface UserSettings {
  id?: string;
  defaultProvider?: LLMProvider;
  notifications?: {
    jobMatches?: boolean;
    productUpdates?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ProviderKeyRecord {
  provider: LLMProvider;
  lastFour?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderKeyPayload {
  provider: LLMProvider;
  apiKey: string;
}
