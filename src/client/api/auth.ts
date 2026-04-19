import { apiRequest } from "./http";
import type { AuthResponse, AuthUser } from "../types/auth";

export const signUp = (input: { email: string; password: string }) => {
  return apiRequest<AuthResponse>("/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
};

export const signIn = (input: { email: string; password: string }) => {
  return apiRequest<AuthResponse>("/api/auth/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
};

export const fetchCurrentUser = () => {
  return apiRequest<AuthUser>("/api/auth/me", {
    cache: "no-store",
  });
};
