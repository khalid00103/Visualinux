import { useSessionStore } from "../../store/sessionStore.js";
import { TreeNode } from "./TreeNode.js";

export function FilesystemPanel() {
  const nodes = useSessionStore((s) => s.nodes);
  const currentDirectoryId = useSessionStore((s) => s.currentDirectoryId);

  const root = nodes.find((n) => n.parentId === null);

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
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 12px" }}>Filesystem</p>
      {root ? (
        <TreeNode node={root} allNodes={nodes} currentDirectoryId={currentDirectoryId} />
      ) : (
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading filesystem…</p>
      )}
    </div>
  );
}
