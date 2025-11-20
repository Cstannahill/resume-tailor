import { Prisma, type ProjectArtifactKind } from '@prisma/client';
import { prisma } from '../../db/client.js';

export interface ProjectArtifactInput {
  kind: ProjectArtifactKind;
  path?: string | null;
  contentPreview?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const replaceProjectArtifacts = async (projectId: string, artifacts: ProjectArtifactInput[]) => {
  await prisma.projectArtifact.deleteMany({ where: { projectId } });

  if (!artifacts.length) {
    return;
  }

  await prisma.projectArtifact.createMany({
    data: artifacts.map((artifact) => ({
      projectId,
      kind: artifact.kind,
      path: artifact.path ?? null,
      contentPreview: artifact.contentPreview ?? null,
      metadata: artifact.metadata
        ? (artifact.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull
    }))
  });
};
