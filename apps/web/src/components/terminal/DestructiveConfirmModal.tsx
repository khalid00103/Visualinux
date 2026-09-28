import { IconAlertTriangle } from "@tabler/icons-react";
import { Button } from "../primitives/Button.js";

export interface DestructiveConfirmModalProps {
  rawInput: string;
  consequenceMessage: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Design System §9: clicking outside or pressing Esc must count as Cancel,
 * never as Confirm — an accidental dismissal must never accidentally execute
 * the destructive action. There is deliberately no "click outside to close"
 * handler wired to onConfirm anywhere in this component.
 */
export function DestructiveConfirmModal({ rawInput, consequenceMessage, onConfirm, onCancel }: DestructiveConfirmModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="destructive-confirm-title"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface-3)",
          border: "1px solid var(--role-warning)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl)",
          maxWidth: "420px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
          <IconAlertTriangle size={20} color="var(--role-warning)" />
          <h2 id="destructive-confirm-title" style={{ fontSize: "16px", fontWeight: 500, margin: 0 }}>
            This can't be undone
          </h2>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 8px" }}>
          {rawInput}
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 var(--space-lg)" }}>
          {consequenceMessage}
        </p>
        <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete anyway
          </Button>
        </div>
      </div>
    </div>
  );
}
