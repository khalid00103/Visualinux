// Mirrors API Design §8 (Filesystem) and §9 (Terminal), and the diff/animation
// event schema described in Architecture §6-8.

export type NodeType = "file" | "directory" | "symlink";

export interface FilesystemNodeSummary {
  nodeId: string;
  parentId: string | null;
  nodeType: NodeType;
  name: string;
  permissions: string;
  owner: string;
  groupOwner: string;
  hasContent: boolean;
  currentDirectory: boolean;
}

export interface FilesystemNodeDetail extends FilesystemNodeSummary {
  content: string | null;
  symlinkTargetId: string | null;
}

export interface FilesystemDiff {
  nodesCreated: FilesystemNodeSummary[];
  nodesDeleted: string[];
  nodesMoved: Array<{ nodeId: string; fromParentId: string | null; toParentId: string }>;
  nodesModified: FilesystemNodeSummary[];
}

export type AnimationEventType =
  | "create"
  | "delete"
  | "move"
  | "copy"
  | "permission_change"
  | "ownership_change"
  | "symlink"
  | "directory_change"
  | "content_display"
  | "none";

export interface AnimationEvent {
  type: AnimationEventType;
  nodeId: string;
  metadata?: Record<string, unknown>;
}

export interface CommandSuggestion {
  suggestedCommand: string;
  description: string;
}

export interface LessonStepResult {
  stepId: string;
  completed: boolean;
  currentHintLevel: number;
}

export interface CommandExecutionRequest {
  rawInput: string;
  confirmed?: boolean;
}

export interface CommandExecutionResponse {
  success: boolean;
  outputText: string;
  errorType: string | null;
  suggestion: CommandSuggestion | null;
  diff: FilesystemDiff;
  animationEvents: AnimationEvent[];
  lessonStepResult: LessonStepResult | null;
  commandHistoryId: string;
  /** Set only when the command changed the current directory (i.e. a successful `cd`). */
  newCurrentDirectoryId: string | null;
}

export interface CommandHistoryEntry {
  commandHistoryId: string;
  rawInput: string;
  commandName: string | null;
  wasSuccessful: boolean;
  executedAt: string;
}
