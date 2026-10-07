import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "echo-lesson-root";
  const homeId = "echo-lesson-home";
  const studentId = "echo-lesson-student";
  const notesId = "echo-lesson-notes";

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

export interface EchoResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
}

export function runEcho(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
//  _currentDirectoryId: string,
): EchoResult {
  const input = rawInput.trim();

  if (!input) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (!input.startsWith("echo")) {
    return {
      success: false,
      message: "This lesson only teaches echo. Try: echo Hello Linux",
      nodes,
    };
  }

  const tokens = input.split(/\s+/);

  if (tokens[0] !== "echo") {
    return {
      success: false,
      message: "This lesson only teaches echo. Try: echo Hello Linux",
      nodes,
    };
  }

  const text = input.slice(4).trim();

  if (!text) {
    return {
      success: true,
      message: "",
      nodes,
    };
  }

  const startsWithDoubleQuote = text.startsWith('"');
  const endsWithDoubleQuote = text.endsWith('"');

  const startsWithSingleQuote = text.startsWith("'");
  const endsWithSingleQuote = text.endsWith("'");

  const hasMatchingDoubleQuotes =
    startsWithDoubleQuote && endsWithDoubleQuote;

  const hasMatchingSingleQuotes =
    startsWithSingleQuote && endsWithSingleQuote;

  if (
    (startsWithDoubleQuote && !endsWithDoubleQuote) ||
    (endsWithDoubleQuote && !startsWithDoubleQuote) ||
    (startsWithSingleQuote && !endsWithSingleQuote) ||
    (endsWithSingleQuote && !startsWithSingleQuote)
  ) {
    return {
      success: false,
      message: "echo: unmatched quote.",
      nodes,
    };
  }

  let output = text;

  if (hasMatchingDoubleQuotes || hasMatchingSingleQuotes) {
    output = text.slice(1, -1);
  }

  return {
    success: true,
    message: output,
    nodes,
  };
}