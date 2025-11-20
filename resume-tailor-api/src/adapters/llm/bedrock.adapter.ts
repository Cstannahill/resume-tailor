import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConversationRole,
  type Message,
  type SystemContentBlock
} from '@aws-sdk/client-bedrock-runtime';
import type { LLMAdapter, LLMGenerationParams, LLMMessage, LLMResponse } from './llm.types.js';
import { buildBedrockConfig } from './bedrock.config.js';

const BEDROCK_DEFAULT_MODEL = 'anthropic.claude-3-sonnet-20240229-v1:0';

const bedrockClient = new BedrockRuntimeClient(buildBedrockConfig());

const normalizeMessages = (messages: LLMMessage[]) => {
  const system: SystemContentBlock[] = messages
    .filter((message) => message.role === 'system')
    .map((message) => ({ text: message.content }));

  const chatMessages: Message[] = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: (message.role === 'assistant' ? 'assistant' : 'user') as ConversationRole,
      content: [{ text: message.content }]
    }));

  return { system, chatMessages };
};

export class BedrockAdapter implements LLMAdapter {
  public readonly provider = 'bedrock' as const;

  async generate(params: LLMGenerationParams): Promise<LLMResponse> {
    const { system, chatMessages } = normalizeMessages(params.messages);

    const command = new ConverseCommand({
      modelId: params.model ?? BEDROCK_DEFAULT_MODEL,
      messages: chatMessages,
      system: system.length > 0 ? system : undefined,
      inferenceConfig: {
        temperature: params.temperature ?? 0.5,
        maxTokens: params.maxOutputTokens ?? 512
      }
    });

    const response = await bedrockClient.send(command);
    const content =
      response.output?.message?.content?.map((part) => part.text).filter(Boolean).join('\n') ?? 'No response generated.';

    return {
      content,
      raw: response
    };
  }
}
