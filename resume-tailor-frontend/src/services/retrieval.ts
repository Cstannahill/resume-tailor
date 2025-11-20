import { apiRequest } from "@/lib/api-client";
import type { TailorJobPayload, TailorJobResponse, TailoredAsset } from "@/types";

export const tailorJobAsset = (payload: TailorJobPayload) =>
  apiRequest<TailorJobResponse>({
    path: "/retrieval/tailor",
    method: "POST",
    data: payload,
  });

export const listTailoredAssets = () =>
  apiRequest<TailoredAsset[]>({
    path: `/retrieval/tailored`,
    method: "GET",
  });
