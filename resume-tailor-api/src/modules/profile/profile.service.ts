import type { LLMProvider } from '../../adapters/llm/llm.types.js';
import { getLLMAdapter } from '../../adapters/llm/index.js';
import { createDeveloperProfilePrompt } from '../../prompts/basePrompts.js';
import { parseJsonResponse } from '../../utils/json.js';
import { collectUserContext } from './userContext.service.js';

export interface DeveloperProfileReport {
  developerOverview: string;
  coreStrengths: string[];
  growthOpportunities: string[];
  projectEvidence: string[];
  technicalDepth: string[];
  riskCaveats: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface GenerateDeveloperProfileRequest {
  userId: string;
  llmProvider?: LLMProvider | undefined;
}

export const generateDeveloperProfile = async (
  input: GenerateDeveloperProfileRequest
): Promise<DeveloperProfileReport> => {
  const context = await collectUserContext(input.userId);
  const adapter = getLLMAdapter(input.llmProvider);
  const response = await adapter.generate({
    messages: createDeveloperProfilePrompt({
      resumeSummary: context.resumeSummary,
      resumeSkills: context.resumeSkills,
      experienceHighlights: context.resumeExperienceHighlights,
      projectHighlights: context.projectHighlights,
      personaInsights: context.personaInsights,
      additionalInsights: context.additionalInsights
    }),
    maxOutputTokens: 700
  });

  const parsed = parseJsonResponse<DeveloperProfileReport>(response.content);
  if (!parsed) {
    throw new Error('LLM returned unstructured developer profile.');
  }

  return parsed;
};
