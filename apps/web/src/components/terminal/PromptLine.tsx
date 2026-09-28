export interface PromptLineProps {
  currentPath: string;
}

export function PromptLine({ currentPath }: PromptLineProps) {
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
      <span style={{ color: "var(--role-accent)" }}>user@visualinux</span>
      <span style={{ color: "var(--text-muted)" }}>:{currentPath}$</span>
    </span>
  );
}
