import { describe, it, expect } from "vitest";
import { FilesystemTree, type TreeNode } from "../tree.js";
import { cat, head, tail, grep, sort, uniq, wc, diff, echo, nano } from "./text-handlers.js";
import type { HandlerContext } from "../types.js";

function buildTree(): FilesystemTree {
  const nodes: TreeNode[] = [
    { id: "home", parentId: null, nodeType: "directory", name: "home", permissions: "rwxr-xr-x", owner: "user", groupOwner: "user", content: null, symlinkTargetId: null },
    { id: "a", parentId: "home", nodeType: "file", name: "a.txt", permissions: "rw-r--r--", owner: "user", groupOwner: "user", content: "banana\napple\ncherry\napple", symlinkTargetId: null },
    { id: "b", parentId: "home", nodeType: "file", name: "b.txt", permissions: "rw-r--r--", owner: "user", groupOwner: "user", content: "banana\napple\ncherry\napple", symlinkTargetId: null },
    { id: "empty", parentId: "home", nodeType: "file", name: "empty.txt", permissions: "rw-r--r--", owner: "user", groupOwner: "user", content: "", symlinkTargetId: null },
  ];
  return new FilesystemTree(nodes);
}

function ctx(overrides: Partial<HandlerContext> = {}): HandlerContext {
  return { tree: buildTree(), currentDirectoryId: "home", args: [], flags: [], ...overrides };
}

describe("cat", () => {
  it("reads a file's content", () => {
    expect(cat(ctx({ args: ["a.txt"] })).outputText).toBe("banana\napple\ncherry\napple");
  });

  it("prefers stdin over a file argument when piped", () => {
    expect(cat(ctx({ stdin: "piped content" })).outputText).toBe("piped content");
  });

  it("errors with no file and no stdin", () => {
    expect(cat(ctx()).errorType).toBe("invalid_arguments");
  });
});

describe("head / tail", () => {
  it("head returns the first lines, defaulting to 10", () => {
    expect(head(ctx({ args: ["a.txt"] })).outputText).toBe("banana\napple\ncherry\napple");
  });

  it("tail returns the last N lines with -n", () => {
    const result = tail(ctx({ args: ["1", "a.txt"], flags: ["-n"] }));
    expect(result.outputText).toBe("apple");
  });
});

describe("grep", () => {
  it("filters lines containing the pattern from a file argument", () => {
    const result = grep(ctx({ args: ["an", "a.txt"] }));
    expect(result.outputText).toBe("banana");
  });

  it("uses the first arg as the pattern when receiving piped stdin (no file arg)", () => {
    const result = grep(ctx({ args: ["an"], stdin: "banana\napple\ncherry" }));
    expect(result.outputText).toBe("banana");
  });

  it("supports case-insensitive matching with -i", () => {
    const result = grep(ctx({ args: ["BANANA", "a.txt"], flags: ["-i"] }));
    expect(result.outputText).toBe("banana");
  });
});

describe("sort", () => {
  it("sorts lines alphabetically", () => {
    const result = sort(ctx({ args: ["a.txt"] }));
    expect(result.outputText).toBe("apple\napple\nbanana\ncherry");
  });

  it("works on piped stdin with no file argument", () => {
    const result = sort(ctx({ stdin: "banana\napple\ncherry" }));
    expect(result.outputText).toBe("apple\nbanana\ncherry");
  });
});

describe("uniq", () => {
  it("removes consecutive duplicate lines only", () => {
    const result = uniq(ctx({ stdin: "apple\napple\nbanana\nbanana\napple" }));
    expect(result.outputText).toBe("apple\nbanana\napple");
  });
});

describe("wc", () => {
  it("counts lines, words, and characters by default", () => {
    const result = wc(ctx({ stdin: "hello world\nfoo" }));
    expect(result.outputText).toBe("2  3  15");
  });

  it("counts only lines with -l", () => {
    const result = wc(ctx({ stdin: "a\nb\nc", flags: ["-l"] }));
    expect(result.outputText).toBe("3");
  });
});

describe("diff", () => {
  it("reports identical files as identical", () => {
    const result = diff(ctx({ args: ["a.txt", "b.txt"] }));
    expect(result.outputText).toBe("(files are identical)");
  });

  it("reports differing lines", () => {
    const result = diff(ctx({ args: ["a.txt", "empty.txt"] }));
    expect(result.outputText).toContain("< banana");
  });
});

describe("echo", () => {
  it("prints its arguments joined by spaces", () => {
    expect(echo(ctx({ args: ["hello", "world"] })).outputText).toBe("hello world");
  });
});

describe("nano", () => {
  it("creates the file if it doesn't exist, honestly labeled as not-yet-interactive", () => {
    const result = nano(ctx({ args: ["new.txt"] }));
    expect(result.success).toBe(true);
    expect(result.operations[0]).toMatchObject({ type: "createNode", name: "new.txt" });
    expect(result.outputText).toContain("editing UI not yet implemented");
  });

  it("errors when the target already exists and is a directory", () => {
    const result = nano(ctx({ args: ["."] }));
    expect(result.errorType).toBe("is_a_directory");
  });
});
