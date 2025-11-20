import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler.js';
import type { ApiResponse } from '../../types/http.js';
import { getIndexedProject, indexProject, listIndexedProjects } from './projectIndexing.service.js';
import type { ProjectIndexRequest } from './projectIndexing.types.js';
import type { ProjectFilter } from '../../repositories/projects/project.repository.types.js';

export const handleIndexProject = async (
  req: Request<unknown, unknown, ProjectIndexRequest>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const payload: ProjectIndexRequest = {
    ...req.body,
    userId: req.user.id
  };
  const result = await indexProject(payload);
  res.status(201).json({
    data: {
      project: result.project,
      heuristics: result.heuristics,
      summary: result.llmSummary
    }
  });
};

export const handleListProjects = async (req: Request, res: Response<ApiResponse<unknown>>) => {
  const filter: ProjectFilter = {};

  if (typeof req.query.search === 'string') {
    filter.search = req.query.search;
  }

  if (typeof req.query.technology === 'string') {
    filter.technology = req.query.technology;
  }

  if (typeof req.query.ownerId === 'string') {
    filter.ownerId = req.query.ownerId;
  } else if (req.query.mine === 'true' && req.user) {
    filter.ownerId = req.user.id;
  }

  const projects = await listIndexedProjects(filter);

  res.json({
    data: projects
  });
};

export const handleGetProject = async (req: Request<{ projectId: string }>, res: Response<ApiResponse<unknown>>) => {
  const project = await getIndexedProject(req.params.projectId);

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  if (project.ownerId && (!req.user || req.user.id !== project.ownerId)) {
    throw new HttpError(403, 'Forbidden');
  }

  res.json({
    data: project
  });
};
