import type { FilesystemNodeSummary } from "@visualinux/shared-types";

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
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
  removedNodeId?: string;
  removedName?: string;
}

export function runRm(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
  currentDirectoryId: string,
): RmResult {
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

  if (command !== "rm") {
    return {
      success: false,
      message:
        "This lesson only teaches the rm command. Try: rm notes.txt",
      nodes,
    };
  }

  const args = tokens.slice(1);

  if (args.length === 0) {
    return {
      success: false,
      message: "rm: missing operand. Usage: rm <file>",
      nodes,
    };
  }

  if (args.length > 1) {
    return {
      success: false,
      message: "rm: too many arguments. Usage: rm <file>",
      nodes,
    };
  }

  const targetName = args[0];

  if (targetName.startsWith("-")) {
    return {
      success: false,
      message:
        "rm: options are not taught in this lesson. Try: rm <file>",
      nodes,
    };
  }

  const targetNode = nodes.find(
    (node) =>
      node.parentId === currentDirectoryId &&
      node.name === targetName,
  );

  if (!targetNode) {
    return {
      success: false,
      message: `rm: cannot remove '${targetName}': No such file or directory`,
      nodes,
    };
  }

  if (targetNode.nodeId === currentDirectoryId) {
    return {
      success: false,
      message: "rm: cannot remove the current directory.",
      nodes,
    };
  }

  if (targetNode.nodeType === "directory") {
    return {
      success: false,
      message:
        `rm: cannot remove '${targetName}': Is a directory. ` +
        "Directory removal will be taught later.",
      nodes,
    };
  }

  const updatedNodes = nodes.filter(
    (node) => node.nodeId !== targetNode.nodeId,
  );

  return {
    success: true,
    message: `Removed '${targetName}'.`,
    nodes: updatedNodes,
    removedNodeId: targetNode.nodeId,
    removedName: targetNode.name,
  };
}