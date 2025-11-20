import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import type {
  IndexProjectPayload,
  IndexProjectResponse,
  Project,
} from "@/types";

export const indexProject = (payload: IndexProjectPayload) =>
  apiRequest<IndexProjectResponse>({
    path: "/projects/index",
    method: "POST",
    data: payload,
  });

export const listProjects = (filters?: {
  search?: string;
  technology?: string;
  mine?: boolean;
}) =>
  apiRequest<Project[]>({
    path: `/projects${toQueryString(filters ?? {})}`,
    method: "GET",
  });
