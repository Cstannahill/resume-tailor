import fetch from 'node-fetch';
import { env } from '../../config/env.js';
import type { LLMAdapter, LLMGenerationParams, LLMResponse } from './llm.types.js';

const OPENROUTER_DEFAULT_MODEL = 'qwen/qwen3-coder:free';

export class OpenRouterAdapter implements LLMAdapter {
  public readonly provider = 'openrouter' as const;

  async generate(params: LLMGenerationParams): Promise<LLMResponse> {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error('Missing OPENROUTER_API_KEY');
    }

    const response = await fetch(`${env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://experience-api.local',
        'X-Title': 'Experience API'
      },
      body: JSON.stringify({
        model: params.model ?? OPENROUTER_DEFAULT_MODEL,
        messages: params.messages,
        temperature: params.temperature ?? 0.5,
        max_tokens: params.maxOutputTokens ?? 512
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter request failed: ${response.status} ${text}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: LLMResponse['usage'];
    };

    const content = payload.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.length) {
      throw new Error(`OpenRouter returned empty response body: ${JSON.stringify(payload)}`);
    }

    const usage = payload.usage;

    return {
      content,
      ...(usage ? { usage } : {}),
      raw: payload
    };
  }
}
