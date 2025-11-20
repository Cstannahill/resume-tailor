"use client";

import { SettingsPanel } from "@/components/modules/settings/settings-panel";
import { AuthWall } from "@/components/modules/auth/auth-wall";
import { AuthPanel } from "@/components/modules/auth/auth-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-primary">Workspace Settings</p>
        <h1 className="text-3xl font-semibold">Manage authentication, defaults, and provider keys.</h1>
        <p className="text-muted-foreground">
          All keys are encrypted before storage. Update the default LLM provider and notification prefs at any time.
        </p>
      </div>
      <AuthWall fallback={<AuthPanel />}>
        <SettingsPanel />
      </AuthWall>
    </div>
  );
}
