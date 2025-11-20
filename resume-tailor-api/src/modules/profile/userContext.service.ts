import type { Prisma } from '@prisma/client';
import { listResumes } from '../../repositories/resumes/resume.repository.js';
import type { ResumeRecord } from '../../repositories/resumes/resume.repository.types.js';
import { listProjects } from '../../repositories/projects/project.repository.js';
import type { ProjectRecord } from '../../repositories/projects/project.repository.types.js';
import { listInsightsByUser } from '../../repositories/insights/insight.repository.js';
import type { InsightRecord } from '../../repositories/insights/insight.repository.types.js';

export interface UserContextSnapshot {
  resumeSummary?: string | undefined;
  resumeSkills: string[];
  resumeExperienceHighlights: string[];
  projectHighlights: string[];
  personaInsights: string[];
  additionalInsights: string[];
}

interface CollectContextOptions {
  resume?: ResumeRecord;
  projectLimit?: number;
  personaLimit?: number;
  insightLimit?: number;
}

const EXPERIENCE_HIGHLIGHT_LIMIT = 3;
const PROJECT_HIGHLIGHT_LIMIT = 3;
const PERSONA_INSIGHT_LIMIT = 4;
const ADDITIONAL_INSIGHT_LIMIT = 4;

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const asRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object');
};

const describeExperience = (entry: Record<string, unknown>): string | undefined => {
  const role = typeof entry.role === 'string' ? entry.role : undefined;
  const company = typeof entry.company === 'string' ? entry.company : undefined;
  const achievements = normalizeStringArray(entry.achievements).slice(0, 2);

  if (!role && !company && !achievements.length) {
    return undefined;
  }

  const pieces = [role, company ? `@ ${company}` : undefined, achievements.length ? `Highlights: ${achievements.join('; ')}` : undefined];
  return pieces.filter(Boolean).join(' ');
};

const describeProject = (project: ProjectRecord): string => {
  const summary = project.summary || project.description || 'No summary available yet.';
  const technologies = project.technologies?.length ? `Tech: ${project.technologies.slice(0, 6).join(', ')}` : undefined;
  const highlights = project.highlights?.length ? `Highlights: ${project.highlights.slice(0, 2).join('; ')}` : undefined;
  return [
    `${project.name}: ${summary}`,
    technologies,
    highlights
  ]
    .filter(Boolean)
    .join(' | ');
};

const extractInsightDetails = (payload: Prisma.JsonValue | null): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  for (const key of ['summary', 'evaluation', 'notes', 'description']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  const serialized = JSON.stringify(payload);
  if (serialized.length > 280) {
    return `${serialized.slice(0, 280)}...`;
  }
  return serialized;
};

const describeInsight = (insight: InsightRecord): string => {
  const detail = insight.notes ?? extractInsightDetails(insight.payload);
  const header = `${insight.topic} (${insight.level}) via ${insight.source}`;
  return detail ? `${header}: ${detail}` : header;
};

const filterPersonaInsights = (insights: InsightRecord[]): InsightRecord[] => {
  return insights.filter((insight) => insight.source?.toLowerCase().includes('conversation'));
};

const filterAdditionalInsights = (insights: InsightRecord[]): InsightRecord[] => {
  return insights.filter((insight) => !insight.source?.toLowerCase().includes('conversation'));
};

export const collectUserContext = async (userId: string, options: CollectContextOptions = {}): Promise<UserContextSnapshot> => {
  const resume = options.resume ?? (await listResumes({ userId })).at(0);
  const resumeSummary = resume?.extractedSummary ?? undefined;
  const resumeSkills = resume?.skills ?? [];

  const experiences = resume?.experience ? asRecordArray(resume.experience) : [];
  const resumeExperienceHighlights = experiences
    .map(describeExperience)
    .filter((line): line is string => Boolean(line))
    .slice(0, EXPERIENCE_HIGHLIGHT_LIMIT);

  const ownerId = resume?.userId ?? userId;
  const projects = await listProjects({ ownerId, limit: options.projectLimit ?? PROJECT_HIGHLIGHT_LIMIT });
  const projectHighlights = projects.map(describeProject);

  const insights = await listInsightsByUser(ownerId);
  const personaInsights = filterPersonaInsights(insights)
    .slice(0, options.personaLimit ?? PERSONA_INSIGHT_LIMIT)
    .map(describeInsight);
  const additionalInsights = filterAdditionalInsights(insights)
    .slice(0, options.insightLimit ?? ADDITIONAL_INSIGHT_LIMIT)
    .map(describeInsight);

  return {
    resumeSummary,
    resumeSkills,
    resumeExperienceHighlights,
    projectHighlights,
    personaInsights,
    additionalInsights
  };
};

export const composeUserContextNotes = (snapshot: UserContextSnapshot): string | undefined => {
  const sections: string[] = [];

  if (snapshot.resumeSummary) {
    sections.push(`Resume Summary: ${snapshot.resumeSummary}`);
  }

  if (snapshot.resumeSkills.length) {
    sections.push(`Resume Skills: ${snapshot.resumeSkills.slice(0, 20).join(', ')}`);
  }

  if (snapshot.resumeExperienceHighlights.length) {
    sections.push(`Experience Highlights:\n- ${snapshot.resumeExperienceHighlights.join('\n- ')}`);
  }

  if (snapshot.projectHighlights.length) {
    sections.push(`Project Evidence:\n- ${snapshot.projectHighlights.join('\n- ')}`);
  }

  if (snapshot.personaInsights.length) {
    sections.push(`Persona Coach Insights:\n- ${snapshot.personaInsights.join('\n- ')}`);
  }

  if (snapshot.additionalInsights.length) {
    sections.push(`Additional Insights:\n- ${snapshot.additionalInsights.join('\n- ')}`);
  }

  return sections.length ? sections.join('\n\n') : undefined;
};
