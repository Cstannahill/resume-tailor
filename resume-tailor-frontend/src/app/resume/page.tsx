"use client";

import { useQuery } from "@tanstack/react-query";
import { listResumes } from "@/services/resumes";
import { ResumeIngestForm } from "@/components/modules/resume/resume-ingest-form";
import { ResumeBuilder } from "@/components/modules/resume/resume-builder";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthWall } from "@/components/modules/auth/auth-wall";
import { AuthPanel } from "@/components/modules/auth/auth-panel";

export default function ResumePage() {
  const query = useQuery({
    queryKey: ["resumes"],
    queryFn: () => listResumes(),
  });

  const resume = query.data?.[0];

  return (
    <div className="space-y-8 pb-16">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-primary">Resume Studio</p>
        <h1 className="text-3xl font-semibold">Ingest, refine, and export ATS-ready resumes.</h1>
        <p className="text-muted-foreground">
          The Experience API merges regex heuristics with LLM reasoning so you can focus on editing.
        </p>
      </div>
      <AuthWall fallback={<AuthPanel />}>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <ResumeIngestForm />
          {query.isLoading && <Skeleton className="h-[600px] w-full" />}
          {!query.isLoading && <ResumeBuilder resume={resume} />}
        </div>
      </AuthWall>
    </div>
  );
}
