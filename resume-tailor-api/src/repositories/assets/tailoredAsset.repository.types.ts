import type { AssetType, TailoredAsset } from '@prisma/client';

export type TailoredAssetRecord = TailoredAsset;

export interface CreateTailoredAssetInput {
  userId: string;
  jobTitle: string;
  jobDescription: string;
  assetType: AssetType;
  content: string;
  recommendations?: Record<string, unknown> | null;
  projectIds: string[];
  resumeId?: string | null;
}
