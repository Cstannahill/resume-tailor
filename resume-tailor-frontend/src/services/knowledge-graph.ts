import { apiRequest } from "@/lib/api-client";
import type { KnowledgeGraphPayload } from "@/types";

export const fetchKnowledgeGraph = () =>
  apiRequest<KnowledgeGraphPayload>({
    path: `/knowledge-graph`,
    method: "GET",
  });
