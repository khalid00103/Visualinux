import type { FilesystemDiff, FilesystemNodeSummary } from "@visualinux/shared-types";
import type { TreeNode } from "@visualinux/simulation-engine";

/**
 * FilesystemNodeSummary (what GET /filesystem returns, and what the mirror is
 * built from) deliberately excludes file `content` (Architecture §8's read API
 * design — content is fetched per-node on demand, not bulk). This means a
 * client-side TreeNode reconstructed from the mirror has no content to read.
 *
 * Practical consequence, stated honestly rather than worked around: true
 * optimistic simulation in this milestone only covers *structural* commands
 * (create/delete/move/copy/permission/ownership/symlink/directory-change) —
 * exactly the commands the Animation Engine (Milestone 5) cares about most.
 * Content-reading commands (cat, head, tail, grep, sort, uniq, wc, diff, nano)
 * have nothing to optimistically read from and go straight to the server; see
 * COMMANDS_REQUIRING_SERVER_ROUNDTRIP in commandExecutionOrchestrator.ts.
 */
export function summaryToTreeNode(n: FilesystemNodeSummary): TreeNode {
  return {
    id: n.nodeId,
    parentId: n.parentId,
    nodeType: n.nodeType,
    name: n.name,
    permissions: n.permissions,
    owner: n.owner,
    groupOwner: n.groupOwner,
    content: null, // never available at the summary level — see note above
    symlinkTargetId: null,
  };
}

/** Applies a FilesystemDiff to a node list, returning a new array (never mutates in place). */
export function applyDiffToNodes(nodes: FilesystemNodeSummary[], diff: FilesystemDiff): FilesystemNodeSummary[] {
  let result = nodes.filter((n) => !diff.nodesDeleted.includes(n.nodeId));

  const byId = new Map(result.map((n) => [n.nodeId, n]));

  for (const created of diff.nodesCreated) {
    byId.set(created.nodeId, created);
  }
  for (const modified of diff.nodesModified) {
    byId.set(modified.nodeId, modified);
  }

  result = Array.from(byId.values());
  return result;
}
