import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Design System §8 content card. Never nests more than one level deep. */
export function Card({ children, style, ...rest }: CardProps) {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-lg)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
