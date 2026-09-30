import { useEffect, useRef, useState } from "react";
import {
  IconFolder,
  IconFile,
  IconLink,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { CurrentDirectoryMarker } from "./CurrentDirectoryMarker.js";

export interface TreeNodeProps {
  node: FilesystemNodeSummary;
  allNodes: FilesystemNodeSummary[];
  currentDirectoryId: string | null;
  highlightedNodeIds?: string[];
  depth?: number;
}

function iconFor(nodeType: FilesystemNodeSummary["nodeType"]) {
  if (nodeType === "directory") return IconFolder;
  if (nodeType === "symlink") return IconLink;
  return IconFile;
}

export function TreeNode({
  node,
  allNodes,
  currentDirectoryId,
  highlightedNodeIds = [],
  depth = 0,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const children = allNodes.filter(
    (n) => n.parentId === node.nodeId,
  );

  const previousChildCountRef = useRef(children.length);

  useEffect(() => {
    const previousChildCount = previousChildCountRef.current;

    if (children.length > previousChildCount) {
      setIsExpanded(true);
    }

    previousChildCountRef.current = children.length;
  }, [children.length]);

  const hasChildren =
    node.nodeType === "directory" && children.length > 0;

  const isCurrent = node.nodeId === currentDirectoryId;

  const isHighlighted = highlightedNodeIds.includes(node.nodeId);

  const Icon = iconFor(node.nodeType);

  return (
    <div>
      <div
        className={isHighlighted ? "visualinux-node-highlight" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px",
          paddingLeft: `${8 + depth * 24}px`,
          borderRadius: "var(--radius-sm)",

          /*
           * Current directory remains green even when another visual
           * effect is active.
           */
          background: isCurrent
            ? "var(--role-success-bg)"
            : "transparent",

          cursor:
            node.nodeType === "directory"
              ? "pointer"
              : "default",

          /*
           * Keep the yellow highlight subtle outside the animation.
           * The CSS animation provides the pulsing glow.
           */
          border: isHighlighted
            ? "1px solid rgba(250, 204, 21, 0.35)"
            : "1px solid transparent",

          transition:
            "background 180ms ease, border-color 180ms ease",
        }}
        onClick={() =>
          node.nodeType === "directory" &&
          setIsExpanded((v) => !v)
        }
      >
        <div
          style={{
            width: "14px",
            minWidth: "14px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {node.nodeType === "directory" && hasChildren ? (
            isExpanded ? (
              <IconChevronDown
                size={14}
                color="var(--text-muted)"
              />
            ) : (
              <IconChevronRight
                size={14}
                color="var(--text-muted)"
              />
            )
          ) : null}
        </div>

        <div
          style={{
            width: "10px",
            minWidth: "10px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {isCurrent && <CurrentDirectoryMarker />}
        </div>

        <Icon
          size={16}
          color={
            isCurrent
              ? "var(--role-success)"
              : isHighlighted
                ? "#facc15"
                : "var(--text-secondary)"
          }
        />

        <span
          style={{
            fontSize: "13px",
            color: isCurrent
              ? "var(--role-success)"
              : isHighlighted
                ? "#facc15"
                : "var(--text-primary)",
          }}
        >
          {node.name}
        </span>

        {isCurrent && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--role-success)",
              marginLeft: "auto",
            }}
          >
            here
          </span>
        )}
      </div>

      {isExpanded &&
        children.map((child) => (
          <TreeNode
            key={child.nodeId}
            node={child}
            allNodes={allNodes}
            currentDirectoryId={currentDirectoryId}
            highlightedNodeIds={highlightedNodeIds}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}