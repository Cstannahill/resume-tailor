import { GoogleGenerativeAI, type Content, type GenerateContentRequest } from '@google/generative-ai';
import { env } from '../../config/env.js';
import type { LLMAdapter, LLMGenerationParams, LLMResponse } from './llm.types.js';

const GOOGLE_DEFAULT_MODEL = 'gemini-2.5-flash';

const getClient = () => {
  if (!env.GOOGLE_GENAI_API_KEY) {
    throw new Error('Missing GOOGLE_GENAI_API_KEY');
  }

  return new GoogleGenerativeAI(env.GOOGLE_GENAI_API_KEY);
};

export class GoogleGenAiAdapter implements LLMAdapter {
  public readonly provider = 'google' as const;

  async generate(params: LLMGenerationParams): Promise<LLMResponse> {
    const client = getClient();
    const model = client.getGenerativeModel({
      model: params.model ?? GOOGLE_DEFAULT_MODEL
    });

    const systemInstruction = params.messages.find((message) => message.role === 'system');
    const contents = params.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      })) as Content[];

    const request: GenerateContentRequest = {
      contents,
      generationConfig: {
        temperature: params.temperature ?? 0.5,
        maxOutputTokens: params.maxOutputTokens ?? 512
      }
    };

    if (systemInstruction) {
      request.systemInstruction = {
        parts: [{ text: systemInstruction.content }]
      } as Content;
    }

    const result = await model.generateContent(request);

    const content = result.response.text() ?? '';

    return {
      content,
      raw: result.response
    };
  }
}
