import { describe, it, expect } from "vitest";
import { FilesystemTree, type TreeNode } from "../tree.js";
import { pwd, ls, cd, mkdir, rmdir, touch, rm, cp, mv, ln, treeCommand, find, stat, du, df } from "./filesystem-handlers.js";
import { chmod, chown, chgrp } from "./permission-handlers.js";
import type { HandlerContext } from "../types.js";

function buildTree(): FilesystemTree {
  const nodes: TreeNode[] = [
    { id: "home", parentId: null, nodeType: "directory", name: "home", permissions: "rwxr-xr-x", owner: "user", groupOwner: "user", content: null, symlinkTargetId: null },
    { id: "docs", parentId: "home", nodeType: "directory", name: "Documents", permissions: "rwxr-xr-x", owner: "user", groupOwner: "user", content: null, symlinkTargetId: null },
    { id: "notes", parentId: "docs", nodeType: "file", name: "notes.txt", permissions: "rw-r--r--", owner: "user", groupOwner: "user", content: "hello\nworld", symlinkTargetId: null },
    { id: "empty-dir", parentId: "home", nodeType: "directory", name: "empty", permissions: "rwxr-xr-x", owner: "user", groupOwner: "user", content: null, symlinkTargetId: null },
  ];
  return new FilesystemTree(nodes);
}

function ctx(overrides: Partial<HandlerContext> = {}): HandlerContext {
  return { tree: buildTree(), currentDirectoryId: "home", args: [], flags: [], ...overrides };
}

describe("pwd", () => {
  it("prints the current path", () => {
    expect(pwd(ctx({ currentDirectoryId: "docs" })).outputText).toBe("/home/Documents");
  });
});

describe("ls", () => {
  it("lists children of the current directory", () => {
    const result = ls(ctx());
    expect(result.outputText).toContain("Documents");
    expect(result.outputText).toContain("empty");
  });

  it("errors on a nonexistent path", () => {
    const result = ls(ctx({ args: ["nope"] }));
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("not_found");
  });
});

describe("cd", () => {
  it("succeeds into a valid directory and sets newCurrentDirectoryId", () => {
    const result = cd(ctx({ args: ["Documents"] }));
    expect(result.success).toBe(true);
    expect(result.newCurrentDirectoryId).toBe("docs");
    expect(result.animationEvents[0].type).toBe("directory_change");
  });

  it("errors when the target is a file, not a directory", () => {
    const result = cd(ctx({ currentDirectoryId: "docs", args: ["notes.txt"] }));
    expect(result.errorType).toBe("not_a_directory");
  });
});

describe("mkdir", () => {
  it("creates a single new directory", () => {
    const result = mkdir(ctx({ args: ["newdir"] }));
    expect(result.success).toBe(true);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({ type: "createNode", nodeType: "directory", name: "newdir" });
  });

  it("errors on an already-existing directory without -p", () => {
    const result = mkdir(ctx({ args: ["Documents"] }));
    expect(result.errorType).toBe("already_exists");
  });

  it("with -p, creates every missing intermediate segment", () => {
    const result = mkdir(ctx({ args: ["a/b/c"], flags: ["-p"] }));
    expect(result.operations).toHaveLength(3);
    expect(result.operations.map((o) => "name" in o && o.name)).toEqual(["a", "b", "c"]);
  });

  it("with -p, does not error if the directory already exists", () => {
    const result = mkdir(ctx({ args: ["Documents"], flags: ["-p"] }));
    expect(result.success).toBe(true);
    expect(result.operations).toHaveLength(0);
  });
});

describe("rmdir", () => {
  it("removes an empty directory", () => {
    const result = rmdir(ctx({ args: ["empty"] }));
    expect(result.success).toBe(true);
  });

  it("refuses to remove a non-empty directory", () => {
    const result = rmdir(ctx({ args: ["Documents"] }));
    expect(result.errorType).toBe("directory_not_empty");
  });
});

describe("touch", () => {
  it("creates a new file", () => {
    const result = touch(ctx({ args: ["new.txt"] }));
    expect(result.operations[0]).toMatchObject({ type: "createNode", nodeType: "file", name: "new.txt" });
  });

  it("is a no-op (not an error) on an already-existing file", () => {
    const result = touch(ctx({ currentDirectoryId: "docs", args: ["notes.txt"] }));
    expect(result.success).toBe(true);
    expect(result.operations).toHaveLength(0);
  });
});

