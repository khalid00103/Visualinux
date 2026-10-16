import { describe, expect, it } from "vitest";
import type {
  CommandExecutionResponse,
  FilesystemNodeSummary,
} from "@visualinux/shared-types";
import { createCommandPresentation } from "./commandPresentation.js";

const nodes: FilesystemNodeSummary[] = [
  { nodeId: "root", parentId: null, nodeType: "directory", name: "/", permissions: "rwxr-xr-x", owner: "root", groupOwner: "root", hasContent: false, currentDirectory: false },
  { nodeId: "home", parentId: "root", nodeType: "directory", name: "home", permissions: "rwxr-xr-x", owner: "root", groupOwner: "root", hasContent: false, currentDirectory: false },
  { nodeId: "student", parentId: "home", nodeType: "directory", name: "student", permissions: "rwxr-xr-x", owner: "student", groupOwner: "student", hasContent: false, currentDirectory: true },
  { nodeId: "documents", parentId: "student", nodeType: "directory", name: "documents", permissions: "rwxr-xr-x", owner: "student", groupOwner: "student", hasContent: false, currentDirectory: false },
  { nodeId: "notes", parentId: "student", nodeType: "file", name: "notes.txt", permissions: "rw-r--r--", owner: "student", groupOwner: "student", hasContent: true, currentDirectory: false },
];

function response(overrides: Partial<CommandExecutionResponse> = {}): CommandExecutionResponse {
  return {
    success: true,
    outputText: "",
    errorType: null,
    suggestion: null,
    diff: { nodesCreated: [], nodesDeleted: [], nodesMoved: [], nodesModified: [] },
    animationEvents: [],
    lessonStepResult: null,
    commandHistoryId: "history-1",
    newCurrentDirectoryId: null,
    ...overrides,
  };
}

describe("shared command presentation", () => {
  it("formats ls as a tree and highlights every current-directory child", () => {
    const plan = createCommandPresentation({
      commandName: "ls", args: [], flags: [], isSingleCommand: true, rawInput: "ls",
      response: response(), beforeNodes: nodes, afterNodes: nodes,
      currentDirectoryId: "student", newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toBe("student\n├── documents\n└── notes.txt");
    expect(plan.highlightNodeIds).toEqual(["documents", "notes"]);
    expect(plan.removalNodeIds).toEqual([]);
  });

  it("formats cd without a yellow highlight and expands the complete path", () => {
    const plan = createCommandPresentation({
      commandName: "cd", args: ["documents"], flags: [], isSingleCommand: true,
      rawInput: "cd documents",
      response: response({ outputText: "", newCurrentDirectoryId: "documents" }),
      beforeNodes: nodes, afterNodes: nodes,
      currentDirectoryId: "student", newCurrentDirectoryId: "documents",
    });

    expect(plan.outputText).toBe("Changed directory to 'documents'.\n\nCurrent directory:\n/home/student/documents");
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.expandNodeIds).toEqual(["root", "home", "student", "documents"]);
  });

  it("shows rm's educational explanation while leaving actual visual removal to the controller", () => {
    const plan = createCommandPresentation({
      commandName: "rm", args: ["notes.txt"], flags: [], isSingleCommand: true,
      rawInput: "rm notes.txt",
      response: response({
        diff: { nodesCreated: [], nodesDeleted: ["notes"], nodesMoved: [], nodesModified: [] },
        animationEvents: [{ type: "delete", nodeId: "notes" }],
      }),
      beforeNodes: nodes, afterNodes: nodes,
      currentDirectoryId: "student", newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toBe("Removed 'notes.txt'.\n\nVisualized result:\nRemoved: notes.txt");
    expect(plan.removalNodeIds).toEqual(["notes"]);
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.expandNodeIds).toContain("student");
  });

  it("does not animate a failed Linux command", () => {
    const plan = createCommandPresentation({
      commandName: "mkdir", args: ["existing"], flags: [], isSingleCommand: true,
      rawInput: "mkdir existing",
      response: response({
        success: false,
        outputText: "mkdir: cannot create directory 'existing': File exists",
        animationEvents: [{ type: "create", nodeId: "fake-node" }],
      }),
      beforeNodes: nodes, afterNodes: nodes,
      currentDirectoryId: "student", newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toBe("mkdir: cannot create directory 'existing': File exists");
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });

  it("does not turn content-display events into yellow filesystem highlights", () => {
    const plan = createCommandPresentation({
      commandName: "cat", args: ["notes.txt"], flags: [], isSingleCommand: true,
      rawInput: "cat notes.txt",
      response: response({
        outputText: "hello",
        animationEvents: [{ type: "content_display", nodeId: "notes" }],
      }),
      beforeNodes: nodes, afterNodes: nodes,
      currentDirectoryId: "student", newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toBe("hello");
    expect(plan.highlightNodeIds).toEqual([]);
  });
});
