import { apiRequest } from "@/lib/api-client";
import type {
  GenerateResumeSectionPayload,
  ImproveResumeSectionPayload,
  IngestResumePayload,
  IngestResumeResponse,
  ResumeRecord,
  ResumeSectionSuggestion,
  ResumeSectionType,
  UpdateResumeSectionPayload,
} from "@/types";

export const ingestResume = (payload: IngestResumePayload) =>
  apiRequest<IngestResumeResponse>({
    path: "/resumes/ingest",
    method: "POST",
    data: payload,
  });

export const listResumes = () =>
  apiRequest<ResumeRecord[]>({
    path: `/resumes`,
    method: "GET",
  });

export const getResume = (resumeId: string) =>
  apiRequest<ResumeRecord>({
    path: `/resumes/${resumeId}`,
    method: "GET",
  });

export const generateResumeSection = (
  resumeId: string,
  section: ResumeSectionType,
  payload: GenerateResumeSectionPayload,
) =>
  apiRequest<ResumeSectionSuggestion>({
    path: `/resumes/${resumeId}/sections/${section}/generate`,
    method: "POST",
    data: payload,
  });

export const improveResumeSection = (
  resumeId: string,
  section: ResumeSectionType,
  payload: ImproveResumeSectionPayload,
) =>
  apiRequest<ResumeSectionSuggestion>({
    path: `/resumes/${resumeId}/sections/${section}/improve`,
    method: "POST",
    data: payload,
  });

export const updateResumeSection = <TContent = unknown>(
  resumeId: string,
  section: ResumeSectionType,
  payload: UpdateResumeSectionPayload<TContent>,
) =>
  apiRequest<ResumeRecord>({
    path: `/resumes/${resumeId}/sections/${section}`,
    method: "PATCH",
    data: payload,
  });
