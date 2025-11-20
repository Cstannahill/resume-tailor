import type { LLMProviderOption } from "@/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export const LLM_PROVIDER_OPTIONS: LLMProviderOption[] = [
  {
    value: "ollama",
    label: "Ollama Cloud",
    description: "Fastest iteration for local-style prompting.",
  },
  {
    value: "bedrock",
    label: "AWS Bedrock",
    description: "Enterprise guardrails with Claude/Sonnet family.",
  },
  {
    value: "google",
    label: "Google GenAI",
    description: "Gemini 1.5 + Imagen for rich reasoning.",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    description: "Meta, Mistral, and experimental open models.",
  },
];

export const PROJECT_SOURCE_KINDS = [
  { id: "github", label: "GitHub Repository" },
  { id: "local", label: "Local Directory" },
] as const;

export const PERSONA_TOPICS = [
  { value: "frontend-react", label: "Frontend / React" },
  { value: "backend-node", label: "Backend / Node.js" },
  { value: "platform-aws", label: "Platform / AWS" },
  { value: "ai-ml", label: "Applied AI" },
] as const;

export const DEFAULT_RESUME_TEMPLATE = {
  summary:
    "Full-stack engineer blending AI-assisted development with rigorous delivery practices.",
  highlights: [
    "Shipped complex data products with multi-cloud backends.",
    "Led AI adoption programs and authored governance standards.",
    "Obsessed with DX, documentation, and measurable impact.",
  ],
  skills: [
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "AWS",
    "CI/CD",
    "LangChain",
  ],
};
