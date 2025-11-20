import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { ProjectIndexer } from "@/components/modules/projects/project-indexer";
import { ProjectList } from "@/components/modules/projects/project-list";
import { ResumeInsightsCard } from "@/components/modules/resume/resume-insights-card";
import { ConversationCoach } from "@/components/modules/conversations/conversation-coach";
import { TailoredAssetsCard } from "@/components/modules/retrieval/tailored-assets-card";
import { KnowledgeGraphPanel } from "@/components/modules/knowledge-graph/graph-panel";
import { LlmModelCatalog } from "@/components/modules/llm/llm-model-catalog";
import { AuthWall } from "@/components/modules/auth/auth-wall";
import { AuthPanel } from "@/components/modules/auth/auth-panel";
import { DeveloperReportCard } from "@/components/modules/profile/developer-report-card";

export default function Home() {
  return (
    <div className="space-y-10 pb-16">
      <section className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-white to-white p-8 shadow-lg shadow-primary/10 dark:from-primary/20 dark:via-background dark:to-background">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-primary">Experience API</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Codify your projects, resumes, and coaching insights in one AI-native workspace.
            </h1>
            <p className="text-base text-muted-foreground">
              Index repositories directly from the source code, ingest resumes, and tailor job materials
              backed by the same structured intelligence.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/resume" className="flex items-center gap-2">
                  Resume builder
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/cover-letter">Cover letters</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/30 bg-white/60 p-6 text-sm shadow-md dark:bg-background/80">
            <p className="font-semibold">LLM Adapters</p>
            <p className="text-muted-foreground">Ollama Cloud / AWS Bedrock / Google GenAI / OpenRouter</p>
          </div>
        </div>
      </section>

      <AuthWall fallback={<AuthPanel />}>
        <KpiGrid />

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <ProjectIndexer />
            <ProjectList />
          </div>
          <div className="space-y-6">
            <ResumeInsightsCard />
            <TailoredAssetsCard />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <ConversationCoach />
          <div className="rounded-2xl border border-dashed border-primary/40 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-primary">Retrieval Kit</p>
            <h2 className="mt-2 text-2xl font-semibold">Tailor cover letters with project context.</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Jump into the cover letter workspace to pull highlights from indexed projects, resume bullets,
              and persona insights. Export polished PDF/DOCX deliverables in seconds.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link href="/cover-letter">Open cover letter studio</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <KnowledgeGraphPanel />
          <LlmModelCatalog />
        </section>

        <DeveloperReportCard />
      </AuthWall>
    </div>
  );
}
