import type { Technology } from '@prisma/client';
import { prisma } from '../../db/client.js';

export type TechnologyRecord = Technology;

const normalizeNames = (names: string[]): string[] => {
  return Array.from(
    new Set(
      names
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    )
  );
};

export const ensureTechnologies = async (names: string[]): Promise<Record<string, TechnologyRecord>> => {
  const normalized = normalizeNames(names);
  if (normalized.length === 0) {
    return {};
  }

  const existing = await prisma.technology.findMany({
    where: { name: { in: normalized } }
  });

  const existingMap = new Map(existing.map((tech) => [tech.name, tech]));

  const missing = normalized.filter((name) => !existingMap.has(name));

  if (missing.length > 0) {
    const created = await prisma.$transaction(
      missing.map((name) =>
        prisma.technology.create({
          data: { name }
        })
      )
    );

    created.forEach((tech) => existingMap.set(tech.name, tech));
  }

  return Object.fromEntries(existingMap);
};

export const syncProjectTechnologies = async (
  projectId: string,
  technologies: Array<{ name: string; source: string; usageContext?: string }>
) => {
  if (!technologies.length) {
    await prisma.projectTechnology.deleteMany({ where: { projectId } });
    return;
  }

  const techMap = await ensureTechnologies(technologies.map((tech) => tech.name));

  await prisma.projectTechnology.deleteMany({ where: { projectId } });

  await prisma.projectTechnology.createMany({
    data: technologies
      .map((tech) => {
        const record = techMap[tech.name.trim()];
        if (!record) {
          return null;
        }

        return {
          projectId,
          technologyId: record.id,
          usageContext: tech.usageContext ?? null,
          source: tech.source
        };
      })
      .filter(Boolean) as Array<{
        projectId: string;
        technologyId: string;
        usageContext: string | null;
        source: string;
      }>
  });
};

export const syncResumeTechnologies = async (
  resumeId: string,
  technologies: Array<{ name: string; proficiency?: string }>
) => {
  if (!technologies.length) {
    await prisma.resumeTechnology.deleteMany({ where: { resumeId } });
    return;
  }

  const techMap = await ensureTechnologies(technologies.map((tech) => tech.name));

  await prisma.resumeTechnology.deleteMany({ where: { resumeId } });

  await prisma.resumeTechnology.createMany({
    data: technologies
      .map((tech) => {
        const record = techMap[tech.name.trim()];
        if (!record) {
          return null;
        }

        return {
          resumeId,
          technologyId: record.id,
          proficiency: tech.proficiency ?? null
        };
      })
      .filter(Boolean) as Array<{
        resumeId: string;
        technologyId: string;
        proficiency: string | null;
      }>
  });
};

export const attachTechnologiesToInsight = async (
  insightId: string,
  technologyNames: string[],
  context?: string
) => {
  if (!technologyNames.length) {
    return;
  }

  const techMap = await ensureTechnologies(technologyNames);

  await prisma.insightTechnology.createMany({
    data: Object.values(techMap).map((tech) => ({
      insightId,
      technologyId: tech.id,
      context: context ?? null
    }))
  });
};
