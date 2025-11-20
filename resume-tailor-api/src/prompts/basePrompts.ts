import type { ProjectHeuristics, ProjectIndexRequest } from '../modules/projects/projectIndexing.types.js';
import type {
  ResumeExtractionRequest,
  ResumeInsight,
  ResumeSectionGenerateRequest,
  ResumeSectionImproveRequest
} from '../modules/resumes/resume.types.js';
import type { PersonaProfile } from '../modules/conversations/conversation.types.js';
import type { ConversationAnswerRequest } from '../modules/conversations/conversation.types.js';
import type { TailorJobMaterialsRequest } from '../modules/retrieval/retrieval.types.js';
import type { LLMMessage } from '../adapters/llm/llm.types.js';

export interface JobDescriptionPromptContext {
  jobDescription: string;
}

export interface DeveloperProfilePromptInput {
  resumeSummary?: string | undefined;
  resumeSkills: string[];
  experienceHighlights: string[];
  projectHighlights: string[];
  personaInsights: string[];
  additionalInsights: string[];
}

export const createProjectSummaryPrompt = (
  request: ProjectIndexRequest,
  heuristics: ProjectHeuristics
): LLMMessage[] => {
  const serializedFileInsights = heuristics.fileInsights
    .slice(0, 15)
    .map(
      (insight) =>
        `• Path: ${insight.path}\n  Language: ${insight.language}\n  Lines: ${insight.linesOfCode}\n  Exports: ${insight.exportsDetected.join(', ') || 'None'}`
    )
    .join('\n');

  return [
    {
      role: 'system',
      content: `
You are a Staff-level software architect composing a repository intelligence brief.
Follow these rules:
- Base conclusions ONLY on the provided metrics, files, and detections.
- Emphasize architecture patterns, critical functionality, and measurable signals.
- Produce structured Markdown JSON with keys { "executiveSummary", "architecture", "metrics", "risks", "nextSteps" }.
- Include technology stacks explicitly and reference file paths when calling out functionality.
- Limit marketing language.`
        .trim()
    },
    {
      role: 'user',
      content: [
        `Repository: ${request.name}`,
        request.description ? `Description: ${request.description}` : undefined,
        heuristics.highlights.length ? `Highlights:\n${heuristics.highlights.map((h) => `- ${h}`).join('\n')}` : undefined,
        `Key Functionality:\n${heuristics.keyFunctionality.map((line) => `- ${line}`).join('\n')}`,
        `Key Metrics: ${JSON.stringify(heuristics.keyMetrics, null, 2)}`,
        `Technologies Detected: ${heuristics.technologies.join(', ') || 'Unknown'}`,
        `Representative Files:\n${serializedFileInsights}`
      ]
        .filter(Boolean)
        .join('\n\n')
    }
  ];
};

export const createResumeExtractionPrompt = (
  input: ResumeExtractionRequest,
  seed: ResumeInsight
): LLMMessage[] => [
  {
    role: 'system',
    content: `
You parse developer resumes into structured JSON.
Return STRICT JSON matching:
{
  "summary": string,
  "skills": string[],
  "experiences": [
    {"company": string, "role": string, "achievements": string[]}
  ],
  "education": [
    {"institution": string, "degree": string, "year": string}
  ],
  "contact": { "email": string, "phone": string, "location": string },
  "confidenceNotes": string[]
}
Formatting Rules:
- Output ONLY raw JSON (no Markdown code fences, headers, commentary, or explanations).
Guidelines:
- Capture measurable achievements; rewrite vague bullets to include impact.
- Infer missing organization names cautiously—mark as "Unknown" if absent.
- Maintain chronological ordering when possible.
- Use the provided seed insight as fallback context but prefer direct resume content.`
      .trim()
  },
  {
    role: 'user',
    content: `Resume Text:\n${input.resumeText}\n\nSeed Insight:\n${JSON.stringify(seed)}`
  }
];

export const createPersonaQuestionPrompt = (persona: PersonaProfile): LLMMessage[] => [
  {
    role: 'system',
    content: `
You are a senior interviewer crafting Socratic technical prompts.
Respond with STRICT JSON:
{
  "question": {
    "text": string,
    "difficulty": "easy" | "medium" | "hard",
    "rubric": string[]
  }
}
Formatting Rules:
- Output ONLY raw JSON (no Markdown code fences, headers, commentary, or explanations).
Requirements:
- Target deep reasoning, not trivia.
- Reference the persona's focus areas explicitly.
- Set a rubric explaining what great answers include.`
      .trim()
  },
  {
    role: 'user',
    content: `Persona Topic: ${persona.topic}
Expertise Level: ${persona.expertiseLevel}
Tone: ${persona.tone}
Focus Areas: ${persona.focusAreas.join(', ') || 'None'}`
  }
];

