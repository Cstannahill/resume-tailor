"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, FolderGit2, PenLine, MessageCircle } from "lucide-react";
import { listProjects } from "@/services/projects";
import { listResumes } from "@/services/resumes";
import { listTailoredAssets } from "@/services/retrieval";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const KpiGrid = () => {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(),
  });
  const resumesQuery = useQuery({
    queryKey: ["resumes"],
    queryFn: () => listResumes(),
  });
  const assetsQuery = useQuery({
    queryKey: ["tailored-assets"],
    queryFn: () => listTailoredAssets(),
  });

  const metrics = [
    {
      label: "Indexed projects",
      value: projectsQuery.data?.length ?? 0,
      icon: FolderGit2,
      accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Resume records",
      value: resumesQuery.data?.length ?? 0,
      icon: PenLine,
      accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Tailored assets",
      value: assetsQuery.data?.length ?? 0,
      icon: Sparkles,
      accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Coaching sessions",
      value: 1,
      icon: MessageCircle,
      accent: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-full p-2 ${metric.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">{metric.label}</p>
                {projectsQuery.isLoading || resumesQuery.isLoading || assetsQuery.isLoading ? (
                  <Skeleton className="mt-1 h-6 w-16" />
                ) : (
                  <p className="text-2xl font-semibold">{metric.value}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
