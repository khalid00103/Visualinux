import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "chown-lesson-root";
  const homeId = "chown-lesson-home";
  const studentId = "chown-lesson-student";
  const notesId = "chown-lesson-notes";

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

export interface ChownResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
  affectedNodeId?: string;
}

export function runChown(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
): ChownResult {
  const input = rawInput.trim();

  if (!input) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (!input.startsWith("chown")) {
    return {
      success: false,
      message:
        "This lesson only teaches chown. Try: chown root notes.txt",
      nodes,
    };
  }

  const tokens = input.split(/\s+/);

  if (tokens[0] !== "chown") {
    return {
      success: false,
      message:
        "This lesson only teaches chown. Try: chown root notes.txt",
      nodes,
    };
  }

  if (tokens.length === 1) {
    return {
      success: false,
      message: "chown: missing owner and file operand.",
      nodes,
    };
  }

  if (tokens.length !== 3) {
    return {
      success: false,
      message: "This lesson supports one owner and one file.",
      nodes,
    };
  }

  const owner = tokens[1];
  const filename = tokens[2];

  if (filename !== "notes.txt") {
    return {
      success: false,
      message: `chown: ${filename}: No such file.`,
      nodes,
    };
  }

  if (owner !== "student" && owner !== "root") {
    return {
      success: false,
      message: `chown: invalid user '${owner}'.`,
      nodes,
    };
  }

  const targetNode = nodes.find(
    (node) => node.name === filename,
  );

  if (!targetNode) {
    return {
      success: false,
      message: `chown: ${filename}: No such file.`,
      nodes,
    };
  }

  const updatedNodes = nodes.map((node) =>
    node.nodeId === targetNode.nodeId
      ? {
          ...node,
          owner,
        }
      : node,
  );

  return {
    success: true,
    message: `Owner changed to ${owner} for ${filename}.`,
    nodes: updatedNodes,
    affectedNodeId: targetNode.nodeId,
  };
}