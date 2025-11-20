import fetch from 'node-fetch';
import { env } from '../../config/env.js';

export interface OllamaTagResponse {
  models: Array<{
    name: string;
    modified_at?: string;
    size?: number;
    digest?: string;
  }>;
}

const CACHE_TTL_MS = 1000 * 60 * 5;

let cachedTags: { data: OllamaTagResponse; expiresAt: number } | null = null;

const requireOllamaKey = (): string => {
  if (!env.OLLAMA_API_KEY) {
    throw new Error('OLLAMA_API_KEY is required to fetch Ollama Cloud tags.');
  }

  return env.OLLAMA_API_KEY;
};

const fetchTags = async (): Promise<OllamaTagResponse> => {
  const apiKey = requireOllamaKey();
  const url = `${env.OLLAMA_BASE_URL}/api/tags`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Ollama tags: ${response.status} ${text}`);
  }

  return response.json() as Promise<OllamaTagResponse>;
};

export const getOllamaTags = async (forceRefresh = false): Promise<OllamaTagResponse> => {
  if (!forceRefresh && cachedTags && cachedTags.expiresAt > Date.now()) {
    return cachedTags.data;
  }

  const data = await fetchTags();
  cachedTags = {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  };

  return data;
};
