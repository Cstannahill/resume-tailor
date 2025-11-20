import { Prisma } from '@prisma/client';
import { getLLMAdapter } from '../../adapters/llm/index.js';
import { createResumeRecord, getResumeById, listResumes, updateResumeSection } from '../../repositories/resumes/resume.repository.js';
import type { ResumeFilter, ResumeRecord } from '../../repositories/resumes/resume.repository.types.js';
import { syncResumeTechnologies } from '../../repositories/technologies/technology.repository.js';
import { createInsight } from '../../repositories/insights/insight.repository.js';
import type {
  ResumeExtractionRequest,
  ResumeExtractionResult,
  ResumeInsight,
  ResumeSectionGenerateRequest,
  ResumeSectionImproveRequest,
  ResumeSectionSuggestion,
  ResumeSectionType,
  ResumeSectionContext
} from './resume.types.js';
import {
  createResumeExtractionPrompt,
  createResumeSectionGeneratePrompt,
  createResumeSectionImprovePrompt
} from '../../prompts/basePrompts.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { parseJsonResponse } from '../../utils/json.js';
import { collectUserContext, composeUserContextNotes } from '../profile/userContext.service.js';

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;

const extractContact = (text: string): Record<string, string> => {
  const email = text.match(emailRegex)?.[0];
  const phone = text.match(phoneRegex)?.[0];
  return {
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {})
  };
};

const seedInsightFromText = (text: string): ResumeInsight => {
  const skillsSection = text
    .split('\n')
    .filter((line) => /skills?/i.test(line))
    .flatMap((line) => line.split(/[,•|-]/))
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 1);

  const experiences = text
    .split(/\n{2,}/)
    .filter((chunk) => /(engineer|developer|manager|lead)/i.test(chunk))
    .slice(0, 4)
    .map((chunk) => ({
      company: chunk.split('\n')[0]?.trim(),
      role: chunk.split('\n')[1]?.trim(),
      achievements: chunk
        .split('\n')
        .slice(2)
        .map((line) => line.replace(/^[•*-]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 3)
    }));

  return {
    summary: text.split('\n').slice(0, 3).join(' ').slice(0, 280),
    skills: Array.from(new Set(skillsSection)).slice(0, 25),
    experiences,
    education: [],
    contact: extractContact(text)
  };
};

const mergeInsights = (base: ResumeInsight, enriched: Partial<ResumeInsight>): ResumeInsight => {
  return {
    summary: enriched.summary ?? base.summary,
    skills: enriched.skills?.length ? enriched.skills : base.skills,
    experiences: enriched.experiences?.length ? enriched.experiences : base.experiences,
    education: enriched.education?.length ? enriched.education : base.education,
    contact: { ...base.contact, ...(enriched.contact ?? {}) }
  };
};

const requestEnrichedInsight = async (input: ResumeExtractionRequest, seed: ResumeInsight): Promise<Partial<ResumeInsight>> => {
  const adapter = getLLMAdapter(input.llmProvider);
  const response = await adapter.generate({
    messages: createResumeExtractionPrompt(input, seed),
    maxOutputTokens: 600
  });

  return parseJsonResponse<ResumeInsight>(response.content) ?? {};
};

export const extractResumeInsights = async (input: ResumeExtractionRequest): Promise<ResumeExtractionResult> => {
  const seed = seedInsightFromText(input.resumeText);
  const enriched = await requestEnrichedInsight(input, seed);
  const combined = mergeInsights(seed, enriched);

  const record = await createResumeRecord({
    userId: input.userId,
    sourceName: input.sourceName ?? null,
    extractedSummary: combined.summary,
    skills: combined.skills,
    experience: combined.experiences ?? [],
    education: combined.education ?? [],
    contact: combined.contact
  });

  await syncResumeTechnologies(
    record.id,
    combined.skills.map((skill) => ({ name: skill }))
  );

  await createInsight({
    userId: input.userId,
    topic: 'Resume raw capture',
    level: 'raw',
    source: 'resume-ingest',
    layer: 'raw',
    resumeId: record.id,
    payload: {
      resumeText: input.resumeText,
      seed
    },
    technologyNames: combined.skills
  });

  await createInsight({
    userId: input.userId,
    topic: 'Resume structured insight',
    level: 'derived',
    source: 'resume-ingest',
    layer: 'derived',
    resumeId: record.id,
    payload: combined,
    technologyNames: combined.skills
  });

  return { record, insight: combined };
};

