import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client.js';
import type { ProjectFilter, ProjectRecord, UpsertProjectInput } from './project.repository.types.js';

const buildProjectWhere = (input: UpsertProjectInput) => {
  const conditions = [];

  if (input.id) {
    conditions.push({ id: input.id });
  }

  if (input.repoUrl) {
    conditions.push({ repoUrl: input.repoUrl });
  }

  if (input.localPath) {
    conditions.push({ localPath: input.localPath });
  }

  return conditions;
};

export const upsertProject = async (input: UpsertProjectInput): Promise<ProjectRecord> => {
  const existing = await prisma.project.findFirst({
    where: {
      OR: buildProjectWhere(input)
    }
  });

  const data = {
    name: input.name,
    description: input.description ?? null,
    repoUrl: input.repoUrl ?? null,
    localPath: input.localPath ?? null,
    summary: input.summary,
    keyFunctionality: input.keyFunctionality,
    technologies: input.technologies,
    highlights: input.highlights,
    filesAnalyzed: input.filesAnalyzed,
    ownerId: input.ownerId ?? null
  };

  if (input.keyMetrics !== undefined) {
    Object.assign(data, { keyMetrics: input.keyMetrics });
  }

  if (input.insights !== undefined) {
    Object.assign(data, { insights: input.insights });
  }

  if (existing) {
    return prisma.project.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.project.create({ data });
};

export const listProjects = async (filter: ProjectFilter = {}): Promise<ProjectRecord[]> => {
  const whereConditions: Prisma.ProjectWhereInput[] = [];

  if (filter.search) {
    whereConditions.push({
      OR: [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } }
      ]
    });
  }

  if (filter.technology) {
    whereConditions.push({ technologies: { has: filter.technology } });
  }

  if (filter.ownerId) {
    whereConditions.push({ ownerId: filter.ownerId });
  }

  const where = whereConditions.length > 0 ? { AND: whereConditions } : undefined;

  const query: Parameters<typeof prisma.project.findMany>[0] = {
    orderBy: { updatedAt: 'desc' }
  };

  if (where) {
    query.where = where;
  }

  if (typeof filter.limit === 'number') {
    query.take = filter.limit;
  }

  return prisma.project.findMany(query);
};

export const getProjectById = async (id: string): Promise<ProjectRecord | null> => {
  return prisma.project.findUnique({ where: { id } });
};
