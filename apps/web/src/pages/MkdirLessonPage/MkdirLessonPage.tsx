import { useRef, useState } from "react";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { TreeNode } from "../../components/filesystem/TreeNode.js";
import { buildInitialFilesystem, runMkdir } from "./localMkdirFilesystem.js";

interface HistoryEntry {
  input: string;
  output: string;
  success: boolean;
}

/**
 * Standalone, public, frontend-only lesson screen. Deliberately does not use
 * useSessionStore, TerminalPanel, FilesystemPanel, useCommandExecutionOrchestrator,
 * commandsApi, or any authenticated/backend-dependent architecture — this page
 * must render and function with zero login, zero API, zero database.
 */
export function MkdirLessonPage() {
  const initial = buildInitialFilesystem();
  const [nodes, setNodes] = useState<FilesystemNodeSummary[]>(initial.nodes);
  const [currentDirectoryId] = useState(initial.studentId);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [taskComplete, setTaskComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const root = nodes.find((n) => n.parentId === null);

  function handleReset() {
    const fresh = buildInitialFilesystem();
    setNodes(fresh.nodes);
    setHistory([]);
    setTaskComplete(false);
    setDraft("");
    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = draft.trim();
    if (!input) return;

    const result = runMkdir(input, nodes, currentDirectoryId);
    setNodes(result.nodes);
    setHistory((prev) => [...prev, { input, output: result.message, success: result.success }]);
    setDraft("");

    if (result.success && result.createdName === "my-project") {
      setTaskComplete(true);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "var(--space-xl)", maxWidth: "960px", margin: "0 auto" }}>
      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Lesson 1</p>
      <h1 style={{ fontSize: "22px", fontWeight: 500, marginTop: "4px" }}>mkdir — Create a directory</h1>

      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-lg)", marginBottom: "var(--space-lg)" }}>
        <p style={{ fontSize: "14px", lineHeight: 1.6, margin: "0 0 8px" }}>
          A <strong>directory</strong> (also called a folder) is a container used to organize files and other
          directories — just like folders on a desk keep papers organized.
        </p>
        <p style={{ fontSize: "14px", lineHeight: 1.6, margin: "0 0 8px" }}>
          <code style={{ fontFamily: "var(--font-mono)", color: "var(--role-accent)" }}>mkdir</code> stands for
          "make directory." It creates a brand new, empty directory.
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
          Syntax: <code style={{ fontFamily: "var(--font-mono)" }}>mkdir &lt;directory-name&gt;</code> — for
          example, <code style={{ fontFamily: "var(--font-mono)" }}>mkdir projects</code> creates a folder named
          "projects."
        </p>
      </div>

      {!taskComplete && (
        <div style={{ background: "var(--role-accent)", color: "#fff", borderRadius: "var(--radius-md)", padding: "var(--space-md) var(--space-lg)", marginBottom: "var(--space-lg)", fontSize: "14px" }}>
          <strong>Your turn:</strong> create a directory named <code>my-project</code>
        </div>
      )}

      {taskComplete && (
        <div style={{ background: "var(--role-success-bg)", border: "1px solid var(--role-success)", borderRadius: "var(--radius-md)", padding: "var(--space-md) var(--space-lg)", marginBottom: "var(--space-lg)" }}>
          <p style={{ margin: "0 0 12px", color: "var(--role-success)", fontSize: "14px" }}>
            ✓ Great job! You created the directory: <strong>my-project</strong>
          </p>
          <div style={{ display: "flex", gap: "var(--space-md)" }}>
            <button onClick={handleReset} style={buttonStyle(false)}>
              Practice Again
            </button>
            <button onClick={() => alert("Next lesson coming soon.")} style={buttonStyle(true)}>
              Next Command →
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-lg)" }}>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 12px" }}>Filesystem</p>
          {root && <TreeNode node={root} allNodes={nodes} currentDirectoryId={currentDirectoryId} />}
        </div>

        <div style={{ flex: "1 1 340px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>Terminal</p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: 1.8, minHeight: "120px" }}>
            {history.map((h, i) => (
              <div key={i}>
                <div>
                  <span style={{ color: "var(--role-accent)" }}>student@visualinux</span>
                  <span style={{ color: "var(--text-muted)" }}>:/home/student$</span> {h.input}
                </div>
                <div style={{ color: h.success ? "var(--text-secondary)" : "var(--role-danger)" }}>{h.output}</div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
              <span style={{ color: "var(--role-accent)" }}>student@visualinux</span>
              <span style={{ color: "var(--text-muted)" }}>:/home/student$</span>
            </span>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                flex: 1,
              }}
            />
          </form>
        </div>
      </div>

      <div style={{ marginTop: "var(--space-lg)" }}>
        <button onClick={handleReset} style={buttonStyle(false)}>
          Reset
        </button>
      </div>
    </div>
  );
}

function buttonStyle(primary: boolean): React.CSSProperties {
  return {
    background: primary ? "var(--role-accent)" : "transparent",
    color: primary ? "#fff" : "var(--text-primary)",
    border: primary ? "1px solid transparent" : "1px solid var(--border-strong)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 16px",
    fontSize: "14px",
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
  };
}
