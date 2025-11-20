"use client";

import { useEffect, useRef, useState } from "react";
import { Network, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { forceCenter, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { fetchKnowledgeGraph } from "@/services/knowledge-graph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { KnowledgeGraphEdge, KnowledgeGraphNode, KnowledgeGraphNodeType } from "@/types";

const NODE_TYPE_LABELS: Record<KnowledgeGraphNodeType, string> = {
  project: "Projects",
  resume: "Resumes",
  technology: "Technologies",
  artifact: "Artifacts",
  persona: "Personas",
};

export const KnowledgeGraphPanel = () => {
  const [filter, setFilter] = useState<KnowledgeGraphNodeType | "all">("all");
  const query = useQuery({
    queryKey: ["knowledge-graph"],
    queryFn: () => fetchKnowledgeGraph(),
  });

  const summaryCards = query.data?.summary;
  const nodes = query.data?.nodes ?? [];
  const edges = query.data?.edges ?? [];

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Network className="h-5 w-5 text-primary" />
            Knowledge graph
          </CardTitle>
          <CardDescription>Infrastructure-wide linkage across projects, resumes, technologies, and personas.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {query.isLoading && <Skeleton className="h-64 w-full" />}
        {!query.isLoading && summaryCards && (
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile label="Projects" value={summaryCards.projectCount} />
            <SummaryTile label="Resumes" value={summaryCards.resumeCount} />
            <SummaryTile label="Personas" value={summaryCards.personaCount} />
            <SummaryTile label="Technologies" value={summaryCards.technologyCount} />
            <SummaryTile label="Artifacts" value={summaryCards.artifactCount} />
            {summaryCards.topTechnologies?.length ? (
              <div className="rounded-xl border border-dashed border-primary/40 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-primary">Top tech</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {summaryCards.topTechnologies.map((tech) => (
                    <Badge key={tech.name} variant="secondary">
                      {tech.name} ({tech.connections})
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
        {!query.isLoading && nodes.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <FilterPill label="All" active={filter === "all"} onClick={() => setFilter("all")} />
              {(Object.keys(NODE_TYPE_LABELS) as KnowledgeGraphNodeType[]).map((type) => (
                <FilterPill
                  key={type}
                  label={NODE_TYPE_LABELS[type]}
                  active={filter === type}
                  onClick={() => setFilter(type)}
                />
              ))}
            </div>
            <GraphCanvas nodes={nodes} edges={edges} highlight={filter} />
          </div>
        )}
        {!query.isLoading && nodes.length === 0 && (
          <p className="text-sm text-muted-foreground">Index projects or ingest resumes to populate the knowledge graph.</p>
        )}
      </CardContent>
    </Card>
  );
};

const SummaryTile = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-border/60 bg-card/60 p-4">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-2xl font-semibold">{value}</p>
  </div>
);

const FilterPill = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-xs ${
      active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
    }`}
  >
    {label}
  </button>
);

type GraphNodeSim = KnowledgeGraphNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

type GraphLinkSim = KnowledgeGraphEdge & {
  source: GraphNodeSim;
  target: GraphNodeSim;
};

const GraphCanvas = ({
  nodes,
  edges,
  highlight,
}: {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  highlight: KnowledgeGraphNodeType | "all";
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNodeSim[]>([]);
  const edgesRef = useRef<GraphLinkSim[]>([]);
  const [dimensions, setDimensions] = useState({ width: 600, height: 420 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNodeSim } | null>(null);
  const highlightRef = useRef<KnowledgeGraphNodeType | "all">("all");

  useEffect(() => {
    highlightRef.current = highlight;
  }, [highlight]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setDimensions((prev) => ({
        width: entry.contentRect.width,
        height: prev.height,
      }));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!nodes.length) return;
    const width = dimensions.width;
    const height = dimensions.height;
    const nodeCopies: GraphNodeSim[] = nodes.map((node) => ({ ...node }));
    const nodeMap = new Map(nodeCopies.map((node) => [node.id, node]));
    const edgeCopies: GraphLinkSim[] = edges
      .map((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return null;
        return { ...edge, source, target };
      })
      .filter(Boolean) as GraphLinkSim[];

    nodesRef.current = nodeCopies;
    edgesRef.current = edgeCopies;

    const simulation = forceSimulation(nodeCopies)
      .force("charge", forceManyBody().strength(-90))
      .force("center", forceCenter(width / 2, height / 2))
      .force(
        "link",
        forceLink(edgeCopies)
          .id((d) => (d as KnowledgeGraphNode).id)
          .distance(140)
          .strength(0.5),
      )
      .stop();

    for (let i = 0; i < 240; i += 1) {
      simulation.tick();
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrame: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(148,163,184,0.4)";
      edgeCopies.forEach((edge) => {
        ctx.beginPath();
        ctx.moveTo(edge.source.x ?? 0, edge.source.y ?? 0);
        ctx.lineTo(edge.target.x ?? 0, edge.target.y ?? 0);
        ctx.stroke();
      });
      nodeCopies.forEach((node) => {
        const currentHighlight = highlightRef.current;
        const isHighlighted = currentHighlight === "all" || node.type === currentHighlight;
        const radius = isHighlighted ? 7 : 5;
        ctx.beginPath();
        ctx.fillStyle = getNodeColor(node.type, isHighlighted);
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
      animationFrame = requestAnimationFrame(draw);
    };
    animationFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrame);
  }, [nodes, edges, dimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nearest = nodesRef.current.find((node) => {
        const dx = (node.x ?? 0) - x;
        const dy = (node.y ?? 0) - y;
        return Math.sqrt(dx * dx + dy * dy) < 10;
      });
      if (nearest) {
        setTooltip({ x, y, node: nearest });
      } else {
        setTooltip(null);
      }
    };
    const handleLeave = () => setTooltip(null);
    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("pointerleave", handleLeave);
    return () => {
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        width={Math.max(1, Math.floor(dimensions.width))}
        height={dimensions.height}
        className="h-[420px] w-full rounded-xl border border-border/60 bg-background"
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute rounded-md border border-border/80 bg-popover px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <p className="font-medium text-foreground">{tooltip.node.label}</p>
          <p className="text-[10px] uppercase text-muted-foreground">{NODE_TYPE_LABELS[tooltip.node.type]}</p>
        </div>
      )}
    </div>
  );
};

const getNodeColor = (type: KnowledgeGraphNodeType, highlight: boolean) => {
  const palette: Record<KnowledgeGraphNodeType, string> = {
    project: highlight ? "#2563eb" : "#93c5fd",
    resume: highlight ? "#10b981" : "#6ee7b7",
    technology: highlight ? "#f97316" : "#fdba74",
    artifact: highlight ? "#6366f1" : "#c7d2fe",
    persona: highlight ? "#ec4899" : "#f9a8d4",
  };
  return palette[type];
};
