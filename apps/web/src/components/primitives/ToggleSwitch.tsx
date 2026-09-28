import { useId } from "react";

export interface ToggleSwitchProps {
  label: string;
  isOn: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}

/** Design System §12 toggle switch — used for boolean settings (notification opt-in, etc.). */
export function ToggleSwitch({ label, isOn, onToggle, disabled }: ToggleSwitchProps) {
  const id = useId();

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)" }}>
      <label htmlFor={id} style={{ fontSize: "14px", color: "var(--text-primary)" }}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={isOn}
        disabled={disabled}
        onClick={() => onToggle(!isOn)}
        style={{
          width: "40px",
          height: "22px",
          borderRadius: "var(--radius-pill)",
          border: "none",
          background: isOn ? "var(--role-accent)" : "var(--border-strong)",
          position: "relative",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: `background var(--duration-fast) var(--ease-standard)`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "3px",
            left: isOn ? "21px" : "3px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#ffffff",
            transition: `left var(--duration-fast) var(--ease-standard)`,
          }}
        />
      </button>
    </div>
  );
}
