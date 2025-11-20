"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "../theme-toggle";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { Skeleton } from "../ui/skeleton";

interface NavLink {
  href: string;
  label: string;
  requiresAuth?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Workspace" },
  { href: "/resume", label: "Resume Builder" },
  { href: "/cover-letter", label: "Cover Letter" },
  { href: "/settings", label: "Settings", requiresAuth: true },
];

interface NavItemsProps {
  pathname: string;
  onNavigate?: () => void;
  isAuthenticated: boolean;
}

const NavItems = ({ pathname, onNavigate, isAuthenticated }: NavItemsProps) => (
  <nav className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
    {NAV_LINKS.map((item) => {
      if (item.requiresAuth && !isAuthenticated) return null;
      const active = pathname === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "text-sm font-medium transition-colors hover:text-foreground",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {item.label}
        </Link>
      );
    })}
  </nav>
);

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { status, user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
              Ex
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Experience Studio</p>
              <p className="text-xs text-muted-foreground">Projects / Resumes / AI</p>
            </div>
          </Link>
          <div className="hidden items-center gap-4 sm:flex">
            <NavItems pathname={pathname} isAuthenticated={status === "authenticated"} />
            <ThemeToggle />
            <AuthActions status={status} userName={user?.name ?? user?.email} onLogout={logout} />
          </div>
          <div className="flex items-center gap-3 sm:hidden">
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="mt-8 flex flex-col gap-4">
                  <NavItems pathname={pathname} isAuthenticated={status === "authenticated"} />
                  <AuthActions
                    status={status}
                    userName={user?.name ?? user?.email}
                    onLogout={logout}
                    isMobile
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        {children}
      </main>
    </div>
  );
};

const AuthActions = ({
  status,
  userName,
  onLogout,
  isMobile,
}: {
  status: ReturnType<typeof useAuth>["status"];
  userName?: string;
  onLogout: () => void;
  isMobile?: boolean;
}) => {
  if (status === "loading") {
    return <Skeleton className="h-8 w-24 rounded-full" />;
  }

  if (status !== "authenticated") {
    return (
      <Button asChild variant="outline" className={isMobile ? "w-full" : ""}>
        <a href="#auth-panel">Sign in</a>
      </Button>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-sm font-semibold">{userName}</p>
          <p className="text-xs text-muted-foreground">Signed in</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings">Settings</Link>
        </Button>
        <Button variant="ghost" onClick={onLogout}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <span className="hidden sm:inline">{userName}</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onLogout();
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
