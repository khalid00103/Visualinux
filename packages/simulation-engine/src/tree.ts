export interface TreeNode {
  id: string;
  parentId: string | null;
  nodeType: "file" | "directory" | "symlink";
  name: string;
  permissions: string;
  owner: string;
  groupOwner: string;
  content: string | null;
  symlinkTargetId: string | null;
}

/**
 * Loaded fresh from the database at the start of every command execution
 * (Architecture §6 — the backend is authoritative; there is no cross-request
 * caching of tree state, which would risk staleness). Mutations during a single
 * command (e.g. `rm -r` deleting many nodes) are applied to this in-memory copy
 * and to the database in the same pass, then this object is discarded.
 */
export class FilesystemTree {
  private byId = new Map<string, TreeNode>();
  private childrenByParent = new Map<string | null, TreeNode[]>();

  constructor(nodes: TreeNode[]) {
    for (const node of nodes) {
      this.byId.set(node.id, node);
    }
    for (const node of nodes) {
      const siblings = this.childrenByParent.get(node.parentId) ?? [];
      siblings.push(node);
      this.childrenByParent.set(node.parentId, siblings);
    }
  }

  getNode(id: string): TreeNode | undefined {
    return this.byId.get(id);
  }

  getChildren(parentId: string): TreeNode[] {
    return this.childrenByParent.get(parentId) ?? [];
  }

  getRoot(): TreeNode | undefined {
    const roots = this.childrenByParent.get(null);
    return roots?.[0];
  }

  findChildByName(parentId: string, name: string): TreeNode | undefined {
    return this.getChildren(parentId).find((n) => n.name === name);
  }

  /** Every descendant of a node, not including the node itself. */
  getDescendants(nodeId: string): TreeNode[] {
    const result: TreeNode[] = [];
    const stack = [...this.getChildren(nodeId)];
    while (stack.length > 0) {
      const next = stack.pop()!;
      result.push(next);
      stack.push(...this.getChildren(next.id));
    }
    return result;
  }

  /** Full absolute path string for a node, e.g. "/home/projects/website". */
  getPath(nodeId: string): string {
    const segments: string[] = [];
    let current = this.byId.get(nodeId);
    while (current) {
      // Some demo lesson trees use `/` as the root node's display name, while
      // persisted Practice trees use `home`. A slash is already supplied by
      // the leading separator and must never become a path segment itself.
      if (!(current.parentId === null && current.name === "/")) {
        segments.unshift(current.name);
      }
      current = current.parentId ? this.byId.get(current.parentId) : undefined;
    }
    return "/" + segments.join("/");
  }

  /**
   * Resolves a path string (absolute, relative, with `.`/`..`) starting from
   * `fromNodeId`. Returns the resolved node if the full path exists, or
   * `{ parent, missingSegments }` describing how far resolution got — used by
   * `mkdir -p` to know exactly which intermediate directories to create.
   */
  resolve(
    fromNodeId: string,
    pathStr: string
  ): { node: TreeNode } | { parent: TreeNode; missingSegments: string[] } | { node: undefined; parent: undefined } {
    const root = this.getRoot();
    if (!root) return { node: undefined, parent: undefined };

    const startNode = pathStr.startsWith("/") ? root : this.byId.get(fromNodeId);
    if (!startNode) return { node: undefined, parent: undefined };

    let segments = pathStr.split("/").filter((s) => s.length > 0);

    // Absolute paths display the root's own name as the first path segment
    // (getPath() does the same — root.name = "home" makes the root's path
    // "/home", not ""). A leading segment matching the root's name means
    // "start at the root," not "look up a child of the root named that."
    if (pathStr.startsWith("/") && segments[0] === root.name) {
      segments = segments.slice(1);
    }

    let current: TreeNode = startNode;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (segment === ".") continue;

      if (segment === "..") {
        const parentNode: TreeNode | undefined = current.parentId ? this.byId.get(current.parentId) : undefined;
        current = parentNode ?? root; // ".." at root stays at root, matching real shell behavior
        continue;
      }

      const child = this.findChildByName(current.id, segment);
      if (!child) {
        return { parent: current, missingSegments: segments.slice(i) };
      }
      current = child;
    }

    return { node: current };
  }
}
