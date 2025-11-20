"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cpu } from "lucide-react";
import { listLlmModels } from "@/services/llm";
import { LLM_PROVIDERS, type LLMProvider, type LlmModelMetadata } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const LlmModelCatalog = () => {
  const [provider, setProvider] = useState<LLMProvider | "all">("all");
  const query = useQuery({
    queryKey: ["llm-models", provider],
    queryFn: () => listLlmModels(provider === "all" ? undefined : provider),
  });

  const models = useMemo(
    () => (Array.isArray(query.data) ? query.data : []),
    [query.data],
  );
  const grouped = useMemo(
    () =>
      models.reduce<Record<string, LlmModelMetadata[]>>((acc, model) => {
        if (!acc[model.provider]) acc[model.provider] = [];
        acc[model.provider].push(model);
        return acc;
      }, {}),
    [models],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          Model catalog
        </CardTitle>
        <CardDescription>Explore cached metadata for Ollama, Bedrock, Google, and OpenRouter.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <FilterButton label="All" active={provider === "all"} onClick={() => setProvider("all")} />
          {LLM_PROVIDERS.map((value) => (
            <FilterButton
              key={value}
              label={value}
              active={provider === value}
              onClick={() => setProvider(value)}
            />
          ))}
        </div>
        {query.isLoading && <Skeleton className="h-48 w-full" />}
        {query.isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load model catalog.{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => query.refetch()}
            >
              Retry
            </button>
          </div>
        )}
        {!query.isLoading && !query.isError && (
          <div className="space-y-4">
            {Object.entries(grouped).map(([providerName, providerModels]) => (
              <div key={providerName} className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{providerName}</p>
                <div className="grid gap-3 lg:grid-cols-2">
                  {providerModels.map((model) => (
                    <ModelCard key={`${model.provider}-${model.name}`} model={model} />
                  ))}
                </div>
              </div>
            ))}
            {models.length === 0 && (
              <p className="text-sm text-muted-foreground">No models returned for this provider.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const FilterButton = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <Button
    type="button"
    variant={active ? "default" : "outline"}
    size="sm"
    onClick={onClick}
    className={active ? "" : "text-muted-foreground"}
  >
    {label}
  </Button>
);

const ModelCard = ({ model }: { model: LlmModelMetadata }) => {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{model.displayName ?? model.name}</p>
          <p className="text-xs uppercase text-muted-foreground">{model.provider}</p>
        </div>
        {model.free ? <Badge variant="secondary">Free</Badge> : null}
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{model.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {model.contextWindow && (
          <Badge variant="outline">{(model.contextWindow / 1000).toFixed(1)}k ctx</Badge>
        )}
        {model.tags?.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>
      {model.pricing && <p className="mt-2 text-xs text-muted-foreground">{model.pricing}</p>}
    </div>
  );
};
