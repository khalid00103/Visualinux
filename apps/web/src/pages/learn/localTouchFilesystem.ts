import type { FilesystemNodeSummary } from "@visualinux/shared-types";

let counter = 0;

function nextId(): string {
  counter += 1;
  return `touch-lesson-node-${counter}`;
}

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
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
  createdName?: string;
}

const VALID_NAME = /^[A-Za-z0-9._-]+$/;

export function runTouch(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
  currentDirectoryId: string,
): TouchResult {
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

  if (command !== "touch") {
    return {
      success: false,
      message:
        "This lesson only teaches the touch command. Try: touch hello.txt",
      nodes,
    };
  }

  if (tokens.includes("-")) {
    return {
      success: false,
      message:
        "touch: options are not supported in this lesson. Try: touch <file-name>",
      nodes,
    };
  }

  const args = tokens.slice(1);

  if (args.length === 0) {
    return {
      success: false,
      message:
        "touch: missing file operand. Usage: touch <file-name>",
      nodes,
    };
  }

  if (args.length > 1) {
    return {
      success: false,
      message:
        "touch: too many arguments. Usage: touch <file-name>",
      nodes,
    };
  }

  const name = args[0];

  if (!VALID_NAME.test(name)) {
    return {
      success: false,
      message: `touch: cannot create file '${name}': invalid name`,
      nodes,
    };
  }

  const alreadyExists = nodes.some(
    (node) =>
      node.parentId === currentDirectoryId &&
      node.name === name,
  );

  if (alreadyExists) {
    return {
      success: false,
      message: `touch: cannot create file '${name}': File exists`,
      nodes,
    };
  }

  const newNode: FilesystemNodeSummary = {
    nodeId: nextId(),
    parentId: currentDirectoryId,
    nodeType: "file",
    name,
    permissions: "rw-r--r--",
    owner: "student",
    groupOwner: "student",
    hasContent: false,
    currentDirectory: false,
  };

  return {
    success: true,
    message: `File '${name}' created.`,
    nodes: [...nodes, newNode],
    createdName: name,
  };
}