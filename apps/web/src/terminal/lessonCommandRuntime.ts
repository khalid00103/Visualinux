import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import {
  FilesystemTree,
  interpret,
  parseCommandLine,
  type TreeNode,
} from "@visualinux/simulation-engine";
import { createClientRegistryLookup } from "./client-registry-lookup.js";

export type LessonCommandName =
  | "cat" | "cd" | "chmod" | "chown" | "clear" | "cp" | "echo" | "grep"
  | "head" | "ls" | "man" | "mkdir" | "mv" | "pwd" | "rm" | "sort"
  | "tail" | "touch" | "wc" | "whoami";

export interface LessonCommandResult {
  success: boolean;
  message: string;
  nodes: FilesystemNodeSummary[];
  currentDirectoryId?: string;
  currentPath?: string;
  pathNodeIds?: string[];
  listedNames?: string[];
  createdName?: string;
  createdNodeId?: string;
  affectedNodeId?: string;
  affectedName?: string;
  action?: "move" | "rename";
  removedNodeId?: string;
  removedName?: string;
}

interface LessonCommandOptions {
  command: LessonCommandName;
  rawInput: string;
  nodes: FilesystemNodeSummary[];
  currentDirectoryId?: string;
}

const VALID_NAME = /^[A-Za-z0-9._-]+$/;
const NO_MANUALS_IN_LESSON = new Set(["ls", "pwd", "mkdir", "touch", "cd"]);

const EXAMPLES: Record<LessonCommandName, string> = {
  cat: "cat notes.txt",
  cd: "cd documents",
  chmod: "chmod +x script.sh",
  chown: "chown root notes.txt",
  clear: "clear",
  cp: "cp notes.txt backup.txt",
  echo: "echo Hello Linux",
  grep: "grep Linux notes.txt",
  head: "head notes.txt",
  ls: "ls",
  man: "man ls",
  mkdir: "mkdir my-project",
  mv: "mv notes.txt renamed.txt",
  pwd: "pwd",
  rm: "rm notes.txt",
  sort: "sort names.txt",
  tail: "tail notes.txt",
  touch: "touch hello.txt",
  wc: "wc notes.txt",
  whoami: "whoami",
};

const GREP_AND_WC_NOTES = [
  "Linux is an operating system.",
  "The terminal lets you interact with Linux using commands.",
  "The head command shows the beginning of a file.",
  "The tail command shows the end of a file.",
  "You can use grep to search text inside a file.",
  "Linux commands are often small and focused.",
  "Learning commands step by step makes the terminal easier.",
  "Visualinux helps you practice Linux commands visually.",
  "Searching files is useful when you have a lot of text.",
  "The grep command finds matching lines.",
  "This is line eleven.",
  "This is line twelve.",
].join("\n");

const HEAD_AND_TAIL_NOTES = [
  "Linux is an operating system.",
  "The terminal lets you interact with Linux using commands.",
  "The head command shows the beginning of a file.",
  "By default, head displays the first 10 lines.",
  "You can use head when you only need the start of a file.",
  "It is useful for quickly checking large files.",
  "You can combine head with other commands later.",
  "Linux commands are often small and focused.",
  "Learning commands step by step makes the terminal easier.",
  "Visualinux helps you practice Linux commands visually.",
  "This is line eleven.",
  "This is line twelve.",
].join("\n");

const LESSON_FILE_CONTENTS: Partial<Record<LessonCommandName, Record<string, string>>> = {
  cat: {
    "notes.txt": [
      "Welcome to Visualinux!",
      "Linux lets you work with files and directories.",
      "The cat command displays the contents of a file.",
    ].join("\n"),
  },
  grep: { "notes.txt": GREP_AND_WC_NOTES },
  head: { "notes.txt": HEAD_AND_TAIL_NOTES },
  tail: { "notes.txt": HEAD_AND_TAIL_NOTES },
  wc: { "notes.txt": GREP_AND_WC_NOTES },
  sort: { "names.txt": ["Zebra", "Apple", "Mango", "Banana", "Orange", "Grape"].join("\n") },
};

