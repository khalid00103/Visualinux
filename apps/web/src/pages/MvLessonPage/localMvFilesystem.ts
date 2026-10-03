
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
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
  affectedNodeId?: string;
  affectedName?: string;
  action?: "move" | "rename";
}

const VALID_NAME = /^[A-Za-z0-9._-]+$/;

export function runMv(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
  currentDirectoryId: string,
): MvResult {
  const tokens = rawInput.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return { success: false, message: "Please type a command.", nodes };
  }

  if (tokens[0] !== "mv") {
    return {
      success: false,
      message: "This lesson only teaches mv. Try: mv notes.txt renamed.txt",
      nodes,
    };
  }

  const args = tokens.slice(1);

  if (args.length !== 2) {
    return {
      success: false,
      message: "Usage: mv <source> <destination>",
      nodes,
    };
  }

  const [sourceName, destination] = args;

  if (
    sourceName.startsWith("-") ||
    destination.startsWith("-")
  ) {
    return {
      success: false,
      message: "Options are not taught in this lesson.",
      nodes,
    };
  }

  if (
    !VALID_NAME.test(sourceName) ||
    !VALID_NAME.test(destination) ||
    sourceName === "." ||
    sourceName === ".." ||
    destination === "." ||
    destination === ".."
  ) {
    return {
      success: false,
      message: "mv: invalid file or directory name.",
      nodes,
    };
  }

  const source = nodes.find(
    (node) =>
      node.parentId === currentDirectoryId &&
      node.name === sourceName,
  );

  if (!source) {
    return {
      success: false,
      message: `mv: cannot stat '${sourceName}': No such file or directory`,
      nodes,
    };
  }

  const destinationNode = nodes.find(
    (node) =>
      node.parentId === currentDirectoryId &&
      node.name === destination,
  );

  // If the destination is an existing directory, move the source into it.
  if (destinationNode?.nodeType === "directory") {
    if (source.nodeId === destinationNode.nodeId) {
      return {
        success: false,
        message: "mv: source and destination are the same.",
        nodes,
      };
    }

    // Prevent moving a directory into itself or one of its descendants.
    if (source.nodeType === "directory") {
      let parentId: string | null = destinationNode.nodeId;

      while (parentId !== null) {
        if (parentId === source.nodeId) {
          return {
            success: false,
            message: "mv: cannot move a directory into itself.",
            nodes,
          };
        }

        const parent = nodes.find((node) => node.nodeId === parentId);
        parentId = parent?.parentId ?? null;
      }
    }

    return {
      success: true,
      message: `'${sourceName}' moved into '${destination}'.`,
      nodes: nodes.map((node) =>
        node.nodeId === source.nodeId
          ? { ...node, parentId: destinationNode.nodeId }
          : node,
      ),
      affectedNodeId: source.nodeId,
      affectedName: source.name,
      action: "move",
    };
  }

  // Otherwise, destination is interpreted as a new name in the current directory.
  if (destinationNode) {
    return {
      success: false,
      message: `mv: cannot move '${sourceName}': destination already exists.`,
      nodes,
    };
  }

  return {
    success: true,
    message: `'${sourceName}' renamed to '${destination}'.`,
    nodes: nodes.map((node) =>
      node.nodeId === source.nodeId
        ? { ...node, name: destination }
        : node,
    ),
    affectedNodeId: source.nodeId,
    affectedName: destination,
    action: "rename",
  };
}
