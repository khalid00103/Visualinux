import { describe, expect, it } from "vitest";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { runLessonCommand, type LessonCommandName, type LessonCommandResult } from "./lessonCommandRuntime.js";

function makeFilesystem(): FilesystemNodeSummary[] {
  return [
    { nodeId: "root", parentId: null, nodeType: "directory", name: "/", permissions: "rwxr-xr-x", owner: "root", groupOwner: "root", hasContent: false, currentDirectory: false },
    { nodeId: "home", parentId: "root", nodeType: "directory", name: "home", permissions: "rwxr-xr-x", owner: "root", groupOwner: "root", hasContent: false, currentDirectory: false },
    { nodeId: "student", parentId: "home", nodeType: "directory", name: "student", permissions: "rwxr-xr-x", owner: "student", groupOwner: "student", hasContent: false, currentDirectory: true },
    { nodeId: "documents", parentId: "student", nodeType: "directory", name: "documents", permissions: "rwxr-xr-x", owner: "student", groupOwner: "student", hasContent: false, currentDirectory: false },
    { nodeId: "downloads", parentId: "student", nodeType: "directory", name: "downloads", permissions: "rwxr-xr-x", owner: "student", groupOwner: "student", hasContent: false, currentDirectory: false },
    { nodeId: "notes", parentId: "student", nodeType: "file", name: "notes.txt", permissions: "rw-r--r--", owner: "student", groupOwner: "student", hasContent: true, currentDirectory: false },
    { nodeId: "script", parentId: "student", nodeType: "file", name: "script.sh", permissions: "rw-r--r--", owner: "student", groupOwner: "student", hasContent: true, currentDirectory: false },
    { nodeId: "names", parentId: "student", nodeType: "file", name: "names.txt", permissions: "rw-r--r--", owner: "student", groupOwner: "student", hasContent: true, currentDirectory: false },
  ];
}

const cases: Array<{ command: LessonCommandName; input: string; verify: (result: LessonCommandResult) => void }> = [
  { command: "cat", input: "cat notes.txt", verify: (r) => expect(r.message).toContain("Welcome to Visualinux!") },
  { command: "cd", input: "cd documents", verify: (r) => { expect(r.currentDirectoryId).toBe("documents"); expect(r.currentPath).toBe("/home/student/documents"); } },
  { command: "chmod", input: "chmod +x script.sh", verify: (r) => expect(r.nodes.find((n) => n.nodeId === "script")?.permissions).toBe("rwxr-xr-x") },
  { command: "wc", input: "wc -l notes.txt", verify: (r) => expect(r.message).toBe("12 notes.txt") },
  { command: "chown", input: "chown root notes.txt", verify: (r) => expect(r.nodes.find((n) => n.nodeId === "notes")?.owner).toBe("root") },
  { command: "clear", input: "clear", verify: (r) => expect(r.message).toBe("") },
  { command: "cp", input: "cp notes.txt backup.txt", verify: (r) => expect(r.createdName).toBe("backup.txt") },
  { command: "echo", input: "echo Hello Linux", verify: (r) => expect(r.message).toBe("Hello Linux") },
  { command: "grep", input: "grep Linux notes.txt", verify: (r) => expect(r.message).toContain("Linux is an operating system.") },
  { command: "head", input: "head notes.txt", verify: (r) => expect(r.message).toContain("Linux is an operating system.") },
  { command: "ls", input: "ls", verify: (r) => expect(r.listedNames).toContain("notes.txt") },
  { command: "man", input: "man ls", verify: (r) => expect(r.message).toContain("LS(1)") },
  { command: "mkdir", input: "mkdir my-project", verify: (r) => expect(r.createdName).toBe("my-project") },
  { command: "mv", input: "mv notes.txt documents", verify: (r) => { expect(r.action).toBe("move"); expect(r.nodes.find((n) => n.nodeId === "notes")?.parentId).toBe("documents"); } },
  { command: "pwd", input: "pwd", verify: (r) => expect(r.currentPath).toBe("/home/student") },
  { command: "rm", input: "rm notes.txt", verify: (r) => { expect(r.removedNodeId).toBe("notes"); expect(r.nodes.some((n) => n.nodeId === "notes")).toBe(false); } },
  { command: "sort", input: "sort names.txt", verify: (r) => expect(r.message.split("\n")[0]).toBe("Apple") },
  { command: "tail", input: "tail notes.txt", verify: (r) => expect(r.message).toContain("This is line twelve.") },
  { command: "touch", input: "touch hello.txt", verify: (r) => expect(r.createdName).toBe("hello.txt") },
  { command: "wc", input: "wc notes.txt", verify: (r) => expect(r.message).toBe("12 90 517 notes.txt") },
  { command: "whoami", input: "whoami", verify: (r) => expect(r.message).toBe("student") },
];

describe("guided lessons use the shared simulation engine", () => {
  it.each(cases)("executes $command through the shared interpreter", ({ command, input, verify }) => {
    const nodes = makeFilesystem();
    const result = runLessonCommand({ command, rawInput: input, nodes, currentDirectoryId: "student" });
    expect(result.success).toBe(true);
    verify(result);
  });

  it("parses chmod -x as a mode operand and applies the shared handler", () => {
    const nodes = makeFilesystem().map((node) =>
      node.nodeId === "script" ? { ...node, permissions: "rwxr-xr-x" } : node,
    );
    const result = runLessonCommand({ command: "chmod", rawInput: "chmod -x script.sh", nodes, currentDirectoryId: "student" });
    expect(result.success).toBe(true);
    expect(result.nodes.find((node) => node.nodeId === "script")?.permissions).toBe("rw-r--r--");
  });

  it("keeps lesson restrictions while using shared command semantics", () => {
    const nodes = makeFilesystem();
    const result = runLessonCommand({ command: "mkdir", rawInput: "mkdir -p nested/project", nodes, currentDirectoryId: "student" });
    expect(result.success).toBe(false);
    expect(result.message).toContain("option '-p' is not supported in this lesson");
    expect(result.nodes).toEqual(nodes);
  });
});
