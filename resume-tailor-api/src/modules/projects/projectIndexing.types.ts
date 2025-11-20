import type { ProjectRecord } from '../../repositories/projects/project.repository.types.js';
import type { LLMProvider } from '../../adapters/llm/llm.types.js';

export interface LocalProjectSource {
  kind: 'local';
  path: string;
}

export interface GithubProjectSource {
  kind: 'github';
  repoUrl: string;
  branch?: string;
  shallow?: boolean;
}

export type ProjectSource = LocalProjectSource | GithubProjectSource;

export interface ProjectIndexRequest {
  name: string;
  description?: string;
  userId: string;
  source: ProjectSource;
  tags?: string[];
  llmProvider?: LLMProvider;
}

export interface ProjectFileInsight {
  path: string;
  language: string;
  linesOfCode: number;
  exportsDetected: string[];
}

export interface ProjectHeuristics {
  technologies: string[];
  highlights: string[];
  keyFunctionality: string[];
  keyMetrics: Record<string, unknown>;
  filesAnalyzed: number;
  fileInsights: ProjectFileInsight[];
}

export interface ProjectIndexingResult {
  project: ProjectRecord;
  heuristics: ProjectHeuristics;
  llmSummary: string;
}