export const listResumeRecords = (filter: ResumeFilter = {}) => listResumes(filter);

export const getResumeRecord = (resumeId: string) => getResumeById(resumeId);

const ensureResumeOwnership = async (resumeId: string, userId: string) => {
  const record = await getResumeById(resumeId);
  if (!record) {
    throw new HttpError(404, 'Resume not found');
  }
  if (record.userId !== userId) {
    throw new HttpError(403, 'Forbidden');
  }
  return record;
};

const parseSuggestion = (payload: string, section: ResumeSectionType): ResumeSectionSuggestion => {
  const parsed = parseJsonResponse<ResumeSectionSuggestion>(payload);
  if (parsed?.content) {
    const suggestion: ResumeSectionSuggestion = {
      section,
      content: parsed.content
    };
    if (parsed.rationale) {
      suggestion.rationale = parsed.rationale;
    }
    return suggestion;
  }

  let rationale = 'Failed to parse suggestion; returning raw text.';
  try {
    JSON.parse(payload);
  } catch (error) {
    if (error instanceof Error) {
      rationale = error.message;
    }
  }

  return {
    section,
    content: payload,
    rationale
  };
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalized.length ? normalized : undefined;
};

const getExperienceEntry = (resume: ResumeRecord, index: number): Record<string, unknown> | undefined => {
  const experienceValue = resume.experience;
  if (!experienceValue || !Array.isArray(experienceValue)) {
    return undefined;
  }

  const entry = experienceValue[index];
  if (!entry || typeof entry !== 'object') {
    return undefined;
  }

  return entry as Record<string, unknown>;
};

const mergeResumeContext = (resume: ResumeRecord, context: ResumeSectionContext): ResumeSectionContext => {
  const merged: ResumeSectionContext = { ...context };

  if (!merged.summary && resume.extractedSummary) {
    merged.summary = resume.extractedSummary;
  }

  if ((!merged.skills || !merged.skills.length) && resume.skills?.length) {
    merged.skills = resume.skills;
  }

  if (merged.section === 'experiences' && merged.experienceIndex !== undefined) {
    const entry = getExperienceEntry(resume, merged.experienceIndex);
    if (entry) {
      const role = entry['role'];
      if (!merged.jobTitle && typeof role === 'string') {
        merged.jobTitle = role;
      }

      const company = entry['company'];
      if (!merged.company && typeof company === 'string') {
        merged.company = company;
      }

      if (!merged.achievements || !merged.achievements.length) {
        const achievements = normalizeStringArray(entry['achievements']);
        if (achievements) {
          merged.achievements = achievements;
        }
      }

      const notes = entry['notes'];
      if (!merged.notes && typeof notes === 'string') {
        merged.notes = notes;
      }
    }
  }

  return merged;
};

