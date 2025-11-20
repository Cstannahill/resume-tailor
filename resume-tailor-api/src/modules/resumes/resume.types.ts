import type { ResumeRecord } from '../../repositories/resumes/resume.repository.types.js';
import type { LLMProvider } from '../../adapters/llm/llm.types.js';

export interface ResumeExtractionRequest {
  userId: string;
  resumeText: string;
  sourceName?: string;
  llmProvider?: LLMProvider;
}

export interface ResumeInsight {
  summary: string;
  skills: string[];
  experiences: Array<{
    company?: string;
    role?: string;
    achievements: string[];
  }>;
  education: Array<{
    institution?: string;
    degree?: string;
    year?: string;
  }>;
  contact: Record<string, string>;
}

export interface ResumeExtractionResult {
  record: ResumeRecord;
  insight: ResumeInsight;
}

export type ResumeSectionType = 'summary' | 'skills' | 'experiences' | 'education' | 'contact';

export interface ResumeSectionContext {
  section: ResumeSectionType;
  jobTitle?: string;
  company?: string;
  experienceIndex?: number;
  achievements?: string[];
  summary?: string;
  skills?: string[];
  notes?: string;
  resumeHighlights?: string[];
  projectHighlights?: string[];
  personaInsights?: string[];
  additionalInsights?: string[];
}

export interface ResumeSectionGenerateRequest {
  context: ResumeSectionContext;
  llmProvider?: LLMProvider;
  tone?: string;
}

export interface ResumeSectionImproveRequest {
  context: ResumeSectionContext;
  currentContent: string | string[] | Record<string, unknown>;
  instructions?: string;
  llmProvider?: LLMProvider;
}

export interface ResumeSectionUpdateRequest {
  content: string | string[] | Record<string, unknown>;
}

export interface ResumeSectionSuggestion {
  section: ResumeSectionType;
  content: string | string[] | Record<string, unknown>;
  rationale?: string;
}
