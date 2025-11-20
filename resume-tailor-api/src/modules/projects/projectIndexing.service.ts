import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import fg from 'fast-glob';
import { simpleGit } from 'simple-git';
import { getLLMAdapter } from '../../adapters/llm/index.js';
import { logger } from '../../config/logger.js';
import {
  getProjectById,
  listProjects,
  upsertProject
} from '../../repositories/projects/project.repository.js';
import { replaceProjectArtifacts } from '../../repositories/projects/projectArtifact.repository.js';
import { syncProjectTechnologies } from '../../repositories/technologies/technology.repository.js';
import { createInsight } from '../../repositories/insights/insight.repository.js';
import type { ProjectFilter } from '../../repositories/projects/project.repository.types.js';
import type { ProjectHeuristics, ProjectIndexRequest, ProjectIndexingResult, ProjectSource } from './projectIndexing.types.js';
import { createProjectSummaryPrompt } from '../../prompts/basePrompts.js';
import { HttpError } from '../../middleware/errorHandler.js';

const MAX_FILES_ANALYZED = 250;
const SYSTEM_USER = 'system';

const codeGlob = [
  '**/*.{ts,tsx,js,jsx,py,rb,go,java,cs,php,rs,kt,swift,scala,cpp,c,h}',
  '**/package.json',
  '**/requirements.txt',
  '**/pyproject.toml'
];

const ignoredGlobs = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/*.lock', '**/*.min.*'];

interface SourceResolution {
  rootPath: string;
  cleanup?: () => Promise<void>;
}

const detectLanguage = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.rb': 'Ruby',
    '.go': 'Go',
    '.java': 'Java',
    '.cs': 'C#',
    '.php': 'PHP',
    '.rs': 'Rust',
    '.kt': 'Kotlin',
    '.swift': 'Swift',
    '.scala': 'Scala',
    '.cpp': 'C++',
    '.c': 'C',
    '.h': 'C/C++'
  };

  return map[ext] ?? 'Unknown';
};

const extractExports = (content: string): string[] => {
  const matches = content.match(/export\s+(?:const|class|function|interface|type)\s+([A-Za-z0-9_]+)/g) ?? [];
  return matches.map((match) => match.split(/\s+/).at(-1) ?? '').filter(Boolean);
};

const parseGitHttpStatus = (message: string): number | undefined => {
  const statusMatch = message.match(/error:\s*(\d{3})/i);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    if (!Number.isNaN(status)) {
      return status;
    }
  }

  return undefined;
};

const buildGitCloneError = (error: unknown, repoUrl: string): HttpError => {
  const fallbackMessage = error instanceof Error ? error.message : String(error);
  let status = parseGitHttpStatus(fallbackMessage);

  if (!status && /repository not found/i.test(fallbackMessage)) {
    status = 404;
  }

  let suggestion = 'Verify the repository URL and try again.';

  if (status === 404) {
    suggestion = 'Repository may be private or missing. Confirm visibility or credentials.';
  } else if (status === 401 || /auth/i.test(fallbackMessage)) {
    suggestion = 'Authentication failed. Provide valid credentials or ensure the repository is public.';
  } else if (status && status >= 500) {
    suggestion = 'Git provider returned an error. Wait a moment and retry.';
  }

  const details: Record<string, unknown> = {
    repoUrl,
    gitMessage: fallbackMessage.trim(),
    suggestion
  };

  if (typeof error === 'object' && error && 'task' in error) {
    details.gitTask = (error as { task: unknown }).task;
  }

  const message = `Failed to clone repository ${repoUrl}`;

  return new HttpError(status ?? 502, message, details);
};

const resolveSourceRoot = async (source: ProjectSource): Promise<SourceResolution> => {
  if (source.kind === 'local') {
    const stats = await fs.stat(source.path);
    if (!stats.isDirectory()) {
      throw new HttpError(400, `Provided local path ${source.path} is not a directory`);
    }

    return { rootPath: source.path };
  }

  const checkoutDir = path.join(os.tmpdir(), `project-${randomUUID()}`);
  const git = simpleGit();
  const cloneOptions: string[] = [];

  if (source.branch) {
    cloneOptions.push('--branch', source.branch);
  }

  if (source.shallow ?? true) {
    cloneOptions.push('--depth', '1');
  }

  try {
    await git.clone(source.repoUrl, checkoutDir, cloneOptions.length ? cloneOptions : undefined);
  } catch (error) {
    await fs.rm(checkoutDir, { recursive: true, force: true }).catch(() => undefined);
    throw buildGitCloneError(error, source.repoUrl);
  }

  return {
    rootPath: checkoutDir,
    cleanup: () => fs.rm(checkoutDir, { recursive: true, force: true })
  };
};

