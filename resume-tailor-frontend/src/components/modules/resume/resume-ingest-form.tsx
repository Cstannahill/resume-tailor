"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ingestResume } from "@/services/resumes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LlmProviderSelect } from "@/components/llm-provider-select";

const schema = z.object({
  resumeText: z.string().min(200, "Provide at least a few paragraphs of text."),
  sourceName: z.string().optional(),
  llmProvider: z.enum(["ollama", "bedrock", "google", "openrouter"]).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onIngested?: () => void;
}

export const ResumeIngestForm = ({ onIngested }: Props) => {
  const client = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const [fileName, setFileName] = useState<string>();

  const llmProviderValue = useWatch({
    control: form.control,
    name: "llmProvider",
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      ingestResume({
        resumeText: values.resumeText,
        sourceName: values.sourceName ?? fileName,
        llmProvider: values.llmProvider,
      }),
    onSuccess: () => {
      toast.success("Resume ingested", {
        description: "AI insights updated and ready for tailoring.",
      });
      client.invalidateQueries({ queryKey: ["resumes"] });
      onIngested?.();
      form.reset();
      setFileName(undefined);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    form.setValue("resumeText", text);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Resume ingestion</CardTitle>
        <CardDescription>Paste resume text or drop a PDF to let the adapter extract structured data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Drag a text/PDF file</Label>
          <Input
            type="file"
            accept=".txt,.pdf"
            onChange={(event) => handleFile(event.target.files?.[0] ?? undefined)}
          />
          {fileName && <p className="text-xs text-muted-foreground">Loaded file: {fileName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Resume text</Label>
          <Textarea rows={8} placeholder="Paste resume text..." {...form.register("resumeText")} />
        </div>
        <div className="space-y-1.5">
          <Label>Source label</Label>
          <Input placeholder="May 2024 resume" {...form.register("sourceName")} />
        </div>
        <LlmProviderSelect
          value={llmProviderValue}
          onChange={(value) => form.setValue("llmProvider", value)}
        />
        <Button type="button" onClick={form.handleSubmit((values) => mutation.mutate(values))} disabled={mutation.isPending}>
          {mutation.isPending ? "Ingesting..." : "Extract insights"}
        </Button>
      </CardContent>
    </Card>
  );
};
