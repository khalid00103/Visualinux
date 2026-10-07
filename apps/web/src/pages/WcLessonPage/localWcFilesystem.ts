import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "wc-lesson-root";
  const homeId = "wc-lesson-home";
  const studentId = "wc-lesson-student";
  const notesId = "wc-lesson-notes";

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

function getWordCount(lines: string[]): number {
  return lines
    .join("\n")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getCharacterCount(lines: string[]): number {
  return lines.join("\n").length;
}

export interface WcResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
}

export function runWc(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
): WcResult {
  const input = rawInput.trim();

  if (!input) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (!input.startsWith("wc")) {
    return {
      success: false,
      message: "This lesson only teaches wc. Try: wc notes.txt",
      nodes,
    };
  }

  const tokens = input.split(/\s+/);

  if (tokens[0] !== "wc") {
    return {
      success: false,
      message: "This lesson only teaches wc. Try: wc notes.txt",
      nodes,
    };
  }

  if (tokens.length === 1) {
    return {
      success: false,
      message: "wc: missing file operand.",
      nodes,
    };
  }

  if (tokens.length > 3) {
    return {
      success: false,
      message: "This lesson supports one option and one file.",
      nodes,
    };
  }

  let option: string | null = null;
  let filename: string;

  if (tokens.length === 2) {
    filename = tokens[1];
  } else {
    option = tokens[1];
    filename = tokens[2];
  }

  if (filename !== "notes.txt") {
    return {
      success: false,
      message: `wc: ${filename}: No such file.`,
      nodes,
    };
  }

  const lineCount = NOTES_CONTENT.length;
  const wordCount = getWordCount(NOTES_CONTENT);
  const characterCount = getCharacterCount(NOTES_CONTENT);

  if (option === null) {
    return {
      success: true,
      message: `${lineCount} ${wordCount} ${characterCount} notes.txt`,
      nodes,
    };
  }

  if (option === "-l") {
    return {
      success: true,
      message: `${lineCount} notes.txt`,
      nodes,
    };
  }

  if (option === "-w") {
    return {
      success: true,
      message: `${wordCount} notes.txt`,
      nodes,
    };
  }

  if (option === "-c") {
    return {
      success: true,
      message: `${characterCount} notes.txt`,
      nodes,
    };
  }

  return {
    success: false,
    message: `wc: invalid option ${option}`,
    nodes,
  };
}