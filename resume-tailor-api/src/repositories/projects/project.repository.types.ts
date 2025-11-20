import type { Project } from '@prisma/client';

export type ProjectRecord = Project;

export interface UpsertProjectInput {
  id?: string;
  name: string;
  description?: string | null;
  repoUrl?: string | null;
  localPath?: string | null;
  summary: string;
  keyFunctionality: string[];
  keyMetrics?: Record<string, unknown> | null;
  technologies: string[];
  highlights: string[];
  filesAnalyzed: number;
  insights?: Record<string, unknown> | null;
  ownerId?: string | null;
}

export interface ProjectFilter {
  search?: string;
  technology?: string;
  limit?: number;
  ownerId?: string;
}
