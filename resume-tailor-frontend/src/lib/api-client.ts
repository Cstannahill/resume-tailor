import { API_BASE_URL } from "./constants";
import { getAuthToken } from "./auth-storage";
import type { ApiErrorResponse } from "@/types";

export interface ApiRequestOptions extends RequestInit {
  path: string;
  data?: unknown;
  skipJson?: boolean;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  if (!response.ok) {
    const payload = isJson ? ((await response.json()) as ApiErrorResponse) : null;
    const message =
      payload?.error?.message ??
      response.statusText ??
      "Unexpected API error.";
    throw new Error(message);
  }
  if (!isJson) {
    return (await response.text()) as unknown as T;
  }
  const json = await response.json();
  return json.data as T;
};

export const apiRequest = async <T>(options: ApiRequestOptions): Promise<T> => {
  const { path, data, skipJson, headers, ...rest } = options;
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const token = getAuthToken();
  const init: RequestInit = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: data && !skipJson ? JSON.stringify(data) : (data as BodyInit | null | undefined),
  };
  if (!data) delete init.body;
  const response = await fetch(url, init);
  if (response.status === 401) {
    const error = new Error("Unauthorized") as Error & { code?: number };
    error.code = 401;
    throw error;
  }
  return handleResponse<T>(response);
};
