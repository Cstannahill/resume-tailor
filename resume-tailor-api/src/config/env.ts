import 'dotenv/config';
import { z } from 'zod';
import type { LLMProvider } from '../adapters/llm/llm.types.js';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(0).default(4000),
  DATABASE_URL: z.string().url(),
  DEFAULT_LLM_PROVIDER: z.enum(['ollama', 'bedrock', 'google', 'openrouter']).default('ollama'),
  // Ollama Cloud
  OLLAMA_BASE_URL: z.string().url().default('https://ollama.com'),
  OLLAMA_API_KEY: z.string().optional(),
  // AWS Bedrock
  BEDROCK_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  // Google GenAI
  GOOGLE_GENAI_API_KEY: z.string().optional(),
  // OpenRouter
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().optional(),
  // Auth & encryption
  AUTH_JWT_SECRET: z.string().min(32, 'AUTH_JWT_SECRET must be at least 32 characters'),
  APP_ENCRYPTION_KEY: z.string(),
  CORS_ALLOWED_ORIGINS: z.string().optional()
});

export type AppEnvironment = z.infer<typeof envSchema> & {
  DEFAULT_LLM_PROVIDER: LLMProvider;
  ALLOWED_ORIGINS: string[];
};

const parsed = envSchema.parse(process.env);

const allowedOrigins =
  parsed.CORS_ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? ['http://localhost:3000'];

export const env: AppEnvironment = {
  ...parsed,
  ALLOWED_ORIGINS: allowedOrigins
};

export const isProduction = env.NODE_ENV === 'production';