const analyzeSourceFiles = async (rootPath: string): Promise<ProjectHeuristics> => {
  const entries = await fg(codeGlob, {
    cwd: rootPath,
    absolute: true,
    ignore: ignoredGlobs,
    onlyFiles: true
  });

  const limited = entries.slice(0, MAX_FILES_ANALYZED);
  const fileInsights = await Promise.all(
    limited.map(async (absolutePath) => {
      const content = await fs.readFile(absolutePath, 'utf8');
      const linesOfCode = content.split(/\r?\n/).length;

      return {
        path: path.relative(rootPath, absolutePath),
        language: detectLanguage(absolutePath),
        linesOfCode,
        exportsDetected: extractExports(content)
      };
    })
  );

  const technologies = Array.from(
    new Set(
      fileInsights
        .map((insight) => insight.language)
        .filter((language) => language !== 'Unknown')
    )
  );

  const keyFunctionality = fileInsights
    .filter((insight) => insight.exportsDetected.length > 0)
    .map((insight) => `${insight.path}: ${insight.exportsDetected.join(', ')}`)
    .slice(0, 20);

  const highlights = [
    `Analyzed ${fileInsights.length} key source files`,
    `Primary languages: ${technologies.join(', ') || 'Unknown'}`,
    `Detected ${keyFunctionality.length} exported components`
  ];

  const keyMetrics = {
    totalLinesOfCode: fileInsights.reduce((sum, insight) => sum + insight.linesOfCode, 0),
    filesAnalyzed: fileInsights.length
  };

  return {
    technologies,
    highlights,
    keyFunctionality,
    keyMetrics,
    filesAnalyzed: fileInsights.length,
    fileInsights
  };
};

const summarizeProject = async (request: ProjectIndexRequest, heuristics: ProjectHeuristics): Promise<string> => {
  const adapter = getLLMAdapter(request.llmProvider);
  const response = await adapter.generate({
    messages: createProjectSummaryPrompt(request, heuristics),
    maxOutputTokens: 400
  });

  return response.content;
};

const buildProjectArtifacts = (heuristics: ProjectHeuristics, summary: string) => {
  return [
    ...heuristics.fileInsights.map((insight) => ({
      kind: 'source_file' as const,
      path: insight.path,
      metadata: {
        language: insight.language,
        linesOfCode: insight.linesOfCode,
        exportsDetected: insight.exportsDetected
      }
    })),
    {
      kind: 'heuristic' as const,
      metadata: {
        keyMetrics: heuristics.keyMetrics,
        highlights: heuristics.highlights,
        keyFunctionality: heuristics.keyFunctionality
      }
    },
    {
      kind: 'summary' as const,
      metadata: {
        summary
      }
    }
  ];
};

export const indexProject = async (request: ProjectIndexRequest): Promise<ProjectIndexingResult> => {
  const resolution = await resolveSourceRoot(request.source);
  try {
    const heuristics = await analyzeSourceFiles(resolution.rootPath);
    const llmSummary = await summarizeProject(request, heuristics);

    const project = await upsertProject({
      name: request.name,
      description: request.description ?? null,
      repoUrl: request.source.kind === 'github' ? request.source.repoUrl : null,
      localPath: request.source.kind === 'local' ? request.source.path : null,
      summary: llmSummary,
      keyFunctionality: heuristics.keyFunctionality,
      keyMetrics: heuristics.keyMetrics,
      technologies: heuristics.technologies,
      highlights: heuristics.highlights,
      filesAnalyzed: heuristics.filesAnalyzed,
      insights: { files: heuristics.fileInsights },
      ownerId: request.userId ?? null
    });

    await replaceProjectArtifacts(project.id, buildProjectArtifacts(heuristics, llmSummary));
    await syncProjectTechnologies(
      project.id,
      heuristics.technologies.map((name) => ({
        name,
        source: 'code-analysis'
      }))
    );

    const ownerId = request.userId ?? SYSTEM_USER;

    await createInsight({
      userId: ownerId,
      topic: `${request.name} code analysis`,
      level: 'analysis',
      source: 'project-index',
      layer: 'raw',
      projectId: project.id,
      payload: {
        heuristics
      },
      technologyNames: heuristics.technologies
    });

    await createInsight({
      userId: ownerId,
      topic: `${request.name} repository summary`,
      level: 'overview',
      source: 'project-summary',
      layer: 'derived',
      projectId: project.id,
      notes: request.description ?? null,
      payload: {
        summary: llmSummary
      },
      technologyNames: heuristics.technologies
    });

    return { project, heuristics, llmSummary };
  } catch (error) {
    logger.error({ error }, 'Failed to index project');
    throw error;
  } finally {
    await resolution.cleanup?.();
  }
};

export const listIndexedProjects = (filter: ProjectFilter = {}) => listProjects(filter);

export const getIndexedProject = (id: string) => getProjectById(id);
