import type { FilesystemNodeDetail, FilesystemNodeSummary } from "@visualinux/shared-types";
import { apiRequest } from "./client.js";

export const filesystemApi = {
  getTree(accessToken: string, sandboxId: string) {
    return apiRequest<FilesystemNodeSummary[]>(`/api/v1/sandboxes/${sandboxId}/filesystem`, { accessToken });
  },

  getNode(accessToken: string, sandboxId: string, nodeId: string) {
    return apiRequest<FilesystemNodeDetail>(`/api/v1/sandboxes/${sandboxId}/filesystem/nodes/${nodeId}`, {
      accessToken,
    });
  },
};
