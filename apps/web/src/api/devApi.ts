import { apiRequest } from "./client.js";

// TEMPORARY — see apps/api/src/filesystem/dev-routes.ts. Delete this file
// alongside that one once Milestone 6's real Practice API exists.
export const devApi = {
  createSandbox(accessToken: string) {
    return apiRequest<{ id: string }>("/api/v1/dev/sandbox", { method: "POST", accessToken });
  },
};
