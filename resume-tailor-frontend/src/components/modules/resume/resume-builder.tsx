"use client";

import { useMemo, useState } from "react";
import { BookOpen, Download, FileText, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useResumeDraft } from "@/hooks/useResumeDraft";
import type { ResumeRecord, ResumeSectionType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { exportToDocx, exportToPdf } from "@/lib/exporters";
import {
  generateResumeSection,
  improveResumeSection,
  updateResumeSection,
} from "@/services/resumes";
import { toast } from "sonner";

interface Props {
  resume?: ResumeRecord;
}

interface SectionSuggestionState {
  key: string;
  section: ResumeSectionType;
  content: string[];
  rationale?: string;
  experienceIndex?: number;
}

export const ResumeBuilder = ({ resume }: Props) => {
  const insight = resume?.insight;
  const { draft, updateDraft, addCustomSection, removeSection } = useResumeDraft(insight);
  const resumeId = resume?.id;
  const [suggestionState, setSuggestionState] = useState<Record<string, SectionSuggestionState>>({});
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);

  const formatSkillsForExport = (skills: string[]) => {
    const entries = skills.map((skill) => skill.trim()).filter(Boolean);
    if (entries.length === 0) return [];
    const chunkSize = 6;
    const chunks: string[] = [];
    for (let i = 0; i < entries.length; i += chunkSize) {
      chunks.push(entries.slice(i, i + chunkSize).join(", "));
    }
    return chunks;
  };

  const sectionsForExport = useMemo(
    () => [
      {
        heading: "Summary",
        lines: [draft.summary].filter(Boolean),
      },
      {
        heading: "Skills",
        lines: formatSkillsForExport(draft.skills),
      },
      {
        heading: "Experience",
        lines: draft.experiences.flatMap((exp) => [
          `${exp.role} / ${exp.company}`,
          ...exp.achievements,
        ]),
      },
      {
        heading: "Education",
        lines: draft.education.map((edu) => `${edu.degree ?? ""} / ${edu.institution}`),
      },
      ...draft.sections.map((section) => ({
        heading: section.title,
        lines: section.body.split("\n"),
      })),
    ],
    [draft],
  );

  const buildSectionKey = (section: ResumeSectionType, experienceIndex?: number) =>
    `${section}${experienceIndex !== undefined ? `-${experienceIndex}` : ""}`;

  const suggestionFor = (section: ResumeSectionType, experienceIndex?: number) =>
    suggestionState[buildSectionKey(section, experienceIndex)];

  const extractLines = (value: string): string[] => {
    const sanitized = value.replace(/\r/g, "").replace(/[\u2022\u25CF\u25AA]/g, "\n");
    const lines = sanitized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.length > 0 ? lines : sanitized.trim() ? [sanitized.trim()] : [];
  };

  const normalizeSuggestionContent = (
    section: ResumeSectionType,
    rawContent: unknown,
  ): string[] => {
    if (Array.isArray(rawContent)) {
      const normalized = rawContent
        .flatMap((entry) =>
          extractLines(typeof entry === "string" ? entry : String(entry ?? "")),
        )
        .filter(Boolean);
      return section === "skills"
        ? normalized
            .flatMap((entry) => entry.split(/[,/|]/))
            .map((entry) => entry.trim())
            .filter(Boolean)
        : normalized;
    }
    if (typeof rawContent === "string") {
      const base = extractLines(rawContent);
      if (section === "skills") {
        return base
          .flatMap((entry) => entry.split(/[,/|]/))
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      return base;
    }
    if (rawContent && typeof rawContent === "object") {
      return normalizeSuggestionContent(
        section,
        Object.values(rawContent)
          .map((value) => (typeof value === "string" ? value : String(value ?? "")))
          .join("\n"),
      );
    }
    return [];
  };

  const setSuggestionEntry = (suggestion: SectionSuggestionState) => {
    setSuggestionState((prev) => ({
      ...prev,
      [suggestion.key]: suggestion,
    }));
  };

  const clearSuggestionFor = (section: ResumeSectionType, experienceIndex?: number) => {
    const key = buildSectionKey(section, experienceIndex);
    setSuggestionState((prev) => {
      if (!(key in prev)) return prev;
      const clone = { ...prev };
      delete clone[key];
      return clone;
    });
  };

  const handleSkillsChange = (value: string) =>
    updateDraft({
      skills: value.split(",").map((skill) => skill.trim()).filter(Boolean),
    });

  const handleExperienceChange = (
    index: number,
    field: "company" | "role" | "achievements",
    value: string,
  ) => {
    const experiences = [...draft.experiences];
    const target = experiences[index] ?? { company: "", role: "", achievements: [] };
    if (field === "achievements") {
      target.achievements = value.split("\n").filter(Boolean);
    } else {
      target[field] = value;
    }
    experiences[index] = target;
    updateDraft({ experiences });
  };

  const addExperience = () =>
    updateDraft({
      experiences: [
        ...draft.experiences,
        { company: "", role: "", achievements: ["Impact bullet"] },
      ],
    });

  const handleEducationChange = (
    index: number,
    field: "institution" | "degree",
    value: string,
  ) => {
    const education = [...draft.education];
    const target = education[index] ?? { institution: "", degree: "" };
    target[field] = value;
    education[index] = target;
    updateDraft({ education });
  };

  const addEducation = () =>
    updateDraft({
      education: [...draft.education, { institution: "", degree: "" }],
    });

  const buildContext = (section: ResumeSectionType, experienceIndex?: number) => {
    switch (section) {
      case "summary":
        return {
          notes: "Craft a concise, high-impact summary.",
        };
      case "skills":
        return {
          notes: "Highlight depth and breadth of technical experience.",
        };
      case "experiences": {
        if (experienceIndex === undefined) return null;
        if (!draft.experiences[experienceIndex]) return null;
        return {
          experienceIndex,
          notes: "Emphasize metrics, scale, and leadership.",
        };
      }
      default:
        return {};
    }
  };

  const getCurrentContent = (section: ResumeSectionType, experienceIndex?: number) => {
    switch (section) {
      case "summary":
        return [draft.summary].filter(Boolean);
      case "skills":
        return draft.skills;
      case "experiences": {
        if (experienceIndex === undefined) return [];
        return draft.experiences[experienceIndex]?.achievements ?? [];
      }
      default:
        return [];
    }
  };

  const handleSectionSuggestion = async (
    mode: "generate" | "improve",
    section: ResumeSectionType,
    experienceIndex?: number,
  ) => {
    if (!resumeId) {
      toast.error("Ingest or select a resume before using AI suggestions.");
      return;
    }
    const context = buildContext(section, experienceIndex);
    if (!context) {
      toast.error("Add more context to this section before using AI.");
      return;
    }
    const key = buildSectionKey(section, experienceIndex);
    setAiLoadingKey(key);
    try {
      const response =
        mode === "generate"
          ? await generateResumeSection(resumeId, section, {
              context,
              tone: section === "summary" ? "concise" : undefined,
          })
          : await improveResumeSection(resumeId, section, {
            context,
            currentContent: getCurrentContent(section, experienceIndex),
            instructions:
              section === "experiences"
                ? "Add concrete metrics, technologies, and outcomes."
                : "Enhance clarity and specificity.",
          });
      setSuggestionEntry({
        ...response,
        content: normalizeSuggestionContent(section, response.content),
        key,
        experienceIndex,
      });
    } catch (error) {
      toast.error((error as Error)?.message ?? "Unable to get AI suggestion");
    } finally {
      setAiLoadingKey(null);
    }
  };

  const handleApplySuggestion = async (section: ResumeSectionType, experienceIndex?: number) => {
    if (!resumeId) return;
    const suggestion = suggestionFor(section, experienceIndex);
    if (!suggestion) return;
    const key = buildSectionKey(section, experienceIndex);
    setAiLoadingKey(key);
    try {
      switch (section) {
        case "summary": {
          const newSummary = suggestion.content.join(" ");
          await updateResumeSection(resumeId, "summary", { content: newSummary });
          updateDraft({ summary: newSummary });
          break;
        }
        case "skills": {
          await updateResumeSection(resumeId, "skills", { content: suggestion.content });
          updateDraft({ skills: suggestion.content });
          break;
        }
        case "experiences": {
          if (experienceIndex === undefined) throw new Error("Missing experience index");
          const updatedExperiences = draft.experiences.map((exp, idx) =>
            idx === experienceIndex ? { ...exp, achievements: suggestion.content } : exp,
          );
          await updateResumeSection(resumeId, "experiences", {
            content: updatedExperiences,
          });
          updateDraft({ experiences: updatedExperiences });
          break;
        }
        default:
          break;
      }
      toast.success("Section updated");
      clearSuggestionFor(section, experienceIndex);
    } catch (error) {
      toast.error((error as Error)?.message ?? "Unable to apply suggestion");
    } finally {
      setAiLoadingKey(null);
    }
  };

  const isSectionLoading = (section: ResumeSectionType, experienceIndex?: number) =>
    aiLoadingKey === buildSectionKey(section, experienceIndex);

  const renderSuggestionCard = (section: ResumeSectionType, experienceIndex?: number) => {
    const suggestion = suggestionFor(section, experienceIndex);
    if (!suggestion) return null;
    return (
      <SuggestionCard
        suggestion={suggestion}
        loading={isSectionLoading(section, experienceIndex)}
        onApply={() => handleApplySuggestion(section, experienceIndex)}
        onDismiss={() => clearSuggestionFor(section, experienceIndex)}
      />
    );
  };

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/10">
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Resume designer</CardTitle>
            <CardDescription>
              Fine-tune AI extracted data and export clean ATS-ready documents.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                exportToPdf(
                  { title: draft.headline ?? "Resume", sections: sectionsForExport },
                  `${draft.contact.name ?? "resume"}.pdf`,
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                exportToDocx(
                  { title: draft.headline ?? "Resume", sections: sectionsForExport },
                  `${draft.contact.name ?? "resume"}.docx`,
                )
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              DOCX
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="editor">
          <TabsList className="mb-4">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="editor" className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input
                  value={draft.contact.name ?? ""}
                  autoComplete="name"
                  onChange={(event) =>
                    updateDraft({ contact: { ...draft.contact, name: event.target.value } })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Headline</Label>
                <Input
                  value={draft.headline}
                  onChange={(event) => updateDraft({ headline: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={draft.contact.email ?? ""}
                  autoComplete="email"
                  onChange={(event) =>
                    updateDraft({ contact: { ...draft.contact, email: event.target.value } })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  value={draft.contact.location ?? ""}
                  autoComplete="address-level1"
                  onChange={(event) =>
                    updateDraft({ contact: { ...draft.contact, location: event.target.value } })
                  }
                />
              </div>
            </section>

            <div className="space-y-1.5">
              <Label>Professional summary</Label>
              <Textarea
                rows={4}
                value={draft.summary}
                onChange={(event) => updateDraft({ summary: event.target.value })}
              />
            </div>
            <AIActionRow
              disabled={!resumeId}
              loading={isSectionLoading("summary")}
              onGenerate={() => handleSectionSuggestion("generate", "summary")}
              onImprove={() => handleSectionSuggestion("improve", "summary")}
            />
            {renderSuggestionCard("summary")}

            <div className="space-y-1.5">
              <Label>Skills (comma separated)</Label>
              <Input value={draft.skills.join(", ")} onChange={(event) => handleSkillsChange(event.target.value)} />
            </div>
            <AIActionRow
              disabled={!resumeId}
              loading={isSectionLoading("skills")}
              onGenerate={() => handleSectionSuggestion("generate", "skills")}
              onImprove={() => handleSectionSuggestion("improve", "skills")}
            />
            {renderSuggestionCard("skills")}

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" />
                  Experience
                </Label>
                <Button type="button" size="sm" variant="outline" onClick={addExperience}>
                  Add role
                </Button>
              </div>
              {draft.experiences.map((exp, index) => (
                <div key={index} className="rounded-lg border border-border/70 p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Company</Label>
                      <Input
                        value={exp.company}
                        onChange={(event) =>
                          handleExperienceChange(index, "company", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Input
                        value={exp.role}
                        onChange={(event) =>
                          handleExperienceChange(index, "role", event.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Achievements (one per line)</Label>
                    <Textarea
                      rows={3}
                      value={exp.achievements.join("\n")}
                      onChange={(event) =>
                        handleExperienceChange(index, "achievements", event.target.value)
                      }
                    />
                  </div>
                  <AIActionRow
                    disabled={!resumeId}
                    loading={isSectionLoading("experiences", index)}
                    onGenerate={() => handleSectionSuggestion("generate", "experiences", index)}
                    onImprove={() => handleSectionSuggestion("improve", "experiences", index)}
                  />
                  {renderSuggestionCard("experiences", index)}
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Education</Label>
                <Button type="button" size="sm" variant="outline" onClick={addEducation}>
                  Add school
                </Button>
              </div>
              {draft.education.map((edu, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Institution</Label>
                    <Input
                      value={edu.institution}
                      onChange={(event) =>
                        handleEducationChange(index, "institution", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Degree</Label>
                    <Input
                      value={edu.degree ?? ""}
                      onChange={(event) => handleEducationChange(index, "degree", event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Custom sections</Label>
                <Button type="button" size="sm" variant="outline" onClick={addCustomSection}>
                  Add section
                </Button>
              </div>
              {draft.sections.map((section) => (
                <div key={section.id} className="rounded-lg border border-dashed p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Input
                      value={section.title}
                      onChange={(event) =>
                        updateDraft({
                          sections: draft.sections.map((item) =>
                            item.id === section.id ? { ...item, title: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeSection(section.id)}>
                      Remove
                    </Button>
                  </div>
                  <Textarea
                    className="mt-2"
                    rows={3}
                    value={section.body}
                    onChange={(event) =>
                      updateDraft({
                        sections: draft.sections.map((item) =>
                          item.id === section.id ? { ...item, body: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </section>
          </TabsContent>

          <TabsContent value="preview">
            <div className="rounded-2xl border bg-white p-8 text-neutral-900 shadow-inner">
              <div className="flex flex-col gap-1 text-center">
                <h2 className="text-2xl font-semibold">{draft.contact.name}</h2>
                <p className="text-sm uppercase tracking-widest">{draft.headline}</p>
                <p className="text-xs text-muted-foreground">
                  {[draft.contact.email, draft.contact.location, draft.contact.phone]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
              <div className="mt-6 space-y-5 text-left">
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
                    Summary
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-700">{draft.summary}</p>
                </section>
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
                    Skills
                  </h3>
                  <p className="mt-1 text-sm text-neutral-700">{draft.skills.join(" • ")}</p>
                </section>
                {draft.experiences.map((exp, index) => (
                  <section key={index}>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
                      Experience
                    </h3>
                    <div className="mt-2">
                      <p className="text-base font-semibold">
                        {exp.role} / {exp.company}
                      </p>
                      <ul className="mt-1 space-y-1 text-sm leading-relaxed text-neutral-700">
                        {exp.achievements.map((achieve, idx) => (
                          <li key={idx}>• {achieve}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                ))}
                {draft.education.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
                      Education
                    </h3>
                    {draft.education.map((edu, idx) => (
                      <p key={idx} className="mt-1 text-sm text-neutral-700">
                        {edu.degree} / {edu.institution}
                      </p>
                    ))}
                  </section>
                )}
                {draft.sections.map((section) => (
                  <section key={section.id}>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
                      {section.title}
                    </h3>
                    <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{section.body}</p>
                  </section>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

interface AIActionRowProps {
  disabled?: boolean;
  loading?: boolean;
  onGenerate: () => void;
  onImprove: () => void;
}

const AIActionRow = ({ disabled, loading, onGenerate, onImprove }: AIActionRowProps) => (
  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || loading}
      onClick={onGenerate}
      className="flex items-center gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      Generate
    </Button>
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={disabled || loading}
      onClick={onImprove}
      className="flex items-center gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
      Improve existing
    </Button>
  </div>
);

interface SuggestionCardProps {
  suggestion: SectionSuggestionState;
  loading?: boolean;
  onApply: () => void;
  onDismiss: () => void;
}

const SuggestionCard = ({ suggestion, loading, onApply, onDismiss }: SuggestionCardProps) => (
  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-primary-foreground">
    <p className="text-xs uppercase tracking-[0.3em] text-primary">AI suggestion</p>
    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">
      {suggestion.content.map((line, index) => (
        <li key={`${suggestion.key}-${index}`}>{line}</li>
      ))}
    </ul>
    {suggestion.rationale && (
      <p className="mt-2 text-xs text-muted-foreground">
        Rationale: <span>{suggestion.rationale}</span>
      </p>
    )}
    <div className="mt-3 flex flex-wrap gap-2">
      <Button type="button" size="sm" onClick={onApply} disabled={loading}>
        Apply
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  </div>
);
