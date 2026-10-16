import { apiRequest } from "./client.js";

export interface PracticeSandboxResponse {
  id: string;
  currentDirectoryId: string;
}

export const practiceApi = {
  getOrCreateSandbox(accessToken: string) {
    return apiRequest<PracticeSandboxResponse>("/api/v1/practice/sandbox", {
      method: "POST",
      accessToken,
    });
  },
};