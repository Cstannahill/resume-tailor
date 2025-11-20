import fetch from "node-fetch";
import { env } from "../../config/env.js";
import type {
  LLMAdapter,
  LLMGenerationParams,
  LLMResponse,
} from "./llm.types.js";

const OLLAMA_DEFAULT_MODEL = "minimax-m2:cloud";

export class OllamaAdapter implements LLMAdapter {
  public readonly provider = "ollama" as const;

  async generate(params: LLMGenerationParams): Promise<LLMResponse> {
    if (!env.OLLAMA_API_KEY) {
      throw new Error("OLLAMA_API_KEY is required for Ollama Cloud requests.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OLLAMA_API_KEY}`,
    };

    const response = await fetch(`${env.OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: params.model ?? OLLAMA_DEFAULT_MODEL,
        messages: params.messages,
        temperature: params.temperature ?? 0.3,
        stream: params.stream ?? false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama request failed: ${response.status} ${text}`);
    }

    const payload = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: LLMResponse["usage"];
    };

    const content = payload.choices.at(0)?.message.content ?? "";

    const usage = payload.usage;

    return {
      content,
      ...(usage ? { usage } : {}),
      raw: payload,
    };
  }
}
