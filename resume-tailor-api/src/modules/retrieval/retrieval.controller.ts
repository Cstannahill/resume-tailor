import type { Request, Response } from 'express';
import type { ApiResponse } from '../../types/http.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { listTailoredJobMaterials, tailorJobMaterials } from './retrieval.service.js';
import type { TailorJobMaterialsRequest } from './retrieval.types.js';

export const handleTailorJobMaterials = async (
  req: Request<unknown, unknown, TailorJobMaterialsRequest>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const payload: TailorJobMaterialsRequest = {
    ...req.body,
    userId: req.user.id
  };
  const result = await tailorJobMaterials(payload);
  res.status(201).json({ data: result });
};

export const handleListTailoredAssets = async (req: Request, res: Response<ApiResponse<unknown>>) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const assets = await listTailoredJobMaterials(req.user.id);
  res.json({ data: assets });
};
