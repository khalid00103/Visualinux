import { describe, it, expect } from "vitest";
import { FilesystemTree, type TreeNode } from "./tree.js";
import { parseCommandLine } from "./parser.js";
import { interpret, type CommandRegistryLookup } from "./interpreter.js";

function buildTree(): FilesystemTree {
  const nodes: TreeNode[] = [
    { id: "home", parentId: null, nodeType: "directory", name: "home", permissions: "rwxr-xr-x", owner: "user", groupOwner: "user", content: null, symlinkTargetId: null },
    { id: "a", parentId: "home", nodeType: "file", name: "a.txt", permissions: "rw-r--r--", owner: "user", groupOwner: "user", content: "banana\napple", symlinkTargetId: null },
  ];
  return new FilesystemTree(nodes);
}

// A minimal fake covering exactly the MVP commands these tests exercise —
// deliberately not the real DB-backed registry, so interpreter tests never
// need a live database.
const fakeRegistry: CommandRegistryLookup = {
  findByName(name) {
    const table: Record<string, { minArgs: number; maxArgs: number | null }> = {
      mkdir: { minArgs: 1, maxArgs: null },
      cat: { minArgs: 1, maxArgs: null },
      sort: { minArgs: 1, maxArgs: 1 },
      echo: { minArgs: 0, maxArgs: null },
    };
    return table[name];
  },
  suggestSimilar(name) {
    if (name === "mkdirr") return { name: "mkdir", description: "Creates a new directory" };
    return undefined;
  },
};

describe("interpret — command recognition", () => {
  it("returns unrecognized_command with a suggestion for a close typo", () => {
    const tree = buildTree();
    const parsed = parseCommandLine("mkdirr project", "home", tree);
    const result = interpret(parsed, "home", tree, fakeRegistry);

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("unrecognized_command");
    expect(result.suggestion).toEqual({ suggestedCommand: "mkdir", description: "Creates a new directory" });
  });

  it("returns unrecognized_command with no suggestion for something wildly different", () => {
    const tree = buildTree();
    const parsed = parseCommandLine("zzzzzzz", "home", tree);
    const result = interpret(parsed, "home", tree, fakeRegistry);

    expect(result.errorType).toBe("unrecognized_command");
    expect(result.suggestion).toBeUndefined();
  });
});

describe("interpret — argument count validation", () => {
  it("rejects a command with too few arguments", () => {
    const tree = buildTree();
    const parsed = parseCommandLine("mkdir", "home", tree);
    const result = interpret(parsed, "home", tree, fakeRegistry);

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("invalid_arguments");
  });

  it("relaxes minArgs by one for a pipeline stage that receives stdin", () => {
    // sort normally requires 1 file argument (minArgs: 1); piped, it needs zero,
    // since stdin substitutes for the file — this is the exact fix for the
    // piping bug found during Milestone 3 verification.
    const tree = buildTree();
    const parsed = parseCommandLine("cat a.txt | sort", "home", tree);
    const result = interpret(parsed, "home", tree, fakeRegistry);

    expect(result.success).toBe(true);
    expect(result.outputText).toBe("apple\nbanana");
  });
});

describe("interpret — pipelines", () => {
  it("feeds each stage's output as the next stage's stdin", () => {
    const tree = buildTree();
    const parsed = parseCommandLine("cat a.txt | sort", "home", tree);
    const result = interpret(parsed, "home", tree, fakeRegistry);
    expect(result.outputText).toBe("apple\nbanana");
  });

  it("stops and reports failure at the stage that fails, not later stages", () => {
    const tree = buildTree();
    const parsed = parseCommandLine("cat missing.txt | sort", "home", tree);
    const result = interpret(parsed, "home", tree, fakeRegistry);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("not_found");
  });
});

describe("interpret — redirect", () => {
  it("writes the pipeline's final output to a new file instead of returning it as terminal output", () => {
    const tree = buildTree();
    const parsed = parseCommandLine("echo hello > output.txt", "home", tree);
    const result = interpret(parsed, "home", tree, fakeRegistry);

    expect(result.success).toBe(true);
    expect(result.outputText).toBe(""); // redirected — nothing printed to terminal
    expect(result.operations).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "createNode", name: "output.txt", content: "hello" })])
    );
  });

  it("appends to an existing file with >>", () => {
    const tree = buildTree();
    const parsed = parseCommandLine("echo more >> a.txt", "home", tree);
    const result = interpret(parsed, "home", tree, fakeRegistry);

    expect(result.success).toBe(true);
    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "updateNode", nodeId: "a", updates: { content: "banana\napple\nmore" } }),
      ])
    );
  });
});
