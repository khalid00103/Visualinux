import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "head-lesson-root";
  const homeId = "head-lesson-home";
  const studentId = "head-lesson-student";
  const notesId = "head-lesson-notes";

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

const NOTES_CONTENT = [
  "Linux is an operating system.",
  "The terminal lets you interact with Linux using commands.",
  "The head command shows the beginning of a file.",
  "By default, head displays the first 10 lines.",
  "You can use head when you only need the start of a file.",
  "It is useful for quickly checking large files.",
  "You can combine head with other commands later.",
  "Linux commands are often small and focused.",
  "Learning commands step by step makes the terminal easier.",
  "Visualinux helps you practice Linux commands visually.",
  "This is line eleven.",
  "This is line twelve.",
];

export interface HeadResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
}

export function runHead(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
 // _currentDirectoryId: string,
): HeadResult {
  const input = rawInput.trim();

  if (!input) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (!input.startsWith("head")) {
    return {
      success: false,
      message: "This lesson only teaches head. Try: head notes.txt",
      nodes,
    };
  }

  const tokens = input.split(/\s+/);

  if (tokens[0] !== "head") {
    return {
      success: false,
      message: "This lesson only teaches head. Try: head notes.txt",
      nodes,
    };
  }

  if (tokens.length === 1) {
    return {
      success: false,
      message: "head: missing file operand.",
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

  if (filename !== "notes.txt") {
    return {
      success: false,
      message: `head: ${filename}: No such file.`,
      nodes,
    };
  }

  return {
    success: true,
    message: NOTES_CONTENT.slice(0, 10).join("\n"),
    nodes,
  };
}