export type KnowledgeGraphNodeType =
  | "project"
  | "resume"
  | "technology"
  | "artifact"
  | "persona";

export interface KnowledgeGraphNode {
  id: string;
  type: KnowledgeGraphNodeType;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraphSummary {
  projectCount: number;
  resumeCount: number;
  personaCount: number;
  technologyCount: number;
  artifactCount: number;
  topTechnologies: Array<{ name: string; connections: number }>;
}

export interface KnowledgeGraphPayload {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  summary: KnowledgeGraphSummary;
}
