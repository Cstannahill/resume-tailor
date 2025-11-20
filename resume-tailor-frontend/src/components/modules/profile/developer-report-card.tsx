"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchDeveloperReport } from "@/services/profile";
import type { DeveloperReportData, LLMProvider } from "@/types";
import { LlmProviderSelect } from "@/components/llm-provider-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SectionList = ({
  label,
  items,
}: {
  label: string;
  items?: string[];
}) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-primary">{label}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
        {items.map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export const DeveloperReportCard = () => {
  const [report, setReport] = useState<DeveloperReportData | null>(null);
  const [llmProvider, setLlmProvider] = useState<LLMProvider | undefined>();

  const mutation = useMutation({
    mutationFn: () => fetchDeveloperReport(llmProvider ? { llmProvider } : undefined),
    onSuccess: (response) => {
      setReport(response.data);
    },
    onError: (error: Error) => {
      toast.error("Unable to load developer report", {
        description: error.message,
      });
    },
  });

  const handleGenerate = () => mutation.mutate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Developer baseline
        </CardTitle>
        <CardDescription>
          Inspect the full picture of what the platform already knows before requesting more AI work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LlmProviderSelect value={llmProvider} onChange={(value) => setLlmProvider(value)} />
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={handleGenerate}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Generating report..." : report ? "Refresh report" : "Generate report"}
        </Button>
        {report ? (
          <div className="space-y-4 text-sm">
            {report.developerOverview && (
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs uppercase text-muted-foreground">Overview</p>
                <p className="mt-1">{report.developerOverview}</p>
              </div>
            )}
            <SectionList label="Core strengths" items={report.coreStrengths} />
            <SectionList label="Growth opportunities" items={report.growthOpportunities} />
            <SectionList label="Project evidence" items={report.projectEvidence} />
            <SectionList label="Technical depth" items={report.technicalDepth} />
            <SectionList label="Risk caveats" items={report.riskCaveats} />
            {report.confidence && (
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Confidence: <span className="font-medium normal-case tracking-normal">{report.confidence}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Generate a baseline to validate the signals your resume, indexed projects, and coaching sessions
            already provide.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
