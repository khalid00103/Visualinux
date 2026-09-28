import { generateId } from "../ids.js";
import type { CommandHandler, HandlerContext, HandlerResult } from "../types.js";

const NO_OPS: HandlerResult["operations"] = [];
const NO_EVENTS: HandlerResult["animationEvents"] = [];

/** Reads input from stdin (piped) if present, otherwise from the first file argument. */
function getInputText(ctx: HandlerContext): { text: string; error?: HandlerResult } {
  if (ctx.stdin !== undefined) return { text: ctx.stdin };

  const path = ctx.args[0];
  if (!path) {
    return {
      text: "",
      error: { success: false, outputText: "missing file operand", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS },
    };
  }

  const resolved = ctx.tree.resolve(ctx.currentDirectoryId, path);
  if (!("node" in resolved) || !resolved.node || resolved.node.nodeType !== "file") {
    return {
      text: "",
      error: { success: false, outputText: `${path}: No such file`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS },
    };
  }

  return { text: resolved.node.content ?? "" };
}

export const cat: CommandHandler = (ctx) => {
  if (ctx.stdin === undefined && ctx.args.length === 0) {
    return { success: false, outputText: "cat: missing file operand", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  if (ctx.stdin !== undefined) {
    return { success: true, outputText: ctx.stdin, operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const outputs: string[] = [];
  const animationEvents: HandlerResult["animationEvents"] = [];
  for (const path of ctx.args) {
    const resolved = ctx.tree.resolve(ctx.currentDirectoryId, path);
    if (!("node" in resolved) || !resolved.node || resolved.node.nodeType !== "file") {
      return { success: false, outputText: `cat: ${path}: No such file`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
    }
    outputs.push(resolved.node.content ?? "");
    animationEvents.push({ type: "content_display", nodeId: resolved.node.id });
  }

  return { success: true, outputText: outputs.join("\n"), operations: NO_OPS, animationEvents };
};

export const head: CommandHandler = (ctx) => {
  const hasCountFlag = ctx.flags.includes("-n");
  const n = hasCountFlag ? Number(ctx.args[0]) || 10 : 10;
  const fileArgs = hasCountFlag ? ctx.args.slice(1) : ctx.args;

  const { text, error } = getInputText({ ...ctx, args: fileArgs });
  if (error) return error;
  return { success: true, outputText: text.split("\n").slice(0, n).join("\n"), operations: NO_OPS, animationEvents: NO_EVENTS };
};

export const tail: CommandHandler = (ctx) => {
  const hasCountFlag = ctx.flags.includes("-n");
  const n = hasCountFlag ? Number(ctx.args[0]) || 10 : 10;
  const fileArgs = hasCountFlag ? ctx.args.slice(1) : ctx.args;

  const { text, error } = getInputText({ ...ctx, args: fileArgs });
  if (error) return error;
  const lines = text.split("\n");
  return { success: true, outputText: lines.slice(Math.max(0, lines.length - n)).join("\n"), operations: NO_OPS, animationEvents: NO_EVENTS };
};

export const grep: CommandHandler = (ctx) => {
  // Pattern is always the first argument, whether piped or not — real grep
  // syntax is `grep PATTERN [FILE]`, with FILE omitted when reading stdin.
  const pattern = ctx.args[0];
  const fileArgs = ctx.stdin !== undefined ? [] : ctx.args.slice(1);

  if (!pattern) {
    return { success: false, outputText: "grep: missing pattern", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const { text, error } = getInputText({ ...ctx, args: fileArgs });
  if (error) return error;

  const ignoreCase = ctx.flags.includes("-i");
  const test = ignoreCase ? pattern.toLowerCase() : pattern;

  const matches = text.split("\n").filter((line) => (ignoreCase ? line.toLowerCase() : line).includes(test));
  return { success: true, outputText: matches.join("\n"), operations: NO_OPS, animationEvents: NO_EVENTS };
};

export const sort: CommandHandler = (ctx) => {
  const { text, error } = getInputText(ctx);
  if (error) return error;
  const numeric = ctx.flags.includes("-n");
  const lines = text.split("\n").filter((l) => l.length > 0);
  const sorted = numeric ? lines.sort((a, b) => Number(a) - Number(b)) : lines.sort();
  return { success: true, outputText: sorted.join("\n"), operations: NO_OPS, animationEvents: NO_EVENTS };
};

export const uniq: CommandHandler = (ctx) => {
  const { text, error } = getInputText(ctx);
  if (error) return error;
  const lines = text.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    if (result[result.length - 1] !== line) result.push(line);
  }
  return { success: true, outputText: result.join("\n"), operations: NO_OPS, animationEvents: NO_EVENTS };
};

export const wc: CommandHandler = (ctx) => {
  const { text, error } = getInputText(ctx);
  if (error) return error;

  const lines = text.split("\n").length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;

  if (ctx.flags.includes("-l")) {
    return { success: true, outputText: String(lines), operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  return { success: true, outputText: `${lines}  ${words}  ${chars}`, operations: NO_OPS, animationEvents: NO_EVENTS };
};

export const diff: CommandHandler = (ctx) => {
  if (ctx.args.length !== 2) {
    return { success: false, outputText: "diff: usage: diff <file1> <file2>", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const first = getInputText({ ...ctx, args: [ctx.args[0]], stdin: undefined });
  if (first.error) return first.error;
  const second = getInputText({ ...ctx, args: [ctx.args[1]], stdin: undefined });
  if (second.error) return second.error;

  const linesA = first.text.split("\n");
  const linesB = second.text.split("\n");
  const diffLines: string[] = [];
  const maxLen = Math.max(linesA.length, linesB.length);

  for (let i = 0; i < maxLen; i++) {
    if (linesA[i] !== linesB[i]) {
      if (linesA[i] !== undefined) diffLines.push(`< ${linesA[i]}`);
      if (linesB[i] !== undefined) diffLines.push(`> ${linesB[i]}`);
    }
  }

  return { success: true, outputText: diffLines.join("\n") || "(files are identical)", operations: NO_OPS, animationEvents: NO_EVENTS };
};

export const echo: CommandHandler = (ctx) => ({
  success: true,
  outputText: ctx.args.join(" "),
  operations: NO_OPS,
  animationEvents: NO_EVENTS,
});

export const nano: CommandHandler = (ctx) => {
  if (ctx.args.length !== 1) {
    return { success: false, outputText: "nano: usage: nano <file>", errorType: "invalid_arguments", operations: NO_OPS, animationEvents: NO_EVENTS };
  }
  const path = ctx.args[0];
  const resolved = ctx.tree.resolve(ctx.currentDirectoryId, path);

  // Honest, partial implementation: this milestone is the API-level engine only.
  // Real interactive line editing needs a frontend editor overlay that doesn't
  // exist until a later UI milestone — there is no mechanism yet for the client
  // to send edited content back. `nano` here creates the file if missing (like
  // `touch`) and confirms it's ready, rather than pretending to support editing
  // it doesn't yet have a channel for.
  if ("node" in resolved && resolved.node) {
    if (resolved.node.nodeType !== "file") {
      return { success: false, outputText: `nano: ${path}: Is a directory`, errorType: "is_a_directory", operations: NO_OPS, animationEvents: NO_EVENTS };
    }
    return { success: true, outputText: `(opened ${path} — editing UI not yet implemented)`, operations: NO_OPS, animationEvents: [{ type: "content_display", nodeId: resolved.node.id }] };
  }

  if (!resolved.parent || resolved.missingSegments.length > 1) {
    return { success: false, outputText: `nano: cannot create '${path}': No such file or directory`, errorType: "not_found", operations: NO_OPS, animationEvents: NO_EVENTS };
  }

  const id = generateId();
  return {
    success: true,
    outputText: `(created ${path} — editing UI not yet implemented)`,
    operations: [{ type: "createNode", id, parentId: resolved.parent.id, nodeType: "file", name: resolved.missingSegments[0], permissions: "rw-r--r--", content: "" }],
    animationEvents: [{ type: "create", nodeId: id }],
  };
};
