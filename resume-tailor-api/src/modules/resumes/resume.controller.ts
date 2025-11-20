import type { Request, Response } from 'express';
import type { ApiResponse } from '../../types/http.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  extractResumeInsights,
  generateResumeSection,
  getResumeRecord,
  improveResumeSection,
  listResumeRecords,
  updateResumeSectionContent
} from './resume.service.js';
import type {
  ResumeExtractionRequest,
  ResumeSectionGenerateRequest,
  ResumeSectionImproveRequest,
  ResumeSectionType,
  ResumeSectionUpdateRequest
} from './resume.types.js';
import type { ResumeFilter } from '../../repositories/resumes/resume.repository.types.js';

export const handleResumeExtraction = async (
  req: Request<unknown, unknown, ResumeExtractionRequest>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const payload: ResumeExtractionRequest = {
    ...req.body,
    userId: req.user.id
  };
  const result = await extractResumeInsights(payload);
  res.status(201).json({
    data: result
  });
};

export const handleListResumes = async (req: Request, res: Response<ApiResponse<unknown>>) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const filter: ResumeFilter = {};

  filter.userId = req.user.id;

  const records = await listResumeRecords(filter);

  res.json({ data: records });
};

export const handleGetResume = async (req: Request<{ resumeId: string }>, res: Response<ApiResponse<unknown>>) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const record = await getResumeRecord(req.params.resumeId);

  if (!record) {
    throw new HttpError(404, 'Resume not found');
  }

  if (record.userId !== req.user.id) {
    throw new HttpError(403, 'Forbidden');
  }

  res.json({ data: record });
};

const getSectionFromParams = (sectionParam: string): ResumeSectionType => {
  if (['summary', 'skills', 'experiences', 'education', 'contact'].includes(sectionParam)) {
    return sectionParam as ResumeSectionType;
  }
  throw new HttpError(400, `Unsupported section ${sectionParam}`);
};

export const handleGenerateResumeSection = async (
  req: Request<{ resumeId: string; section: string }, unknown, Omit<ResumeSectionGenerateRequest, 'context'> & {
    context: Omit<ResumeSectionGenerateRequest['context'], 'section'>;
  }>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const section = getSectionFromParams(req.params.section);
  const suggestion = await generateResumeSection(req.params.resumeId, req.user.id, {
    ...req.body,
    context: {
      ...req.body.context,
      section
    }
  });

  res.json({ data: suggestion });
};

export const handleImproveResumeSection = async (
  req: Request<{ resumeId: string; section: string }, unknown, ResumeSectionImproveRequest>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const section = getSectionFromParams(req.params.section);
  const suggestion = await improveResumeSection(req.params.resumeId, req.user.id, {
    ...req.body,
    context: {
      ...req.body.context,
      section
    }
  });

  res.json({ data: suggestion });
};

export const handleUpdateResumeSection = async (
  req: Request<{ resumeId: string; section: string }, unknown, ResumeSectionUpdateRequest>,
  res: Response<ApiResponse<unknown>>
) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  const section = getSectionFromParams(req.params.section);
  const updated = await updateResumeSectionContent(req.params.resumeId, req.user.id, section, req.body.content);

  res.json({ data: updated });
};
