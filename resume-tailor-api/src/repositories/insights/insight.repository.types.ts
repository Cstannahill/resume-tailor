import type { Insight, InsightLayer } from '@prisma/client';

export type InsightRecord = Insight;

export interface CreateInsightInput {
  userId: string;
  topic: string;
  level: string;
  source: string;
  notes?: string | null;
  payload?: unknown;
  layer?: InsightLayer;
  projectId?: string | null;
  resumeId?: string | null;
  conversationSessionId?: string | null;
  conversationResponseId?: string | null;
  technologyNames?: string[];
}
