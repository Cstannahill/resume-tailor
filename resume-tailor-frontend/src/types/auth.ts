export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string;
}