export const createConversationEvaluationPrompt = (
  question: string,
  answer: ConversationAnswerRequest,
  personaSummary: string
): LLMMessage[] => [
  {
    role: 'system',
    content: `
You are evaluating a candidate's technical response.
Return STRICT JSON:
{
  "evaluation": string,
  "proficiencyLevel": "novice" | "intermediate" | "advanced" | "expert",
  "insights": string[],
  "followUpPlan": string,
  "nextQuestion": { "text": string, "difficulty": "easy"|"medium"|"hard" },
  "technologySignals": string[]
}
Formatting Rules:
- Output ONLY raw JSON (no Markdown code fences, headers, commentary, or explanations).
Scoring guidance:
- Reference the original question and persona summary.
- Note reasoning quality, trade-offs considered, and misconceptions.
- Suggest the next probing question building on current answer.`
      .trim()
  },
  {
    role: 'user',
    content: `Persona Summary: ${personaSummary}
Question: ${question}
Answer: ${answer.userAnswer}
Thought Process: ${answer.thoughtProcess ?? 'N/A'}`
  }
];

export const createJobTailoringPrompt = (
  input: TailorJobMaterialsRequest,
  resumeContext: { summary?: string; skills?: string[] },
  projectsContext: Array<{ name?: string; summary?: string }>
): LLMMessage[] => [
  {
    role: 'system',
    content: `
You craft targeted career collateral (resumes, cover letters, summaries).
Return STRICT JSON:
{
  "content": string,
  "projectHighlights": string[],
  "resumeBullets": string[],
  "alignmentNotes": string
}
Formatting Rules:
- Output ONLY raw JSON (no Markdown code fences, headers, commentary, or explanations).
Guidelines:
- Mirror the tone of the job description while keeping it professional.
- Showcase measurable outcomes, citing technologies and metrics.
- Use the provided resume + project context only; invent nothing else.`
      .trim()
  },
  {
    role: 'user',
    content: [
      `Asset Type Requested: ${input.assetType ?? 'summary'}`,
      `Job Title: ${input.jobTitle}`,
      `Job Description:\n${input.jobDescription}`,
      resumeContext.summary
        ? `Resume Summary: ${resumeContext.summary}\nSkills: ${(resumeContext.skills ?? []).join(', ')}`
        : 'No resume available.',
      `Projects:\n${projectsContext.map((project) => `- ${project.name}: ${project.summary ?? 'No summary yet.'}`).join('\n')}`
    ].join('\n\n')
  }
];

export const createJobDescriptionInsightsPrompt = (input: JobDescriptionPromptContext): LLMMessage[] => [
  {
    role: 'system',
    content: `
You analyze job descriptions for software roles.
Return STRICT JSON:
{
  "roleSummary": string,
  "senioritySignals": string[],
  "requiredTechnologies": [
    {"name": string, "importance": "core"|"nice_to_have"}
  ],
  "culturalNotes": string[],
  "responsibilityThemes": string[],
  "riskAlerts": string[]
}
Formatting Rules:
- Output ONLY raw JSON (no Markdown code fences, headers, commentary, or explanations).
Focus:
- Extract concrete technologies, frameworks, methodologies.
- Capture clues about workload, communication, leadership expectations.
- Highlight ambiguous or risky statements.`
      .trim()
  },
  {
    role: 'user',
    content: `Job Description:\n${input.jobDescription}`
  }
];

