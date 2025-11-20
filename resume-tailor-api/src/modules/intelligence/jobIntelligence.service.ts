import { prisma } from '../../db/client.js';
import { getLLMAdapter } from '../../adapters/llm/index.js';
import { listResumes } from '../../repositories/resumes/resume.repository.js';
import { createJobDescriptionInsightsPrompt } from '../../prompts/basePrompts.js';
import { parseJsonResponse } from '../../utils/json.js';
import type {
  JobDescriptionRequest,
  JobDescriptionInsights,
  JobIntelligenceResult,
  JobMatchProject,
  JobMatchResume
} from './jobIntelligence.types.js';

const fallbackInsights: JobDescriptionInsights = {
  roleSummary: 'Unable to parse job description. Provide more context.',
  senioritySignals: [],
  requiredTechnologies: [],
  culturalNotes: [],
  responsibilityThemes: [],
  riskAlerts: []
};

const normalizeTech = (name: string) => name.trim().toLowerCase();

const buildProjectMatches = (
  requiredTechs: string[],
  projects: Array<{ id: string; name: string; summary: string; technologies: string[] }>
): JobMatchProject[] => {
  const requiredSet = new Set(requiredTechs.map(normalizeTech));

  return projects
    .map((project) => {
      const matchingTechnologies = project.technologies.filter((tech) => requiredSet.has(normalizeTech(tech)));
      if (!matchingTechnologies.length) {
        return null;
      }

      return {
        id: project.id,
        name: project.name,
        summary: project.summary,
        matchingTechnologies
      } satisfies JobMatchProject;
    })
    .filter(Boolean) as JobMatchProject[];
};

const buildResumeMatches = (requiredTechs: string[], resumes: Awaited<ReturnType<typeof listResumes>>): JobMatchResume[] => {
  const requiredSet = new Set(requiredTechs.map(normalizeTech));

  return resumes
    .map((resume) => {
      const matchingSkills = resume.skills.filter((skill) => requiredSet.has(normalizeTech(skill)));
      if (!matchingSkills.length) {
        return null;
      }

      return {
        id: resume.id,
        sourceName: resume.sourceName,
        matchingSkills,
        summary: resume.extractedSummary
      } satisfies JobMatchResume;
    })
    .filter(Boolean) as JobMatchResume[];
};

export const analyzeJobDescription = async (input: JobDescriptionRequest): Promise<JobIntelligenceResult> => {
  const adapter = getLLMAdapter(input.llmProvider);
  const response = await adapter.generate({
    messages: createJobDescriptionInsightsPrompt({ jobDescription: input.jobDescription }),
    maxOutputTokens: 600
  });

  const insights = parseJsonResponse<JobDescriptionInsights>(response.content) ?? fallbackInsights;
  const requiredTechNames = Array.from(new Set(insights.requiredTechnologies.map((tech) => tech.name).filter(Boolean)));

  const projectQuery: Parameters<typeof prisma.project.findMany>[0] = {
    orderBy: { updatedAt: 'desc' },
    take: 25
  };

  if (requiredTechNames.length) {
    projectQuery.where = { technologies: { hasSome: requiredTechNames } };
  }

  const [projects, resumes] = await Promise.all([
    prisma.project.findMany(projectQuery),
    input.userId ? listResumes({ userId: input.userId }) : Promise.resolve([])
  ]);

  const projectMatches = buildProjectMatches(
    requiredTechNames,
    projects.map((project) => ({
      id: project.id,
      name: project.name,
      summary: project.summary,
      technologies: project.technologies
    }))
  );

  const resumeMatches = buildResumeMatches(requiredTechNames, resumes);

  const covered = new Set<string>();
  projectMatches.forEach((match) => match.matchingTechnologies.forEach((tech) => covered.add(normalizeTech(tech))));
  resumeMatches.forEach((match) => match.matchingSkills.forEach((skill) => covered.add(normalizeTech(skill))));

  const missing = requiredTechNames.filter((name) => !covered.has(normalizeTech(name)));
  const coveredList = requiredTechNames.filter((name) => covered.has(normalizeTech(name)));

  return {
    insights,
    matches: {
      projects: projectMatches,
      resumes: resumeMatches,
      coverage: {
        covered: Array.from(new Set(coveredList)),
        missing
      }
    }
  };
};
