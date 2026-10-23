import type { AutocompleteSuggestion, CommandDetail } from "@visualinux/shared-types";
import { apiRequest } from "./client.js";

export const commandsApi = {
  autocomplete(accessToken: string, prefix: string) {
    return apiRequest<AutocompleteSuggestion[]>(`/api/v1/commands/autocomplete?prefix=${encodeURIComponent(prefix)}`, {
      accessToken,
    });
  },

    getByName(accessToken: string, name: string) {
    return apiRequest<CommandDetail>(
      `/api/v1/commands/${encodeURIComponent(name)}`,
      { accessToken }
    );
  },

};
