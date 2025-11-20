"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  clearAuthToken,
  clearStoredUser,
  getAuthToken,
  getStoredUser,
  setAuthToken,
  setStoredUser,
} from "@/lib/auth-storage";
import { getProfile, loginUser, registerUser } from "@/services/auth";
import type { RegisterPayload, LoginPayload, UserProfile } from "@/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: UserProfile | null;
  status: AuthStatus;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const loadProfile = useCallback(async (force = false) => {
    const token = getAuthToken();
    if (!token) {
      clearStoredUser();
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    if (!force) {
      const cachedUser = getStoredUser();
      if (cachedUser) {
        setUser(cachedUser);
        setStatus("authenticated");
        return;
      }
    }

    try {
      const profile = await getProfile();
      setUser(profile);
      setStoredUser(profile);
      setStatus("authenticated");
    } catch {
      clearAuthToken();
      clearStoredUser();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  const handleLogin = async (payload: LoginPayload) => {
    const auth = await loginUser(payload);
    setAuthToken(auth.token);
    setStoredUser(auth.user);
    setUser(auth.user);
    setStatus("authenticated");
    toast.success("Signed in");
  };

  const handleRegister = async (payload: RegisterPayload) => {
    const auth = await registerUser(payload);
    setAuthToken(auth.token);
    setStoredUser(auth.user);
    setUser(auth.user);
    setStatus("authenticated");
    toast.success("Account created");
  };

  const handleLogout = () => {
    clearAuthToken();
    clearStoredUser();
    setUser(null);
    setStatus("unauthenticated");
  };

  const value: AuthContextValue = {
    user,
    status,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshProfile: () => loadProfile(true),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
