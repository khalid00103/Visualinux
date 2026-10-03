
import {
  useEffect,
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
  runCp,
} from "./localCpFilesystem.js";

export function CpLessonPage() {
  const initial = buildInitialFilesystem();

  const [nodes, setNodes] = useState<FilesystemNodeSummary[]>(
    initial.nodes,
  );

  const [currentDirectoryId] = useState(initial.studentId);

  const [history, setHistory] = useState<LessonHistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [taskComplete, setTaskComplete] = useState(false);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);

  const highlightTimerRef = useRef<number | null>(null);
  const highlightFrameRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const root = nodes.find((node) => node.parentId === null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }

      if (highlightFrameRef.current !== null) {
        window.cancelAnimationFrame(highlightFrameRef.current);
      }
    };
  }, []);

  function clearHighlightTimers() {
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }

    if (highlightFrameRef.current !== null) {
      window.cancelAnimationFrame(highlightFrameRef.current);
      highlightFrameRef.current = null;
    }
  }

  function handleReset() {
    clearHighlightTimers();

    const fresh = buildInitialFilesystem();

    setNodes(fresh.nodes);
    setHistory([]);
    setDraft("");
    setTaskComplete(false);
    setHighlightedNodeIds([]);

    inputRef.current?.focus();
  }

  function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    const input = draft.trim();

    if (!input) {
      return;
    }

    const result = runCp(input, nodes, currentDirectoryId);

    let output = result.message;

    if (
      result.success &&
      result.createdNodeId &&
      result.createdName
    ) {
      clearHighlightTimers();

      setNodes(result.nodes);
      setHighlightedNodeIds([]);

      highlightFrameRef.current = window.requestAnimationFrame(() => {
        setHighlightedNodeIds([result.createdNodeId!]);

        highlightTimerRef.current = window.setTimeout(() => {
          setHighlightedNodeIds([]);
          highlightTimerRef.current = null;
        }, 10_000);

        highlightFrameRef.current = null;
      });

      output = [
        result.message,
        "",
        "Visualized result:",
        `Original: notes.txt`,
        `New copy: ${result.createdName}`,
        "The original file remains unchanged.",
      ].join("\n");

      if (result.createdName === "backup.txt") {
        setTaskComplete(true);
      }
    }

    setHistory((previous) => [
      ...previous,
      {
        input,
        output,
        success: result.success,
      },
    ]);

    setDraft("");
  }

  return (
    <LessonShell
      lessonNumber={7}
      title="cp — Copy a file"
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
              cp
            </code>{" "}
            command copies a file. The original stays in place,
            and a separate file is created.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            In this lesson, copy a file to a new name in the
            same directory. Existing files cannot be overwritten.
          </p>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            Syntax:{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>
              cp &lt;source-file&gt; &lt;new-file-name&gt;
            </code>
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> copy{" "}
          <code>notes.txt</code> to{" "}
          <code>backup.txt</code>
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
          ✓ Great job! You created <strong>backup.txt</strong>.
          The original <strong>notes.txt</strong> remains.
        </p>
      }
      filesystem={
        root ? (
          <TreeNode
            node={root}
            allNodes={nodes}
            currentDirectoryId={currentDirectoryId}
            highlightedNodeIds={highlightedNodeIds}
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