function findInitialDirectory(nodes: FilesystemNodeSummary[]): string | undefined {
  return nodes.find((node) => node.currentDirectory && node.nodeType === "directory")?.nodeId
    ?? nodes.find((node) => node.name === "student" && node.nodeType === "directory")?.nodeId
    ?? nodes.find((node) => node.parentId === null)?.nodeId;
}

function toEngineNodes(
  nodes: FilesystemNodeSummary[],
  command: LessonCommandName,
): TreeNode[] {
  const fixtures = LESSON_FILE_CONTENTS[command] ?? {};
  return nodes.map((node) => ({
    id: node.nodeId,
    parentId: node.parentId,
    nodeType: node.nodeType,
    name: node.name,
    permissions: node.permissions,
    owner: node.owner,
    groupOwner: node.groupOwner,
    content: node.nodeType === "file"
      ? fixtures[node.name] ?? (node.hasContent ? "" : null)
      : null,
    symlinkTargetId: null,
  }));
}

function fail(
  nodes: FilesystemNodeSummary[],
  message: string,
  currentDirectoryId?: string,
): LessonCommandResult {
  return {
    success: false,
    message,
    nodes,
    currentDirectoryId,
    currentPath: "",
    pathNodeIds: [],
  };
}

function isUnbalancedQuote(input: string): boolean {
  let quote: "'" | '"' | null = null;
  for (const char of input) {
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === "'" || char === '"') {
      quote = char;
    }
  }
  return quote !== null;
}

function directChild(
  nodes: FilesystemNodeSummary[],
  parentId: string,
  name: string,
): FilesystemNodeSummary | undefined {
  return nodes.find((node) => node.parentId === parentId && node.name === name);
}

