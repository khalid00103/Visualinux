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


  it("explains a missing path using the current directory and its contents", () => {
    const plan = createCommandPresentation({
      commandName: "cd",
      args: ["dvfg"],
      flags: [],
      isSingleCommand: true,
      rawInput: "cd dvfg",
      response: response({
        success: false,
        outputText: "cd: dvfg: No such file or directory",
        errorType: "not_found",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain("What happened:");
    expect(plan.outputText).toContain("/home/student");
    expect(plan.outputText).toContain("documents/");
    expect(plan.outputText).toContain("notes.txt");
    expect(plan.outputText).toContain("Check its spelling and location");
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });

  it("identifies an existing item when a name conflicts in the current directory", () => {
    const plan = createCommandPresentation({
      commandName: "mkdir",
      args: ["notes.txt"],
      flags: [],
      isSingleCommand: true,
      rawInput: "mkdir notes.txt",
      response: response({
        success: false,
        outputText: "mkdir: cannot create directory 'notes.txt': File exists",
        errorType: "already_exists",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain("notes.txt");
    expect(plan.outputText).toContain("/home/student");
    expect(plan.outputText).toContain("It is a file.");
    expect(plan.outputText).toContain("choose a different name");
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });

  it("does not show filesystem path diagnostics for a missing manual page", () => {
    const plan = createCommandPresentation({
      commandName: "man",
      args: ["unknown-command"],
      flags: [],
      isSingleCommand: true,
      rawInput: "man unknown-command",
      response: response({
        success: false,
        outputText: "No manual entry for unknown-command",
        errorType: "not_found",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain(
      "The simulator does not have a manual page",
    );
    expect(plan.outputText).not.toContain("Your current simulated directory:");
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });


  it("shows a valid usage example for invalid arguments", () => {
    const plan = createCommandPresentation({
      commandName: "mkdir",
      args: [],
      flags: [],
      isSingleCommand: true,
      rawInput: "mkdir",
      response: response({
        success: false,
        outputText: "mkdir: missing operand",
        errorType: "invalid_arguments",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain("What happened:");
    expect(plan.outputText).toContain("Example of valid usage: mkdir project");
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });

  it("explains when a command is not recognized", () => {
    const plan = createCommandPresentation({
      commandName: "unknowncmd",
      args: [],
      flags: [],
      isSingleCommand: true,
      rawInput: "unknowncmd",
      response: response({
        success: false,
        outputText: "unknowncmd: command not found",
        errorType: "unrecognized_command",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain(
      "This command is not recognized by the simulator",
    );
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });

  it("explains permission errors without changing the filesystem", () => {
    const plan = createCommandPresentation({
      commandName: "chmod",
      args: ["755", "notes.txt"],
      flags: [],
      isSingleCommand: true,
      rawInput: "chmod 755 notes.txt",
      response: response({
        success: false,
        outputText: "chmod: operation not permitted",
        errorType: "permission_denied",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain("What happened:");
    expect(plan.outputText).toContain(
      "does not have permission to perform this operation",
    );
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });

  it("explains that nano expects a file rather than a directory", () => {
    const plan = createCommandPresentation({
      commandName: "nano",
      args: ["documents"],
      flags: [],
      isSingleCommand: true,
      rawInput: "nano documents",
      response: response({
        success: false,
        outputText: "nano: documents: Is a directory",
        errorType: "is_a_directory",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain("What happened:");
    expect(plan.outputText).toContain("target is a directory");
    expect(plan.outputText).toContain("provide a file path instead");
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });

  it("explains an existing cp destination without claiming it was overwritten", () => {
    const plan = createCommandPresentation({
      commandName: "cp",
      args: ["source.txt", "notes.txt"],
      flags: [],
      isSingleCommand: true,
      rawInput: "cp source.txt notes.txt",
      response: response({
        success: false,
        outputText: "cp: cannot create 'notes.txt': File exists",
        errorType: "already_exists",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain(
      "The destination 'notes.txt' already exists",
    );
    expect(plan.outputText).toContain("It is a file.");
    expect(plan.outputText).toContain("Choose a different destination");
    expect(plan.outputText).not.toContain("The file was overwritten");
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });


  it("gives cat-specific guidance when an input file is missing", () => {
    const plan = createCommandPresentation({
      commandName: "cat",
      args: ["missing.txt"],
      flags: [],
      isSingleCommand: true,
      rawInput: "cat missing.txt",
      response: response({
        success: false,
        outputText: "cat: missing.txt: No such file or directory",
        errorType: "not_found",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain(
      "Check that the input file exists and its path is correct.",
    );
    expect(plan.outputText).toContain("Your current simulated directory:");
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });

  it("gives cp-specific guidance when a source or destination path is missing", () => {
    const plan = createCommandPresentation({
      commandName: "cp",
      args: ["missing.txt", "copy.txt"],
      flags: [],
      isSingleCommand: true,
      rawInput: "cp missing.txt copy.txt",
      response: response({
        success: false,
        outputText: "cp: cannot stat 'missing.txt': No such file or directory",
        errorType: "not_found",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain(
      "Check that the source exists and that the destination path is valid.",
    );
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });


  it("explains when mkdir has a file in its parent path", () => {
    const plan = createCommandPresentation({
      commandName: "mkdir",
      args: ["notes.txt/new-folder"],
      flags: [],
      isSingleCommand: true,
      rawInput: "mkdir notes.txt/new-folder",
      response: response({
        success: false,
        outputText: "mkdir: Not a directory",
        errorType: "not_a_directory",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain("What happened:");
    expect(plan.outputText).toContain(
      "Use an existing directory as the parent or correct the path.",
    );
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });

  it("explains invalid path components for cp", () => {
    const plan = createCommandPresentation({
      commandName: "cp",
      args: ["notes.txt/source.txt", "documents/copy.txt"],
      flags: [],
      isSingleCommand: true,
      rawInput: "cp notes.txt/source.txt documents/copy.txt",
      response: response({
        success: false,
        outputText: "cp: Not a directory",
        errorType: "not_a_directory",
      }),
      beforeNodes: nodes,
      afterNodes: nodes,
      currentDirectoryId: "student",
      newCurrentDirectoryId: null,
    });

    expect(plan.outputText).toContain(
      "A component of the source or destination path is not a directory.",
    );
    expect(plan.highlightNodeIds).toEqual([]);
    expect(plan.removalNodeIds).toEqual([]);
  });

});
