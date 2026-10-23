import { generateId } from "../ids.js";
import type { CommandHandler, HandlerResult } from "../types.js";
import type { TreeNode } from "../tree.js";

const NO_OPS: HandlerResult["operations"] = [];
const NO_EVENTS: HandlerResult["animationEvents"] = [];

function requireDirectory(node: TreeNode | undefined, path: string): HandlerResult | null {
  if (!node) {
    return { success: false, outputText: `No such file or directory: ${path}`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  if (node.nodeType !== "directory") {
    return { success: false, outputText: `Not a directory: ${path}`, errorType: "not_a_directory", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  return null;
}

export const pwd: CommandHandler = (ctx) => ({
  success: true,
  outputText: ctx.tree.getPath(ctx.currentDirectoryId),
  operations: NO_OPS,
  animationEvents: NO_EVENTS,
});

export const ls: CommandHandler = (ctx) => {
  const targets = ctx.args.length > 0 ? ctx.args : ["."];
  const sections: string[] = [];

  for (const targetPath of targets) {
    const resolved = ctx.tree.resolve(ctx.currentDirectoryId, targetPath);
    if (!("node" in resolved) || !resolved.node) {
      return { success: false, outputText: `No such file or directory: ${targetPath}`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
    }

    if (resolved.node.nodeType !== "directory") {
      // Real `ls` on a plain file just echoes the filename itself.
      sections.push(targets.length > 1 ? `${targetPath}` : resolved.node.name);
      continue;
    }

    const children = ctx.tree.getChildren(resolved.node.id);
    const detailed = ctx.flags.includes("-l");
    const listing = detailed
      ? children.map((c) => `${c.permissions}  ${c.owner}:${c.groupOwner}  ${c.name}`).join("\n")
      : children.map((c) => c.name).join("  ");

    sections.push(targets.length > 1 ? `${targetPath}:\n${listing || "(empty directory)"}` : listing || "(empty directory)");
  }

  return { success: true, outputText: sections.join("\n\n"), operations: NO_OPS, animationEvents: NO_EVENTS };
};

export const cd: CommandHandler = (ctx) => {
  const targetPath = ctx.args[0] ?? "/";
  const resolved = ctx.tree.resolve(ctx.currentDirectoryId, targetPath);
  if (!("node" in resolved) || !resolved.node) {
    return { success: false, outputText: `No such file or directory: ${targetPath}`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const dirError = requireDirectory(resolved.node, targetPath);
  if (dirError) return dirError;

  return {
    success: true,
    outputText: "",
    operations: NO_OPS,
    animationEvents: [{ type: "directory_change", nodeId: resolved.node.id }],
    newCurrentDirectoryId: resolved.node.id,
  };
};

export const mkdir: CommandHandler = (ctx) => {
  if (ctx.args.length === 0) {
    return { success: false, outputText: "mkdir: missing operand", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const usesParentFlag = ctx.flags.includes("-p");
  const operations: HandlerResult["operations"] = [];
  const animationEvents: HandlerResult["animationEvents"] = [];

  for (const path of ctx.args) {
    const resolved = ctx.tree.resolve(ctx.currentDirectoryId, path);


    if ("node" in resolved && resolved.node) {
      if (resolved.node.nodeType !== "directory") {
        return {
          success: false,
          outputText: `mkdir: cannot create directory '${path}': File exists`,
          errorType: "already_exists",
          operations: NO_OPS,
          animationEvents: NO_EVENTS,
        };
      }

      if (!usesParentFlag) {
        return {
          success: false,
          outputText: `mkdir: cannot create directory '${path}': File exists`,
          errorType: "already_exists",
          operations: NO_OPS,
          animationEvents: NO_EVENTS,
        };
      }

      continue; // -p: an existing directory is not an error
    }

    if (!resolved.parent) {
      return { success: false, outputText: `mkdir: cannot create directory '${path}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
    }

    if (resolved.parent.nodeType !== "directory") {
      return {
        success: false,
        outputText: `mkdir: cannot create directory '${path}': Not a directory`,
        errorType: "not_a_directory",
        operations: NO_OPS,
        animationEvents: NO_EVENTS,
      };
    }

    if (resolved.missingSegments.length > 1 && !usesParentFlag) {
      return {
        success: false,
        outputText: `mkdir: cannot create directory '${path}': No such file or directory`,
        errorType: "not_found",
        operations: NO_OPS,
        animationEvents: NO_EVENTS,
      };
    }

    // Create every missing segment in order (supports -p; for a single missing
    // segment this loop runs once regardless of the flag).
    let parentId = resolved.parent.id;
    for (const segment of resolved.missingSegments) {
      const id = generateId();
      operations.push({ type: "createNode", id, parentId, nodeType: "directory", name: segment, permissions: "rwxr-xr-x" });
      animationEvents.push({ type: "create", nodeId: id });
      parentId = id;
    }
  }

  return { success: true, outputText: "", operations, animationEvents };
};

export const rmdir: CommandHandler = (ctx) => {
  if (ctx.args.length === 0) {
    return { success: false, outputText: "rmdir: missing operand", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const operations: HandlerResult["operations"] = [];
  const animationEvents: HandlerResult["animationEvents"] = [];

  for (const path of ctx.args) {
    const resolved = ctx.tree.resolve(ctx.currentDirectoryId, path);
    if (!("node" in resolved) || !resolved.node) {
      return { success: false, outputText: `rmdir: failed to remove '${path}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
    }
    if (resolved.node.nodeType !== "directory") {
      return { success: false, outputText: `rmdir: failed to remove '${path}': Not a directory`, errorType: "not_a_directory", operations: NO_OPS, animationEvents: NO_EVENTS };
    }
        if (resolved.node.id === ctx.tree.getRoot()?.id) {
      return {
        success: false,
        outputText: `rmdir: failed to remove '${path}': Operation not permitted`,
        errorType: "permission_denied",
        operations: NO_OPS,
        animationEvents: NO_EVENTS,
      };
    }

    const containsCurrentDirectory =
      resolved.node.id === ctx.currentDirectoryId ||
      ctx.tree
        .getDescendants(resolved.node.id)
        .some((descendant) => descendant.id === ctx.currentDirectoryId);

    if (containsCurrentDirectory) {
      return {
        success: false,
        outputText: `rmdir: failed to remove '${path}': cannot remove the current working directory`,
        errorType: "permission_denied",
        operations: NO_OPS,
        animationEvents: NO_EVENTS,
      };
    }
    if (ctx.tree.getChildren(resolved.node.id).length > 0) {
      return { success: false, outputText: `rmdir: failed to remove '${path}': Directory not empty`, errorType: "directory_not_empty", operations: NO_OPS, animationEvents: NO_EVENTS };
    }
    operations.push({ type: "deleteNode", nodeId: resolved.node.id });
    animationEvents.push({ type: "delete", nodeId: resolved.node.id });
  }

  return { success: true, outputText: "", operations, animationEvents };
};

export const touch: CommandHandler = (ctx) => {
  if (ctx.args.length === 0) {
    return { success: false, outputText: "touch: missing operand", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const operations: HandlerResult["operations"] = [];
  const animationEvents: HandlerResult["animationEvents"] = [];

  for (const path of ctx.args) {
    const resolved = ctx.tree.resolve(ctx.currentDirectoryId, path);

    if ("node" in resolved && resolved.node) {
      continue; // touch on an existing file just updates its timestamp — no-op here
    }
    if (!resolved.parent || resolved.missingSegments.length > 1) {
      return { success: false, outputText: `touch: cannot touch '${path}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
    }

        if (resolved.parent.nodeType !== "directory") {
      return {
        success: false,
        outputText: `touch: cannot touch '${path}': Not a directory`,
        errorType: "not_a_directory",
        operations: NO_OPS,
        animationEvents: NO_EVENTS,
      };
    }

    const id = generateId();
    operations.push({ type: "createNode", id, parentId: resolved.parent.id, nodeType: "file", name: resolved.missingSegments[0], permissions: "rw-r--r--", content: "" });
    animationEvents.push({ type: "create", nodeId: id });
  }

  return { success: true, outputText: "", operations, animationEvents };
};

export const rm: CommandHandler = (ctx) => {
  if (ctx.args.length === 0) {
    return { success: false, outputText: "rm: missing operand", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const recursive = ctx.flags.includes("-r");
  const operations: HandlerResult["operations"] = [];
  const animationEvents: HandlerResult["animationEvents"] = [];

  for (const path of ctx.args) {
    const resolved = ctx.tree.resolve(ctx.currentDirectoryId, path);
    if (!("node" in resolved) || !resolved.node) {
      return { success: false, outputText: `rm: cannot remove '${path}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
    }


    if (resolved.node.id === ctx.tree.getRoot()?.id) {
      return {
        success: false,
        outputText: `rm: cannot remove '${path}': Operation not permitted`,
        errorType: "permission_denied",
        operations: NO_OPS,
        animationEvents: NO_EVENTS,
      };
    }

    const containsCurrentDirectory =
      resolved.node.id === ctx.currentDirectoryId ||
      ctx.tree
        .getDescendants(resolved.node.id)
        .some((descendant) => descendant.id === ctx.currentDirectoryId);

    if (containsCurrentDirectory) {
      return {
        success: false,
        outputText: `rm: refusing to remove '${path}': target contains the current working directory`,
        errorType: "permission_denied",
        operations: NO_OPS,
        animationEvents: NO_EVENTS,
      };
    }

    if (resolved.node.nodeType === "directory" && !recursive) {
      return { success: false, outputText: `rm: cannot remove '${path}': Is a directory`, errorType: "is_a_directory", operations: NO_OPS, animationEvents: NO_EVENTS };
    }

    if (resolved.node.nodeType === "directory") {
      for (const descendant of ctx.tree.getDescendants(resolved.node.id)) {
        operations.push({ type: "deleteNode", nodeId: descendant.id });
        animationEvents.push({ type: "delete", nodeId: descendant.id });
      }
    }
    operations.push({ type: "deleteNode", nodeId: resolved.node.id });
    animationEvents.push({ type: "delete", nodeId: resolved.node.id });
  }

  return {
    success: true,
    outputText: "",
    operations,
    animationEvents,
    isDestructive: true,
  };
};

export const cp: CommandHandler = (ctx) => {
  if (ctx.args.length !== 2) {
    return { success: false, outputText: "cp: usage: cp <source> <destination>", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const [sourcePath, destPath] = ctx.args;
  const recursive = ctx.flags.includes("-r");

  const sourceResolved = ctx.tree.resolve(ctx.currentDirectoryId, sourcePath);
  if (!("node" in sourceResolved) || !sourceResolved.node) {
    return { success: false, outputText: `cp: cannot stat '${sourcePath}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  if (sourceResolved.node.nodeType === "directory" && !recursive) {
    return { success: false, outputText: `cp: -r not specified; omitting directory '${sourcePath}'`, errorType: "is_a_directory", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const destResolved = ctx.tree.resolve(ctx.currentDirectoryId, destPath);
  let destParentId: string;
  let destName: string;

  if ("node" in destResolved && destResolved.node && destResolved.node.nodeType === "directory") {
    destParentId = destResolved.node.id;
    destName = sourceResolved.node.name;
  } else if (!("node" in destResolved) || !destResolved.node) {
    if (!destResolved.parent || destResolved.missingSegments.length > 1) {
      return { success: false, outputText: `cp: cannot create '${destPath}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
    }
    if (destResolved.parent.nodeType !== "directory") {
      return {
        success: false,
        outputText: `cp: cannot create '${destPath}': Not a directory`,
        errorType: "not_a_directory",
        operations: NO_OPS,
        animationEvents: NO_EVENTS,
      };
    }
    destParentId = destResolved.parent.id;
    destName = destResolved.missingSegments[0];
  } else {
    return { success: false, outputText: `cp: cannot overwrite '${destPath}': File exists`, errorType: "already_exists", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

    if (sourceResolved.node.nodeType === "directory") {
    const destinationIsInsideSource =
      destParentId === sourceResolved.node.id ||
      ctx.tree
        .getDescendants(sourceResolved.node.id)
        .some((descendant) => descendant.id === destParentId);

    if (destinationIsInsideSource) {
      return {
        success: false,
        outputText: `cp: cannot copy directory '${sourcePath}' into itself`,
        errorType: "invalid_arguments",
        operations: NO_OPS,
        animationEvents: NO_EVENTS,
      };
    }
  }

  const operations: HandlerResult["operations"] = [];
  const animationEvents: HandlerResult["animationEvents"] = [];

  function copySubtree(sourceNode: TreeNode, newParentId: string, newName: string) {
    const id = generateId();
    operations.push({
      type: "createNode",
      id,
      parentId: newParentId,
      nodeType: sourceNode.nodeType,
      name: newName,
      permissions: sourceNode.permissions,
      owner: sourceNode.owner,
      groupOwner: sourceNode.groupOwner,
      content: sourceNode.content,
    });
    animationEvents.push({ type: "copy", nodeId: id });
    if (sourceNode.nodeType === "directory") {
      for (const child of ctx.tree.getChildren(sourceNode.id)) {
        copySubtree(child, id, child.name);
      }
    }
  }

  copySubtree(sourceResolved.node, destParentId, destName);

  return { success: true, outputText: "", operations, animationEvents };
};

export const mv: CommandHandler = (ctx) => {
  if (ctx.args.length !== 2) {
    return { success: false, outputText: "mv: usage: mv <source> <destination>", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const [sourcePath, destPath] = ctx.args;

  const sourceResolved = ctx.tree.resolve(ctx.currentDirectoryId, sourcePath);
  if (!("node" in sourceResolved) || !sourceResolved.node) {
    return { success: false, outputText: `mv: cannot stat '${sourcePath}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const destResolved = ctx.tree.resolve(ctx.currentDirectoryId, destPath);
  let newParentId: string;
  let newName: string;

  if ("node" in destResolved && destResolved.node && destResolved.node.nodeType === "directory") {
    newParentId = destResolved.node.id;
    newName = sourceResolved.node.name;
  } else if (!("node" in destResolved) || !destResolved.node) {
    if (!destResolved.parent || destResolved.missingSegments.length > 1) {
      return { success: false, outputText: `mv: cannot move to '${destPath}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
    }

    if (destResolved.parent.nodeType !== "directory") {
      return {
        success: false,
        outputText: `mv: cannot move to '${destPath}': Not a directory`,
        errorType: "not_a_directory",
        operations: NO_OPS,
        animationEvents: NO_EVENTS,
      };
    }

    newParentId = destResolved.parent.id;
    newName = destResolved.missingSegments[0];
  } else {
    return { success: false, outputText: `mv: cannot overwrite '${destPath}': File exists`, errorType: "already_exists", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

    // Prevent moving a directory into itself or one of its descendants.
  if (
    sourceResolved.node.nodeType === "directory" &&
    (
      newParentId === sourceResolved.node.id ||
      ctx.tree
        .getDescendants(sourceResolved.node.id)
        .some((node) => node.id === newParentId)
    )
  ) {
    return {
      success: false,
      outputText: `mv: cannot move '${sourcePath}' to a subdirectory of itself, '${destPath}'`,
      errorType: "invalid_arguments",
      operations: NO_OPS,
      animationEvents: NO_EVENTS,
    };
  }

  return {
    success: true,
    outputText: "",
    operations: [{ type: "moveNode", nodeId: sourceResolved.node.id, newParentId, newName }],
    animationEvents: [{ type: "move", nodeId: sourceResolved.node.id }],
  };
};

export const ln: CommandHandler = (ctx) => {
  if (ctx.args.length !== 2 || !ctx.flags.includes("-s")) {
    return { success: false, outputText: "ln: usage: ln -s <target> <link-name>", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const [targetPath, linkPath] = ctx.args;

  const targetResolved = ctx.tree.resolve(ctx.currentDirectoryId, targetPath);
  if (!("node" in targetResolved) || !targetResolved.node) {
    return { success: false, outputText: `ln: failed to access '${targetPath}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const linkResolved = ctx.tree.resolve(ctx.currentDirectoryId, linkPath);
  if ("node" in linkResolved && linkResolved.node) {
    return { success: false, outputText: `ln: failed to create symbolic link '${linkPath}': File exists`, errorType: "already_exists", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  if (!linkResolved.parent || linkResolved.missingSegments.length > 1) {
    return { success: false, outputText: `ln: failed to create symbolic link '${linkPath}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

    if (linkResolved.parent.nodeType !== "directory") {
    return {
      success: false,
      outputText: `ln: failed to create symbolic link '${linkPath}': Not a directory`,
      errorType: "not_a_directory",
      operations: NO_OPS,
      animationEvents: NO_EVENTS,
    };
  }

  const id = generateId();
  return {
    success: true,
    outputText: "",
    operations: [
      {
        type: "createNode",
        id,
        parentId: linkResolved.parent.id,
        nodeType: "symlink",
        name: linkResolved.missingSegments[0],
        permissions: "rwxrwxrwx",
        symlinkTargetId: targetResolved.node.id,
      },
    ],
    animationEvents: [{ type: "symlink", nodeId: id }],
  };
};

export const treeCommand: CommandHandler = (ctx) => {
  const targetPath = ctx.args[0] ?? ".";
  const resolved = ctx.tree.resolve(ctx.currentDirectoryId, targetPath);
  if (!("node" in resolved) || !resolved.node) {
    return { success: false, outputText: `tree: ${targetPath}: No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  function render(node: TreeNode, depth: number): string {
    const children = ctx.tree.getChildren(node.id);
    const line = `${"  ".repeat(depth)}${node.name}${node.nodeType === "directory" ? "/" : ""}`;
    return [line, ...children.map((c) => render(c, depth + 1))].join("\n");
  }

  return { success: true, outputText: render(resolved.node, 0), operations: NO_OPS, animationEvents: [{ type: "content_display", nodeId: resolved.node.id }] };
};

export const find: CommandHandler = (ctx) => {
  const nameFlagIndex = ctx.args.indexOf("-name");
  const pattern = nameFlagIndex >= 0 ? ctx.args[nameFlagIndex + 1] : undefined;
  const searchRoot = ctx.tree.getNode(ctx.currentDirectoryId);
  if (!searchRoot) {
    return { success: false, outputText: "find: current directory not found", errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const matches = ctx.tree
    .getDescendants(searchRoot.id)
    .filter((n) => !pattern || n.name.includes(pattern))
    .map((n) => ctx.tree.getPath(n.id));

  return { success: true, outputText: matches.join("\n") || "(no matches)", operations: NO_OPS, animationEvents: NO_EVENTS };
};

export const stat: CommandHandler = (ctx) => {
  if (ctx.args.length !== 1) {
    return { success: false, outputText: "stat: missing operand", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const resolved = ctx.tree.resolve(ctx.currentDirectoryId, ctx.args[0]);
  if (!("node" in resolved) || !resolved.node) {
    return { success: false, outputText: `stat: cannot stat '${ctx.args[0]}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const n = resolved.node;
  const outputText = [
    `  File: ${n.name}`,
    `  Type: ${n.nodeType}`,
    `  Permissions: ${n.permissions}`,
    `  Owner: ${n.owner}  Group: ${n.groupOwner}`,
    n.content !== null ? `  Size: ${n.content.length} bytes` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  return { success: true, outputText, operations: NO_OPS, animationEvents: [{ type: "content_display", nodeId: n.id }] };
};

export const du: CommandHandler = (ctx) => {
  const targetPath = ctx.args[0] ?? ".";
  const resolved = ctx.tree.resolve(ctx.currentDirectoryId, targetPath);
  if (!("node" in resolved) || !resolved.node) {
    return { success: false, outputText: `du: cannot access '${targetPath}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const descendants = ctx.tree.getDescendants(resolved.node.id);
  const totalBytes = descendants.reduce((sum, n) => sum + (n.content?.length ?? 0), 0);
  return { success: true, outputText: `${totalBytes}\t${targetPath}`, operations: NO_OPS, animationEvents: NO_EVENTS };
};

export const df: CommandHandler = () => ({
  success: true,
  outputText: "Filesystem     Size  Used  Avail  Use%\nvisualinux-sim  1.0G   12M   988M    1%",
  operations: NO_OPS,
  animationEvents: NO_EVENTS,
});
