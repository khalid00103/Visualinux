import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { runLessonCommand } from "../../terminal/lessonCommandRuntime.js";

/**
 * Initial filesystem:
 *
 * /
 * └── home
 *     └── student (current directory)
 *         ├── documents
 *         ├── downloads
 *         └── notes.txt
 */

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "rm-lesson-root";
  const homeId = "rm-lesson-home";
  const studentId = "rm-lesson-student";
  const documentsId = "rm-lesson-documents";
  const downloadsId = "rm-lesson-downloads";
  const notesId = "rm-lesson-notes";

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
    {
      nodeId: notesId,
      parentId: studentId,
      nodeType: "file",
      name: "notes.txt",
      permissions: "rw-r--r--",
      owner: "student",
      groupOwner: "student",
      hasContent: true,
      currentDirectory: false,
    },
  ];

  return {
    nodes,
    rootId,
    studentId,
  };
}

export interface RmResult {
  success: boolean; message: string; nodes: FilesystemNodeSummary[]; removedNodeId?: string; removedName?: string;
}

export function runRm(rawInput: string, nodes: FilesystemNodeSummary[], currentDirectoryId: string): RmResult {
  return runLessonCommand({ command: "rm", rawInput, nodes, currentDirectoryId }) as RmResult;
}