describe("rm", () => {
  it("refuses to remove a directory without -r", () => {
    const result = rm(ctx({ args: ["Documents"] }));
    expect(result.errorType).toBe("is_a_directory");
  });

  it("removes a directory and its descendants with -r, marked destructive", () => {
    const result = rm(ctx({ args: ["Documents"], flags: ["-r"] }));
    expect(result.success).toBe(true);
    expect(result.isDestructive).toBe(true);
    expect(result.operations.map((o) => "nodeId" in o && o.nodeId).sort()).toEqual(["docs", "notes"].sort());
  });
});

describe("cp", () => {
  it("copies a file", () => {
    const result = cp(ctx({ currentDirectoryId: "docs", args: ["notes.txt", "copy.txt"] }));
    expect(result.operations[0]).toMatchObject({ type: "createNode", name: "copy.txt", content: "hello\nworld" });
  });

  it("refuses to copy a directory without -r", () => {
    const result = cp(ctx({ args: ["Documents", "Documents2"] }));
    expect(result.errorType).toBe("is_a_directory");
  });
});

describe("mv", () => {
  it("moves a node to a new parent", () => {
    const result = mv(ctx({ args: ["Documents", "empty/Documents"] }));
    expect(result.operations[0]).toMatchObject({ type: "moveNode", nodeId: "docs", newParentId: "empty-dir" });
  });
});

describe("ln", () => {
  it("creates a symlink with -s", () => {
    const result = ln(ctx({ currentDirectoryId: "docs", args: ["notes.txt", "shortcut.txt"], flags: ["-s"] }));
    expect(result.operations[0]).toMatchObject({ type: "createNode", nodeType: "symlink", symlinkTargetId: "notes" });
  });

  it("requires -s", () => {
    const result = ln(ctx({ args: ["notes.txt", "shortcut.txt"] }));
    expect(result.errorType).toBe("invalid_arguments");
  });
});

describe("tree command", () => {
  it("renders nested structure", () => {
    const result = treeCommand(ctx());
    expect(result.outputText).toContain("home/");
    expect(result.outputText).toContain("Documents/");
  });
});

describe("find", () => {
  it("finds a descendant matching a name pattern", () => {
    const result = find(ctx({ args: ["-name", "notes"] }));
    expect(result.outputText).toContain("notes.txt");
  });
});

describe("stat", () => {
  it("reports file metadata including size", () => {
    const result = stat(ctx({ currentDirectoryId: "docs", args: ["notes.txt"] }));
    expect(result.outputText).toContain("Size: 11 bytes");
  });
});

describe("du", () => {
  it("sums content size across descendants", () => {
    const result = du(ctx({ args: ["Documents"] }));
    expect(result.outputText).toContain("11");
  });
});

describe("df", () => {
  it("returns a static simulated disk usage summary", () => {
    expect(df(ctx()).success).toBe(true);
  });
});

describe("chmod", () => {
  it("converts octal mode to symbolic permissions", () => {
    const result = chmod(ctx({ currentDirectoryId: "docs", args: ["755", "notes.txt"] }));
    expect(result.operations[0]).toMatchObject({ updates: { permissions: "rwxr-xr-x" } });
  });

  it("rejects an invalid mode", () => {
    const result = chmod(ctx({ args: ["999", "notes.txt"] }));
    expect(result.errorType).toBe("invalid_arguments");
  });
});

describe("chown / chgrp", () => {
  it("chown updates the owner field", () => {
    const result = chown(ctx({ currentDirectoryId: "docs", args: ["alice", "notes.txt"] }));
    expect(result.operations[0]).toMatchObject({ updates: { owner: "alice" } });
    expect(result.animationEvents[0].type).toBe("ownership_change");
  });

  it("chgrp updates the group_owner field, using the group_owner column added in Milestone 3", () => {
    const result = chgrp(ctx({ currentDirectoryId: "docs", args: ["staff", "notes.txt"] }));
    expect(result.operations[0]).toMatchObject({ updates: { groupOwner: "staff" } });
  });
});
