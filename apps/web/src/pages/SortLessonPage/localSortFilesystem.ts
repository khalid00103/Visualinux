import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "sort-lesson-root";
  const homeId = "sort-lesson-home";
  const studentId = "sort-lesson-student";
  const namesId = "sort-lesson-names";

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
      nodeId: namesId,
      parentId: studentId,
      nodeType: "file",
      name: "names.txt",
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

const NAMES_CONTENT = [
  "Zebra",
  "Apple",
  "Mango",
  "Banana",
  "Orange",
  "Grape",
];

export interface SortResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
}

export function runSort(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
): SortResult {
  const input = rawInput.trim();

  if (!input) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (!input.startsWith("sort")) {
    return {
      success: false,
      message: "This lesson only teaches sort. Try: sort names.txt",
      nodes,
    };
  }

  const tokens = input.split(/\s+/);

  if (tokens[0] !== "sort") {
    return {
      success: false,
      message: "This lesson only teaches sort. Try: sort names.txt",
      nodes,
    };
  }

  if (tokens.length === 1) {
    return {
      success: false,
      message: "sort: missing file operand.",
      nodes,
    };
  }

  if (tokens.length > 2) {
    return {
      success: false,
      message: "This lesson supports one file at a time.",
      nodes,
    };
  }

  const filename = tokens[1];

  if (filename !== "names.txt") {
    return {
      success: false,
      message: `sort: ${filename}: No such file.`,
      nodes,
    };
  }

  const sortedLines = [...NAMES_CONTENT].sort();

  return {
    success: true,
    message: sortedLines.join("\n"),
    nodes,
  };
}