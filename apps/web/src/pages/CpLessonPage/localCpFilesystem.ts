
import { runLessonCommand } from "../../terminal/lessonCommandRuntime.js";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "cp-lesson-root";
  const homeId = "cp-lesson-home";
  const studentId = "cp-lesson-student";
  const notesId = "cp-lesson-notes";

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

  return { nodes, rootId, studentId };
}

export interface CpResult {
  success: boolean; message: string; nodes: FilesystemNodeSummary[]; createdNodeId?: string; createdName?: string;
}

export function runCp(rawInput: string, nodes: FilesystemNodeSummary[], currentDirectoryId: string): CpResult {
  return runLessonCommand({ command: "cp", rawInput, nodes, currentDirectoryId }) as CpResult;
}
