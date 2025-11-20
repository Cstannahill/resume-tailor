import { useMemo, useState } from "react";
import type { ResumeDraft, ResumeInsight } from "@/types";
import { DEFAULT_RESUME_TEMPLATE } from "@/lib/constants";
import { createId } from "@/lib/utils";

const buildDraft = (insight?: ResumeInsight): ResumeDraft => ({
  headline: insight?.contact?.name ?? "Software Engineer",
  contact: insight?.contact ?? {},
  summary: insight?.summary ?? DEFAULT_RESUME_TEMPLATE.summary,
  skills: insight?.skills ?? DEFAULT_RESUME_TEMPLATE.skills,
  experiences: insight?.experiences ?? [],
  education: insight?.education ?? [],
  highlights: insight?.experiences?.flatMap((exp) => exp.achievements.slice(0, 1)) ??
    DEFAULT_RESUME_TEMPLATE.highlights,
  sections: [
    {
      id: createId(),
      title: "Impact",
      body:
        "Quantify the measurable outcomes you drove. Aim for metrics, scale, or business KPIs.",
    },
  ],
});

export const useResumeDraft = (insight?: ResumeInsight) => {
  const [draft, setDraft] = useState<ResumeDraft>(() => buildDraft(insight));

  const updateDraft = (partial: Partial<ResumeDraft>) =>
    setDraft((prev) => ({ ...prev, ...partial }));

  const addCustomSection = () =>
    setDraft((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        { id: createId(), title: "New Section", body: "Add details..." },
      ],
    }));

  const removeSection = (id: string) =>
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== id),
    }));

  const memoized = useMemo(
    () => ({
      draft,
      updateDraft,
      addCustomSection,
      removeSection,
    }),
    [draft],
  );

  return memoized;
};
