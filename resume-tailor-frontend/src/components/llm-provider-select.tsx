"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { LLM_PROVIDER_OPTIONS } from "@/lib/constants";
import type { LLMProvider } from "@/types";
import { Label } from "./ui/label";

interface Props {
  value?: LLMProvider;
  onChange?: (value: LLMProvider) => void;
  placeholder?: string;
  label?: string;
  optional?: boolean;
}

export const LlmProviderSelect = ({
  value,
  onChange,
  placeholder = "Provider",
  label = "LLM Provider (optional)",
  optional = true,
}: Props) => (
  <div className="flex flex-col gap-1.5">
    <Label>
      {label}
      {optional && <span className="ml-1 text-xs text-muted-foreground">(optional)</span>}
    </Label>
    <Select value={value} onValueChange={(val) => onChange?.(val as LLMProvider)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {LLM_PROVIDER_OPTIONS.map((provider) => (
          <SelectItem key={provider.value} value={provider.value}>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{provider.label}</span>
              <span className="text-xs text-muted-foreground">{provider.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