function validateLessonInput(
  command: LessonCommandName,
  rawInput: string,
  parsed: ReturnType<typeof parseCommandLine>,
  nodes: FilesystemNodeSummary[],
  currentDirectoryId: string,
): string | null {
  const stage = parsed.stages[0];
  if (!stage || stage.commandName !== command) {
    const exactMessages: Partial<Record<LessonCommandName, string>> = {
      mkdir: "This lesson only teaches the mkdir command. Try: mkdir my-project",
      ls: "This lesson only teaches the ls command. Try: ls",
      touch: "This lesson only teaches the touch command. Try: touch hello.txt",
      man: "This lesson only teaches man. Try: man ls",
      whoami: "This lesson only teaches whoami. Try: whoami",
      echo: "This lesson only teaches echo. Try: echo Hello Linux",
      grep: "This lesson only teaches grep. Try: grep Linux notes.txt",
      head: "This lesson only teaches head. Try: head notes.txt",
      tail: "This lesson only teaches tail. Try: tail notes.txt",
      sort: "This lesson only teaches sort. Try: sort names.txt",
      wc: "This lesson only teaches wc. Try: wc notes.txt",
      mv: "This lesson only teaches mv. Try: mv notes.txt renamed.txt",
    };
    return exactMessages[command] ?? `This lesson only teaches ${command}. Try: ${EXAMPLES[command]}`;
  }
  if (parsed.stages.length !== 1 || parsed.redirect) {
    return "This lesson supports one command at a time without redirection.";
  }

  const { args, flags } = stage;
  const currentNode = nodes.find((node) => node.nodeId === currentDirectoryId);
  const unsupportedFlags = (allowed: string[] = []) => flags.find((flag) => !allowed.includes(flag));
  const hasUnsupportedFlags = (allowed: string[] = []) => unsupportedFlags(allowed) !== undefined;

  switch (command) {
    case "mkdir": {
      if (flags.includes("-p")) return "mkdir: option '-p' is not supported in this lesson. Try: mkdir <directory-name>";
      if (flags.length) return "mkdir: options are not supported in this lesson. Try: mkdir <directory-name>";
      if (args.length === 0) return "mkdir: missing operand. Usage: mkdir <directory-name>";
      if (args.length > 1) return "mkdir: too many arguments. Usage: mkdir <directory-name>";
      if (!VALID_NAME.test(args[0])) return `mkdir: cannot create directory '${args[0]}': invalid name`;
      if (directChild(nodes, currentDirectoryId, args[0])) return `mkdir: cannot create directory '${args[0]}': File exists`;
      return null;
    }
    case "ls":
      return args.length || flags.length
        ? "ls: options and paths are not supported in this lesson. Try: ls"
        : null;
    case "pwd":
      return args.length || flags.length
        ? "pwd: this lesson does not support options or arguments."
        : null;
    case "cd": {
      if (flags.length) return "cd: options are not supported in this lesson. Try: cd documents";
      if (!args.length) return "cd: missing directory operand. Usage: cd <directory>";
      if (args.length > 1) return "cd: too many arguments. Usage: cd <directory>";
      const target = args[0];
      if (target === "." || target === "..") {
        if (target === ".." && (!currentNode || currentNode.parentId === null)) return "cd: already at the root directory.";
        return null;
      }
      const node = directChild(nodes, currentDirectoryId, target);
      if (!node) return `cd: ${target}: No such file or directory`;
      if (node.nodeType !== "directory") return `cd: ${target}: Not a directory`;
      return null;
    }
    case "touch": {
      if (flags.length) return "touch: options are not supported in this lesson. Try: touch <file-name>";
      if (!args.length) return "touch: missing file operand. Usage: touch <file-name>";
      if (args.length > 1) return "touch: too many arguments. Usage: touch <file-name>";
      if (!VALID_NAME.test(args[0])) return `touch: cannot create file '${args[0]}': invalid name`;
      if (directChild(nodes, currentDirectoryId, args[0])) return `touch: cannot create file '${args[0]}': File exists`;
      return null;
    }
    case "rm": {
      if (!args.length) return "rm: missing operand. Usage: rm <file>";
      if (args.length > 1) return "rm: too many arguments. Usage: rm <file>";
      if (flags.length) return "rm: options are not taught in this lesson. Try: rm <file>";
      const target = directChild(nodes, currentDirectoryId, args[0]);
      if (!target) return `rm: cannot remove '${args[0]}': No such file or directory`;
      if (target.nodeId === currentDirectoryId) return "rm: cannot remove the current directory.";
      if (target.nodeType === "directory") return `rm: cannot remove '${args[0]}': Is a directory. Directory removal will be taught later.`;
      return null;
    }
    case "cp": {
      if (args.length !== 2) return "Usage: cp <source-file> <new-file-name>";
      if (hasUnsupportedFlags()) return "Options are not taught in this lesson. Try: cp notes.txt backup.txt";
      const [sourceName, destinationName] = args;
      if (!VALID_NAME.test(sourceName) || !VALID_NAME.test(destinationName)) return "cp: invalid file name.";
      const source = directChild(nodes, currentDirectoryId, sourceName);
      if (!source) return `cp: cannot stat '${sourceName}': No such file`;
      if (source.nodeType !== "file") return `cp: '${sourceName}' is not a file. Directory copying is taught later.`;
      if (sourceName === destinationName) return "cp: source and destination are the same file.";
      if (directChild(nodes, currentDirectoryId, destinationName)) return `cp: cannot create '${destinationName}': File exists. Overwriting is not taught in this lesson.`;
      return null;
    }
    case "mv": {
      if (args.length !== 2) return "Usage: mv <source> <destination>";
      if (hasUnsupportedFlags()) return "Options are not taught in this lesson.";
      const [sourceName, destination] = args;
      if (!VALID_NAME.test(sourceName) || !VALID_NAME.test(destination) || [".", ".."].includes(sourceName) || [".", ".."].includes(destination)) {
        return "mv: invalid file or directory name.";
      }
      const source = directChild(nodes, currentDirectoryId, sourceName);
      if (!source) return `mv: cannot stat '${sourceName}': No such file or directory`;
      const destinationNode = directChild(nodes, currentDirectoryId, destination);
      if (destinationNode?.nodeType === "directory") {
        if (source.nodeId === destinationNode.nodeId) return "mv: source and destination are the same.";
        if (source.nodeType === "directory") {
          let parentId: string | null = destinationNode.nodeId;
          while (parentId !== null) {
            if (parentId === source.nodeId) return "mv: cannot move a directory into itself.";
            parentId = nodes.find((node) => node.nodeId === parentId)?.parentId ?? null;
          }
        }
        return null;
      }
      if (destinationNode) return `mv: cannot move '${sourceName}': destination already exists.`;
      return null;
    }
    case "chmod": {
      if (args.length === 0 && flags.length === 0) return "chmod: missing mode and file operand.";
      if (args.length !== 2) return "This lesson supports one mode and one file.";
      if (!new Set(["+x", "-x", "644", "755"]).has(args[0])) return `chmod: unsupported mode '${args[0]}' in this lesson.`;
      if (args[1] !== "script.sh" && args[1] !== "notes.txt") return `chmod: ${args[1]}: No such file.`;
      const target = directChild(nodes, currentDirectoryId, args[1]);
      if (!target || target.nodeType !== "file") return `chmod: ${args[1]}: No such file.`;
      return null;
    }
    case "chown": {
      if (args.length === 0) return "chown: missing owner and file operand.";
      if (args.length !== 2) return "This lesson supports one owner and one file.";
      if (args[1] !== "notes.txt") return `chown: ${args[1]}: No such file.`;
      if (args[0] !== "student" && args[0] !== "root") return `chown: invalid user '${args[0]}'.`;
      const target = directChild(nodes, currentDirectoryId, args[1]);
      if (!target || target.nodeType !== "file") return `chown: ${args[1]}: No such file.`;
      return null;
    }
    case "cat": {
      if (flags.length) return "cat: invalid file name. Options are not taught in this lesson.";
      if (args.length !== 1) return "Usage: cat <file-name>";
      if (!VALID_NAME.test(args[0]) || args[0] === "." || args[0] === "..") return "cat: invalid file name. Options are not taught in this lesson.";
      const target = directChild(nodes, currentDirectoryId, args[0]);
      if (!target) return `cat: ${args[0]}: No such file or directory`;
      if (target.nodeType !== "file") return `cat: ${args[0]}: Is a directory`;
      if (LESSON_FILE_CONTENTS.cat?.[args[0]] === undefined) return `cat: ${args[0]}: This demo file has no sample content configured.`;
      return null;
    }
    case "grep": {
      const tokens = rawInput.trim().split(/\s+/).filter(Boolean);
      if (tokens.length === 1) return "grep: missing search pattern and file.";
      if (tokens.length === 2) return "grep: missing file operand.";
      if (tokens.length > 3) return "This lesson supports one search pattern and one file.";
      if (tokens[2] !== "notes.txt") return `grep: ${tokens[2]}: No such file.`;
      if (!directChild(nodes, currentDirectoryId, "notes.txt")) return "grep: notes.txt: No such file.";
      return null;
    }
    case "head":
    case "tail": {
      const tokens = rawInput.trim().split(/\s+/).filter(Boolean);
      if (tokens.length === 1) return `${command}: missing file operand.`;
      if (tokens.length > 2) return "This lesson supports one file at a time.";
      if (tokens[1] !== "notes.txt") return `${command}: ${tokens[1]}: No such file.`;
      if (!directChild(nodes, currentDirectoryId, "notes.txt")) return `${command}: notes.txt: No such file.`;
      return null;
    }
    case "sort": {
      const tokens = rawInput.trim().split(/\s+/).filter(Boolean);
      if (tokens.length === 1) return "sort: missing file operand.";
      if (tokens.length > 2) return "This lesson supports one file at a time.";
      if (tokens[1] !== "names.txt") return `sort: ${tokens[1]}: No such file.`;
      if (!directChild(nodes, currentDirectoryId, "names.txt")) return "sort: names.txt: No such file.";
      return null;
    }
    case "wc": {
      const tokens = rawInput.trim().split(/\s+/).filter(Boolean);
      if (tokens.length === 1) return "wc: missing file operand.";
      if (tokens.length > 3) return "This lesson supports one option and one file.";
      const option = tokens.length === 3 ? tokens[1] : null;
      const filename = tokens.length === 3 ? tokens[2] : tokens[1];
      if (filename !== "notes.txt") return `wc: ${filename}: No such file.`;
      if (!directChild(nodes, currentDirectoryId, "notes.txt")) return "wc: notes.txt: No such file.";
      if (option !== null && !["-l", "-w", "-c"].includes(option)) return `wc: invalid option ${option}`;
      return null;
    }
    case "echo":
      if (isUnbalancedQuote(rawInput.slice(rawInput.indexOf("echo") + 4))) return "echo: unmatched quote.";
      return flags.length ? "This lesson only teaches echo. Try: echo Hello Linux" : null;
    case "man": {
      if (flags.length) return "This lesson only teaches man. Try: man ls";
      if (args.length === 0) return "man: missing manual page.";
      if (args.length !== 1) return "This lesson supports one command at a time.";
      if (!NO_MANUALS_IN_LESSON.has(args[0])) return `No manual entry for ${args[0]}.`;
      return null;
    }
    case "clear":
      return args.length || flags.length ? "This lesson only teaches clear. Try: clear" : null;
    case "whoami":
      return args.length || flags.length ? "This lesson only teaches whoami. Try: whoami" : null;
    default:
      return null;
  }
}

