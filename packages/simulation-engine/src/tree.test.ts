import { describe, it, expect } from "vitest";
import { FilesystemTree, type TreeNode } from "./tree.js";

function buildSampleTree(): TreeNode[] {
  return [
    { id: "home", parentId: null, nodeType: "directory", name: "home", permissions: "rwxr-xr-x", owner: "user", groupOwner: "user", content: null, symlinkTargetId: null },
    { id: "docs", parentId: "home", nodeType: "directory", name: "Documents", permissions: "rwxr-xr-x", owner: "user", groupOwner: "user", content: null, symlinkTargetId: null },
    { id: "notes", parentId: "docs", nodeType: "file", name: "notes.txt", permissions: "rw-r--r--", owner: "user", groupOwner: "user", content: "hello", symlinkTargetId: null },
    { id: "projects", parentId: "home", nodeType: "directory", name: "projects", permissions: "rwxr-xr-x", owner: "user", groupOwner: "user", content: null, symlinkTargetId: null },
  ];
}

describe("FilesystemTree.resolve", () => {
  it("resolves a relative path from the current directory", () => {
    const tree = new FilesystemTree(buildSampleTree());
    const result = tree.resolve("home", "Documents");
    expect("node" in result && result.node?.id).toBe("docs");
  });

  it("resolves an absolute path whose leading segment matches the root's own name", () => {
    // This is the exact bug found during Milestone 3 verification: root.name is
    // "home", so "/home/Documents" must resolve, not fail looking for a child
    // of root literally named "home".
    const tree = new FilesystemTree(buildSampleTree());
    const result = tree.resolve("projects", "/home/Documents");
    expect("node" in result && result.node?.id).toBe("docs");
  });

  it("resolves an absolute path that is just the root's name", () => {
    const tree = new FilesystemTree(buildSampleTree());
    const result = tree.resolve("docs", "/home");
    expect("node" in result && result.node?.id).toBe("home");
  });

  it("resolves an absolute path without the root's name prefix, directly from root", () => {
    const tree = new FilesystemTree(buildSampleTree());
    const result = tree.resolve("docs", "/projects");
    expect("node" in result && result.node?.id).toBe("projects");
  });

  it("resolves '..' up to the parent", () => {
    const tree = new FilesystemTree(buildSampleTree());
    const result = tree.resolve("docs", "..");
    expect("node" in result && result.node?.id).toBe("home");
  });

  it("keeps '..' at the root rather than erroring", () => {
    const tree = new FilesystemTree(buildSampleTree());
    const result = tree.resolve("home", "..");
    expect("node" in result && result.node?.id).toBe("home");
  });

  it("resolves '.' as a no-op", () => {
    const tree = new FilesystemTree(buildSampleTree());
    const result = tree.resolve("docs", ".");
    expect("node" in result && result.node?.id).toBe("docs");
  });

  it("returns the parent and every missing segment for a not-yet-existing nested path (mkdir -p support)", () => {
    const tree = new FilesystemTree(buildSampleTree());
    const result = tree.resolve("home", "a/b/c");
    expect("parent" in result && result.parent?.id).toBe("home");
    expect("missingSegments" in result && result.missingSegments).toEqual(["a", "b", "c"]);
  });

  it("returns undefined node/parent for a completely invalid starting point", () => {
    const tree = new FilesystemTree(buildSampleTree());
    const result = tree.resolve("does-not-exist", "anything");
    expect("node" in result && result.node).toBeUndefined();
  });
});

describe("FilesystemTree.getPath", () => {
  it("builds the full absolute path including the root's own name", () => {
    const tree = new FilesystemTree(buildSampleTree());
    expect(tree.getPath("notes")).toBe("/home/Documents/notes.txt");
  });
});

describe("FilesystemTree.getDescendants", () => {
  it("returns every nested descendant, not just direct children", () => {
    const tree = new FilesystemTree(buildSampleTree());
    const descendants = tree.getDescendants("home").map((n) => n.id).sort();
    expect(descendants).toEqual(["docs", "notes", "projects"].sort());
  });
});
