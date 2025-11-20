export const LLM_PROVIDERS = ["ollama", "bedrock", "google", "openrouter"] as const;

export type LLMProvider = (typeof LLM_PROVIDERS)[number];

export interface LLMProviderOption {
  value: LLMProvider;
  label: string;
  description: string;
}

export interface LlmModelMetadata {
  provider: LLMProvider;
  name: string;
  displayName?: string;
  description?: string;
  contextWindow?: number;
  tags?: string[];
  pricing?: string;
  availability?: "public" | "beta" | "private";
  free?: boolean;
}
