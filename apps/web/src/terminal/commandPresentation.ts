import type {
  AnimationEvent,
  CommandExecutionResponse,
  FilesystemDiff,
  FilesystemNodeSummary,
} from "@visualinux/shared-types";

export interface FilesystemAnimationPlan {
  highlightNodeIds: string[];
  removalNodeIds: string[];
  expandNodeIds: string[];
}

export interface CommandPresentationInput {
  commandName: string;
  args: string[];
  flags: string[];
  isSingleCommand: boolean;
  rawInput: string;
  response: CommandExecutionResponse;
  beforeNodes: FilesystemNodeSummary[];
  afterNodes: FilesystemNodeSummary[];
  currentDirectoryId: string;
  newCurrentDirectoryId: string | null;
}

export interface LessonAnimationInput {
  commandName: string;
  success: boolean;
  beforeNodes: FilesystemNodeSummary[];
  afterNodes: FilesystemNodeSummary[];
  currentDirectoryId: string;
  args?: string[];
  createdNodeId?: string;
  affectedNodeId?: string;
  removedNodeId?: string;
  pathNodeIds?: string[];
}

export interface CommandPresentation extends FilesystemAnimationPlan {
  outputText: string;
}

const EMPTY_ANIMATION: FilesystemAnimationPlan = {
  highlightNodeIds: [],
  removalNodeIds: [],
  expandNodeIds: [],
};

