import type { EntityBase } from "./common";
import type { LLMProvider } from "./llm";

export interface ResumeExperience {
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  achievements: string[];
  technologies?: string[];
}

export interface ResumeEducation {
  institution: string;
  degree?: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
}

export interface ResumeContact {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
}

export interface ResumeInsight {
  summary?: string;
  skills?: string[];
  experiences?: ResumeExperience[];
  education?: ResumeEducation[];
  contact?: ResumeContact;
}

export interface ResumeRecord extends EntityBase {
  userId: string;
  sourceName?: string;
  resumeText?: string;
  insight?: ResumeInsight;
}

export interface IngestResumePayload {
  resumeText: string;
  sourceName?: string;
  llmProvider?: LLMProvider;
}

export interface IngestResumeResponse {
  record: ResumeRecord;
  insight: ResumeInsight;
}

export interface ResumeDraftSection {
  id: string;
  title: string;
  body: string;
}

export interface ResumeDraft {
  headline: string;
  contact: ResumeContact;
  summary: string;
  skills: string[];
  experiences: ResumeExperience[];
  education: ResumeEducation[];
  highlights: string[];
  sections: ResumeDraftSection[];
}

export type ResumeSectionType =
  | "summary"
  | "skills"
  | "experiences"
  | "education"
  | "contact";

export interface ResumeSectionContext {
  jobTitle?: string;
  company?: string;
  experienceIndex?: number;
  achievements?: string[];
  skills?: string[];
  notes?: string;
  [key: string]: unknown;
}

export interface GenerateResumeSectionPayload {
  context: ResumeSectionContext;
  llmProvider?: LLMProvider;
  tone?: string;
}

export interface ImproveResumeSectionPayload extends GenerateResumeSectionPayload {
  currentContent: string[];
  instructions?: string;
}

export interface ResumeSectionSuggestion {
  section: ResumeSectionType;
  content: string[];
  rationale?: string;
}

export interface UpdateResumeSectionPayload<TContent = unknown> {
  content: TContent;
}
