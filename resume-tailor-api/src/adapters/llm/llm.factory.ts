import { env } from '../../config/env.js';
import type { LLMAdapter, LLMProvider } from './llm.types.js';
import { BedrockAdapter } from './bedrock.adapter.js';
import { GoogleGenAiAdapter } from './google.adapter.js';
import { OllamaAdapter } from './ollama.adapter.js';
import { OpenRouterAdapter } from './openrouter.adapter.js';

const adapterSingletons: Partial<Record<LLMProvider, LLMAdapter>> = {};

const createAdapter = (provider: LLMProvider): LLMAdapter => {
  switch (provider) {
    case 'ollama':
      return new OllamaAdapter();
    case 'bedrock':
      return new BedrockAdapter();
    case 'google':
      return new GoogleGenAiAdapter();
    case 'openrouter':
      return new OpenRouterAdapter();
    default:
      throw new Error(`Unsupported LLM provider: ${provider satisfies never}`);
  }
};

export const getLLMAdapter = (provider?: LLMProvider): LLMAdapter => {
  const resolvedProvider = provider ?? env.DEFAULT_LLM_PROVIDER;

  if (!adapterSingletons[resolvedProvider]) {
    adapterSingletons[resolvedProvider] = createAdapter(resolvedProvider);
  }

  return adapterSingletons[resolvedProvider]!;
};