function applyOperations(
  original: FilesystemNodeSummary[],
  operations: ReturnType<typeof interpret>["operations"],
): FilesystemNodeSummary[] {
  let nodes = [...original];

  for (const operation of operations) {
    if (operation.type === "createNode") {
      nodes.push({
        nodeId: operation.id,
        parentId: operation.parentId,
        nodeType: operation.nodeType,
        name: operation.name,
        permissions: operation.permissions,
        owner: operation.owner ?? "student",
        groupOwner: operation.groupOwner ?? operation.owner ?? "student",
        hasContent: operation.content !== null && operation.content !== undefined,
        currentDirectory: false,
      });
    } else if (operation.type === "deleteNode") {
      nodes = nodes.filter((node) => node.nodeId !== operation.nodeId);
    } else if (operation.type === "moveNode") {
      nodes = nodes.map((node) => node.nodeId === operation.nodeId
        ? { ...node, parentId: operation.newParentId, name: operation.newName ?? node.name }
        : node);
    } else {
      nodes = nodes.map((node) => {
        if (node.nodeId !== operation.nodeId) return node;
        return {
          ...node,
          permissions: operation.updates.permissions ?? node.permissions,
          owner: operation.updates.owner ?? node.owner,
          groupOwner: operation.updates.groupOwner ?? node.groupOwner,
          hasContent: operation.updates.content === undefined ? node.hasContent : operation.updates.content !== null,
        };
      });
    }
  }
  return nodes;
}

