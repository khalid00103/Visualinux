import { useEffect, useState } from "react";
import { TopNav } from "../../components/layout/TopNav.js";
import { FilesystemPanel } from "../../components/filesystem/FilesystemPanel.js";
import { TerminalPanel } from "../../components/terminal/TerminalPanel.js";
import { useAuthStore } from "../../store/authStore.js";
import { useSessionStore } from "../../store/sessionStore.js";
import { practiceApi } from "../../api/practiceApi.js";
import { filesystemApi } from "../../api/filesystemApi.js";

export function PracticePage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const initializeSandbox = useSessionStore((s) => s.initializeSandbox);
  const sandboxId = useSessionStore((s) => s.sandboxId);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || sandboxId) {
      if (!sandboxId) setLoading(false);
      return;
    }

    let cancelled = false;

    async function setup() {
      try {
        setLoading(true);
        setError(null);

        const sandbox = await practiceApi.getOrCreateSandbox(accessToken!);
        const tree = await filesystemApi.getTree(accessToken!, sandbox.id);

        if (cancelled) return;

        initializeSandbox(
          sandbox.id,
          tree,
          sandbox.currentDirectoryId
        );
      } catch {
        if (!cancelled) {
          setError("Failed to initialize Practice Mode. Is the API running?");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;
    };
  }, [accessToken, sandboxId, initializeSandbox]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <TopNav />

      <div
        style={{
          padding: "var(--space-xl)",
          paddingBottom: "var(--space-md)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 500,
          }}
        >
          Practice Linux
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            color: "var(--text-secondary)",
            fontSize: "13px",
          }}
        >
          Practice commands freely in your own Linux sandbox.
        </p>
      </div>

      {error && (
        <div style={{ padding: "0 var(--space-xl) var(--space-md)" }}>
          <p style={{ color: "var(--role-danger)", margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {loading && !sandboxId && !error && (
        <div style={{ padding: "0 var(--space-xl)" }}>
          <p style={{ color: "var(--text-secondary)" }}>
            Preparing your Practice sandbox…
          </p>
        </div>
      )}

      {sandboxId && (
        <div
          style={{
            display: "flex",
            gap: "var(--space-lg)",
            padding: "0 var(--space-xl) var(--space-xl)",
            flex: 1,
            minHeight: 0,
          }}
        >
          <FilesystemPanel />
          <TerminalPanel />
        </div>
      )}
    </div>
  );
}