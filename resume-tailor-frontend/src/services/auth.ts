import { apiRequest } from "@/lib/api-client";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  UserProfile,
} from "@/types";

export const registerUser = (payload: RegisterPayload) =>
  apiRequest<AuthResponse>({
    path: "/auth/register",
    method: "POST",
    data: payload,
  });

export const loginUser = (payload: LoginPayload) =>
  apiRequest<AuthResponse>({
    path: "/auth/login",
    method: "POST",
    data: payload,
  });

export const getProfile = () =>
  apiRequest<UserProfile>({
    path: "/auth/me",
    method: "GET",
  });

export const updateProfile = (payload: UpdateProfilePayload) =>
  apiRequest<UserProfile>({
    path: "/auth/me",
    method: "PUT",
    data: payload,
  });
