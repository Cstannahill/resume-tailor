import { apiRequest } from "@/lib/api-client";

export const getHealth = () =>
  apiRequest<{ status: string; environment?: string }>({
    path: "/health",
    method: "GET",
  });