function getPathNodeIds(nodes: FilesystemNodeSummary[], nodeId: string): string[] {
  const result: string[] = [];
  let current = nodes.find((node) => node.nodeId === nodeId);
  while (current) {
    result.unshift(current.nodeId);
    current = current.parentId ? nodes.find((node) => node.nodeId === current?.parentId) : undefined;
  }
  return result;
}

function getEducationalMessage(
  command: LessonCommandName,
  rawInput: string,
  engineOutput: string,
  beforeNodes: FilesystemNodeSummary[],
  afterNodes: FilesystemNodeSummary[],
  currentDirectoryId: string,
  newCurrentDirectoryId: string,
  operations: ReturnType<typeof interpret>["operations"],
): Pick<LessonCommandResult, "message" | "createdName" | "createdNodeId" | "affectedNodeId" | "affectedName" | "action" | "removedNodeId" | "removedName" | "listedNames" | "currentPath" | "pathNodeIds"> {
  const args = parseCommandLine(rawInput, currentDirectoryId, new FilesystemTree(toEngineNodes(beforeNodes, command))).stages[0]?.args ?? [];
  const createdOperations = operations.filter((operation) => operation.type === "createNode");
  const createdOperation = createdOperations[createdOperations.length - 1];
  const deletedOperation = operations.find((operation) => operation.type === "deleteNode");
  const moveOperation = operations.find((operation) => operation.type === "moveNode");
  const updateOperation = operations.find((operation) => operation.type === "updateNode");
  const createdNode = createdOperation?.type === "createNode" ? afterNodes.find((node) => node.nodeId === createdOperation.id) : undefined;
  const targetNodeId = moveOperation?.nodeId ?? (updateOperation?.nodeId ?? undefined);
  const affectedBefore = targetNodeId ? beforeNodes.find((node) => node.nodeId === targetNodeId) : undefined;
  const affectedAfter = targetNodeId ? afterNodes.find((node) => node.nodeId === targetNodeId) : undefined;
  const deletedNode = deletedOperation?.type === "deleteNode" ? beforeNodes.find((node) => node.nodeId === deletedOperation.nodeId) : undefined;

  if (command === "mkdir" && createdNode) return { message: `Directory '${createdNode.name}' created.`, createdName: createdNode.name, createdNodeId: createdNode.nodeId };
  if (command === "touch" && createdNode) return { message: `File '${createdNode.name}' created.`, createdName: createdNode.name, createdNodeId: createdNode.nodeId };
  if (command === "ls") {
    const listedNames = beforeNodes.filter((node) => node.parentId === currentDirectoryId).map((node) => node.name).sort((a, b) => a.localeCompare(b));
    return { message: listedNames.join("  "), listedNames };
  }
  if (command === "cd") {
    const target = args[0];
    if (target === ".") return { message: "Already in the current directory.", currentPath: pathFor(beforeNodes, newCurrentDirectoryId), pathNodeIds: getPathNodeIds(beforeNodes, newCurrentDirectoryId) };
    const node = beforeNodes.find((candidate) => candidate.nodeId === newCurrentDirectoryId);
    return { message: node ? `Changed directory to '${node.name}'.` : "Changed directory.", currentPath: pathFor(beforeNodes, newCurrentDirectoryId), pathNodeIds: getPathNodeIds(beforeNodes, newCurrentDirectoryId) };
  }
  if (command === "pwd") {
    const currentPath = pathFor(beforeNodes, currentDirectoryId);
    return { message: currentPath, currentPath, pathNodeIds: getPathNodeIds(beforeNodes, currentDirectoryId) };
  }
  if (command === "rm" && deletedNode) return { message: `Removed '${deletedNode.name}'.`, removedNodeId: deletedNode.nodeId, removedName: deletedNode.name };
  if (command === "cp" && createdNode) return { message: `'${args[0]}' copied to '${createdNode.name}'.`, createdName: createdNode.name, createdNodeId: createdNode.nodeId };
  if (command === "mv" && affectedBefore && affectedAfter) {
    const action = affectedBefore.parentId === affectedAfter.parentId && affectedBefore.name !== affectedAfter.name ? "rename" : "move";
    const destination = args[1];
    const destinationNode = beforeNodes.find((node) => node.parentId === currentDirectoryId && node.name === destination && node.nodeType === "directory");
    const message = action === "rename" ? `'${affectedBefore.name}' renamed to '${affectedAfter.name}'.` : `'${affectedBefore.name}' moved into '${destinationNode?.name ?? destination}'.`;
    return { message, affectedNodeId: affectedAfter.nodeId, affectedName: action === "rename" ? affectedAfter.name : affectedBefore.name, action };
  }
  if (command === "chmod" && affectedAfter) return { message: `Permissions changed for ${args[1]}.`, affectedNodeId: affectedAfter.nodeId };
  if (command === "chown" && affectedAfter) return { message: `Owner changed to ${args[0]} for ${args[1]}.`, affectedNodeId: affectedAfter.nodeId };
  if (command === "clear") return { message: "" };
  return { message: engineOutput };
}

