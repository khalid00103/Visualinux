import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { runLessonCommand } from "../../terminal/lessonCommandRuntime.js";

let counter = 0;

function nextId(): string {
  counter += 1;
  return `cd-lesson-node-${counter}`;
}

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
  const rootId = "cd-lesson-root";
  const homeId = "cd-lesson-home";
  const studentId = "cd-lesson-student";
  const documentsId = nextId();
  const downloadsId = nextId();

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

export interface CdResult {
  success: boolean; message: string; currentDirectoryId: string; pathNodeIds: string[];
}

export function runCd(rawInput: string, nodes: FilesystemNodeSummary[], currentDirectoryId: string): CdResult {
  return runLessonCommand({ command: "cd", rawInput, nodes, currentDirectoryId }) as CdResult;
}
