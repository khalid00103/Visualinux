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
import type {
  AutocompleteSuggestion,
  CommandDetail,
} from "@visualinux/shared-types";
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

  const [commandDetail, setCommandDetail] = useState<CommandDetail | null>(null);

  const normalizedDraft = draft.trimStart();
  const firstToken = normalizedDraft.split(/\s+/)[0] ?? "";
  const hasCommandSeparator = /\s/.test(normalizedDraft);

  const currentPath = computePath(nodes, currentDirectoryId);

  useEffect(() => {
    if (!firstToken || !accessToken || hasCommandSeparator) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;

    commandsApi
      .autocomplete(accessToken, firstToken)
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
  }, [firstToken, hasCommandSeparator, accessToken]);

  useEffect(() => {
    if (!firstToken || !accessToken || !hasCommandSeparator) {
      setCommandDetail(null);
      return;
    }

    let cancelled = false;
    setCommandDetail(null);

    commandsApi
      .getByName(accessToken, firstToken)
      .then((detail) => {
        if (!cancelled) {
          setCommandDetail(detail);
        }
      })
      .catch(() => {
        if (!cancelled) setCommandDetail(null);
      });

    return () => {
      cancelled = true;
    };
  }, [firstToken, hasCommandSeparator, accessToken]);

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

      {commandDetail &&
      commandDetail.name === firstToken &&
      hasCommandSeparator ? (
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <strong
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
              }}
            >
              {commandDetail.name}
            </strong>

            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              Command help
            </span>
          </div>

          {commandDetail.longDescription && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {commandDetail.longDescription}
            </p>
          )}

          <div style={{ fontSize: "12px" }}>
            <span style={{ color: "var(--text-muted)" }}>
              Example:{" "}
            </span>

            <code
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
              }}
            >
              {commandDetail.exampleUsage}
            </code>
          </div>

          {commandDetail.flags.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <strong
                style={{
                  fontSize: "12px",
                  color: "var(--text-primary)",
                }}
              >
                Available flags
              </strong>

              {commandDetail.flags.map((flag) => (
                <div
                  key={flag.flag}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "10px",
                    fontSize: "12px",
                  }}
                >
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--role-accent)",
                      flexShrink: 0,
                    }}
                  >
                    {flag.flag}
                  </code>

                  <span style={{ color: "var(--text-secondary)" }}>
                    {flag.description}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <AutocompleteDropdown
          suggestions={suggestions}
          highlightedIndex={highlightedIndex}
          onSelect={(name) => {
            setDraft(`${name} `);
            setSuggestions([]);
          }}
        />
      )}

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
