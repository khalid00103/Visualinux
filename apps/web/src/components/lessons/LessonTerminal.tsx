import type { FormEventHandler, RefObject } from "react";

export interface LessonHistoryEntry {
  input: string;
  output: string;
  success: boolean;
}

interface LessonTerminalProps {
  history: LessonHistoryEntry[];
  promptPath: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  inputRef: RefObject<HTMLInputElement>;
}

export function LessonTerminal({
  history,
  promptPath,
  draft,
  onDraftChange,
  onSubmit,
  inputRef,
}: LessonTerminalProps) {
  return (
    <div
      style={{
        flex: "1 1 340px",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
      }}
    >
      <p
        style={{
          fontSize: "13px",
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        Terminal
      </p>

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          lineHeight: 1.8,
          minHeight: "120px",
        }}
      >
        {history.map((entry, index) => (
          <div key={index}>
            <div>
              <span style={{ color: "var(--role-accent)" }}>
                student@visualinux
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                :{promptPath}$
              </span>{" "}
              {entry.input}
            </div>

            <div
              style={{
                color: entry.success
                  ? "var(--text-secondary)"
                  : "var(--role-danger)",
                whiteSpace: "pre",
              }}
            >
              {entry.output}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
        >
          <span style={{ color: "var(--role-accent)" }}>
            student@visualinux
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            :{promptPath}$
          </span>
        </span>

        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
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
  );
}