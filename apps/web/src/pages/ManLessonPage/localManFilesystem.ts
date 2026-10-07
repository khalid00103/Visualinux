import type { FilesystemNodeSummary } from "@visualinux/shared-types";

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "man-lesson-root";
  const homeId = "man-lesson-home";
  const studentId = "man-lesson-student";
  const notesId = "man-lesson-notes";

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

export interface ManResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
}

const MANUALS: Record<string, string> = {
  ls: `LS(1)

NAME
    ls - list directory contents

DESCRIPTION
    List files and directories.

EXAMPLE
    ls`,

  pwd: `PWD(1)

NAME
    pwd - print working directory

DESCRIPTION
    Print the path of the current directory.

EXAMPLE
    pwd`,

  mkdir: `MKDIR(1)

NAME
    mkdir - make directories

DESCRIPTION
    Create a new directory.

EXAMPLE
    mkdir projects`,

  touch: `TOUCH(1)

NAME
    touch - create an empty file

DESCRIPTION
    Create a new file.

EXAMPLE
    touch notes.txt`,

  cd: `CD(1)

NAME
    cd - change directory

DESCRIPTION
    Change the current working directory.

EXAMPLE
    cd projects`,
};

export function runMan(
  rawInput: string,
  nodes: FilesystemNodeSummary[],
): ManResult {
  const input = rawInput.trim();

  if (!input) {
    return {
      success: false,
      message: "Please type a command.",
      nodes,
    };
  }

  if (!input.startsWith("man")) {
    return {
      success: false,
      message: "This lesson only teaches man. Try: man ls",
      nodes,
    };
  }

  const tokens = input.split(/\s+/);

  if (tokens[0] !== "man") {
    return {
      success: false,
      message: "This lesson only teaches man. Try: man ls",
      nodes,
    };
  }

  if (tokens.length === 1) {
    return {
      success: false,
      message: "man: missing manual page.",
      nodes,
    };
  }

  if (tokens.length !== 2) {
    return {
      success: false,
      message: "This lesson supports one command at a time.",
      nodes,
    };
  }

  const command = tokens[1];

  const manual = MANUALS[command];

  if (!manual) {
    return {
      success: false,
      message: `No manual entry for ${command}.`,
      nodes,
    };
  }

  return {
    success: true,
    message: manual,
    nodes,
  };
}