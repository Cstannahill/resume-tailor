"use client";

import { useQuery } from "@tanstack/react-query";
import { GraduationCap, NotebookPen } from "lucide-react";
import { listResumes } from "@/services/resumes";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const ResumeInsightsCard = () => {
  const query = useQuery({
    queryKey: ["resumes"],
    queryFn: () => listResumes(),
  });

  const latest = query.data?.[0];
  const insight = latest?.insight;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-primary" />
          Resume intelligence
        </CardTitle>
        <CardDescription>Key signals extracted from your latest upload.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading && <Skeleton className="h-24 w-full" />}
        {!query.isLoading && !latest && (
          <p className="text-sm text-muted-foreground">Upload a resume to get started.</p>
        )}
        {insight && (
          <>
            <p className="text-sm">{insight.summary}</p>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs uppercase text-muted-foreground">Core skills</p>
              <p className="text-sm">{insight.skills?.slice(0, 8).join(" / ")}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs uppercase text-muted-foreground">Recent experience</p>
              <ul className="mt-1 space-y-1 text-sm">
                {insight.experiences?.slice(0, 2).map((exp, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    {exp.role} / {exp.company}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href="/resume">Open resume builder</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
