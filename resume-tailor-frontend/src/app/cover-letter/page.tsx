"use client";

import { useState } from "react";
import {
  CoverLetterWorkbench,
  type IntelContextPayload,
} from "@/components/modules/retrieval/cover-letter-workbench";
import { JobIntelWorkbench } from "@/components/modules/intelligence/job-intel-workbench";
import type { JobIntelligenceResponse } from "@/types";
import { AuthWall } from "@/components/modules/auth/auth-wall";
import { AuthPanel } from "@/components/modules/auth/auth-panel";

export default function CoverLetterPage() {
  const [intelContext, setIntelContext] = useState<IntelContextPayload>();

  const handleIntelComplete = ({
    jobTitle,
    jobDescription,
    result,
  }: {
    jobTitle?: string;
    jobDescription: string;
    result: JobIntelligenceResponse;
  }) => {
    const resumeId = result.matches.resumes?.[0]?.id;
    const projectIds = result.matches.projects?.map((project) => project.id) ?? [];
    setIntelContext({
      jobTitle,
      jobDescription,
      resumeId,
      projectIds,
    });
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-primary">Cover Letter Studio</p>
        <h1 className="text-3xl font-semibold">Tailored outreach backed by your actual work.</h1>
        <p className="text-muted-foreground">
          Pair job descriptions with indexed repos, resume highlights, and persona insights. Export polished
          PDF or DOCX files that pass both ATS and human review.
        </p>
      </div>
      <AuthWall fallback={<AuthPanel />}>
        <CoverLetterWorkbench intelContext={intelContext} />
        <JobIntelWorkbench onAnalysisComplete={handleIntelComplete} />
      </AuthWall>
    </div>
  );
}
