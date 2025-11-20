import type { Resume } from '@prisma/client';

export type ResumeRecord = Resume;

export interface CreateResumeInput {
  userId: string;
  sourceName?: string | null;
  extractedSummary: string;
  skills: string[];
  experience?: Record<string, unknown>[] | null;
  education?: Record<string, unknown>[] | null;
  contact?: Record<string, string> | null;
}

export interface ResumeFilter {
  userId?: string;
}
