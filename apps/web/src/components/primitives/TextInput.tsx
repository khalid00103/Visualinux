import type { InputHTMLAttributes } from "react";
import { useId } from "react";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Design System §12: labels sit above the field, never as placeholder-only text
 * (which disappears exactly when a user most needs to confirm what a field is).
 */
export function TextInput({ label, error, id, style, ...rest }: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        htmlFor={inputId}
        style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "left" }}
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${error ? "var(--role-danger)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          color: "var(--text-primary)",
          padding: "10px 12px",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          ...style,
        }}
        {...rest}
      />
      {error && (
        <span id={`${inputId}-error`} style={{ fontSize: "12px", color: "var(--role-danger)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
