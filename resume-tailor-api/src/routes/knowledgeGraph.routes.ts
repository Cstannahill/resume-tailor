import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { handleGetKnowledgeGraph } from '../modules/knowledgeGraph/knowledgeGraph.controller.js';

export const knowledgeGraphRouter = Router();

knowledgeGraphRouter.get('/', asyncHandler(handleGetKnowledgeGraph));

export const registerKnowledgeGraphRoutes = (app: Router) => {
  app.use('/knowledge-graph', knowledgeGraphRouter);
};
