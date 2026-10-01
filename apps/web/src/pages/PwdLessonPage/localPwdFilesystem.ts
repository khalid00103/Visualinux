import type { FilesystemNodeSummary } from "@visualinux/shared-types";

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
  const rootId = "pwd-lesson-root";
  const homeId = "pwd-lesson-home";
  const studentId = "pwd-lesson-student";
  const documentsId = "pwd-lesson-documents";
  const downloadsId = "pwd-lesson-downloads";

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

export interface PwdResult {
  success: boolean;
  message: string;
  currentPath: string;
  pathNodeIds: string[];
}

export function runPwd(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
  currentDirectoryId: string,
): PwdResult {
  const trimmed = rawInput.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      success: false,
      message: "Please type a command.",
      currentPath: "",
      pathNodeIds: [],
    };
  }

  const command = tokens[0];

  if (command !== "pwd") {
    return {
      success: false,
      message:
        "This lesson only teaches the pwd command. Try: pwd",
      currentPath: "",
      pathNodeIds: [],
    };
  }

  if (tokens.length > 1) {
    return {
      success: false,
      message: "pwd: this lesson does not support options or arguments.",
      currentPath: "",
      pathNodeIds: [],
    };
  }

  const currentNode = nodes.find(
    (node) => node.nodeId === currentDirectoryId,
  );

  if (!currentNode) {
    return {
      success: false,
      message: "pwd: current directory could not be found.",
      currentPath: "",
      pathNodeIds: [],
    };
  }

  const pathParts: string[] = [];
  const pathNodeIds: string[] = [];

  let node: FilesystemNodeSummary | undefined = currentNode;

  while (node) {
    pathNodeIds.unshift(node.nodeId);

    if (node.name !== "/") {
      pathParts.unshift(node.name);
    }

    if (node.parentId === null) {
      break;
    }

    node = nodes.find(
      (candidate) => candidate.nodeId === node?.parentId,
    );
  }

  const currentPath = `/${pathParts.join("/")}`;

  return {
    success: true,
    message: currentPath,
    currentPath,
    pathNodeIds,
  };
}