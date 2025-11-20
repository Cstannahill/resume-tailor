import { apiRequest } from "@/lib/api-client";
import type { LlmModelMetadata, LLMProvider } from "@/types";

export const listLlmModels = (provider?: LLMProvider) =>
  apiRequest<LlmModelMetadata[]>({
    path: provider ? `/llm/models/${provider}` : "/llm/models",
    method: "GET",
  });

export const listOllamaTags = () =>
  apiRequest<{ name: string; digest?: string }[]>({
    path: "/llm/ollama/tags",
    method: "GET",
  });
