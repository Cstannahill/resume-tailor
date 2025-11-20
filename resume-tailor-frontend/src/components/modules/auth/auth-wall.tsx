"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { AuthPanel } from "./auth-panel";

interface AuthWallProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthWall = ({ children, fallback }: AuthWallProps) => {
  const { status } = useAuth();

  if (status === "loading") {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  if (status !== "authenticated") {
    return <>{fallback ?? <AuthPanel />}</>;
  }

  return <>{children}</>;
};
