import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { runLessonCommand } from "../../terminal/lessonCommandRuntime.js";

/**
 * Initial filesystem:
 *
 * /
 * └── home
 *     └── student (current directory)
 */

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "touch-lesson-root";
  const homeId = "touch-lesson-home";
  const studentId = "touch-lesson-student";

  const nodes: FilesystemNodeSummary[] = [
    {
      nodeId: rootId,
      parentId: null,
      nodeType: "directory",
      name: "/",
      permissions: "rwxr-xr-x",
      owner: "root",
      groupOwner: "root",
      hasContent: false,
      currentDirectory: false,
    },
    {
      nodeId: homeId,
      parentId: rootId,
      nodeType: "directory",
      name: "home",
      permissions: "rwxr-xr-x",
      owner: "root",
      groupOwner: "root",
      hasContent: false,
      currentDirectory: false,
    },
    {
      nodeId: studentId,
      parentId: homeId,
      nodeType: "directory",
      name: "student",
      permissions: "rwxr-xr-x",
      owner: "student",
      groupOwner: "student",
      hasContent: false,
      currentDirectory: false,
    },
  ];

  return {
    nodes,
    rootId,
    studentId,
  };
}

export interface TouchResult {
  success: boolean; message: string; nodes: FilesystemNodeSummary[]; createdName?: string; createdNodeId?: string;
}

export function runTouch(rawInput: string, nodes: FilesystemNodeSummary[], currentDirectoryId: string): TouchResult {
  return runLessonCommand({ command: "touch", rawInput, nodes, currentDirectoryId }) as TouchResult;
}
