import type { TerminalHistoryEntry } from "../../store/sessionStore.js";
import { PromptLine } from "./PromptLine.js";

export interface HistoryScrollbackProps {
  entries: TerminalHistoryEntry[];
  currentPath: string;
}

export function HistoryScrollback({ entries, currentPath }: HistoryScrollbackProps) {
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: 1.8 }}>
      {entries.map((entry, i) => (
        <div key={i} style={{ opacity: entry.isPending ? 0.6 : 1 }}>
          <div>
            <PromptLine currentPath={currentPath} /> <span style={{ color: "var(--text-primary)" }}>{entry.rawInput}</span>
          </div>
          {entry.outputText && (
            <div style={{ color: entry.success ? "var(--text-secondary)" : "var(--role-danger)", whiteSpace: "pre-wrap" }}>
              {entry.outputText}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
