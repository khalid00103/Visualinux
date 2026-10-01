import type { FilesystemNodeSummary } from "@visualinux/shared-types";

let counter = 0;

function nextId(): string {
  counter += 1;
  return `cd-lesson-node-${counter}`;
}

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
  const rootId = "cd-lesson-root";
  const homeId = "cd-lesson-home";
  const studentId = "cd-lesson-student";
  const documentsId = nextId();
  const downloadsId = nextId();

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

export interface CdResult {
  success: boolean;
  message: string;
  currentDirectoryId: string;
}

export function runCd(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
  currentDirectoryId: string,
): CdResult {
  const trimmed = rawInput.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      success: false,
      message: "Please type a command.",
      currentDirectoryId,
    };
  }

  const command = tokens[0];

  if (command !== "cd") {
    return {
      success: false,
      message:
        "This lesson only teaches the cd command. Try: cd documents",
      currentDirectoryId,
    };
  }

  const args = tokens.slice(1);

  if (args.length === 0) {
    return {
      success: false,
      message: "cd: missing directory operand. Usage: cd <directory>",
      currentDirectoryId,
    };
  }

  if (args.length > 1) {
    return {
      success: false,
      message: "cd: too many arguments. Usage: cd <directory>",
      currentDirectoryId,
    };
  }

  const targetName = args[0];

  if (targetName === ".") {
    return {
      success: true,
      message: "Already in the current directory.",
      currentDirectoryId,
    };
  }

  if (targetName === "..") {
    const currentNode = nodes.find(
      (node) => node.nodeId === currentDirectoryId,
    );

    if (!currentNode || currentNode.parentId === null) {
      return {
        success: false,
        message: "cd: already at the root directory.",
        currentDirectoryId,
      };
    }

    const parentNode = nodes.find(
        (node) => node.nodeId === currentNode.parentId,
    );

    return {
        success: true,
        message: parentNode
            ? `Changed directory to '${parentNode.name}'.`
            : "Changed directory.",
        currentDirectoryId: currentNode.parentId,
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
      message: `cd: ${targetName}: No such file or directory`,
      currentDirectoryId,
    };
  }

  if (targetNode.nodeType !== "directory") {
    return {
      success: false,
      message: `cd: ${targetName}: Not a directory`,
      currentDirectoryId,
    };
  }

  return {
    success: true,
    message: `Changed directory to '${targetName}'.`,
    currentDirectoryId: targetNode.nodeId,
  };
}