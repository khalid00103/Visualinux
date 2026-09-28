import { useRef, type KeyboardEvent } from "react";

export interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onHistoryNavigate: (direction: "up" | "down") => void;
  onTabComplete: () => void;
}

export function CommandInput({ value, onChange, onSubmit, onHistoryNavigate, onTabComplete }: CommandInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onHistoryNavigate("up");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onHistoryNavigate("down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      onTabComplete();
    }
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
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
  );
}
