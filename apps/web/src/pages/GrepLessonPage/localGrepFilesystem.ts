import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "grep-lesson-root";
  const homeId = "grep-lesson-home";
  const studentId = "grep-lesson-student";
  const notesId = "grep-lesson-notes";

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
  "The tail command shows the end of a file.",
  "You can use grep to search text inside a file.",
  "Linux commands are often small and focused.",
  "Learning commands step by step makes the terminal easier.",
  "Visualinux helps you practice Linux commands visually.",
  "Searching files is useful when you have a lot of text.",
  "The grep command finds matching lines.",
  "This is line eleven.",
  "This is line twelve.",
];

export interface GrepResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
}

export function runGrep(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
): GrepResult {
  const input = rawInput.trim();

  if (!input) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (!input.startsWith("grep")) {
    return {
      success: false,
      message: "This lesson only teaches grep. Try: grep Linux notes.txt",
      nodes,
    };
  }

  const tokens = input.split(/\s+/);

  if (tokens[0] !== "grep") {
    return {
      success: false,
      message: "This lesson only teaches grep. Try: grep Linux notes.txt",
      nodes,
    };
  }

  if (tokens.length === 1) {
    return {
      success: false,
      message: "grep: missing search pattern and file.",
      nodes,
    };
  }

  if (tokens.length === 2) {
    return {
      success: false,
      message: "grep: missing file operand.",
      nodes,
    };
  }

  if (tokens.length > 3) {
    return {
      success: false,
      message: "This lesson supports one search pattern and one file.",
      nodes,
    };
  }

  const searchText = tokens[1];
  const filename = tokens[2];

  if (filename !== "notes.txt") {
    return {
      success: false,
      message: `grep: ${filename}: No such file.`,
      nodes,
    };
  }

  const matchingLines = NOTES_CONTENT.filter((line) =>
    line.includes(searchText),
  );

  return {
    success: true,
    message: matchingLines.join("\n"),
    nodes,
  };
}