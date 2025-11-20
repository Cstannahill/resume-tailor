"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { tailorJobAsset } from "@/services/retrieval";
import { listProjects } from "@/services/projects";
import { listResumes } from "@/services/resumes";
import { LlmProviderSelect } from "@/components/llm-provider-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportToDocx, exportToPdf } from "@/lib/exporters";
import type { ExportPayload, ExportSection } from "@/lib/exporters";

const schema = z.object({
  jobTitle: z.string().min(2),
  jobDescription: z.string().min(100, "Paste the job description for the AI to reason."),
  resumeId: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
  llmProvider: z.enum(["ollama", "bedrock", "google", "openrouter"]).optional(),
});

type FormValues = z.infer<typeof schema>;

export interface IntelContextPayload {
  jobTitle?: string;
  jobDescription?: string;
  resumeId?: string;
  projectIds?: string[];
}

interface Props {
  intelContext?: IntelContextPayload;
}

export const CoverLetterWorkbench = ({ intelContext }: Props) => {
  const [result, setResult] = useState<string>("");
  const [aiMeta, setAiMeta] = useState<{
    projectHighlights: string[];
    resumeBullets: string[];
    alignmentNotes?: string;
  }>({ projectHighlights: [], resumeBullets: [], alignmentNotes: "" });
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(),
  });
  const resumesQuery = useQuery({
    queryKey: ["resumes"],
    queryFn: () => listResumes(),
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const selectedProjectIds =
    useWatch({
      control: form.control,
      name: "projectIds",
    }) ?? [];
  const llmProviderValue = useWatch({
    control: form.control,
    name: "llmProvider",
  });
  const jobTitleValue = useWatch({
    control: form.control,
    name: "jobTitle",
  });

  useEffect(() => {
    if (!intelContext) return;
    if (intelContext.jobTitle) {
      form.setValue("jobTitle", intelContext.jobTitle);
    }
    if (intelContext.jobDescription) {
      form.setValue("jobDescription", intelContext.jobDescription);
    }
    if (intelContext.resumeId) {
      form.setValue("resumeId", intelContext.resumeId);
    }
    if (intelContext.projectIds?.length) {
      const existing = form.getValues("projectIds") ?? [];
      const merged = Array.from(new Set([...existing, ...intelContext.projectIds]));
      form.setValue("projectIds", merged);
    }
  }, [intelContext, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      tailorJobAsset({
        jobTitle: values.jobTitle,
        jobDescription: values.jobDescription,
        resumeId: values.resumeId,
        projectIds: values.projectIds,
        llmProvider: values.llmProvider,
        assetType: "cover_letter",
      }),
    onSuccess: (payload) => {
      const parsed = parseCoverLetterContent(payload.record.content, payload.recommendations);
      setResult(parsed.content);
      setAiMeta({
        projectHighlights: parsed.projectHighlights ?? payload.recommendations.projectHighlights ?? [],
        resumeBullets: parsed.resumeBullets ?? payload.recommendations.resumeBullets ?? [],
        alignmentNotes: parsed.alignmentNotes ?? payload.recommendations.alignmentNotes ?? "",
      });
      toast.success("Cover letter ready", {
        description: "Edit and export as needed.",
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleProjectSelection = (projectId: string) => {
    const current = new Set(form.getValues("projectIds") ?? []);
    if (current.has(projectId)) {
      current.delete(projectId);
    } else {
      current.add(projectId);
    }
    form.setValue("projectIds", Array.from(current));
  };

  const exportPayload: ExportPayload = useMemo(() => {
    const paragraphs = result
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
      .filter(Boolean);
    const sections = (
      [
        {
          heading: "Cover Letter",
          lines: paragraphs,
        },
        aiMeta.projectHighlights.length
          ? { heading: "Project Highlights", lines: aiMeta.projectHighlights }
          : null,
        aiMeta.resumeBullets.length ? { heading: "Resume Bullets", lines: aiMeta.resumeBullets } : null,
        aiMeta.alignmentNotes
          ? { heading: "Alignment Notes", lines: [aiMeta.alignmentNotes] }
          : null,
      ] satisfies (ExportSection | null)[]
    ).filter((section): section is ExportSection => Boolean(section));
    return {
      title: `${jobTitleValue || "Cover Letter"} - ${llmProviderValue ?? "auto"}`,
      sections,
    };
  }, [result, aiMeta, jobTitleValue, llmProviderValue]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Tailor for a role</CardTitle>
          <CardDescription>
            Provide the job context and let the retrieval layer pull resume + project signals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Job title</Label>
            <Input placeholder="Senior React Engineer" {...form.register("jobTitle")} />
          </div>
          <div className="space-y-1.5">
            <Label>Job description</Label>
            <Textarea rows={8} placeholder="Paste the JD or recruiter notes" {...form.register("jobDescription")} />
          </div>
          <div className="space-y-1.5">
            <Label>Resume source</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...form.register("resumeId")}
            >
              <option value="">Auto-select latest</option>
              {resumesQuery.data?.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.sourceName ?? resume.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Emphasize projects</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {projectsQuery.data?.map((project) => {
                const active = selectedProjectIds.includes(project.id);
                return (
                  <button
                    key={project.id}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    }`}
                    onClick={() => handleProjectSelection(project.id)}
                  >
                    {project.name}
                  </button>
                );
              })}
            </div>
          </div>
          <LlmProviderSelect
            value={llmProviderValue}
            onChange={(value) => form.setValue("llmProvider", value)}
          />
          {intelContext && (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
              Applied job intelligence: selected {intelContext.projectIds?.length ?? 0} projects and{" "}
              {intelContext.resumeId ? "1 resume" : "0 resumes"} from matched assets.
            </div>
          )}
          <Button type="button" onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
            {mutation.isPending ? "Generating..." : "Generate cover letter"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI output</CardTitle>
          <CardDescription>
            Edit the content before exporting to PDF or DOCX. Recommendations feed into the builder.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-full flex-col gap-4">
          <Textarea
            className="min-h-[300px] flex-1"
            value={result}
            onChange={(event) => setResult(event.target.value)}
            placeholder="Your tailored cover letter will appear here."
          />
          {(aiMeta.projectHighlights.length > 0 ||
            aiMeta.resumeBullets.length > 0 ||
            aiMeta.alignmentNotes) && (
            <div className="grid gap-3 lg:grid-cols-2">
              {aiMeta.projectHighlights.length > 0 && (
                <InsightCard title="Project highlights" items={aiMeta.projectHighlights} />
              )}
              {aiMeta.resumeBullets.length > 0 && (
                <InsightCard title="Resume bullets" items={aiMeta.resumeBullets} />
              )}
              {aiMeta.alignmentNotes && (
                <InsightCard title="Alignment notes" body={aiMeta.alignmentNotes} />
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => exportToPdf(exportPayload, "cover-letter.pdf")} disabled={!result}>
              PDF
            </Button>
            <Button type="button" variant="outline" onClick={() => exportToDocx(exportPayload, "cover-letter.docx")} disabled={!result}>
              DOCX
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const InsightCard = ({
  title,
  items,
  body,
}: {
  title: string;
  items?: string[];
  body?: string;
}) => (
  <div className="rounded-xl border border-border/60 p-4">
    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{title}</p>
    {items && (
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`}>{item}</li>
        ))}
      </ul>
    )}
    {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
  </div>
);

const stripCodeFences = (value: string) =>
  value.replace(/```json/gi, "").replace(/```/g, "").trim();

const parseCoverLetterContent = (
  raw: string | {
    content: string;
    projectHighlights?: string[];
    resumeBullets?: string[];
    alignmentNotes?: string;
  } | undefined,
  recommendations?: { projectHighlights?: string[]; resumeBullets?: string[]; alignmentNotes?: string },
) => {
  const fallback = {
    projectHighlights: recommendations?.projectHighlights ?? [],
    resumeBullets: recommendations?.resumeBullets ?? [],
    alignmentNotes: recommendations?.alignmentNotes,
  };
  if (!raw) {
    return {
      content: "",
      ...fallback,
    };
  }
  if (typeof raw === "object") {
    return {
      content: raw.content ?? "",
      projectHighlights: raw.projectHighlights ?? fallback.projectHighlights,
      resumeBullets: raw.resumeBullets ?? fallback.resumeBullets,
      alignmentNotes: raw.alignmentNotes ?? fallback.alignmentNotes,
    };
  }
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = stripCodeFences(cleaned);
  }
  try {
    const parsed = JSON.parse(cleaned);
    return {
      content: typeof parsed.content === "string" ? parsed.content : cleaned,
      projectHighlights: parsed.projectHighlights ?? fallback.projectHighlights,
      resumeBullets: parsed.resumeBullets ?? fallback.resumeBullets,
      alignmentNotes: parsed.alignmentNotes ?? fallback.alignmentNotes,
    };
  } catch {
    return {
      content: cleaned,
      ...fallback,
    };
  }
};
