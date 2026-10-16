import { useCallback, useEffect } from "react";
import { useSessionStore } from "../../store/sessionStore.js";
import { useFilesystemAnimationController } from "../../terminal/useFilesystemAnimationController.js";
import { TreeNode } from "./TreeNode.js";

export function FilesystemPanel() {
  const nodes = useSessionStore((s) => s.nodes);
  const currentDirectoryId = useSessionStore((s) => s.currentDirectoryId);
  const pendingAnimationPlan = useSessionStore((s) => s.pendingAnimationPlan);
  const clearAnimationPlan = useSessionStore((s) => s.clearAnimationPlan);

  const completeRemoval = useCallback((nodeIds: string[]) => {
    const currentNodes = useSessionStore.getState().nodes;
    useSessionStore.getState().setNodes(
      currentNodes.filter((node) => !nodeIds.includes(node.nodeId)),
    );
  }, []);

  const animations = useFilesystemAnimationController({
    onRemovalComplete: completeRemoval,
  });

  const root = nodes.find((node) => node.parentId === null);

  useEffect(() => {
    if (!pendingAnimationPlan) return;

    const { removalNodeIds, highlightNodeIds, expandNodeIds } = pendingAnimationPlan;

    if (removalNodeIds.length > 0) {
      animations.removeNodes(removalNodeIds, expandNodeIds);
    } else if (highlightNodeIds.length > 0) {
      animations.highlightNodes(highlightNodeIds, expandNodeIds);
    } else if (expandNodeIds.length > 0) {
      animations.expandNodes(expandNodeIds);
    }

    clearAnimationPlan();
  }, [pendingAnimationPlan, animations.removeNodes, animations.highlightNodes, animations.expandNodes, clearAnimationPlan]);

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-lg)",
        minWidth: "220px",
        overflowY: "auto",
      }}
    >
      <p
        style={{
          fontSize: "13px",
          color: "var(--text-secondary)",
          margin: "0 0 12px",
        }}
      >
        Filesystem
      </p>

      {root ? (
        <TreeNode
          node={root}
          allNodes={nodes}
          currentDirectoryId={currentDirectoryId}
          highlightedNodeIds={animations.highlightedNodeIds}
          removingNodeIds={animations.removingNodeIds}
          expandNodeIds={animations.expandNodeIds}
        />
      ) : (
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
        >
          Loading filesystem…
        </p>
      )}
    </div>
  );
}
