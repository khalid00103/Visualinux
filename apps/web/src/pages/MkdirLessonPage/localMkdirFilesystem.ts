import type { FilesystemNodeSummary } from "@visualinux/shared-types";

let counter = 0;

function nextId(): string {
  counter += 1;
  return `mkdir-lesson-node-${counter}`;
}

/** / -> home -> student (current directory) */
export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "mkdir-lesson-root";
  const homeId = "mkdir-lesson-home";
  const studentId = "mkdir-lesson-student";

  const nodes: FilesystemNodeSummary[] = [
    { nodeId: rootId, parentId: null, nodeType: "directory", name: "/", permissions: "rwxr-xr-x", owner: "root", groupOwner: "root", hasContent: false, currentDirectory: false },
    { nodeId: homeId, parentId: rootId, nodeType: "directory", name: "home", permissions: "rwxr-xr-x", owner: "root", groupOwner: "root", hasContent: false, currentDirectory: false },
    { nodeId: studentId, parentId: homeId, nodeType: "directory", name: "student", permissions: "rwxr-xr-x", owner: "student", groupOwner: "student", hasContent: false, currentDirectory: false },
  ];

  return { nodes, rootId, studentId };
}

export interface MkdirResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
  createdName?: string;
}

const VALID_NAME = /^[A-Za-z0-9._-]+$/;

export function runMkdir(rawInput: string, nodes: FilesystemNodeSummary[], currentDirectoryId: string): MkdirResult {
  const trimmed = rawInput.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return { success: false, message: "Please type a command.", nodes };
  }

  const command = tokens[0];

  if (command !== "mkdir") {
    return {
      success: false,
      message: `This lesson only teaches the mkdir command. Try: mkdir my-project`,
      nodes,
    };
  }

  if (tokens.includes("-p")) {
    return {
      success: false,
      message: "mkdir: option '-p' is not supported in this lesson. Try: mkdir <directory-name>",
      nodes,
    };
  }

  const args = tokens.slice(1);
  if (args.length === 0) {
    return { success: false, message: "mkdir: missing operand. Usage: mkdir <directory-name>", nodes };
  }
  if (args.length > 1) {
    return { success: false, message: "mkdir: too many arguments. Usage: mkdir <directory-name>", nodes };
  }
  const name = args[0];

  if (!VALID_NAME.test(name)) {
    return { success: false, message: `mkdir: cannot create directory '${name}': invalid name`, nodes };
  }

  const alreadyExists = nodes.some((n) => n.parentId === currentDirectoryId && n.name === name);
  if (alreadyExists) {
    return { success: false, message: `mkdir: cannot create directory '${name}': File exists`, nodes };
  }

  const newNode: FilesystemNodeSummary = {
    nodeId: nextId(),
    parentId: currentDirectoryId,
    nodeType: "directory",
    name,
    permissions: "rwxr-xr-x",
    owner: "student",
    groupOwner: "student",
    hasContent: false,
    currentDirectory: false,
  };

  return {
    success: true,
    message: `Directory '${name}' created.`,
    nodes: [...nodes, newNode],
    createdName: name,
  };
}
