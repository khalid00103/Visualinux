import { useEffect, useState } from "react";
import { TopNav } from "../../components/layout/TopNav.js";
import { FilesystemPanel } from "../../components/filesystem/FilesystemPanel.js";
import { TerminalPanel } from "../../components/terminal/TerminalPanel.js";
import { useAuthStore } from "../../store/authStore.js";
import { useSessionStore } from "../../store/sessionStore.js";
import { devApi } from "../../api/devApi.js";
import { filesystemApi } from "../../api/filesystemApi.js";

/**
 * TEMPORARY — Milestone 4's verification page for the flagship "type a
 * command, watch the filesystem react" loop. Practice Mode's real page
 * (Component Hierarchy §4) arrives in Milestone 6, backed by the real
 * get-or-create Practice API instead of the dev-only sandbox endpoint this
 * page uses. Delete this file and its route once that ships.
 */
export function DevTerminalPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const initializeSandbox = useSessionStore((s) => s.initializeSandbox);
  const sandboxId = useSessionStore((s) => s.sandboxId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || sandboxId) return;

    async function setup() {
      try {
        const sandbox = await devApi.createSandbox(accessToken!);
        const tree = await filesystemApi.getTree(accessToken!, sandbox.id);
        const root = tree.find((n) => n.parentId === null);
        if (!root) throw new Error("Sandbox has no root node.");
        initializeSandbox(sandbox.id, tree, root.nodeId);
      } catch {
        setError("Failed to initialize sandbox. Is the API running?");
      }
    }

    void setup();
  }, [accessToken, sandboxId, initializeSandbox]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopNav />
      <div style={{ padding: "var(--space-xl)" }}>
        <p style={{ fontSize: "12px", color: "var(--role-warning)", marginBottom: "var(--space-md)" }}>
          Milestone 4 verification page — not the real Practice Mode (Milestone 6).
        </p>
        {error && <p style={{ color: "var(--role-danger)" }}>{error}</p>}
      </div>
      {sandboxId && (
        <div style={{ display: "flex", gap: "var(--space-lg)", padding: "0 var(--space-xl) var(--space-xl)", flex: 1, minHeight: 0 }}>
          <FilesystemPanel />
          <TerminalPanel />
        </div>
      )}
    </div>
  );
}
