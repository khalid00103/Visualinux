import type { UpdateProfileRequest, UserProfile } from "@visualinux/shared-types";
import { apiRequest } from "./client.js";

export const usersApi = {
  getMe(accessToken: string) {
    return apiRequest<UserProfile>("/api/v1/users/me", { accessToken });
  },

  updateMe(accessToken: string, body: UpdateProfileRequest) {
    return apiRequest<UserProfile>("/api/v1/users/me", { method: "PATCH", body, accessToken });
  },

  deleteMe(accessToken: string) {
    return apiRequest<void>("/api/v1/users/me", { method: "DELETE", accessToken });
  },
};
