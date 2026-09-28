import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
  primary: {
    background: "var(--role-accent)",
    color: "#ffffff",
    border: "1px solid transparent",
  },
  secondary: {
    background: "transparent",
    color: "var(--text-primary)",
    border: "1px solid var(--border-strong)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid transparent",
  },
  destructive: {
    background: "transparent",
    color: "var(--role-warning)",
    border: "1px solid var(--role-warning)",
  },
};

const SIZE_STYLES: Record<NonNullable<ButtonProps["size"]>, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: "13px" },
  md: { padding: "10px 16px", fontSize: "14px" },
  lg: { padding: "14px 24px", fontSize: "16px" },
};

/**
 * Design System §7: at most one `primary` button per screen. This is a design
 * discipline the component itself can't enforce, but it's the reason `primary`
 * isn't the default variant — a caller has to choose it deliberately.
 */
export function Button({
  variant = "secondary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      style={{
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        cursor: disabled || isLoading ? "not-allowed" : "pointer",
        opacity: disabled || isLoading ? 0.6 : 1,
        transition: `opacity var(--duration-fast) var(--ease-standard)`,
        ...style,
      }}
      {...rest}
    >
      {isLoading ? "…" : children}
    </button>
  );
}
