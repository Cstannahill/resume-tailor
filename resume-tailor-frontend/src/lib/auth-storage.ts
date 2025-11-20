import type { UserProfile } from "@/types";

const AUTH_TOKEN_KEY = "experience:auth-token";
const AUTH_USER_KEY = "experience:auth-user";

export const getAuthToken = () => {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? undefined;
};

export const setAuthToken = (token: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const getStoredUser = (): UserProfile | undefined => {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return undefined;
  }
};

export const setStoredUser = (user: UserProfile) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearStoredUser = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_USER_KEY);
};
