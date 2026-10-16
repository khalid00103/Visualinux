import { useCallback, useEffect, useRef, useState } from "react";
import type { FilesystemAnimationPlan } from "./commandPresentation.js";

export const FILESYSTEM_HIGHLIGHT_DURATION_MS = 10_000;
export const FILESYSTEM_REMOVAL_DURATION_MS = 3_000;

export interface FilesystemAnimationControllerOptions {
  onRemovalComplete?: (nodeIds: string[]) => void;
}

export function useFilesystemAnimationController(
  options: FilesystemAnimationControllerOptions = {},
) {
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [removingNodeIds, setRemovingNodeIds] = useState<string[]>([]);
  const [expandNodeIds, setExpandNodeIds] = useState<string[]>([]);

  const highlightTimerRef = useRef<number | null>(null);
  const highlightFrameRef = useRef<number | null>(null);
  const removalTimerRef = useRef<number | null>(null);
  const removalFrameRef = useRef<number | null>(null);
  const onRemovalCompleteRef = useRef(options.onRemovalComplete);
  const pendingRemovalIdsRef = useRef<string[]>([]);
  const pendingRemovalCompleteRef = useRef<((ids: string[]) => void) | undefined>(undefined);
  onRemovalCompleteRef.current = options.onRemovalComplete;

  const clearHighlightTimerAndFrame = useCallback(() => {
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    if (highlightFrameRef.current !== null) {
      window.cancelAnimationFrame(highlightFrameRef.current);
      highlightFrameRef.current = null;
    }
  }, []);

  const clearRemovalTimerAndFrame = useCallback(() => {
    if (removalTimerRef.current !== null) {
      window.clearTimeout(removalTimerRef.current);
      removalTimerRef.current = null;
    }
    if (removalFrameRef.current !== null) {
      window.cancelAnimationFrame(removalFrameRef.current);
      removalFrameRef.current = null;
    }
  }, []);

  const finishPendingRemoval = useCallback(() => {
    const ids = pendingRemovalIdsRef.current;
    const callback = pendingRemovalCompleteRef.current ?? onRemovalCompleteRef.current;
    pendingRemovalIdsRef.current = [];
    pendingRemovalCompleteRef.current = undefined;
    if (ids.length > 0) callback?.(ids);
  }, []);

  const resetAnimations = useCallback(() => {
    clearHighlightTimerAndFrame();
    clearRemovalTimerAndFrame();
    pendingRemovalIdsRef.current = [];
    pendingRemovalCompleteRef.current = undefined;
    setHighlightedNodeIds([]);
    setRemovingNodeIds([]);
    setExpandNodeIds([]);
  }, [clearHighlightTimerAndFrame, clearRemovalTimerAndFrame]);

  const expandNodes = useCallback((nodeIds: string[]) => {
    setExpandNodeIds([...new Set(nodeIds)]);
  }, []);

  const highlightNodes = useCallback((nodeIds: string[], parentsToExpand: string[] = []) => {
    clearHighlightTimerAndFrame();
    setExpandNodeIds([...new Set(parentsToExpand)]);
    setHighlightedNodeIds([]);

    const ids = [...new Set(nodeIds)];
    if (ids.length === 0) return;

    // Empty state followed by RAF deliberately restarts CSS animation when the
    // same node is highlighted twice in quick succession.
    highlightFrameRef.current = window.requestAnimationFrame(() => {
      setHighlightedNodeIds(ids);
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedNodeIds([]);
        highlightTimerRef.current = null;
      }, FILESYSTEM_HIGHLIGHT_DURATION_MS);
      highlightFrameRef.current = null;
    });
  }, [clearHighlightTimerAndFrame]);

  const removeNodes = useCallback((nodeIds: string[], parentsToExpand: string[] = [], onComplete?: (ids: string[]) => void) => {
    if (pendingRemovalIdsRef.current.length > 0) finishPendingRemoval();
    clearRemovalTimerAndFrame();
    clearHighlightTimerAndFrame();
    setHighlightedNodeIds([]);
    setRemovingNodeIds([]);
    setExpandNodeIds([...new Set(parentsToExpand)]);

    const ids = [...new Set(nodeIds)];
    if (ids.length === 0) {
      onComplete?.(ids);
      return;
    }
    pendingRemovalIdsRef.current = ids;
    pendingRemovalCompleteRef.current = onComplete;

    removalFrameRef.current = window.requestAnimationFrame(() => {
      setRemovingNodeIds(ids);
      removalTimerRef.current = window.setTimeout(() => {
        setRemovingNodeIds([]);
        removalTimerRef.current = null;
        finishPendingRemoval();
      }, FILESYSTEM_REMOVAL_DURATION_MS);
      removalFrameRef.current = null;
    });
  }, [clearHighlightTimerAndFrame, clearRemovalTimerAndFrame, finishPendingRemoval]);

  useEffect(() => () => {
    clearHighlightTimerAndFrame();
    clearRemovalTimerAndFrame();
    finishPendingRemoval();
  }, [clearHighlightTimerAndFrame, clearRemovalTimerAndFrame, finishPendingRemoval]);

  return {
    highlightedNodeIds,
    removingNodeIds,
    expandNodeIds,
    highlightNodes,
    removeNodes,
    expandNodes,
    resetAnimations,
  };
}

export interface FilesystemAnimationCommands {
  highlightNodes: (nodeIds: string[], parentsToExpand?: string[]) => void;
  removeNodes: (nodeIds: string[], parentsToExpand?: string[], onComplete?: (ids: string[]) => void) => void;
  expandNodes: (nodeIds: string[]) => void;
}

/** Apply a source-derived animation plan using the one shared timer/lifecycle controller. */
export function applyFilesystemAnimationPlan(
  plan: FilesystemAnimationPlan,
  controller: FilesystemAnimationCommands,
  onRemovalComplete?: (ids: string[]) => void,
): void {
  if (plan.removalNodeIds.length > 0) {
    controller.removeNodes(plan.removalNodeIds, plan.expandNodeIds, onRemovalComplete);
  } else if (plan.highlightNodeIds.length > 0) {
    controller.highlightNodes(plan.highlightNodeIds, plan.expandNodeIds);
  } else if (plan.expandNodeIds.length > 0) {
    controller.expandNodes(plan.expandNodeIds);
  }
}
