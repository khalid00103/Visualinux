import { describe, it, expect } from "vitest";
import { applyDiffToNodes, summaryToTreeNode } from "./nodeMirror.js";
import type { FilesystemDiff, FilesystemNodeSummary } from "@visualinux/shared-types";

function node(overrides: Partial<FilesystemNodeSummary> = {}): FilesystemNodeSummary {
  return {
    nodeId: "n1",
    parentId: null,
    nodeType: "directory",
    name: "home",
    permissions: "rwxr-xr-x",
    owner: "user",
    groupOwner: "user",
    hasContent: false,
    currentDirectory: true,
    ...overrides,
  };
}

function emptyDiff(): FilesystemDiff {
  return { nodesCreated: [], nodesDeleted: [], nodesMoved: [], nodesModified: [] };
}

describe("applyDiffToNodes", () => {
  it("adds newly created nodes", () => {
    const nodes = [node()];
    const diff = { ...emptyDiff(), nodesCreated: [node({ nodeId: "n2", parentId: "n1", name: "project" })] };
    const result = applyDiffToNodes(nodes, diff);
    expect(result.map((n) => n.nodeId).sort()).toEqual(["n1", "n2"]);
  });

  it("removes deleted nodes", () => {
    const nodes = [node(), node({ nodeId: "n2", parentId: "n1", name: "project" })];
    const diff = { ...emptyDiff(), nodesDeleted: ["n2"] };
    const result = applyDiffToNodes(nodes, diff);
    expect(result.map((n) => n.nodeId)).toEqual(["n1"]);
  });

  it("replaces modified nodes with their updated version", () => {
    const nodes = [node({ nodeId: "n2", parentId: "n1", name: "old-name" })];
    const diff = { ...emptyDiff(), nodesModified: [node({ nodeId: "n2", parentId: "n1", name: "new-name" })] };
    const result = applyDiffToNodes(nodes, diff);
    expect(result.find((n) => n.nodeId === "n2")?.name).toBe("new-name");
  });

  it("never mutates the original array", () => {
    const nodes = [node()];
    const original = [...nodes];
    applyDiffToNodes(nodes, { ...emptyDiff(), nodesDeleted: ["n1"] });
    expect(nodes).toEqual(original);
  });
});

describe("summaryToTreeNode", () => {
  it("converts a FilesystemNodeSummary to a TreeNode with null content", () => {
    const result = summaryToTreeNode(node({ hasContent: true }));
    expect(result.content).toBeNull();
    expect(result.id).toBe("n1");
  });
});