function unique(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function currentPath(nodes: FilesystemNodeSummary[], nodeId: string): string {
  const parts: string[] = [];
  let current = nodes.find((node) => node.nodeId === nodeId);
  while (current) {
    if (!(current.parentId === null && current.name === "/")) parts.unshift(current.name);
    current = current.parentId
      ? nodes.find((node) => node.nodeId === current?.parentId)
      : undefined;
  }
  return `/${parts.join("/")}`;
}

function currentDirectoryName(nodes: FilesystemNodeSummary[], nodeId: string): string {
  return nodes.find((node) => node.nodeId === nodeId)?.name ?? "student";
}

function nodesOnPath(nodes: FilesystemNodeSummary[], nodeId: string): string[] {
  const path: string[] = [];
  let current = nodes.find((node) => node.nodeId === nodeId);
  while (current) {
    path.unshift(current.nodeId);
    current = current.parentId
      ? nodes.find((node) => node.nodeId === current?.parentId)
      : undefined;
  }
  return path;
}

function childrenOf(nodes: FilesystemNodeSummary[], directoryId: string): FilesystemNodeSummary[] {
  return nodes.filter((node) => node.parentId === directoryId);
}

export function formatFilesystemTree(directoryName: string, names: string[]): string {
  return [
    directoryName,
    ...names.map((name, index) => `${index === names.length - 1 ? "└── " : "├── "}${name}`),
  ].join("\n");
}

export function formatVisualizedChildren(
  message: string,
  directoryName: string,
  names: string[],
): string {
  return [message, "", "Visualized result:", formatFilesystemTree(directoryName, names)].join("\n");
}

export function formatDirectoryListing(directoryName: string, names: string[]): string {
  return formatFilesystemTree(directoryName, names);
}

export function formatCurrentDirectory(message: string, path: string): string {
  return `${message}\n\nCurrent directory:\n${path}`;
}

export function formatCurrentPath(message: string, path: string): string {
  return `${message}\n\nVisualized path:\n${path}`;
}

export function formatCopyExplanation(sourceName: string, destinationName: string): string {
  return [
    `'${sourceName}' copied to '${destinationName}'.`,
    "",
    "Visualized result:",
    `Original: ${sourceName}`,
    `New copy: ${destinationName}`,
    "The original file remains unchanged.",
  ].join("\n");
}

export function formatMoveExplanation(
  message: string,
  action: "move" | "rename",
  name: string,
): string {
  return action === "rename"
    ? [message, "", "Visualized result:", `New name: ${name}`, "The file keeps its identity and contents."].join("\n")
    : [message, "", "Visualized result:", `Moved item: ${name}`, "The item now belongs to the destination directory."].join("\n");
}

export function formatRemovalExplanation(message: string, removedName: string): string {
  return [message, "", "Visualized result:", `Removed: ${removedName}`].join("\n");
}

function createdRootIds(diff: Pick<FilesystemDiff, "nodesCreated">): string[] {
  const createdIds = new Set(diff.nodesCreated.map((node) => node.nodeId));
  return diff.nodesCreated
    .filter((node) => !node.parentId || !createdIds.has(node.parentId))
    .map((node) => node.nodeId);
}

function sharedAnimationPlan(input: {
  commandName: string;
  args: string[];
  flags: string[];
  isSingleCommand: boolean;
  success: boolean;
  beforeNodes: FilesystemNodeSummary[];
  afterNodes: FilesystemNodeSummary[];
  currentDirectoryId: string;
  newCurrentDirectoryId?: string | null;
  createdNodeIds?: string[];
  affectedNodeIds?: string[];
  removedNodeIds?: string[];
  pathNodeIds?: string[];
  diff?: Pick<FilesystemDiff, "nodesCreated" | "nodesDeleted" | "nodesMoved" | "nodesModified">;
  animationEvents?: AnimationEvent[];
}): FilesystemAnimationPlan {
  const {
    commandName, args, flags, isSingleCommand, success, beforeNodes, afterNodes,
    currentDirectoryId, newCurrentDirectoryId, diff, animationEvents = [],
  } = input;
  if (!success) return { ...EMPTY_ANIMATION };

  const highlight = new Set<string>();
  const removal = new Set<string>();
  const expand = new Set<string>();
  const creations = input.createdNodeIds ?? (diff ? createdRootIds(diff) : []);
  const affected = input.affectedNodeIds ?? (diff ? diff.nodesMoved.map((node) => node.nodeId) : []);
  const removed = input.removedNodeIds ?? diff?.nodesDeleted ?? [];

  const isSimpleLessonInvocation = isSingleCommand && flags.length === 0 && (
    ((commandName === "ls" || commandName === "pwd") && args.length === 0) ||
    ((commandName === "mkdir" || commandName === "touch") && args.length === 1) ||
    ((commandName === "cp" || commandName === "mv") && args.length === 2) ||
    (commandName === "rm" && args.length === 1) ||
    ((commandName === "chmod" || commandName === "chown") && args.length === 2)
  );

  if (isSimpleLessonInvocation) {
    switch (commandName) {
      case "ls":
        childrenOf(beforeNodes, currentDirectoryId).forEach((node) => highlight.add(node.nodeId));
        break;
      case "pwd":
        (input.pathNodeIds ?? nodesOnPath(beforeNodes, currentDirectoryId)).forEach((id) => highlight.add(id));
        break;
      case "mkdir":
      case "touch":
      case "cp":
        creations.forEach((id) => highlight.add(id));
        break;
      case "mv":
        affected.forEach((id) => highlight.add(id));
        break;
      case "rm":
        removed.forEach((id) => removal.add(id));
        break;
      case "chmod":
      case "chown":
        (input.affectedNodeIds ?? diff?.nodesModified.map((node) => node.nodeId) ?? []).forEach((id) => highlight.add(id));
        break;
      default:
        break;
    }
  } else {
    // General Practice commands use semantic filesystem events. `content_display`
    // and `directory_change` are deliberately excluded from yellow highlights.
    for (const event of animationEvents) {
      if (["create", "copy", "move", "symlink", "permission_change", "ownership_change"].includes(event.type)) {
        highlight.add(event.nodeId);
      } else if (event.type === "delete") {
        removal.add(event.nodeId);
      }
    }
  }

  for (const id of highlight) {
    const node = afterNodes.find((candidate) => candidate.nodeId === id);
    if (node?.parentId) expand.add(node.parentId);
  }
  for (const id of removal) {
    const node = beforeNodes.find((candidate) => candidate.nodeId === id);
    if (node?.parentId) expand.add(node.parentId);
  }

  if (commandName === "mv") {
    expand.add(currentDirectoryId);
    for (const move of diff?.nodesMoved ?? []) {
      expand.add(move.fromParentId ?? currentDirectoryId);
      expand.add(move.toParentId);
    }
    for (const id of input.affectedNodeIds ?? []) {
      const moved = afterNodes.find((node) => node.nodeId === id);
      if (moved?.parentId) expand.add(moved.parentId);
    }
  }
  if (commandName === "pwd") (input.pathNodeIds ?? nodesOnPath(beforeNodes, currentDirectoryId)).forEach((id) => expand.add(id));
  if (commandName === "cd") {
    const currentPathIds = input.pathNodeIds
      ?? (newCurrentDirectoryId ? nodesOnPath(afterNodes, newCurrentDirectoryId) : []);
    currentPathIds.forEach((id) => expand.add(id));
  }

  return {
    highlightNodeIds: unique([...highlight]),
    removalNodeIds: unique([...removal]),
    expandNodeIds: unique([...expand]),
  };
}

export function createLessonAnimationPlan(input: LessonAnimationInput): FilesystemAnimationPlan {
  const defaultArgs: Record<string, string[]> = {
    mkdir: ["directory"], touch: ["file"], cp: ["source", "destination"],
    mv: ["source", "destination"], rm: ["file"], chmod: ["mode", "file"],
    chown: ["owner", "file"],
  };
  return sharedAnimationPlan({
    commandName: input.commandName,
    args: input.args ?? defaultArgs[input.commandName] ?? [],
    flags: [],
    isSingleCommand: true,
    success: input.success,
    beforeNodes: input.beforeNodes,
    afterNodes: input.afterNodes,
    currentDirectoryId: input.currentDirectoryId,
    createdNodeIds: input.createdNodeId ? [input.createdNodeId] : undefined,
    affectedNodeIds: input.affectedNodeId ? [input.affectedNodeId] : undefined,
    removedNodeIds: input.removedNodeId ? [input.removedNodeId] : undefined,
    pathNodeIds: input.pathNodeIds,
  });
}

function formatCommandError(input: CommandPresentationInput): string {
  const { response, commandName } = input;

    const currentDirectoryPath = currentPath(
    input.beforeNodes,
    input.currentDirectoryId
  );

  const currentDirectoryItems = childrenOf(
    input.beforeNodes,
    input.currentDirectoryId
  );

  const explanations: Record<string, string> = {
    not_found:
      "The requested path or item could not be found. Check its spelling and location. Use pwd to check your current directory and ls to inspect its contents.",

    not_a_directory:
      "A component of the supplied path is not a directory. Check that each directory in the path exists and is actually a folder.",

    already_exists:
      "An item with that name already exists. Inspect the existing item or choose a different name or destination.",

    invalid_arguments:
      "The arguments do not match the syntax supported by this command. Check the error message and the command's required arguments.",

    is_a_directory:
      "The target is a directory, but this operation does not accept it in the way you supplied it.",

    directory_not_empty:
      "The directory contains items. Inspect its contents and move or remove them before trying to remove an empty directory.",
  };

  let explanation = explanations[response.errorType ?? ""];


  const notFoundHints: Record<string, string> = {
    cd: "The directory you tried to enter does not exist or the path is incorrect.",
    ls: "Check the path supplied to ls. Without a path, ls lists the current directory.",
    mkdir: "The parent directory must already exist before mkdir can create a new directory.",
    touch: "The parent directory must already exist before touch can create a file.",
    rmdir: "Check that the target exists and is a directory.",
    rm: "Check the target path and spelling before retrying.",
    cp: "Check that the source exists and that the destination path is valid.",
    mv: "Check that the source exists and that the destination path is valid.",
    ln: "Check that the source and destination paths are valid for the selected link operation.",
    tree: "Check that the starting directory exists.",
    find: "Check that the directory being searched exists.",
    stat: "Check that the target path exists.",
    du: "Check that the target path exists.",
    chmod: "Check that the target item exists and its path is correct.",
    chown: "Check that the target item exists and its path is correct.",
    chgrp: "Check that the target item exists and its path is correct.",
    cat: "Check that the input file exists and its path is correct.",
    head: "Check that the input file exists and its path is correct.",
    tail: "Check that the input file exists and its path is correct.",
    grep: "Check that the input file exists and its path is correct.",
    sort: "Check that the input file exists and its path is correct.",
    uniq: "Check that the input file exists and its path is correct.",
    wc: "Check that the input file exists and its path is correct.",
    diff: "Check that both input files exist and their paths are correct.",
    nano: "Check that the target file path exists.",
  };


  const notADirectoryHints: Record<string, string> = {
    mkdir:
      "At least one component of the requested path is a file, not a directory. Use an existing directory as the parent or correct the path.",
    touch:
      "At least one component of the requested path is a file, not a directory. Check the parent directory path.",
    cp:
      "A component of the source or destination path is not a directory. Check each parent path and the destination directory.",
    mv:
      "A component of the source or destination path is not a directory. Check each parent path and the destination directory.",
    ln:
      "A component of the source or destination path is not a directory. Check each parent path.",
    tree:
      "The starting path contains a component that is not a directory. Check the path and choose a valid directory.",
    find:
      "The search path contains a component that is not a directory. Check the path and choose a valid directory.",
    chmod:
      "A component of the target path is not a directory. Check the parent directories in the supplied path.",
    chown:
      "A component of the target path is not a directory. Check the parent directories in the supplied path.",
    chgrp:
      "A component of the target path is not a directory. Check the parent directories in the supplied path.",
    cat:
      "A component of the file path is not a directory. Check each parent directory in the path.",
    head:
      "A component of the file path is not a directory. Check each parent directory in the path.",
    tail:
      "A component of the file path is not a directory. Check each parent directory in the path.",
    grep:
      "A component of the file path is not a directory. Check each parent directory in the path.",
    sort:
      "A component of the file path is not a directory. Check each parent directory in the path.",
    uniq:
      "A component of the file path is not a directory. Check each parent directory in the path.",
    wc:
      "A component of the file path is not a directory. Check each parent directory in the path.",
    diff:
      "A component of one of the input paths is not a directory. Check both file paths and their parent directories.",
  };

  if (response.errorType === "not_a_directory") {
    const hint = notADirectoryHints[commandName];

    if (hint) {
      explanation = `${explanation ?? explanations.not_a_directory} ${hint}`;
    }
  }

  if (response.errorType === "not_found" && commandName !== "man") {
    const hint = notFoundHints[commandName];

    if (hint) {
      explanation = `${explanation ?? explanations.not_found} ${hint}`;
    }
  }


  const commandExamples: Record<string, string> = {
    pwd: "pwd",
    ls: "ls",
    cd: "cd projects",
    mkdir: "mkdir project",
    rmdir: "rmdir old-folder",
    touch: "touch notes.txt",
    rm: "rm notes.txt",
    cp: "cp app.py src/",
    mv: "mv app.py src/",
    ln: "ln -s original.txt shortcut.txt",
    tree: "tree",
    chmod: "chmod 755 script.sh",
    chown: "chown alice notes.txt",
    chgrp: "chgrp staff notes.txt",
    find: "find . -name notes.txt",
    stat: "stat notes.txt",
    du: "du projects",
    df: "df",
    clear: "clear",
    man: "man ls",
    whoami: "whoami",
    cat: "cat notes.txt",
    head: "head notes.txt",
    tail: "tail notes.txt",
    grep: 'grep "TODO" notes.txt',
    sort: "sort names.txt",
    uniq: "uniq sorted-names.txt",
    wc: "wc notes.txt",
    diff: "diff old.txt new.txt",
    echo: 'echo "Hello, Linux!"',
    nano: "nano notes.txt",
  };

  if (response.errorType === "invalid_arguments") {
    const example = commandExamples[commandName];

    explanation = example
      ? `The arguments do not match the syntax supported by this command. Check the required arguments and flags.\nExample of valid usage: ${example}`
      : "The arguments do not match the syntax supported by this command. Check its required arguments and flags.";
  }

  if (response.errorType === "unrecognized_command") {
    explanation =
      "This command is not recognized by the simulator. Check the spelling, use the terminal's command suggestions, or try a supported command.";
  }

  if (response.errorType === "permission_denied") {
    explanation =
      "The simulated user does not have permission to perform this operation. Check the item's permissions and the operation you are attempting.";
  }


  if (response.errorType === "not_found" && commandName === "man") {
    explanation =
      "The simulator does not have a manual page for the requested command.";
  }

  if (response.errorType === "is_a_directory" && commandName === "cp") {
    explanation =
      "The source is a directory. This simulator requires the -r option to copy a directory and its contents.";
  }

  if (response.errorType === "is_a_directory" && commandName === "rm") {
    explanation =
      "The target is a directory. Recursive removal can delete the directory and its contents, so check the target carefully before using rm -r.";
  }


  if (response.errorType === "is_a_directory" && commandName === "nano") {
    explanation =
      "The target is a directory, not a regular file. The simulated nano editor opens files, so provide a file path instead.";
  }

  if (response.errorType === "not_a_directory" && commandName === "cd") {
    explanation =
      "The path you supplied is not a directory. The cd command can only move into an existing directory, not a regular file.";
  }

  if (
    response.errorType === "already_exists" &&
    ["cp", "mv", "ln"].includes(commandName)
  ) {
    explanation =
      "The destination already exists. This simulator does not overwrite an existing destination for this operation. Inspect the item or choose a different destination.";
  }

  if (response.errorType === "already_exists") {
    const targetPath = input.args[input.args.length - 1];

    // Only inspect a simple name in the current directory.
    // Nested and absolute paths keep the generic explanation.
    if (
      targetPath &&
      !targetPath.includes("/") &&
      targetPath !== "." &&
      targetPath !== ".."
    ) {
      const existingItem = input.beforeNodes.find(
        (node) =>
          node.parentId === input.currentDirectoryId &&
          node.name === targetPath
      );


      if (existingItem) {
        if (["cp", "mv", "ln"].includes(commandName)) {
          explanation =
            `The destination '${existingItem.name}' already exists in your current directory (${currentDirectoryPath}). ` +
            `It is a ${existingItem.nodeType}. Choose a different destination or inspect the existing item.`;
        } else {
          explanation =
            `An item named '${existingItem.name}' already exists in your current directory (${currentDirectoryPath}). ` +
            `It is a ${existingItem.nodeType}. Inspect it with ls or choose a different name.`;
        }
      }

    }
  }

  const lines: string[] = [
    response.outputText || "The command could not be completed.",
  ];

  if (explanation) {
    lines.push("", "What happened:", explanation);
  }

  if (response.errorType === "not_found" && commandName !== "man") {
    const visibleItems = currentDirectoryItems
      .map((node) =>
        node.nodeType === "directory"
          ? `${node.name}/`
          : node.name
      )
      .sort((a, b) => a.localeCompare(b));

    lines.push(
      "",
      "Your current simulated directory:",
      currentDirectoryPath,
      "",
      "Items directly inside this directory:",
      visibleItems.length > 0
        ? visibleItems.slice(0, 10).join(", ")
        : "(This directory is empty.)"
    );

    if (visibleItems.length > 10) {
      lines.push(`...and ${visibleItems.length - 10} more item(s).`);
    }
  }
  if (response.suggestion) {
    lines.push(
      "",
      "Suggested correction:",
      response.suggestion.description,
      `Try: ${response.suggestion.suggestedCommand}`,
      "This suggestion has not been executed."
    );
  }

  return lines.join("\n");
}

function formatEducationalOutput(input: CommandPresentationInput): string {
  const {
    commandName, args, flags, isSingleCommand, response, beforeNodes, afterNodes,
    currentDirectoryId, newCurrentDirectoryId,
  } = input;
  if (!isSingleCommand) return response.outputText;
  if (!response.success) return formatCommandError(input);

  const noFlags = flags.length === 0;
  const noArgs = args.length === 0;
  const created = response.diff.nodesCreated;
  const childrenAfter = childrenOf(afterNodes, currentDirectoryId);
  const directoryName = currentDirectoryName(afterNodes, currentDirectoryId);

  if (commandName === "ls" && noArgs && noFlags) {
    const names = childrenOf(beforeNodes, currentDirectoryId)
      .map((node) => node.name)
      .sort((a, b) => a.localeCompare(b));
    return formatDirectoryListing(directoryName, names);
  }
  if (commandName === "pwd" && noArgs && noFlags) {
    const path = currentPath(beforeNodes, currentDirectoryId);
    return formatCurrentPath(path, path);
  }
  if (commandName === "cd" && args.length === 1 && noFlags && newCurrentDirectoryId) {
    const name = currentDirectoryName(afterNodes, newCurrentDirectoryId);
    const message = args[0] === "." ? "Already in the current directory." : `Changed directory to '${name}'.`;
    return formatCurrentDirectory(message, currentPath(afterNodes, newCurrentDirectoryId));
  }
  if (commandName === "mkdir" && args.length === 1 && noFlags && created.length === 1) {
    return formatVisualizedChildren(`Directory '${created[0].name}' created.`, directoryName, childrenAfter.map((node) => node.name));
  }
  if (commandName === "touch" && args.length === 1 && noFlags && created.length === 1) {
    return formatVisualizedChildren(`File '${created[0].name}' created.`, directoryName, childrenAfter.map((node) => node.name));
  }
  if (commandName === "cp" && args.length === 2 && noFlags && created.length === 1) {
    return formatCopyExplanation(args[0], created[0].name);
  }
  if (commandName === "mv" && args.length === 2 && noFlags && response.diff.nodesMoved.length === 1) {
    const move = response.diff.nodesMoved[0];
    const before = beforeNodes.find((node) => node.nodeId === move.nodeId);
    const after = afterNodes.find((node) => node.nodeId === move.nodeId);
    if (before && after) {
      const action = before.parentId === after.parentId && before.name !== after.name ? "rename" : "move";
      const destination = beforeNodes.find((node) => node.nodeId === after.parentId);
      const message = action === "rename"
        ? `'${before.name}' renamed to '${after.name}'.`
        : `'${before.name}' moved into '${destination?.name ?? args[1]}'.`;
      return formatMoveExplanation(message, action, action === "rename" ? after.name : before.name);
    }
  }
  if (commandName === "rm" && args.length === 1 && noFlags && response.diff.nodesDeleted.length === 1) {
    const removed = beforeNodes.find((node) => node.nodeId === response.diff.nodesDeleted[0]);
    if (removed) return formatRemovalExplanation(`Removed '${removed.name}'.`, removed.name);
  }
  if (commandName === "chmod" && args.length === 2 && noFlags) {
    const target = beforeNodes.find((node) => node.name === args[1]);
    if (target && response.diff.nodesModified.some((node) => node.nodeId === target.nodeId)) return `Permissions changed for ${args[1]}.`;
  }
  if (commandName === "chown" && args.length === 2 && noFlags) {
    const target = beforeNodes.find((node) => node.name === args[1]);
    if (target && response.diff.nodesModified.some((node) => node.nodeId === target.nodeId)) return `Owner changed to ${args[0]} for ${args[1]}.`;
  }
  return response.outputText;
}

export function createCommandPresentation(input: CommandPresentationInput): CommandPresentation {
  const outputText = formatEducationalOutput(input);
  const plan = sharedAnimationPlan({
    commandName: input.commandName,
    args: input.args,
    flags: input.flags,
    isSingleCommand: input.isSingleCommand,
    success: input.response.success,
    beforeNodes: input.beforeNodes,
    afterNodes: input.afterNodes,
    currentDirectoryId: input.currentDirectoryId,
    newCurrentDirectoryId: input.newCurrentDirectoryId,
    diff: input.response.diff,
    animationEvents: input.response.animationEvents,
  });
  return { outputText, ...plan };
}
