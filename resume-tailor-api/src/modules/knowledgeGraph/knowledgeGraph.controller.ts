import type { Request, Response } from 'express';
import type { ApiResponse } from '../../types/http.js';
import { buildKnowledgeGraph } from './knowledgeGraph.service.js';
import type { KnowledgeGraphOptions } from './knowledgeGraph.types.js';

export const handleGetKnowledgeGraph = async (req: Request, res: Response<ApiResponse<unknown>>) => {
  const options: KnowledgeGraphOptions = {};
  if (typeof req.query.userId === 'string') {
    options.userId = req.query.userId;
  }

  const graph = await buildKnowledgeGraph(options);

  res.json({ data: graph });
};
