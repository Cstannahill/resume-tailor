"use client";

import { useMutation } from "@tanstack/react-query";
import { Brain, FileQuestion } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { analyzeJobDescription } from "@/services/intelligence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LlmProviderSelect } from "@/components/llm-provider-select";
import type { JobIntelligenceResponse, LLMProvider } from "@/types";
import { Badge } from "@/components/ui/badge";

type JobIntelResult = Awaited<ReturnType<typeof analyzeJobDescription>>;

interface Props {
  onAnalysisComplete?: (payload: {
    jobTitle?: string;
    jobDescription: string;
    result: JobIntelligenceResponse;
  }) => void;
}

export const JobIntelWorkbench = ({ onAnalysisComplete }: Props) => {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [provider, setProvider] = useState<LLMProvider>();
  const mutation = useMutation({
    mutationFn: () =>
      analyzeJobDescription({
        jobDescription,
        llmProvider: provider,
      }),
    onSuccess: (data) => {
      toast.success("Job insights ready");
      onAnalysisComplete?.({
        jobTitle,
        jobDescription,
        result: data,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Card className="border-accent/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Job intelligence
        </CardTitle>
        <CardDescription>
          Analyze descriptions for requirements, risks, and auto-links to your indexed work.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Job title</Label>
            <Input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Principal Frontend Engineer" />
          </div>
          <div className="space-y-1.5">
            <Label>Job description</Label>
            <Textarea
              rows={10}
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the JD here..."
            />
          </div>
          <LlmProviderSelect value={provider} onChange={(value) => setProvider(value)} label="LLM Provider" optional />
          <Button
            type="button"
            disabled={mutation.isPending || !jobDescription}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Analyzing..." : "Analyze job"}
          </Button>
        </div>
        <JobIntelResults result={mutation.data} jobTitle={jobTitle} />
      </CardContent>
    </Card>
  );
};

const JobIntelResults = ({ result, jobTitle }: { result: JobIntelResult | undefined; jobTitle: string }) => {
  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
        <FileQuestion className="mb-3 h-6 w-6" />
        Insights will appear here after analysis.
      </div>
    );
  }

  const coverage = result.matches.coverage ?? { covered: [], missing: [] };

  return (
    <div className="space-y-4">
      {jobTitle && <p className="text-sm font-medium text-muted-foreground">Target role: {jobTitle}</p>}
      <section className="rounded-xl border border-border/60 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Summary</h3>
        <p className="mt-2 text-sm">{result.insights.roleSummary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.insights.senioritySignals?.map((signal) => (
            <Badge key={signal} variant="secondary">
              {signal}
            </Badge>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-border/60 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Required technologies</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {result.insights.requiredTechnologies && result.insights.requiredTechnologies.length > 0 ? (
            result.insights.requiredTechnologies.map((tech) => (
              <li key={tech.name} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <span>{tech.name}</span>
                <span className="text-xs uppercase text-muted-foreground">{tech.importance}</span>
              </li>
            ))
          ) : (
            <li className="text-xs text-muted-foreground">No technologies detected.</li>
          )}
        </ul>
      </section>
      <section className="rounded-xl border border-border/60 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Matches</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Projects</p>
            <ul className="mt-1 space-y-1 text-sm">
              {result.matches.projects?.map((project) => (
                <li key={project.id} className="rounded-md border border-border/50 px-2 py-1">
                  <span className="font-medium">{project.name}</span>
                  {project.matchingTechnologies && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {project.matchingTechnologies.join(", ")}
                    </span>
                  )}
                </li>
              ))}
              {(result.matches.projects?.length ?? 0) === 0 && (
                <li className="text-xs text-muted-foreground">No indexed projects matched.</li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Resumes</p>
            <ul className="mt-1 space-y-1 text-sm">
              {result.matches.resumes?.map((resume) => (
                <li key={resume.id} className="rounded-md border border-border/50 px-2 py-1">
                  <span className="font-medium">{resume.sourceName ?? resume.id}</span>
                  {resume.matchingSkills && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {resume.matchingSkills.join(", ")}
                    </span>
                  )}
                </li>
              ))}
              {(result.matches.resumes?.length ?? 0) === 0 && (
                <li className="text-xs text-muted-foreground">No resume overlap detected.</li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs uppercase text-emerald-600">Covered</p>
            <p className="text-sm text-emerald-700">{coverage.covered.join(", ") || "None"}</p>
          </div>
          <div className="flex-1 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs uppercase text-rose-600">Missing</p>
            <p className="text-sm text-rose-700">{coverage.missing.join(", ") || "None"}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
