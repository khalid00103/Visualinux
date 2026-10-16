
import { runLessonCommand } from "../../terminal/lessonCommandRuntime.js";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  studentId: string;
  documentsId: string;
} {
  const rootId = "mv-lesson-root";
  const homeId = "mv-lesson-home";
  const studentId = "mv-lesson-student";
  const notesId = "mv-lesson-notes";
  const documentsId = "mv-lesson-documents";

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
  ];

  return { nodes, studentId, documentsId };
}

export interface MvResult {
  success: boolean; message: string; nodes: FilesystemNodeSummary[]; affectedNodeId?: string; affectedName?: string; action?: "move" | "rename";
}

export function runMv(rawInput: string, nodes: FilesystemNodeSummary[], currentDirectoryId: string): MvResult {
  return runLessonCommand({ command: "mv", rawInput, nodes, currentDirectoryId }) as MvResult;
}
