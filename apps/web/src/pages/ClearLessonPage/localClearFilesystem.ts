import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "clear-lesson-root";
  const homeId = "clear-lesson-home";
  const studentId = "clear-lesson-student";
  const notesId = "clear-lesson-notes";

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

  return {
    nodes,
    rootId,
    studentId,
  };
}

export interface ClearResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
}

export function runClear(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
): ClearResult {
  const input = rawInput.trim();

  if (!input) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (input !== "clear") {
    return {
      success: false,
      message: "This lesson only teaches clear. Try: clear",
      nodes,
    };
  }

  return {
    success: true,
    message: "",
    nodes,
  };
}