function pathFor(nodes: FilesystemNodeSummary[], nodeId: string): string {
  const parts: string[] = [];
  let current = nodes.find((node) => node.nodeId === nodeId);
  while (current) {
    if (!(current.parentId === null && current.name === "/")) parts.unshift(current.name);
    current = current.parentId ? nodes.find((node) => node.nodeId === current?.parentId) : undefined;
  }
  return `/${parts.join("/")}`;
}

/**
 * Runs a guided lesson command through the same simulation-engine interpreter
 * used by Practice Mode and the API. Lesson-specific restrictions and copy are
 * applied here; command semantics and filesystem operations come from the
 * shared interpreter instead of a second implementation in each lesson file.
 */
export function runLessonCommand(options: LessonCommandOptions): LessonCommandResult {
  const { command, rawInput, nodes } = options;
  const currentDirectoryId = options.currentDirectoryId ?? findInitialDirectory(nodes);
  if (!rawInput.trim()) return fail(nodes, "Please type a command.", currentDirectoryId);
  if (!currentDirectoryId) return fail(nodes, "The current directory could not be found.");

  const treeNodes = toEngineNodes(nodes, command);
  const tree = new FilesystemTree(treeNodes);
  const parsed = parseCommandLine(rawInput, currentDirectoryId, tree);
  const validationError = validateLessonInput(command, rawInput, parsed, nodes, currentDirectoryId);
  if (validationError) return fail(nodes, validationError, currentDirectoryId);

  const execution = interpret(parsed, currentDirectoryId, tree, createClientRegistryLookup());
  if (!execution.success) {
    return fail(nodes, normalizeLessonError(command, rawInput, execution.outputText), currentDirectoryId);
  }

  const afterNodesRaw = applyOperations(nodes, execution.operations);
  const nextDirectoryId = execution.newCurrentDirectoryId ?? currentDirectoryId;
  const afterNodes = afterNodesRaw.map((node) => ({ ...node, currentDirectory: node.nodeId === nextDirectoryId }));
  const presentation = getEducationalMessage(command, rawInput, execution.outputText, nodes, afterNodes, currentDirectoryId, nextDirectoryId, execution.operations);

  return {
    success: true,
    message: presentation.message,
    nodes: afterNodes,
    currentDirectoryId: nextDirectoryId,
    currentPath: presentation.currentPath ?? pathFor(afterNodes, nextDirectoryId),
    pathNodeIds: presentation.pathNodeIds ?? getPathNodeIds(afterNodes, nextDirectoryId),
    listedNames: presentation.listedNames,
    createdName: presentation.createdName,
    createdNodeId: presentation.createdNodeId,
    affectedNodeId: presentation.affectedNodeId,
    affectedName: presentation.affectedName,
    action: presentation.action,
    removedNodeId: presentation.removedNodeId,
    removedName: presentation.removedName,
  };
}

function normalizeLessonError(command: LessonCommandName, rawInput: string, message: string): string {
  if (command === "cat" && message.startsWith("cat: ") && message.endsWith(": No such file")) return `${message} or directory`;
  if (command === "cp" && message.startsWith("cp: cannot stat") && message.endsWith("No such file or directory")) return message.replace("No such file or directory", "No such file");
  if (command === "cd" && message.startsWith("No such file or directory: ")) return `cd: ${rawInput.trim().split(/\s+/)[1]}: No such file or directory`;
  return message;
}
