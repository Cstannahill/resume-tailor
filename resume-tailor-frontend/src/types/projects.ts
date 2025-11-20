import type { EntityBase } from "./common";
import type { LLMProvider } from "./llm";

export type ProjectSourceKind = "github" | "local";

export interface ProjectSourceBase {
  kind: ProjectSourceKind;
}

export interface GithubProjectSource extends ProjectSourceBase {
  kind: "github";
  repoUrl: string;
  branch?: string;
  shallow?: boolean;
}

export interface LocalProjectSource extends ProjectSourceBase {
  kind: "local";
  path: string;
}

export type ProjectSource = GithubProjectSource | LocalProjectSource;

export interface Project extends EntityBase {
  name: string;
  description?: string;
  summary?: string;
  tags: string[];
  technologies: string[];
  highlights?: string[];
  keyFunctionality?: string[];
  keyMetrics?: Record<string, number>;
}

export interface ProjectHeuristics {
  technologies: string[];
  highlights: string[];
  keyFunctionality: string[];
  keyMetrics: Record<string, number>;
  filesAnalyzed: number;
  summary?: string;
  fileInsights?: Array<{
    path: string;
    language: string;
    highlight?: string;
  }>;
}

export interface IndexProjectPayload {
  name: string;
  description?: string;
  source: ProjectSource;
  tags?: string[];
  llmProvider?: LLMProvider;
}

export interface IndexProjectResponse {
  project: Project;
  heuristics: ProjectHeuristics;
  summary: string;
}
