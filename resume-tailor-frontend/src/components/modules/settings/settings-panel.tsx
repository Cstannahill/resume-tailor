"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getUserSettings, listProviderKeys, updateUserSettings, upsertProviderKey, deleteProviderKey } from "@/services/settings";
import { LLM_PROVIDER_OPTIONS } from "@/lib/constants";
import type { LLMProvider } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const SettingsPanel = () => {
  const client = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getUserSettings,
  });
  const providerKeysQuery = useQuery({
    queryKey: ["provider-keys"],
    queryFn: listProviderKeys,
  });
  const [provider, setProvider] = useState<LLMProvider>("ollama");
  const [apiKey, setApiKey] = useState("");
  const [lastFourCache, setLastFourCache] = useState<Record<string, string>>({});
  const [localDefaultProvider, setLocalDefaultProvider] = useState<LLMProvider>();

  const settingsMutation = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: () => {
      toast.success("Settings updated");
      client.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const upsertKeyMutation = useMutation({
    mutationFn: upsertProviderKey,
    onSuccess: (_, variables) => {
      toast.success("Provider key saved");
      client.invalidateQueries({ queryKey: ["provider-keys"] });
      setLastFourCache((prev) => ({
        ...prev,
        [variables.provider]: variables.apiKey.slice(-4),
      }));
      setApiKey("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteKeyMutation = useMutation({
    mutationFn: deleteProviderKey,
    onSuccess: (_, providerValue) => {
      toast.success("Provider key removed");
      setLastFourCache((prev) => {
        const copy = { ...prev };
        delete copy[providerValue];
        return copy;
      });
      client.invalidateQueries({ queryKey: ["provider-keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const currentDefault = localDefaultProvider ?? settingsQuery.data?.defaultProvider ?? "ollama";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Workspace defaults</CardTitle>
          <CardDescription>Choose a preferred LLM provider. All adapters can still be selected per request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Default provider</Label>
            <Select
              value={currentDefault}
              onValueChange={(value) => {
                const selected = value as LLMProvider;
                setLocalDefaultProvider(selected);
                settingsMutation.mutate({ defaultProvider: selected });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a provider" />
              </SelectTrigger>
              <SelectContent>
                {LLM_PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">
              Stay in the loop when new tailored assets, job matches, or AI coach updates are ready.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary h-4 w-4"
                  checked={settingsQuery.data?.notifications?.jobMatches ?? false}
                  onChange={(event) =>
                    settingsMutation.mutate({
                      notifications: {
                        ...settingsQuery.data?.notifications,
                        jobMatches: event.target.checked,
                      },
                    })
                  }
                />
                Job matches & tailored assets
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary h-4 w-4"
                  checked={settingsQuery.data?.notifications?.productUpdates ?? false}
                  onChange={(event) =>
                    settingsMutation.mutate({
                      notifications: {
                        ...settingsQuery.data?.notifications,
                        productUpdates: event.target.checked,
                      },
                    })
                  }
                />
                Product updates & prompts
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider keys</CardTitle>
          <CardDescription>Store encrypted API keys for each provider. Only the last 4 characters display after saving.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(value) => setProvider(value as LLMProvider)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>API key</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={() => upsertKeyMutation.mutate({ provider, apiKey })}
            disabled={!apiKey || upsertKeyMutation.isPending}
          >
            {upsertKeyMutation.isPending ? "Saving..." : "Save key"}
          </Button>
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Saved keys</p>
            <div className="space-y-2">
              {providerKeysQuery.data?.map((record) => (
                <div key={record.provider} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-semibold uppercase">{record.provider}</p>
                    <p className="text-xs text-muted-foreground">
                      ending in {record.lastFour ?? lastFourCache[record.provider] ?? "????"} • saved{" "}
                      {new Date(record.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKeyMutation.mutate(record.provider)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {providerKeysQuery.data?.length === 0 && (
                <p className="text-xs text-muted-foreground">No provider keys saved yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-primary/40 p-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="mb-2">
              Security
            </Badge>
            Keys are AES encrypted in the backend and only decrypted at request time. Rotate them anytime without
            redeploying the frontend.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
