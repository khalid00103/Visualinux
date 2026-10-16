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

function formatEducationalOutput(input: CommandPresentationInput): string {
  const {
    commandName, args, flags, isSingleCommand, response, beforeNodes, afterNodes,
    currentDirectoryId, newCurrentDirectoryId,
  } = input;
  if (!response.success || !isSingleCommand) return response.outputText;

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
