import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { runLessonCommand } from "../../terminal/lessonCommandRuntime.js";

/** / -> home -> student (current directory) */

export function buildInitialFilesystem(): {
  nodes: FilesystemNodeSummary[];
  rootId: string;
  studentId: string;
} {
  const rootId = "mkdir-lesson-root";
  const homeId = "mkdir-lesson-home";
  const studentId = "mkdir-lesson-student";

  const nodes: FilesystemNodeSummary[] = [
    { nodeId: rootId, parentId: null, nodeType: "directory", name: "/", permissions: "rwxr-xr-x", owner: "root", groupOwner: "root", hasContent: false, currentDirectory: false },
    { nodeId: homeId, parentId: rootId, nodeType: "directory", name: "home", permissions: "rwxr-xr-x", owner: "root", groupOwner: "root", hasContent: false, currentDirectory: false },
    { nodeId: studentId, parentId: homeId, nodeType: "directory", name: "student", permissions: "rwxr-xr-x", owner: "student", groupOwner: "student", hasContent: false, currentDirectory: false },
  ];

  return { nodes, rootId, studentId };
}

export interface MkdirResult {
  success: boolean; message: string; nodes: FilesystemNodeSummary[]; createdName?: string; createdNodeId?: string;
}

export function runMkdir(rawInput: string, nodes: FilesystemNodeSummary[], currentDirectoryId: string): MkdirResult {
  return runLessonCommand({ command: "mkdir", rawInput, nodes, currentDirectoryId }) as MkdirResult;
}
