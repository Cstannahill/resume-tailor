import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client.js';
import type { CreateResumeInput, ResumeFilter, ResumeRecord } from './resume.repository.types.js';

export const createResumeRecord = async (input: CreateResumeInput): Promise<ResumeRecord> => {
  const data = {
    userId: input.userId,
    sourceName: input.sourceName ?? null,
    extractedSummary: input.extractedSummary,
    skills: input.skills
  };

  if (input.experience !== undefined) {
    Object.assign(data, { experience: input.experience });
  }

  if (input.education !== undefined) {
    Object.assign(data, { education: input.education });
  }

  if (input.contact !== undefined) {
    Object.assign(data, { contact: input.contact });
  }

  return prisma.resume.create({ data });
};

export const listResumes = async (filter: ResumeFilter = {}): Promise<ResumeRecord[]> => {
  const where = filter.userId ? { userId: filter.userId } : undefined;

  return prisma.resume.findMany({
    ...(where ? { where } : {}),
    orderBy: { createdAt: 'desc' }
  });
};

export const getResumeById = (id: string): Promise<ResumeRecord | null> => {
  return prisma.resume.findUnique({ where: { id } });
};

export const updateResumeSection = (id: string, data: Prisma.ResumeUpdateInput): Promise<ResumeRecord> => {
  return prisma.resume.update({
    where: { id },
    data
  });
};
