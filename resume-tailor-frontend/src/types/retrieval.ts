import type { EntityBase } from "./common";
import type { LLMProvider } from "./llm";

export type TailoredAssetType = "resume" | "cover_letter" | "summary";

export interface CoverLetterContent {
  content: string;
  projectHighlights?: string[];
  resumeBullets?: string[];
  alignmentNotes?: string;
}

export interface TailoredAsset extends EntityBase {
  userId: string;
  jobTitle: string;
  jobDescription: string;
  resumeId?: string;
  projectIds?: string[];
  assetType: TailoredAssetType;
  content: string | CoverLetterContent;
  recommendations?: {
    projectHighlights?: string[];
    resumeBullets?: string[];
    alignmentNotes?: string;
  };
}

export interface TailorJobPayload {
  jobTitle: string;
  jobDescription: string;
  resumeId?: string;
  projectIds?: string[];
  assetType: TailoredAssetType;
  llmProvider?: LLMProvider;
}

export interface TailorJobResponse {
  record: TailoredAsset;
  recommendations: {
    projectHighlights?: string[];
    resumeBullets?: string[];
    alignmentNotes?: string;
  };
}
