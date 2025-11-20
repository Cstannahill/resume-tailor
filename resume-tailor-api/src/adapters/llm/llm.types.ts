export type LLMProvider = 'ollama' | 'bedrock' | 'google' | 'openrouter';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGenerationParams {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  stream?: boolean;
}

export interface LLMUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage?: LLMUsage;
  raw?: unknown;
}

export interface LLMAdapter {
  readonly provider: LLMProvider;
  generate(params: LLMGenerationParams): Promise<LLMResponse>;
}
