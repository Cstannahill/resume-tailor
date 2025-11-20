"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema
  .extend({
    name: z.string().optional(),
    confirmPassword: z.string().min(6, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

interface AuthPanelProps {
  variant?: "card" | "inline";
}

export const AuthPanel = ({ variant = "card" }: AuthPanelProps) => {
  const { login, register: registerUser, status } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const handleLogin = async (values: LoginValues) => {
    try {
      await login(values);
      loginForm.reset();
    } catch (error) {
      loginForm.setError("email", { message: (error as Error).message });
    }
  };

  const handleRegister = async (values: RegisterValues) => {
    try {
      const { confirmPassword: _confirmPassword, ...payload } = values;
      void _confirmPassword;
      await registerUser(payload);
      registerForm.reset();
    } catch (error) {
      registerForm.setError("email", { message: (error as Error).message });
    }
  };

  const content = (
    <div id="auth-panel" className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sign in to sync your projects, resumes, conversations, and tailored assets. Accounts issue JWTs for
        all protected API calls.
      </p>
      <Tabs value={mode} onValueChange={(value) => setMode(value as "login" | "register")}>
        <TabsList className="w-full">
          <TabsTrigger value="login" className="flex-1">
            Sign in
          </TabsTrigger>
          <TabsTrigger value="register" className="flex-1">
            Create account
          </TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <form className="space-y-3" onSubmit={loginForm.handleSubmit(handleLogin)}>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...loginForm.register("email")}
              />
              {loginForm.formState.errors.email && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="********"
                {...loginForm.register("password")}
              />
              {loginForm.formState.errors.password && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={status === "loading" || loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="register">
          <form className="space-y-3" onSubmit={registerForm.handleSubmit(handleRegister)}>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="Ada Lovelace"
                autoComplete="name"
                {...registerForm.register("name")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...registerForm.register("email")}
              />
              {registerForm.formState.errors.email && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="********"
                {...registerForm.register("password")}
              />
              {registerForm.formState.errors.password && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Confirm password</Label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="********"
                {...registerForm.register("confirmPassword")}
              />
              {registerForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={status === "loading" || registerForm.formState.isSubmitting}
            >
              {registerForm.formState.isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (variant === "inline") {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Experience Studio</CardTitle>
        <CardDescription>Authenticate to unlock indexing, resume ingestion, retrieval, and more.</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};
