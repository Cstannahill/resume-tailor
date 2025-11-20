"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw } from "lucide-react";
import { listProjects } from "@/services/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
export const ProjectList = () => {
  const query = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(),
  });

  const projects = query.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent projects</CardTitle>
          <CardDescription>Summaries extracted directly from source code.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <Skeleton key={idx} className="h-24 w-full" />
            ))}
          </div>
        )}
        {!query.isLoading && projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Index a project to see AI insights here.
          </div>
        )}
        {!query.isLoading &&
          projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4 md:flex-row md:items-start md:justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-base font-semibold">{project.name}</h4>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {project.technologies?.[0] ?? "LLM"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                {project.highlights && project.highlights.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {project.highlights.slice(0, 2).map((highlight, idx) => (
                      <li key={`${project.id}-h-${idx}`}>{highlight}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex w-full flex-col items-end gap-1 text-right text-xs text-muted-foreground md:w-40">
                <span>{project.technologies?.slice(0, 3).join(" / ")}</span>
                <span>{formatDate(project.updatedAt)}</span>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
};
