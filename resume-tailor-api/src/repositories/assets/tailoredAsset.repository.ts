import { prisma } from '../../db/client.js';
import type { CreateTailoredAssetInput, TailoredAssetRecord } from './tailoredAsset.repository.types.js';

export const createTailoredAsset = (input: CreateTailoredAssetInput): Promise<TailoredAssetRecord> => {
  const data = {
    userId: input.userId,
    jobTitle: input.jobTitle,
    jobDescription: input.jobDescription,
    assetType: input.assetType,
    content: input.content,
    projectIds: input.projectIds,
    resumeId: input.resumeId ?? null
  };

  if (input.recommendations) {
    Object.assign(data, { recommendations: input.recommendations });
  }

  return prisma.tailoredAsset.create({ data });
};

export const listTailoredAssets = (userId: string): Promise<TailoredAssetRecord[]> => {
  return prisma.tailoredAsset.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};
