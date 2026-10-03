
import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "cat-lesson-root";
  const homeId = "cat-lesson-home";
  const studentId = "cat-lesson-student";
  const notesId = "cat-lesson-notes";
  const documentsId = "cat-lesson-documents";

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

  return { nodes, rootId, studentId };
}

export interface CatResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
}

const FILE_CONTENTS: Record<string, string> = {
  "notes.txt": [
    "Welcome to Visualinux!",
    "Linux lets you work with files and directories.",
    "The cat command displays the contents of a file.",
  ].join("\n"),
};

export function runCat(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
  currentDirectoryId: string,
): CatResult {
  const tokens = rawInput.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (tokens[0] !== "cat") {
    return {
      success: false,
      message: "This lesson only teaches cat. Try: cat notes.txt",
      nodes,
    };
  }

  const args = tokens.slice(1);

  if (args.length !== 1) {
    return {
      success: false,
      message: "Usage: cat <file-name>",
      nodes,
    };
  }

  const [fileName] = args;

  if (
    fileName.startsWith("-") ||
    !/^[A-Za-z0-9._-]+$/.test(fileName) ||
    fileName === "." ||
    fileName === ".."
  ) {
    return {
      success: false,
      message: "cat: invalid file name. Options are not taught in this lesson.",
      nodes,
    };
  }

  const target = nodes.find(
    (node) =>
      node.parentId === currentDirectoryId &&
      node.name === fileName,
  );

  if (!target) {
    return {
      success: false,
      message: `cat: ${fileName}: No such file or directory`,
      nodes,
    };
  }

  if (target.nodeType !== "file") {
    return {
      success: false,
      message: `cat: ${fileName}: Is a directory`,
      nodes,
    };
  }

  const content = FILE_CONTENTS[fileName];

  if (content === undefined) {
    return {
      success: false,
      message: `cat: ${fileName}: This demo file has no sample content configured.`,
      nodes,
    };
  }

  return {
    success: true,
    message: content,
    nodes,
  };
}
