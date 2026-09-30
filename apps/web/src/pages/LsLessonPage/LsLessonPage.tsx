import { useEffect, useRef, useState } from "react";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { TreeNode } from "../../components/filesystem/TreeNode.js";
import { LessonShell } from "../../components/lessons/LessonShell.js";
import {
  LessonTerminal,
  type LessonHistoryEntry,
} from "../../components/lessons/LessonTerminal.js";
import {
  buildInitialFilesystem,
  runLs,
} from "./localLsFilesystem.js";

export function LsLessonPage() {
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

  function handleReset() {
    const fresh = buildInitialFilesystem();

    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }

    if (highlightFrameRef.current !== null) {
      window.cancelAnimationFrame(highlightFrameRef.current);
      highlightFrameRef.current = null;
    }

    setNodes(fresh.nodes);
    setHistory([]);
    setTaskComplete(false);
    setHighlightedNodeIds([]);
    setDraft("");

    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const input = draft.trim();

    if (!input) {
      return;
    }

    const result = runLs(
      input,
      nodes,
      currentDirectoryId,
    );

    setNodes(result.nodes);

    let output = result.message;

    if (result.success && result.listedNames) {
      const childNodes = result.nodes.filter(
        (node) => node.parentId === currentDirectoryId,
      );

      const highlightedIds = childNodes.map(
        (node) => node.nodeId,
      );

      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }

      if (highlightFrameRef.current !== null) {
        window.cancelAnimationFrame(highlightFrameRef.current);
      }

      /*
      * Remove the current highlight first.
      * The next animation frame adds it again, which forces the CSS
      * animation to restart even if the learner presses `ls` repeatedly.
      */
      setHighlightedNodeIds([]);

      highlightFrameRef.current = window.requestAnimationFrame(() => {
        setHighlightedNodeIds(highlightedIds);

        highlightTimerRef.current = window.setTimeout(() => {
          setHighlightedNodeIds([]);
          highlightTimerRef.current = null;
        }, 10_000);

        highlightFrameRef.current = null;
      });

      const names = result.listedNames;

      output = [
        "student",
        ...names.map((name, index) => {
          const prefix =
            index === names.length - 1 ? "└── " : "├── ";

          return `${prefix}${name}`;
        }),
      ].join("\n");

      setTaskComplete(true);
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
      lessonNumber={2}
      title="ls — List directory contents"
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
              ls
            </code>{" "}
            command shows the files and directories inside
            your current directory.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            Think of it like opening a folder and looking at
            everything inside it.
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
              ls
            </code>
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> use{" "}
          <code>ls</code> to see what is inside the current
          directory.
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
          ✓ Great job! You used <strong>ls</strong> to list
          the directory contents.
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