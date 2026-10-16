import type { CommandHandler, HandlerResult } from "../types.js";

const NO_OPS: HandlerResult["operations"] = [];
const NO_EVENTS: HandlerResult["animationEvents"] = [];

export const chmod: CommandHandler = (ctx) => {
  if (ctx.args.length !== 2) {
    return { success: false, outputText: "chmod: usage: chmod <mode> <path>", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const [mode, path] = ctx.args;
  if (!/^[0-7]{3}$/.test(mode) && mode !== "+x" && mode !== "-x") {
    return { success: false, outputText: `chmod: invalid mode: '${mode}'`, errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const resolved = ctx.tree.resolve(ctx.currentDirectoryId, path);
  if (!("node" in resolved) || !resolved.node) {
    return { success: false, outputText: `chmod: cannot access '${path}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const permissions = mode === "+x"
    ? addExecutePermissions(resolved.node.permissions)
    : mode === "-x"
      ? removeExecutePermissions(resolved.node.permissions)
      : octalToSymbolic(mode);
  return {
    success: true,
    outputText: "",
    operations: [{ type: "updateNode", nodeId: resolved.node.id, updates: { permissions } }],
    animationEvents: [{ type: "permission_change", nodeId: resolved.node.id }],
  };
};

export const chown: CommandHandler = (ctx) => {
  if (ctx.args.length !== 2) {
    return { success: false, outputText: "chown: usage: chown <owner> <path>", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const [owner, path] = ctx.args;
  const resolved = ctx.tree.resolve(ctx.currentDirectoryId, path);
  if (!("node" in resolved) || !resolved.node) {
    return { success: false, outputText: `chown: cannot access '${path}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  return {
    success: true,
    outputText: "",
    operations: [{ type: "updateNode", nodeId: resolved.node.id, updates: { owner } }],
    animationEvents: [{ type: "ownership_change", nodeId: resolved.node.id }],
  };
};

export const chgrp: CommandHandler = (ctx) => {
  if (ctx.args.length !== 2) {
    return { success: false, outputText: "chgrp: usage: chgrp <group> <path>", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const [group, path] = ctx.args;
  const resolved = ctx.tree.resolve(ctx.currentDirectoryId, path);
  if (!("node" in resolved) || !resolved.node) {
    return { success: false, outputText: `chgrp: cannot access '${path}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  return {
    success: true,
    outputText: "",
    operations: [{ type: "updateNode", nodeId: resolved.node.id, updates: { groupOwner: group } }],
    animationEvents: [{ type: "ownership_change", nodeId: resolved.node.id }],
  };
};

function octalToSymbolic(octal: string): string {
  const map: Record<string, string> = {
    "0": "---", "1": "--x", "2": "-w-", "3": "-wx",
    "4": "r--", "5": "r-x", "6": "rw-", "7": "rwx",
  };
  return octal.split("").map((digit) => map[digit] ?? "---").join("");
}


function addExecutePermissions(current: string): string {
  // Preserve the lesson's demonstrated transition: adding execute permission
  // to a standard rw-r--r-- file produces rwxr-xr-x.
  if (current === "rw-r--r--") return "rwxr-xr-x";
  return current.split("").map((char, index) => {
    if ([2, 5, 8].includes(index) && char === "-") return "x";
    return char;
  }).join("");
}

function removeExecutePermissions(current: string): string {
  return current.split("").map((char, index) => ([2, 5, 8].includes(index) && char === "x" ? "-" : char)).join("");
}