const buildSectionContext = async (resume: ResumeRecord, context: ResumeSectionContext): Promise<ResumeSectionContext> => {
  const merged = mergeResumeContext(resume, context);
  const snapshot = await collectUserContext(resume.userId, { resume });

  if (!merged.summary && snapshot.resumeSummary) {
    merged.summary = snapshot.resumeSummary;
  }

  if ((!merged.skills || !merged.skills.length) && snapshot.resumeSkills.length) {
    merged.skills = snapshot.resumeSkills;
  }

  if ((!merged.resumeHighlights || !merged.resumeHighlights.length) && snapshot.resumeExperienceHighlights.length) {
    merged.resumeHighlights = snapshot.resumeExperienceHighlights;
  }

  if ((!merged.projectHighlights || !merged.projectHighlights.length) && snapshot.projectHighlights.length) {
    merged.projectHighlights = snapshot.projectHighlights;
  }

  if ((!merged.personaInsights || !merged.personaInsights.length) && snapshot.personaInsights.length) {
    merged.personaInsights = snapshot.personaInsights;
  }

  if ((!merged.additionalInsights || !merged.additionalInsights.length) && snapshot.additionalInsights.length) {
    merged.additionalInsights = snapshot.additionalInsights;
  }

  const composedNotes = composeUserContextNotes(snapshot);
  if (composedNotes) {
    merged.notes = merged.notes ? `${merged.notes}

${composedNotes}` : composedNotes;
  }

  return merged;
};

const normalizeSectionContent = (section: ResumeSectionType, content: unknown): Prisma.ResumeUpdateInput => {
  switch (section) {
    case 'summary':
      return { extractedSummary: typeof content === 'string' ? content : JSON.stringify(content) };
    case 'skills':
      return {
        skills: Array.isArray(content)
          ? content.map((item) => String(item))
          : typeof content === 'string'
          ? content.split(/\n|,/).map((skill) => skill.trim()).filter(Boolean)
          : []
      };
    case 'experiences': {
      const experienceList =
        Array.isArray(content)
          ? (content as Record<string, unknown>[]).map((exp) => ({
              company: exp.company ?? exp['company'],
              role: exp.role ?? exp['role'],
              achievements:
                Array.isArray(exp.achievements) && exp.achievements.length
                  ? exp.achievements
                  : typeof exp['achievements'] === 'string'
                  ? [exp['achievements']]
                  : []
            }))
          : [];
      return {
        experience: experienceList as Prisma.InputJsonValue
      };
    }
    case 'education': {
      const educationList =
        Array.isArray(content)
          ? (content as Record<string, unknown>[])
          : typeof content === 'string'
          ? [{ summary: content }]
          : [];
      return {
        education: educationList as Prisma.InputJsonValue
      };
    }
    case 'contact':
      return {
        contact:
          typeof content === 'object' && content !== null
            ? (content as Prisma.InputJsonValue)
            : ({ raw: String(content) } as Prisma.InputJsonValue)
      };
    default:
      throw new HttpError(400, `Unsupported section ${section}`);
  }
};

export const generateResumeSection = async (
  resumeId: string,
  userId: string,
  request: ResumeSectionGenerateRequest
): Promise<ResumeSectionSuggestion> => {
  const resume = await ensureResumeOwnership(resumeId, userId);
  const context = await buildSectionContext(resume, request.context);
  const adapter = getLLMAdapter(request.llmProvider);
  const response = await adapter.generate({
    messages: createResumeSectionGeneratePrompt({ ...request, context }),
    maxOutputTokens: 500
  });

  return parseSuggestion(response.content, context.section);
};

export const improveResumeSection = async (
  resumeId: string,
  userId: string,
  request: ResumeSectionImproveRequest
): Promise<ResumeSectionSuggestion> => {
  const resume = await ensureResumeOwnership(resumeId, userId);
  const context = await buildSectionContext(resume, request.context);
  const adapter = getLLMAdapter(request.llmProvider);
  const response = await adapter.generate({
    messages: createResumeSectionImprovePrompt({ ...request, context }),
    maxOutputTokens: 500
  });

  return parseSuggestion(response.content, context.section);
};

export const updateResumeSectionContent = async (
  resumeId: string,
  userId: string,
  section: ResumeSectionType,
  content: unknown
) => {
  await ensureResumeOwnership(resumeId, userId);
  const updatePayload = normalizeSectionContent(section, content);
  return updateResumeSection(resumeId, updatePayload as never);
};
