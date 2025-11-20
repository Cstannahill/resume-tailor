import type { LLMProvider } from "./llm";

export interface DeveloperReportRequest {
  llmProvider?: LLMProvider;
}

export interface DeveloperReportData {
  developerOverview?: string;
  coreStrengths?: string[];
  growthOpportunities?: string[];
  projectEvidence?: string[];
  technicalDepth?: string[];
  riskCaveats?: string[];
  confidence?: "low" | "medium" | "high" | string;
}

export interface DeveloperReportResponse {
  data: DeveloperReportData;
}
