import type { AuthResponse, LoginRequest, RefreshResponse, SignUpRequest } from "@visualinux/shared-types";
import { apiRequest } from "./client.js";

export const authApi = {
  signUp(body: SignUpRequest) {
    return apiRequest<AuthResponse>("/api/v1/auth/signup", { method: "POST", body });
  },

  login(body: LoginRequest) {
    return apiRequest<AuthResponse>("/api/v1/auth/login", { method: "POST", body });
  },

  refresh() {
    return apiRequest<RefreshResponse>("/api/v1/auth/refresh", { method: "POST" });
  },

  logout() {
    return apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
  },
};
