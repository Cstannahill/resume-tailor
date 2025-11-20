import fetch from 'node-fetch';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import { env } from '../../config/env.js';
import type { LLMProvider } from '../../adapters/llm/llm.types.js';
import { getOllamaTags } from '../../adapters/llm/ollama.tags.js';
import { buildBedrockConfig } from '../../adapters/llm/bedrock.config.js';

export interface ProviderModel {
  name: string;
  description?: string;
  tags?: string[];
  contextWindow?: number;
  pricing?: Record<string, unknown>;
  isFree?: boolean;
}

export interface ProviderModelCatalog {
  provider: LLMProvider;
  models: ProviderModel[];
  cachedUntil: number;
  status?: 'ok' | 'error' | 'disabled';
  message?: string;
}

const CACHE_TTL_MS = 1000 * 60 * 10;
const providerCache: Partial<Record<LLMProvider, ProviderModelCatalog>> = {};

const fetchOllamaModels = async (): Promise<ProviderModelCatalog> => {
  const tags = await getOllamaTags();
  return {
    provider: 'ollama',
    models: tags.models.map((model) => {
      const entry: ProviderModel = { name: model.name };
      entry.description = 'Available Ollama Cloud model';
      entry.isFree = false;
      return entry;
    }),
    cachedUntil: Date.now() + CACHE_TTL_MS
  };
};

const fetchOpenRouterModels = async (): Promise<ProviderModelCatalog> => {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is required to list OpenRouter models.');
  }

  const response = await fetch(`${env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'}/models`, {
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch OpenRouter models: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { data: Array<Record<string, unknown>> };

  return {
    provider: 'openrouter',
    models: payload.data.map((model) => {
      const entry: ProviderModel = {
        name: String(model.id ?? model['name'])
      };

      if (typeof model['description'] === 'string' && model['description']) {
        entry.description = model['description'];
      }

      if (Array.isArray(model['tags']) && model['tags'].length) {
        entry.tags = model['tags'] as string[];
      }

      if (typeof model['context_length'] === 'number') {
        entry.contextWindow = model['context_length'] as number;
      }

      if (model['pricing'] && typeof model['pricing'] === 'object') {
        const pricing = model['pricing'] as Record<string, unknown>;
        entry.pricing = pricing;
        const promptPricing = pricing['prompt'];
        if (typeof promptPricing === 'string') {
          entry.isFree = promptPricing === '0';
        }
      }

      return entry;
    }),
    cachedUntil: Date.now() + CACHE_TTL_MS
  };
};

const fetchBedrockModels = async (): Promise<ProviderModelCatalog> => {
  const client = new BedrockClient(buildBedrockConfig());
  const response = await client.send(new ListFoundationModelsCommand({}));
  const models = response.modelSummaries ?? [];

  return {
    provider: 'bedrock',
    models: models.map((model) => {
      const entry: ProviderModel = {
        name: model.modelId ?? model.modelName ?? 'unknown'
      };

      if (model.modelName) {
        entry.description = model.modelName;
      }

      if (model.modelArn) {
        entry.tags = [model.modelArn];
      }

      return entry;
    }),
    cachedUntil: Date.now() + CACHE_TTL_MS
  };
};

const fetchGoogleModels = async (): Promise<ProviderModelCatalog> => {
  if (!env.GOOGLE_GENAI_API_KEY) {
    throw new Error('Google model listing currently requires OAuth; API key listing is disabled.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GOOGLE_GENAI_API_KEY}`
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Google GenAI models: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { models?: Array<Record<string, unknown>> };

  return {
    provider: 'google',
    models:
      payload.models?.map((model) => {
        const record = model as Record<string, unknown>;
        const entry: ProviderModel = {
          name: String(record.name ?? record['name'])
        };

        const description =
          (record['displayName'] as string | undefined) ?? (record['description'] as string | undefined);
        if (description) {
          entry.description = description;
        }

        const generationMethods = record['supportedGenerationMethods'];
        if (Array.isArray(generationMethods) && generationMethods.length) {
          entry.tags = generationMethods.filter((method): method is string => typeof method === 'string');
        }

        const inputTokenLimit = record['inputTokenLimit'];
        if (typeof inputTokenLimit === 'number') {
          entry.contextWindow = inputTokenLimit;
        }

        return entry;
      }) ?? [],
    cachedUntil: Date.now() + CACHE_TTL_MS
  };
};

const providerFetchers: Record<LLMProvider, () => Promise<ProviderModelCatalog>> = {
  ollama: fetchOllamaModels,
  openrouter: fetchOpenRouterModels,
  bedrock: fetchBedrockModels,
  google: fetchGoogleModels
};

const providerErrorCatalog = (provider: LLMProvider, error: unknown): ProviderModelCatalog => ({
  provider,
  models: [],
  cachedUntil: Date.now() + CACHE_TTL_MS,
  status: 'error',
  message: error instanceof Error ? error.message : String(error)
});

export const listProviderModels = async (provider: LLMProvider, forceRefresh = false): Promise<ProviderModelCatalog> => {
  const cached = providerCache[provider];
  if (!forceRefresh && cached && cached.cachedUntil > Date.now()) {
    return cached;
  }

  try {
    const result = await providerFetchers[provider]();
    providerCache[provider] = result;
    return result;
  } catch (error) {
    const fallback = providerErrorCatalog(provider, error);
    providerCache[provider] = fallback;
    return fallback;
  }
};

export const listAllProviderModels = async (): Promise<ProviderModelCatalog[]> => {
  const providers: LLMProvider[] = ['ollama', 'openrouter', 'bedrock', 'google'];
  const catalogs = await Promise.all(providers.map((provider) => listProviderModels(provider)));
  return catalogs;
};
