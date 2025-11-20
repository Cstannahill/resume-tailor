import type { AssetType } from '@prisma/client';
import type { TailoredAssetRecord } from '../../repositories/assets/tailoredAsset.repository.types.js';
import type { LLMProvider } from '../../adapters/llm/llm.types.js';

export interface TailorJobMaterialsRequest {
  userId: string;
  jobTitle: string;
  jobDescription: string;
  resumeId?: string;
  projectIds?: string[];
  assetType?: AssetType;
  llmProvider?: LLMProvider;
}

export interface TailoredJobMaterial {
  record: TailoredAssetRecord;
  recommendations: {
    projectHighlights: string[];
    resumeBullets: string[];
    alignmentNotes: string;
  };
}
