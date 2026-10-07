import {
  useRef,
  useState,
} from "react";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { TreeNode } from "../../components/filesystem/TreeNode.js";
import { LessonShell } from "../../components/lessons/LessonShell.js";
import {
  LessonTerminal,
  type LessonHistoryEntry,
} from "../../components/lessons/LessonTerminal.js";
import {
  buildInitialFilesystem,
  runMan,
} from "./localManFilesystem.js";

export function ManLessonPage() {
  const initial = buildInitialFilesystem();

  const [nodes, setNodes] = useState<FilesystemNodeSummary[]>(
    initial.nodes,
  );

  const [currentDirectoryId] = useState(initial.studentId);
  const [history, setHistory] = useState<LessonHistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [taskComplete, setTaskComplete] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const root = nodes.find((node) => node.parentId === null);

  function handleReset() {
    const resetFilesystem = buildInitialFilesystem();

    setNodes(resetFilesystem.nodes);
    setHistory([]);
    setDraft("");
    setTaskComplete(false);

    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const input = draft.trim();

    if (!input) {
      return;
    }

    const result = runMan(
      input,
      nodes,
    );

    if (result.success) {
      setNodes(result.nodes);

      if (input === "man ls") {
        setTaskComplete(true);
      }
    }

    setHistory((previous) => [
      ...previous,
      {
        input,
        output: result.message,
        success: result.success,
      },
    ]);

    setDraft("");
  }

  return (
    <LessonShell
      lessonNumber={20}
      title="man — Read command manuals"
      explanation={
        <>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            The{" "}
            <code
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--role-accent)",
              }}
            >
              man
            </code>{" "}
            command displays the manual page for a Linux
            command.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            Manual pages help you learn what a command does,
            understand its syntax, and see examples.
          </p>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              margin: "0 0 6px",
            }}
          >
            Examples:
          </p>

          <ul
            style={{
              fontSize: "13px",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              margin: 0,
              paddingLeft: "20px",
            }}
          >
            <li>
              <code>man ls</code> — read the manual for{" "}
              <code>ls</code>
            </li>
            <li>
              <code>man pwd</code> — read the manual for{" "}
              <code>pwd</code>
            </li>
            <li>
              <code>man mkdir</code> — read the manual for{" "}
              <code>mkdir</code>
            </li>
          </ul>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              margin: "8px 0 0",
            }}
          >
            Syntax:{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>
              man &lt;command&gt;
            </code>
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> read the manual for the{" "}
          <code>ls</code> command.
        </>
      }
      taskComplete={taskComplete}
      completion={
        <p
          style={{
            margin: "0 0 12px",
            color: "var(--role-success)",
            fontSize: "14px",
          }}
        >
          ✓ Great job! You used <strong>man</strong> to discover
          how a Linux command works.
        </p>
      }
      filesystem={
        root ? (
          <TreeNode
            node={root}
            allNodes={nodes}
            currentDirectoryId={currentDirectoryId}
          />
        ) : null
      }
      terminal={
        <LessonTerminal
          history={history}
          promptPath="/home/student"
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={handleSubmit}
          inputRef={inputRef}
        />
      }
      onReset={handleReset}
      onNext={() => alert("Next lesson coming soon.")}
    />
  );
}