import type { LLMProvider } from '../../adapters/llm/llm.types.js';

export interface JobDescriptionRequest {
  userId: string;
  jobDescription: string;
  llmProvider?: LLMProvider;
}

export type TechnologyImportance = 'core' | 'nice_to_have';

export interface JobDescriptionInsights {
  roleSummary: string;
  senioritySignals: string[];
  requiredTechnologies: Array<{ name: string; importance: TechnologyImportance }>;
  culturalNotes: string[];
  responsibilityThemes: string[];
  riskAlerts: string[];
}

export interface JobMatchProject {
  id: string;
  name: string;
  summary: string;
  matchingTechnologies: string[];
}

export interface JobMatchResume {
  id: string;
  sourceName?: string | null;
  matchingSkills: string[];
  summary: string;
}

export interface JobIntelligenceResult {
  insights: JobDescriptionInsights;
  matches: {
    projects: JobMatchProject[];
    resumes: JobMatchResume[];
    coverage: {
      covered: string[];
      missing: string[];
    };
  };
}
