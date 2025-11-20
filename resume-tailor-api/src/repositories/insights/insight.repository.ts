import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client.js';
import { attachTechnologiesToInsight } from '../technologies/technology.repository.js';
import type { CreateInsightInput, InsightRecord } from './insight.repository.types.js';

export const createInsight = async (input: CreateInsightInput): Promise<InsightRecord> => {
  const data: Prisma.InsightCreateInput = {
    topic: input.topic,
    level: input.level,
    source: input.source,
    notes: input.notes ?? null,
    user: {
      connect: {
        id: input.userId
      }
    }
  };

  if (input.layer) {
    data.layer = input.layer;
  }

  if (input.projectId) {
    data.projectId = input.projectId;
  }

  if (input.resumeId) {
    data.resumeId = input.resumeId;
  }

  if (input.conversationSessionId) {
    data.conversationSessionId = input.conversationSessionId;
  }

  if (input.conversationResponseId) {
    data.conversationResponseId = input.conversationResponseId;
  }

  if (input.payload !== undefined) {
    data.payload = input.payload as Prisma.InputJsonValue;
  }

  const insight = await prisma.insight.create({ data });

  if (input.technologyNames?.length) {
    await attachTechnologiesToInsight(insight.id, input.technologyNames, input.source);
  }

  return insight;
};

export const listInsightsByUser = (userId: string): Promise<InsightRecord[]> => {
  return prisma.insight.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};
