import type { CSSProperties, ReactNode } from "react";

interface LessonShellProps {
  lessonNumber: number;
  title: string;
  explanation: ReactNode;
  task: ReactNode;
  taskComplete: boolean;
  completion: ReactNode;
  filesystem: ReactNode;
  terminal: ReactNode;
  onReset: () => void;
  onNext?: () => void;
}

export function LessonShell({
  lessonNumber,
  title,
  explanation,
  task,
  taskComplete,
  completion,
  filesystem,
  terminal,
  onReset,
  onNext,
}: LessonShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "var(--space-xl)",
        maxWidth: "960px",
        margin: "0 auto",
      }}
    >
      <p
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
        }}
      >
        Lesson {lessonNumber}
      </p>

      <h1
        style={{
          fontSize: "22px",
          fontWeight: 500,
          marginTop: "4px",
        }}
      >
        {title}
      </h1>

      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-lg)",
          marginBottom: "var(--space-lg)",
        }}
      >
        {explanation}
      </div>

      {!taskComplete && (
        <div
          style={{
            background: "var(--role-accent)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md) var(--space-lg)",
            marginBottom: "var(--space-lg)",
            fontSize: "14px",
          }}
        >
          {task}
        </div>
      )}

      {taskComplete && (
        <div
          style={{
            background: "var(--role-success-bg)",
            border: "1px solid var(--role-success)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md) var(--space-lg)",
            marginBottom: "var(--space-lg)",
          }}
        >
          {completion}

          <div
            style={{
              display: "flex",
              gap: "var(--space-md)",
            }}
          >
            <button onClick={onReset} style={buttonStyle(false)}>
              Practice Again
            </button>

            {onNext && (
              <button onClick={onNext} style={buttonStyle(true)}>
                Next Command →
              </button>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1 1 260px",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-lg)",
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

          {filesystem}
        </div>

        {terminal}
      </div>

      <div style={{ marginTop: "var(--space-lg)" }}>
        <button onClick={onReset} style={buttonStyle(false)}>
          Reset
        </button>
      </div>
    </div>
  );
}

function buttonStyle(primary: boolean): CSSProperties {
  return {
    background: primary ? "var(--role-accent)" : "transparent",
    color: primary ? "#fff" : "var(--text-primary)",
    border: primary
      ? "1px solid transparent"
      : "1px solid var(--border-strong)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 16px",
    fontSize: "14px",
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
  };
}