import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatDate = (input?: string | Date | null) => {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const pluralize = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

export const toQueryString = (
  params: Record<string, string | string[] | number | boolean | undefined>,
) => {
  const entries = Object.entries(params).flatMap(([key, value]) => {
    if (typeof value === "boolean") {
      return value ? [[key, "true"]] : [];
    }
    if (typeof value === "number") {
      return [[key, String(value)]];
    }
    if (!value || (Array.isArray(value) && value.length === 0)) return [];
    if (Array.isArray(value)) return value.map((v) => [key, v]);
    return [[key, value]];
  });
  const search = new URLSearchParams(entries as [string, string][]);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const downloadBlob = (blob: Blob, filename: string) => {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};
