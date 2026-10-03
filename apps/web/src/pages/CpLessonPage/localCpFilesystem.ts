
import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "cp-lesson-root";
  const homeId = "cp-lesson-home";
  const studentId = "cp-lesson-student";
  const notesId = "cp-lesson-notes";

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

  return { nodes, rootId, studentId };
}

export interface CpResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
  createdNodeId?: string;
  createdName?: string;
}

const VALID_NAME = /^[A-Za-z0-9._-]+$/;

export function runCp(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
  currentDirectoryId: string,
): CpResult {
  const tokens = rawInput.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (tokens[0] !== "cp") {
    return {
      success: false,
      message: "This lesson only teaches cp. Try: cp notes.txt backup.txt",
      nodes,
    };
  }

  const args = tokens.slice(1);

  if (args.length !== 2) {
    return {
      success: false,
      message: "Usage: cp <source-file> <new-file-name>",
      nodes,
    };
  }

  const [sourceName, destinationName] = args;

  if (
    sourceName.startsWith("-") ||
    destinationName.startsWith("-")
  ) {
    return {
      success: false,
      message: "Options are not taught in this lesson. Try: cp notes.txt backup.txt",
      nodes,
    };
  }

  if (
    !VALID_NAME.test(sourceName) ||
    !VALID_NAME.test(destinationName)
  ) {
    return {
      success: false,
      message: "cp: invalid file name.",
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
      message: `cp: cannot stat '${sourceName}': No such file`,
      nodes,
    };
  }

  if (source.nodeType !== "file") {
    return {
      success: false,
      message: `cp: '${sourceName}' is not a file. Directory copying is taught later.`,
      nodes,
    };
  }

  if (sourceName === destinationName) {
    return {
      success: false,
      message: "cp: source and destination are the same file.",
      nodes,
    };
  }

  const destinationExists = nodes.some(
    (node) =>
      node.parentId === currentDirectoryId &&
      node.name === destinationName,
  );

  if (destinationExists) {
    return {
      success: false,
      message: `cp: cannot create '${destinationName}': File exists. Overwriting is not taught in this lesson.`,
      nodes,
    };
  }

  const createdNodeId = `cp-lesson-copy-${encodeURIComponent(destinationName)}`;

  const copy: FilesystemNodeSummary = {
    ...source,
    nodeId: createdNodeId,
    parentId: currentDirectoryId,
    name: destinationName,
    currentDirectory: false,
  };

  return {
    success: true,
    message: `'${sourceName}' copied to '${destinationName}'.`,
    nodes: [...nodes, copy],
    createdNodeId,
    createdName: destinationName,
  };
}
