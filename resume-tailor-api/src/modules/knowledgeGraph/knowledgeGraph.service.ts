import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client.js';
import { extractFocusAreasFromInsights } from '../conversations/conversation.utils.js';
import type { KnowledgeGraph, KnowledgeGraphOptions, GraphNode, GraphEdge } from './knowledgeGraph.types.js';

const nodeMap = () => {
  const nodes: GraphNode[] = [];
  const map = new Map<string, GraphNode>();

  const add = (node: GraphNode) => {
    if (!map.has(node.id)) {
      map.set(node.id, node);
      nodes.push(node);
    }
    return map.get(node.id)!;
  };

  return { nodes, add, get: (id: string) => map.get(id) };
};

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    technologyLinks: { include: { technology: true } };
    artifacts: true;
  };
}>;

type ResumeWithRelations = Prisma.ResumeGetPayload<{
  include: {
    technologyLinks: { include: { technology: true } };
  };
}>;

export const buildKnowledgeGraph = async (options: KnowledgeGraphOptions): Promise<KnowledgeGraph> => {
  const projectPromise = prisma.project.findMany({
    include: {
      technologyLinks: {
        include: { technology: true }
      },
      artifacts: true
    }
  }) as Promise<ProjectWithRelations[]>;

  const resumeQuery: Prisma.ResumeFindManyArgs = {
    include: {
      technologyLinks: {
        include: { technology: true }
      }
    }
  };
  if (options.userId) {
    resumeQuery.where = { userId: options.userId };
  }
  const resumePromise = prisma.resume.findMany(resumeQuery) as Promise<ResumeWithRelations[]>;

  const sessionQuery: Prisma.ConversationSessionFindManyArgs = {};
  if (options.userId) {
    sessionQuery.where = { userId: options.userId };
  }

  const [projects, resumes, sessions, technologies] = await Promise.all([
    projectPromise,
    resumePromise,
    prisma.conversationSession.findMany(sessionQuery),
    prisma.technology.findMany()
  ]);

  const { nodes, add } = nodeMap();
  const edges: GraphEdge[] = [];
  const connectionCounter = new Map<string, number>();

  const incrementConnection = (nodeId: string) => {
    connectionCounter.set(nodeId, (connectionCounter.get(nodeId) ?? 0) + 1);
  };

  const technologyById = new Map(technologies.map((tech) => [tech.id, tech]));
  const technologyByName = new Map<string, { id: string; name: string; category?: string | null }>(
    technologies.map((tech) => [tech.name.toLowerCase(), tech])
  );

  const ensureTechnologyNode = (tech: { id: string; name: string; category?: string | null }) => {
    const nodeId = `technology:${tech.id}`;
    add({
      id: nodeId,
      type: 'technology',
      label: tech.name,
      metadata: {
        category: tech.category ?? undefined
      }
    });
    return nodeId;
  };

  const ensureVirtualTechnologyNode = (name: string) => {
    const normalized = name.trim().toLowerCase();
    const existing = technologyByName.get(normalized);
    if (existing) {
      return ensureTechnologyNode(existing);
    }

    const virtualId = `technology:virtual:${normalized}`;
    add({
      id: virtualId,
      type: 'technology',
      label: name,
      metadata: { virtual: true }
    });
    technologyByName.set(normalized, { id: virtualId, name });

    return virtualId;
  };

  const addEdge = (edge: GraphEdge) => {
    edges.push(edge);
    incrementConnection(edge.source);
    incrementConnection(edge.target);
  };

  projects.forEach((project) => {
    const projectNodeId = `project:${project.id}`;
    add({
      id: projectNodeId,
      type: 'project',
      label: project.name,
      metadata: {
        technologies: project.technologies,
        summary: project.summary,
        keyMetrics: project.keyMetrics
      }
    });

    project.technologyLinks.forEach((link) => {
      const techRecord = link.technology ?? technologyById.get(link.technologyId);
      if (!techRecord) {
        return;
      }

      const techNodeId = ensureTechnologyNode(techRecord);
      addEdge({
        id: `edge:tech-project:${techNodeId}:${projectNodeId}`,
        source: techNodeId,
        target: projectNodeId,
        type: 'technology_to_project',
        metadata: {
          usageContext: link.usageContext,
          source: link.source
        }
      });
    });

    project.artifacts.forEach((artifact) => {
      const artifactNodeId = `artifact:${artifact.id}`;
      add({
        id: artifactNodeId,
        type: 'artifact',
        label: `${artifact.kind}`,
        metadata: {
          path: artifact.path,
          metadata: artifact.metadata,
          contentPreview: artifact.contentPreview
        }
      });

      addEdge({
        id: `edge:project-artifact:${projectNodeId}:${artifactNodeId}`,
        source: projectNodeId,
        target: artifactNodeId,
        type: 'project_to_artifact'
      });
    });
  });

  resumes.forEach((resume) => {
    const resumeNodeId = `resume:${resume.id}`;
    add({
      id: resumeNodeId,
      type: 'resume',
      label: `Resume ${resume.sourceName ?? ''}`.trim(),
      metadata: {
        userId: resume.userId,
        summary: resume.extractedSummary,
        skills: resume.skills
      }
    });

    resume.technologyLinks.forEach((link) => {
      const techRecord = link.technology ?? technologyById.get(link.technologyId);
      if (!techRecord) {
        return;
      }

      const techNodeId = ensureTechnologyNode(techRecord);
      addEdge({
        id: `edge:tech-resume:${techNodeId}:${resumeNodeId}`,
        source: techNodeId,
        target: resumeNodeId,
        type: 'technology_to_resume',
        metadata: {
          proficiency: link.proficiency
        }
      });
    });
  });

  sessions.forEach((session) => {
    const personaNodeId = `persona:${session.id}`;
    add({
      id: personaNodeId,
      type: 'persona',
      label: session.personaTopic,
      metadata: {
        userId: session.userId,
        summary: session.personaSummary
      }
    });

    const focusAreas = extractFocusAreasFromInsights(session.insights);
    focusAreas.forEach((area) => {
      const techNodeId = ensureVirtualTechnologyNode(area);
      addEdge({
        id: `edge:persona-tech:${personaNodeId}:${techNodeId}:${area}`,
        source: personaNodeId,
        target: techNodeId,
        type: 'persona_focus',
        metadata: {
          personaTopic: session.personaTopic
        }
      });
    });
  });

  const technologyCount = nodes.filter((node) => node.type === 'technology').length;
  const artifactCount = nodes.filter((node) => node.type === 'artifact').length;

  const topTechnologies = nodes
    .filter((node) => node.type === 'technology')
    .map((node) => ({
      name: node.label,
      connections: connectionCounter.get(node.id) ?? 0
    }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10);

  return {
    nodes,
    edges,
    summary: {
      projectCount: nodes.filter((node) => node.type === 'project').length,
      resumeCount: nodes.filter((node) => node.type === 'resume').length,
      personaCount: nodes.filter((node) => node.type === 'persona').length,
      technologyCount,
      artifactCount,
      topTechnologies
    }
  };
};