const describeSectionContext = (context: ResumeSectionGenerateRequest['context']): string => {
  const lines = [
    `Section: ${context.section}`,
    context.jobTitle ? `Job Title: ${context.jobTitle}` : undefined,
    context.company ? `Company: ${context.company}` : undefined,
    context.experienceIndex !== undefined ? `Experience Index: ${context.experienceIndex}` : undefined,
    context.achievements?.length ? `Existing Achievements:\n- ${context.achievements.join('\n- ')}` : undefined,
    context.skills?.length ? `Relevant Skills: ${context.skills.join(', ')}` : undefined,
    context.summary ? `Summary Context: ${context.summary}` : undefined,
    context.resumeHighlights?.length ? `Resume Highlights:\n- ${context.resumeHighlights.join('\n- ')}` : undefined,
    context.projectHighlights?.length ? `Project Evidence:\n- ${context.projectHighlights.join('\n- ')}` : undefined,
    context.personaInsights?.length ? `Persona Insights:\n- ${context.personaInsights.join('\n- ')}` : undefined,
    context.additionalInsights?.length ? `Additional Insights:\n- ${context.additionalInsights.join('\n- ')}` : undefined,
    context.notes ? `Notes: ${context.notes}` : undefined
  ];
  return lines.filter(Boolean).join('\n');
};

export const createResumeSectionGeneratePrompt = (input: ResumeSectionGenerateRequest): LLMMessage[] => [
  {
    role: 'system',
    content: `
You craft resume ${input.context.section} content with measurable impact.
Return STRICT JSON:
{
  "content": string | string[],
  "rationale": string
}
Formatting Rules:
- Output ONLY raw JSON (no Markdown code fences, headers, commentary, or explanations).
Guidelines:
- Write in concise, action-oriented language.
- Reference metrics, technologies, and outcomes whenever available.
- Maintain consistent tense and formatting for the requested section.
- If generating bullets, return a string array ordered by importance.`
      .trim()
  },
  {
    role: 'user',
    content: [
      describeSectionContext(input.context),
      input.tone ? `Desired Tone: ${input.tone}` : undefined
    ]
      .filter(Boolean)
      .join('\n\n')
  }
];

export const createResumeSectionImprovePrompt = (input: ResumeSectionImproveRequest): LLMMessage[] => [
  {
    role: 'system',
    content: `
You improve resume sections to emphasize impact, clarity, and alignment with modern tech roles.
Return STRICT JSON:
{
  "content": string | string[],
  "rationale": string
}
Formatting Rules:
- Output ONLY raw JSON (no Markdown code fences, headers, commentary, or explanations).
Guidelines:
- Preserve truthful details; do not fabricate companies or metrics.
- Strengthen verbs, quantify scope, highlight technologies.
- Address the provided instructions while keeping professional tone.`
      .trim()
  },
  {
    role: 'user',
    content: [
      describeSectionContext(input.context),
      `Existing Content:\n${JSON.stringify(input.currentContent, null, 2)}`,
      input.instructions ? `Instructions: ${input.instructions}` : undefined
    ]
      .filter(Boolean)
      .join('\n\n')
  }
];

export const createDeveloperProfilePrompt = (input: DeveloperProfilePromptInput): LLMMessage[] => [
  {
    role: 'system',
    content: `
You are an impartial staff-level engineering manager summarizing a developer's true capabilities.
Return STRICT JSON:
{
  "developerOverview": string,
  "coreStrengths": string[],
  "growthOpportunities": string[],
  "projectEvidence": string[],
  "technicalDepth": string[],
  "riskCaveats": string[],
  "confidence": "low" | "medium" | "high"
}
Formatting Rules:
- Output ONLY raw JSON (no Markdown code fences, headers, commentary, or explanations).
Guidelines:
- Be candid and evidence-driven; avoid hype or fabricated claims.
- Cite provided projects, insights, and experiences when making assertions.
- Highlight both strengths and limitations so the report can serve as a baseline assessment.`
      .trim()
  },
  {
    role: 'user',
    content: [
      input.resumeSummary ? `Resume Summary: ${input.resumeSummary}` : 'Resume Summary: N/A',
      input.resumeSkills.length ? `Resume Skills: ${input.resumeSkills.join(', ')}` : 'Resume Skills: N/A',
      input.experienceHighlights.length
        ? `Experience Highlights:\n- ${input.experienceHighlights.join('\n- ')}`
        : 'Experience Highlights: N/A',
      input.projectHighlights.length ? `Projects:\n- ${input.projectHighlights.join('\n- ')}` : 'Projects: N/A',
      input.personaInsights.length ? `Persona Insights:\n- ${input.personaInsights.join('\n- ')}` : 'Persona Insights: N/A',
      input.additionalInsights.length ? `Additional Insights:\n- ${input.additionalInsights.join('\n- ')}` : 'Additional Insights: N/A'
    ].join('\n\n')
  }
];
