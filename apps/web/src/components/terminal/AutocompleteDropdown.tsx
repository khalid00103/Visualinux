import type { AutocompleteSuggestion } from "@visualinux/shared-types";

export interface AutocompleteDropdownProps {
  suggestions: AutocompleteSuggestion[];
  highlightedIndex: number;
  onSelect: (name: string) => void;
}

export function AutocompleteDropdown({ suggestions, highlightedIndex, onSelect }: AutocompleteDropdownProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--surface-3)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-md)",
        marginTop: "6px",
        overflow: "hidden",
      }}
    >
      {suggestions.map((s, i) => (
        <div
          key={s.name}
          onClick={() => onSelect(s.name)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            padding: "8px 12px",
            background: i === highlightedIndex ? "var(--surface-2)" : "transparent",
            cursor: "pointer",
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 500, minWidth: "70px" }}>
            {s.name}
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", flex: 1 }}>{s.shortDescription}</span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-pill)",
              padding: "2px 8px",
            }}
          >
            {s.difficulty}
          </span>
        </div>
      ))}
    </div>
  );
}
