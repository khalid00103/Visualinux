import { useCallback, useState } from "react";
import { useAuthStore } from "../store/authStore.js";
import { useSessionStore } from "../store/sessionStore.js";
import { terminalApi } from "../api/terminalApi.js";
import { ApiError } from "../api/client.js";
import { summaryToTreeNode, applyDiffToNodes } from "./nodeMirror.js";
import { FilesystemTree, parseCommandLine, interpret, isDestructiveInvocation } from "@visualinux/simulation-engine";
import { createClientRegistryLookup } from "./client-registry-lookup.js";
import type { FilesystemDiff } from "@visualinux/shared-types";
import { createCommandPresentation } from "./commandPresentation.js";

/**
 * Content-reading commands have nothing to optimistically simulate against —
 * see nodeMirror.ts's note on why FilesystemNodeSummary excludes content.
 * These always go straight to the server, as do destructive commands pending
 * confirmation (never optimistically delete before the user has confirmed).
 */
const SERVER_ROUNDTRIP_ONLY = new Set([
  "cat", "head", "tail", "grep", "sort", "uniq", "wc", "diff", "nano", "tree", "find", "stat", "du", "df", "clear",
]);

export interface PendingConfirmation {
  rawInput: string;
  consequenceMessage: string;
}

export function useCommandExecutionOrchestrator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const {
    sandboxId,
    nodes,
    currentDirectoryId,
    pushHistoryEntry,
    replaceLastHistoryEntry,
    clearHistory,
    setNodes,
    setCurrentDirectoryId,
    queueAnimationPlan,
  } = useSessionStore();

  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const execute = useCallback(
    async (rawInput: string, confirmed = false) => {
      if (!accessToken || !sandboxId || !currentDirectoryId) return;

      const clientTree = new FilesystemTree(nodes.map(summaryToTreeNode));
      const parsed = parseCommandLine(rawInput, currentDirectoryId, clientTree);
      const primaryCommand = parsed.stages[0]?.commandName ?? "";
      const skipOptimistic = SERVER_ROUNDTRIP_ONLY.has(primaryCommand) || (isDestructiveInvocation(primaryCommand) && !confirmed);

      // Snapshot before any optimistic mutation. Reconciliation always restores
      // this exact state, then applies the server's diff fresh — deliberately
      // simple rather than trying to compute and reverse "a diff of the diff,"
      // since a wrong reconciliation would corrupt what the user trusts as truth.
      const preSnapshot = nodes;
      const preCurrentDirectoryId = currentDirectoryId;

      if (!skipOptimistic) {
        const registry = createClientRegistryLookup();
        const optimistic = interpret(parsed, currentDirectoryId, clientTree, registry);

        if (optimistic.success) {
          const optimisticDiff: FilesystemDiff = {
            nodesCreated: optimistic.operations
              .filter((op) => op.type === "createNode")
              .map((op) => ({
                nodeId: op.id,
                parentId: op.parentId,
                nodeType: op.nodeType,
                name: op.name,
                permissions: op.permissions,
                owner: op.owner ?? "user",
                groupOwner: op.groupOwner ?? "user",
                hasContent: op.content != null,
                currentDirectory: false,
              })),
            nodesDeleted: optimistic.operations.filter((op) => op.type === "deleteNode").map((op) => op.nodeId),
            nodesMoved: [],
            nodesModified: [],
          };

          setNodes(applyDiffToNodes(nodes, optimisticDiff));
          if (optimistic.newCurrentDirectoryId) setCurrentDirectoryId(optimistic.newCurrentDirectoryId);
          pushHistoryEntry({ rawInput, outputText: optimistic.outputText, success: true, isPending: true });
        }
      }

      try {
        const response = await terminalApi.executeCommand(accessToken, sandboxId, { rawInput, confirmed });

        // Reconciliation: always restore the pre-optimistic snapshot, then
        // apply the server's authoritative diff and current-directory value —
        // this runs every time, not only when the optimistic guess was wrong,
        // since optimistically-generated node ids never match the server's
        // real ones anyway (see nodeMirror.ts).
        const deletedNodeIds = response.diff.nodesDeleted;
        let reconciledNodes;

        if (deletedNodeIds.length > 0) {
          // Keep deleted nodes in the UI tree until the shared animation
          // controller finishes the 3-second red removal sequence.
          const diffWithoutDeletes: FilesystemDiff = {
            ...response.diff,
            nodesDeleted: [],
          };
          reconciledNodes = applyDiffToNodes(preSnapshot, diffWithoutDeletes);
        } else {
          reconciledNodes = applyDiffToNodes(preSnapshot, response.diff);
        }

        setNodes(reconciledNodes);

        const presentation = createCommandPresentation({
          commandName: primaryCommand,
          args: parsed.stages[0]?.args ?? [],
          flags: parsed.stages[0]?.flags ?? [],
          isSingleCommand: parsed.stages.length === 1 && parsed.redirect === null,
          rawInput,
          response,
          beforeNodes: preSnapshot,
          afterNodes: reconciledNodes,
          currentDirectoryId: preCurrentDirectoryId,
          newCurrentDirectoryId: response.newCurrentDirectoryId,
        });

        if (
          presentation.highlightNodeIds.length > 0 ||
          presentation.removalNodeIds.length > 0 ||
          presentation.expandNodeIds.length > 0
        ) {
          queueAnimationPlan({
            highlightNodeIds: presentation.highlightNodeIds,
            removalNodeIds: presentation.removalNodeIds,
            expandNodeIds: presentation.expandNodeIds,
          });
        }
        setCurrentDirectoryId(response.newCurrentDirectoryId ?? preCurrentDirectoryId);

        if (primaryCommand === "clear" && response.success && parsed.stages.length === 1 && parsed.redirect === null) {
          // Match the guided clear lesson: clear the visible terminal history;
          // the backend still records the command in persistent command history.
          clearHistory();
        } else if (skipOptimistic) {
          pushHistoryEntry({ rawInput, outputText: presentation.outputText, success: response.success, isPending: false });
        } else {
          replaceLastHistoryEntry({ rawInput, outputText: presentation.outputText, success: response.success, isPending: false });
        }

        setPendingConfirmation(null);
      } catch (err) {
        // A true API-level failure (network error, or the 409 destructive-
        // confirmation gate) — not "the Linux command failed," which is a 200
        // with success:false and never reaches this catch block at all.
        setNodes(preSnapshot);
        setCurrentDirectoryId(preCurrentDirectoryId);

        if (err instanceof ApiError && err.code === "CONFLICT") {
          setPendingConfirmation({ rawInput, consequenceMessage: err.message });
          return;
        }

        const message = err instanceof ApiError ? err.message : "Network error — please try again.";
        if (skipOptimistic) {
          pushHistoryEntry({ rawInput, outputText: message, success: false, isPending: false });
        } else {
          replaceLastHistoryEntry({ rawInput, outputText: message, success: false, isPending: false });
        }
      }
    },
    [
      accessToken,
      sandboxId,
      currentDirectoryId,
      nodes,
      pushHistoryEntry,
      replaceLastHistoryEntry,
      clearHistory,
      setNodes,
      setCurrentDirectoryId,
      queueAnimationPlan,
    ]
  );

  const confirmPending = useCallback(() => {
    if (!pendingConfirmation) return;
    const { rawInput } = pendingConfirmation;
    setPendingConfirmation(null);
    void execute(rawInput, true);
  }, [pendingConfirmation, execute]);

  const cancelPending = useCallback(() => setPendingConfirmation(null), []);

  return { execute, pendingConfirmation, confirmPending, cancelPending };
}
