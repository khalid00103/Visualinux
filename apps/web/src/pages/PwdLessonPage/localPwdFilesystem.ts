import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { runLessonCommand } from "../../terminal/lessonCommandRuntime.js";

/**
 * Initial filesystem:
 *
 * /
 * └── home
 *     └── student (current directory)
 *         ├── documents
 *         └── downloads
 */

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "pwd-lesson-root";
  const homeId = "pwd-lesson-home";
  const studentId = "pwd-lesson-student";
  const documentsId = "pwd-lesson-documents";
  const downloadsId = "pwd-lesson-downloads";

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
      currentDirectory: true,
    },
    {
      nodeId: documentsId,
      parentId: studentId,
      nodeType: "directory",
      name: "documents",
      permissions: "rwxr-xr-x",
      owner: "student",
      groupOwner: "student",
      hasContent: false,
      currentDirectory: false,
    },
    {
      nodeId: downloadsId,
      parentId: studentId,
      nodeType: "directory",
      name: "downloads",
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

export interface PwdResult {
  success: boolean; message: string; currentPath: string; pathNodeIds: string[];
}

export function runPwd(rawInput: string, nodes: FilesystemNodeSummary[], currentDirectoryId: string): PwdResult {
  return runLessonCommand({ command: "pwd", rawInput, nodes, currentDirectoryId }) as PwdResult;
}
