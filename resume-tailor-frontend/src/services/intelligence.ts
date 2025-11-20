import { apiRequest } from "@/lib/api-client";
import type { JobIntelligencePayload, JobIntelligenceResponse } from "@/types";

export const analyzeJobDescription = (payload: JobIntelligencePayload) =>
  apiRequest<JobIntelligenceResponse>({
    path: "/intelligence/job",
    method: "POST",
    data: payload,
  });
