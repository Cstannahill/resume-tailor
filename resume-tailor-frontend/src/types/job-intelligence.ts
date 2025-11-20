import type { Project } from "./projects";
import type { ResumeRecord } from "./resumes";

export interface JobTechnologyRequirement {
  name: string;
  importance?: "core" | "supplemental" | string;
  notes?: string;
}

export interface JobIntelligenceInsights {
  roleSummary?: string;
  senioritySignals?: string[];
  requiredTechnologies?: JobTechnologyRequirement[];
  culturalNotes?: string[];
  responsibilityThemes?: string[];
  riskAlerts?: string[];
}

export interface JobCoverageReport {
  covered: string[];
  missing: string[];
}

export interface JobMatchProject extends Pick<Project, "id" | "name" | "description"> {
  summary?: string;
  matchingTechnologies?: string[];
}

export interface JobMatchResume
  extends Pick<ResumeRecord, "id" | "sourceName" | "resumeText"> {
  summary?: string;
  matchingSkills?: string[];
}

export interface JobIntelligenceMatches {
  projects: JobMatchProject[];
  resumes: JobMatchResume[];
  coverage: JobCoverageReport;
}

export interface JobIntelligencePayload {
  jobDescription: string;
  llmProvider?: string;
}

export interface JobIntelligenceResponse {
  insights: JobIntelligenceInsights;
  matches: JobIntelligenceMatches;
}
