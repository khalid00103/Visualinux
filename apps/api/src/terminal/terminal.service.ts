import { db } from "../db/client.js";
import { commandHistory } from "../db/schema.js";
import { sandboxesRepository } from "../filesystem/sandbox.repository.js";
import { nodesRepository } from "../filesystem/nodes.repository.js";
import { createRegistryLookup } from "./registry-lookup.js";
import { NotFoundError, ConflictError } from "../common/errors.js";
import {
  generateId,
  FilesystemTree,
  type TreeNode,
  parseCommandLine,
  interpret,
  isDestructiveInvocation,
} from "@visualinux/simulation-engine";
import type { CommandExecutionResponse, FilesystemDiff } from "@visualinux/shared-types";

/**
 * Loaded once per command execution (Architecture §6) — never cached across
 * requests, since the backend is the single authoritative source of truth and
 * staleness here would silently corrupt the diff/animation events sent back.
 */
async function loadTree(sandboxId: string): Promise<{ tree: FilesystemTree; currentDirectoryId: string }> {
  const sandbox = await sandboxesRepository.findById(sandboxId);
  if (!sandbox) throw new NotFoundError("Sandbox not found.");
  if (!sandbox.rootNodeId) throw new NotFoundError("Sandbox has no root node — it may not have finished initializing.");

  const rows = await nodesRepository.findAllLiveForSandbox(sandboxId);
  const nodes: TreeNode[] = rows.map((n) => ({
    id: n.id,
    parentId: n.parentId,
    nodeType: n.nodeType,
    name: n.name,
    permissions: n.permissions,
    owner: n.owner,
    groupOwner: n.groupOwner,
    content: n.content,
    symlinkTargetId: n.symlinkTargetId,
  }));

  // Falls back to the root only if currentDirectoryId was somehow never set —
  // in normal operation it's always initialized alongside rootNodeId (see
  // sandbox.repository.ts's setRootNodeId).
  return { tree: new FilesystemTree(nodes), currentDirectoryId: sandbox.currentDirectoryId ?? sandbox.rootNodeId };
}

export const terminalService = {
  async executeCommand(params: {
    sandboxId: string;
    userId: string;
    rawInput: string;
    confirmed: boolean;
    experienceMode: "beginner" | "advanced";
  }): Promise<CommandExecutionResponse> {
    const { tree, currentDirectoryId } = await loadTree(params.sandboxId);
    const registry = await createRegistryLookup();

    const parsed = parseCommandLine(params.rawInput, currentDirectoryId, tree);
    const primaryCommandName = parsed.stages[0]?.commandName ?? "";

    if (
      params.experienceMode === "beginner" &&
      isDestructiveInvocation(primaryCommandName) &&
      !params.confirmed
    ) {
      throw new ConflictError(
        `This will permanently delete ${parsed.stages[0]?.args.join(", ") || "the target"}. Resubmit with confirmed: true to proceed.`,
        { commandText: params.rawInput }
      );
    }

    const result = interpret(parsed, currentDirectoryId, tree, registry);

    const diff: FilesystemDiff = { nodesCreated: [], nodesDeleted: [], nodesMoved: [], nodesModified: [] };

    if (result.success) {
      await db.transaction(async (tx) => {
        for (const op of result.operations) {
          if (op.type === "createNode") {
            const created = await nodesRepository.create(
              {
                id: op.id,
                sandboxId: params.sandboxId,
                parentId: op.parentId,
                nodeType: op.nodeType,
                name: op.name,
                permissions: op.permissions,
                owner: op.owner,
                groupOwner: op.groupOwner,
                content: op.content,
                symlinkTargetId: op.symlinkTargetId,
              },
              tx
            );
            diff.nodesCreated.push({
              nodeId: created.id,
              parentId: created.parentId,
              nodeType: created.nodeType,
              name: created.name,
              permissions: created.permissions,
              owner: created.owner,
              groupOwner: created.groupOwner,
              hasContent: created.content !== null,
              currentDirectory: false,
            });
          } else if (op.type === "deleteNode") {
            await nodesRepository.softDelete(op.nodeId, tx);
            diff.nodesDeleted.push(op.nodeId);
          } else if (op.type === "moveNode") {
            const previousParentId = tree.getNode(op.nodeId)?.parentId ?? null;
            const updates: { parentId: string; name?: string } = { parentId: op.newParentId };
            if (op.newName) updates.name = op.newName;
            const updated = await nodesRepository.update(op.nodeId, updates, tx);
            diff.nodesMoved.push({ nodeId: op.nodeId, fromParentId: previousParentId, toParentId: op.newParentId });
            if (updated) {
              diff.nodesModified.push({
                nodeId: updated.id,
                parentId: updated.parentId,
                nodeType: updated.nodeType,
                name: updated.name,
                permissions: updated.permissions,
                owner: updated.owner,
                groupOwner: updated.groupOwner,
                hasContent: updated.content !== null,
                currentDirectory: false,
              });
            }
          } else if (op.type === "updateNode") {
            const updated = await nodesRepository.update(op.nodeId, op.updates, tx);
            if (updated) {
              diff.nodesModified.push({
                nodeId: updated.id,
                parentId: updated.parentId,
                nodeType: updated.nodeType,
                name: updated.name,
                permissions: updated.permissions,
                owner: updated.owner,
                groupOwner: updated.groupOwner,
                hasContent: updated.content !== null,
                currentDirectory: false,
              });
            }
          }
        }
      });
    }

    const historyId = generateId();
    await db.insert(commandHistory).values({
      id: historyId,
      sandboxId: params.sandboxId,
      userId: params.userId,
      rawInput: params.rawInput,
      commandName: result.commandName,
      wasSuccessful: result.success,
      errorType: result.errorType ?? null,
      diffSnapshot: result.success ? diff : null,
    });

    if (result.success && result.newCurrentDirectoryId) {
      await sandboxesRepository.setCurrentDirectoryId(params.sandboxId, result.newCurrentDirectoryId);
    }

    return {
      success: result.success,
      outputText: result.outputText,
      errorType: result.errorType ?? null,
      suggestion: result.suggestion ?? null,
      diff,
      animationEvents: result.animationEvents,
      lessonStepResult: null,
      commandHistoryId: historyId,
      newCurrentDirectoryId: result.success ? (result.newCurrentDirectoryId ?? null) : null,
    };
  },
};
