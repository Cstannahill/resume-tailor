"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary/10 text-primary",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-dashed border-border",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
}

const Badge = ({ className, variant = "default", ...props }: BadgeProps) => (
  <div
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      variants[variant],
      className,
    )}
    {...props}
  />
);

export { Badge };
