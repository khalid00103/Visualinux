import type { AutocompleteSuggestion } from "@visualinux/shared-types";
import { apiRequest } from "./client.js";

export const commandsApi = {
  autocomplete(accessToken: string, prefix: string) {
    return apiRequest<AutocompleteSuggestion[]>(`/api/v1/commands/autocomplete?prefix=${encodeURIComponent(prefix)}`, {
      accessToken,
    });
  },
};
