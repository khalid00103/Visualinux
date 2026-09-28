import type { CommandExecutionRequest, CommandExecutionResponse, CommandHistoryEntry } from "@visualinux/shared-types";
import { apiRequest } from "./client.js";

export const terminalApi = {
  executeCommand(accessToken: string, sandboxId: string, body: CommandExecutionRequest) {
    return apiRequest<CommandExecutionResponse>(`/api/v1/sandboxes/${sandboxId}/commands`, {
      method: "POST",
      body,
      accessToken,
    });
  },

  getHistory(accessToken: string, sandboxId: string, cursor?: string) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return apiRequest<{ entries: CommandHistoryEntry[]; nextCursor: string | null }>(
      `/api/v1/sandboxes/${sandboxId}/commands/history${query}`,
      { accessToken }
    );
  },
};
