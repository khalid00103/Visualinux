import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore.js";
import { useSessionStore } from "../../store/sessionStore.js";
import { useCommandExecutionOrchestrator } from "../../terminal/useCommandExecutionOrchestrator.js";
import { commandsApi } from "../../api/commandsApi.js";
import { PromptLine } from "./PromptLine.js";
import { CommandInput } from "./CommandInput.js";
import { AutocompleteDropdown } from "./AutocompleteDropdown.js";
import { HistoryScrollback } from "./HistoryScrollback.js";
import { DestructiveConfirmModal } from "./DestructiveConfirmModal.js";
import type { AutocompleteSuggestion } from "@visualinux/shared-types";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";

function computePath(nodes: FilesystemNodeSummary[], nodeId: string | null): string {
  if (!nodeId) return "~";
  const segments: string[] = [];
  let current = nodes.find((n) => n.nodeId === nodeId);
  while (current) {
    segments.unshift(current.name);
    const parentId: string | null = current.parentId;
    current = parentId ? nodes.find((n) => n.nodeId === parentId) : undefined;
  }
  return "/" + segments.join("/");
}

export function TerminalPanel() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { nodes, currentDirectoryId, history } = useSessionStore();
  const { execute, pendingConfirmation, confirmPending, cancelPending } = useCommandExecutionOrchestrator();

  const [draft, setDraft] = useState("");
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const currentPath = computePath(nodes, currentDirectoryId);

  useEffect(() => {
    const prefix = draft.trim().split(" ")[0];
    if (!prefix || !accessToken) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    commandsApi
      .autocomplete(accessToken, prefix)
      .then((results) => {
        if (!cancelled) {
          setSuggestions(results);
          setHighlightedIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [draft, accessToken]);

  function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setInputHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(null);
    setDraft("");
    setSuggestions([]);
    void execute(trimmed);
  }

  function handleHistoryNavigate(direction: "up" | "down") {
    if (inputHistory.length === 0) return;
    if (direction === "up") {
      const nextIndex = historyIndex === null ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setDraft(inputHistory[nextIndex]);
    } else {
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= inputHistory.length) {
        setHistoryIndex(null);
        setDraft("");
      } else {
        setHistoryIndex(nextIndex);
        setDraft(inputHistory[nextIndex]);
      }
    }
  }

  function handleTabComplete() {
    if (suggestions.length === 0) return;
    const chosen = suggestions[highlightedIndex]?.name ?? suggestions[0].name;
    const restOfInput = draft.trim().split(" ").slice(1).join(" ");
    setDraft(restOfInput ? `${chosen} ${restOfInput}` : `${chosen} `);
    setSuggestions([]);
  }

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-lg)",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
      }}
    >
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>Terminal</p>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <HistoryScrollback entries={history} currentPath={currentPath} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <PromptLine currentPath={currentPath} />
        <CommandInput
          value={draft}
          onChange={setDraft}
          onSubmit={handleSubmit}
          onHistoryNavigate={handleHistoryNavigate}
          onTabComplete={handleTabComplete}
        />
      </div>

      <AutocompleteDropdown
        suggestions={suggestions}
        highlightedIndex={highlightedIndex}
        onSelect={(name) => {
          setDraft(`${name} `);
          setSuggestions([]);
        }}
      />

      {pendingConfirmation && (
        <DestructiveConfirmModal
          rawInput={pendingConfirmation.rawInput}
          consequenceMessage={pendingConfirmation.consequenceMessage}
          onConfirm={confirmPending}
          onCancel={cancelPending}
        />
      )}
    </div>
  );
}
