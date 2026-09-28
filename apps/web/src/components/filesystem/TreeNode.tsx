import { useState } from "react";
import { IconFolder, IconFile, IconLink, IconChevronRight, IconChevronDown } from "@tabler/icons-react";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { CurrentDirectoryMarker } from "./CurrentDirectoryMarker.js";

export interface TreeNodeProps {
  node: FilesystemNodeSummary;
  allNodes: FilesystemNodeSummary[];
  currentDirectoryId: string | null;
  depth?: number;
}

function iconFor(nodeType: FilesystemNodeSummary["nodeType"]) {
  if (nodeType === "directory") return IconFolder;
  if (nodeType === "symlink") return IconLink;
  return IconFile;
}

export function TreeNode({ node, allNodes, currentDirectoryId, depth = 0 }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // shallow levels open by default
  const children = allNodes.filter((n) => n.parentId === node.nodeId);
  const hasChildren = node.nodeType === "directory" && children.length > 0;
  const isCurrent = node.nodeId === currentDirectoryId;
  const Icon = iconFor(node.nodeType);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px",
          paddingLeft: `${8 + depth * 16}px`,
          borderRadius: "var(--radius-sm)",
          background: isCurrent ? "var(--role-success-bg)" : "transparent",
          cursor: node.nodeType === "directory" ? "pointer" : "default",
        }}
        onClick={() => node.nodeType === "directory" && setIsExpanded((v) => !v)}
      >
        {node.nodeType === "directory" ? (
          hasChildren ? (
            isExpanded ? (
              <IconChevronDown size={14} color="var(--text-muted)" />
            ) : (
              <IconChevronRight size={14} color="var(--text-muted)" />
            )
          ) : (
            <span style={{ width: 14 }} />
          )
        ) : (
          <span style={{ width: 14 }} />
        )}

        {isCurrent && <CurrentDirectoryMarker />}
        <Icon size={16} color={isCurrent ? "var(--role-success)" : "var(--text-secondary)"} />
        <span style={{ fontSize: "13px", color: isCurrent ? "var(--role-success)" : "var(--text-primary)" }}>
          {node.name}
        </span>
        {isCurrent && (
          <span style={{ fontSize: "11px", color: "var(--role-success)", marginLeft: "auto" }}>here</span>
        )}
      </div>

      {isExpanded &&
        children.map((child) => (
          <TreeNode key={child.nodeId} node={child} allNodes={allNodes} currentDirectoryId={currentDirectoryId} depth={depth + 1} />
        ))}
    </div>
  );
}
