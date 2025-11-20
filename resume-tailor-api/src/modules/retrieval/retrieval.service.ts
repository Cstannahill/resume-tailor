import type { AssetType } from '@prisma/client';
import { getLLMAdapter } from '../../adapters/llm/index.js';
import { getProjectById, listProjects } from '../../repositories/projects/project.repository.js';
import type { ProjectRecord } from '../../repositories/projects/project.repository.types.js';
import { getResumeById, listResumes } from '../../repositories/resumes/resume.repository.js';
import { createTailoredAsset, listTailoredAssets } from '../../repositories/assets/tailoredAsset.repository.js';
import type {
  CreateTailoredAssetInput,
  TailoredAssetRecord
} from '../../repositories/assets/tailoredAsset.repository.types.js';
import type { TailorJobMaterialsRequest, TailoredJobMaterial } from './retrieval.types.js';
import { createJobTailoringPrompt } from '../../prompts/basePrompts.js';
import { parseJsonResponse } from '../../utils/json.js';

const defaultAssetType: AssetType = 'summary';

const buildContext = async (input: TailorJobMaterialsRequest) => {
  const resume =
    input.resumeId !== undefined
      ? await getResumeById(input.resumeId)
      : (await listResumes({ userId: input.userId })).at(0);

  let projects: ProjectRecord[] = [];

  if (input.projectIds?.length) {
    const fetched = await Promise.all(
      input.projectIds.map(async (projectId) => {
        const project = await getProjectById(projectId);
        return project;
      })
    );
    projects = fetched.filter((project): project is ProjectRecord => Boolean(project));
  } else {
    projects = await listProjects({ limit: 3 });
  }

  return { resume, projects };
};

export const tailorJobMaterials = async (input: TailorJobMaterialsRequest): Promise<TailoredJobMaterial> => {
  const { resume, projects } = await buildContext(input);
  const resumeContext: { summary?: string; skills?: string[] } = {};
  if (resume?.extractedSummary) {
    resumeContext.summary = resume.extractedSummary;
  }
  if (resume?.skills?.length) {
    resumeContext.skills = resume.skills;
  }

  const adapter = getLLMAdapter(input.llmProvider);
  const response = await adapter.generate({
    messages: createJobTailoringPrompt(
      input,
      resumeContext,
      projects.map((project) => ({
        name: project.name,
        summary: project.summary
      }))
    ),
    maxOutputTokens: 600
  });

  const parsed = parseJsonResponse<{
    content: string;
    projectHighlights: string[];
    resumeBullets: string[];
    alignmentNotes: string;
  }>(response.content);

  const content = parsed?.content ?? response.content;
  const projectIds = projects.map((project) => project?.id).filter(Boolean) as string[];

  const assetInput: CreateTailoredAssetInput = {
    userId: input.userId,
    jobTitle: input.jobTitle,
    jobDescription: input.jobDescription,
    assetType: input.assetType ?? defaultAssetType,
    content,
    projectIds,
    resumeId: resume?.id ?? null
  };

  if (parsed) {
    assetInput.recommendations = {
      projectHighlights: parsed.projectHighlights,
      resumeBullets: parsed.resumeBullets,
      alignmentNotes: parsed.alignmentNotes
    };
  }

  const record = await createTailoredAsset(assetInput);

  return {
    record,
    recommendations: parsed ?? {
      projectHighlights: [],
      resumeBullets: [],
      alignmentNotes: 'LLM returned unstructured response.'
    }
  };
};

export const listTailoredJobMaterials = (userId: string): Promise<TailoredAssetRecord[]> => listTailoredAssets(userId);
