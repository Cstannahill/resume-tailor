export type GraphNodeType = 'project' | 'resume' | 'technology' | 'artifact' | 'persona';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    projectCount: number;
    resumeCount: number;
    personaCount: number;
    technologyCount: number;
    artifactCount: number;
    topTechnologies: Array<{ name: string; connections: number }>;
  };
}

export interface KnowledgeGraphOptions {
  userId?: string;
}
