"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PROJECT_SOURCE_KINDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { indexProject } from "@/services/projects";
import { LlmProviderSelect } from "@/components/llm-provider-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { IndexProjectPayload, LLMProvider } from "@/types";

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value ?? undefined;
};

const formSchema = z
  .object({
    name: z.string().min(2, "Project name is required"),
    description: z.preprocess(emptyToUndefined, z.string().optional()),
    sourceKind: z.enum(["github", "local"]).default("github"),
    repoUrl: z.preprocess(
      emptyToUndefined,
      z.string().url("Valid repo URL required").optional(),
    ),
    branch: z.preprocess(emptyToUndefined, z.string().optional()),
    localPath: z.preprocess(
      emptyToUndefined,
      z.string().min(2, "Local path is required").optional(),
    ),
    tags: z.preprocess(emptyToUndefined, z.string().optional()),
    llmProvider: z.enum(["ollama", "bedrock", "google", "openrouter"]).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.sourceKind === "github" && !values.repoUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repoUrl"],
        message: "Repository URL is required when indexing from GitHub.",
      });
    }
    if (values.sourceKind === "local" && !values.localPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["localPath"],
        message: "Local path is required when indexing from a local directory.",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface Props {
  onIndexed?: () => void;
}

export const ProjectIndexer = ({ onIndexed }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceKind: "github",
    },
  });

  const sourceKind =
    useWatch({
      control: form.control,
      name: "sourceKind",
    }) ?? "github";
  const llmProviderValue = useWatch({
    control: form.control,
    name: "llmProvider",
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: IndexProjectPayload = {
        name: values.name,
        description: values.description,
        tags: values.tags?.split(",").map((tag) => tag.trim()).filter(Boolean),
        llmProvider: values.llmProvider,
        source:
          values.sourceKind === "github"
            ? {
                kind: "github",
                repoUrl: values.repoUrl!,
                branch: values.branch,
                shallow: true,
              }
            : {
                kind: "local",
                path: values.localPath!,
              },
      };
      return indexProject(payload);
    },
    onSuccess: (data) => {
      toast.success("Project indexed", {
        description: data.summary ?? "LLM summary ready.",
      });
      onIndexed?.();
      form.reset({ sourceKind });
    },
    onError: (error: Error) => {
      toast.error("Unable to index project", { description: error.message });
    },
  });

  const sourceFields = useMemo(() => {
    if (sourceKind === "github") {
      return (
        <>
          <div className="space-y-1.5">
            <Label>Repository URL</Label>
            <Input placeholder="https://github.com/org/repo" {...form.register("repoUrl")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Input placeholder="main" {...form.register("branch")} />
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma separated)</Label>
              <Input placeholder="ai, resume, web" {...form.register("tags")} />
            </div>
          </div>
        </>
      );
    }
    return (
      <div className="space-y-1.5">
        <Label>Local path</Label>
        <Input placeholder="C:\\projects\\sample" {...form.register("localPath")} />
      </div>
    );
  }, [form, sourceKind]);

  const handleSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Index a project</CardTitle>
        <CardDescription>LLM summarizes your repo to unlock resume-ready insights.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            {PROJECT_SOURCE_KINDS.map((option) => {
              const isActive = sourceKind === option.id;
              return (
              <button
                key={option.id}
                type="button"
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  isActive ? "border-primary bg-primary/5" : "border-border",
                )}
                onClick={() => form.setValue("sourceKind", option.id as "github" | "local")}
              >
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {option.id === "github"
                    ? "Clone + analyze files from GitHub."
                    : "Use a local path accessible to the API."}
                </p>
              </button>
            );
          })}
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input placeholder="AI Resume Toolkit" {...form.register("name")} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Short blurb for the dashboard" {...form.register("description")} />
          </div>

          {sourceFields}

          <LlmProviderSelect
            value={llmProviderValue as LLMProvider | undefined}
            onChange={(value) => form.setValue("llmProvider", value)}
          />

          <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
            {mutation.isPending ? "Indexing..." : "Index project"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
