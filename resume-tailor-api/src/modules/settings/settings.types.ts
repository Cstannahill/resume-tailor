export interface UpdateSettingsRequest {
  defaultLlmProvider?: 'ollama' | 'bedrock' | 'google' | 'openrouter';
  notificationPrefs?: Record<string, unknown>;
}

export interface ProviderKeyRequest {
  provider: 'ollama' | 'bedrock' | 'google' | 'openrouter';
  apiKey: string;
  metadata?: Record<string, unknown>;
}
