import { apiRequest } from "@/lib/api-client";
import type { DeveloperReportRequest, DeveloperReportResponse } from "@/types";

export const fetchDeveloperReport = (payload?: DeveloperReportRequest) =>
  apiRequest<DeveloperReportResponse>({
    path: "/profiles/developer-report",
    method: "POST",
    data: payload,
  });
