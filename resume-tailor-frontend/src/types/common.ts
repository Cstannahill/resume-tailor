export interface EntityBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorPayload {
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export type ApiResult<T> = ApiEnvelope<T>;
