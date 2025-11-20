import type { BedrockRuntimeClientConfig } from '@aws-sdk/client-bedrock-runtime';
import type { BedrockClientConfig } from '@aws-sdk/client-bedrock';
import { env } from '../../config/env.js';

export const buildBedrockConfig = (): BedrockRuntimeClientConfig & BedrockClientConfig => {
  const config: BedrockRuntimeClientConfig & BedrockClientConfig = {
    region: env.BEDROCK_REGION ?? 'us-east-1'
  };

  if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    };
  }

  return config;
};
