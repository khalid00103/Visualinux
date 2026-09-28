import type { FilesystemTree } from "./tree.js";
import type { AnimationEvent } from "@visualinux/shared-types";

export type FsOperation =
  | {
      type: "createNode";
      id: string; // pre-generated (generateId()) so animation events can reference it immediately
      parentId: string;
      nodeType: "file" | "directory" | "symlink";
      name: string;
      permissions: string;
      owner?: string;
      groupOwner?: string;
      content?: string | null;
      symlinkTargetId?: string;
    }
  | { type: "deleteNode"; nodeId: string }
  | { type: "moveNode"; nodeId: string; newParentId: string; newName?: string }
  | {
      type: "updateNode";
      nodeId: string;
      updates: Partial<{ permissions: string; owner: string; groupOwner: string; content: string | null }>;
    };

export interface HandlerContext {
  tree: FilesystemTree;
  currentDirectoryId: string;
  args: string[];
  flags: string[];
  /** Present when this stage receives piped input from a previous pipeline stage. */
  stdin?: string;
}

export type ErrorType =
  | "not_found"
  | "already_exists"
  | "not_a_directory"
  | "is_a_directory"
  | "directory_not_empty"
  | "invalid_arguments"
  | "permission_denied";

export interface HandlerResult {
  success: boolean;
  outputText: string;
  errorType?: ErrorType;
  operations: FsOperation[];
  animationEvents: AnimationEvent[];
  /** Only `cd` sets this. */
  newCurrentDirectoryId?: string;
  /** Drives the API-level destructive-command confirmation flow (API Design §9). */
  isDestructive?: boolean;
}

export type CommandHandler = (ctx: HandlerContext) => HandlerResult;
