import type { FilesystemNodeSummary } from "@visualinux/shared-types";

let counter = 0;

function nextId(): string {
  counter += 1;
  return `ls-lesson-node-${counter}`;
}

export interface LsFilesystem {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
}

export function buildInitialFilesystem(): LsFilesystem {
  counter = 0;

  const rootId = nextId();
  const homeId = nextId();
  const studentId = nextId();
  const documentsId = nextId();
  const downloadsId = nextId();
  const notesId = nextId();

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
      hasContent: true,
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

export interface LsResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
  listedNames?: string[];
}

export function runLs(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
  currentDirectoryId: string,
): LsResult {
  const trimmed = rawInput.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  const command = tokens[0];

  if (command !== "ls") {
    return {
      success: false,
      message: "This lesson only teaches the ls command. Try: ls",
      nodes,
    };
  }

  const args = tokens.slice(1);

  if (args.length > 0) {
    return {
      success: false,
      message: "ls: options and paths are not supported in this lesson. Try: ls",
      nodes,
    };
  }

  const children = nodes
    .filter((node) => node.parentId === currentDirectoryId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const listedNames = children.map((node) => node.name);

  return {
    success: true,
    message: listedNames.join("  "),
    nodes,
    listedNames,
  };
}