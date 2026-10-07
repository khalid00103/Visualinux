import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "chmod-lesson-root";
  const homeId = "chmod-lesson-home";
  const studentId = "chmod-lesson-student";
  const scriptId = "chmod-lesson-script";
  const notesId = "chmod-lesson-notes";

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
      nodeId: scriptId,
      parentId: studentId,
      nodeType: "file",
      name: "script.sh",
      permissions: "rw-r--r--",
      owner: "student",
      groupOwner: "student",
      hasContent: true,
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

export interface ChmodResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
  affectedNodeId?: string;
}

export function runChmod(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
): ChmodResult {
  const input = rawInput.trim();

  if (!input) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (!input.startsWith("chmod")) {
    return {
      success: false,
      message:
        "This lesson only teaches chmod. Try: chmod +x script.sh",
      nodes,
    };
  }

  const tokens = input.split(/\s+/);

  if (tokens[0] !== "chmod") {
    return {
      success: false,
      message:
        "This lesson only teaches chmod. Try: chmod +x script.sh",
      nodes,
    };
  }

  if (tokens.length === 1) {
    return {
      success: false,
      message: "chmod: missing mode and file operand.",
      nodes,
    };
  }

  if (tokens.length !== 3) {
    return {
      success: false,
      message: "This lesson supports one mode and one file.",
      nodes,
    };
  }

  const mode = tokens[1];
  const filename = tokens[2];

  if (filename !== "script.sh" && filename !== "notes.txt") {
    return {
      success: false,
      message: `chmod: ${filename}: No such file.`,
      nodes,
    };
  }

  const targetNode = nodes.find(
    (node) => node.name === filename,
  );

  if (!targetNode) {
    return {
      success: false,
      message: `chmod: ${filename}: No such file.`,
      nodes,
    };
  }

  let newPermissions: string | null = null;

  if (mode === "+x") {
    newPermissions = targetNode.permissions.replace(
      /^rw-r--r--$/,
      "rwxr-xr-x",
    );

    if (newPermissions === targetNode.permissions) {
      newPermissions = targetNode.permissions;
    }
  } else if (mode === "-x") {
    newPermissions = targetNode.permissions.replace(
      /x/g,
      "-",
    );
  } else if (mode === "644") {
    newPermissions = "rw-r--r--";
  } else if (mode === "755") {
    newPermissions = "rwxr-xr-x";
  } else {
    return {
      success: false,
      message: `chmod: unsupported mode '${mode}' in this lesson.`,
      nodes,
    };
  }

  const updatedNodes = nodes.map((node) =>
    node.nodeId === targetNode.nodeId
      ? {
          ...node,
          permissions: newPermissions!,
        }
      : node,
  );

  return {
    success: true,
    message: `Permissions changed for ${filename}.`,
    nodes: updatedNodes,
    affectedNodeId: targetNode.nodeId,
  };
}