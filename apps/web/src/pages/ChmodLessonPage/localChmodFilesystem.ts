import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { runLessonCommand } from "../../terminal/lessonCommandRuntime.js";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "chmod-lesson-root";
  const homeId = "chmod-lesson-home";
  const studentId = "chmod-lesson-student";
  const scriptId = "chmod-lesson-script";
  const notesId = "chmod-lesson-notes";

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
      nodeId: scriptId,
      parentId: studentId,
      nodeType: "file",
      name: "script.sh",
      permissions: "rw-r--r--",
      owner: "student",
      groupOwner: "student",
      hasContent: true,
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

export interface ChmodResult {
  success: boolean; message: string; nodes: FilesystemNodeSummary[]; affectedNodeId?: string;
}

export function runChmod(rawInput: string, nodes: FilesystemNodeSummary[]): ChmodResult {
  return runLessonCommand({ command: "chmod", rawInput, nodes }) as ChmodResult;
}
