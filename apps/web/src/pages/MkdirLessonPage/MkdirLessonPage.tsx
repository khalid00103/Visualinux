import { useEffect, useRef, useState } from "react";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import { TreeNode } from "../../components/filesystem/TreeNode.js";
import {
  LessonShell,
} from "../../components/lessons/LessonShell.js";
import {
  LessonTerminal,
  type LessonHistoryEntry,
} from "../../components/lessons/LessonTerminal.js";
import {
  buildInitialFilesystem,
  runMkdir,
} from "./localMkdirFilesystem.js";

export function MkdirLessonPage() {
  const initial = buildInitialFilesystem();

  const [nodes, setNodes] = useState<FilesystemNodeSummary[]>(initial.nodes);
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

    const result = runMkdir(
      input,
      nodes,
      currentDirectoryId,
    );

    setNodes(result.nodes);

    let output = result.message;

    if (result.success && result.createdName) {
      const children = result.nodes.filter(
        (node) => node.parentId === currentDirectoryId,
      );

      const names = children.map((node) => node.name);

      output = [
        result.message,
        "",
        "Visualized result:",
        "student",
        ...names.map((name, index) => {
          const prefix =
            index === names.length - 1
              ? "└── "
              : "├── ";

          return `${prefix}${name}`;
        }),
      ].join("\n");
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

    if (result.success && result.createdName) {
      const createdNode = result.nodes.find(
        (node) =>
          node.parentId === currentDirectoryId &&
          node.name === result.createdName,
      );

      if (createdNode) {
        if (highlightTimerRef.current !== null) {
          window.clearTimeout(highlightTimerRef.current);
        }

        if (highlightFrameRef.current !== null) {
          window.cancelAnimationFrame(highlightFrameRef.current);
        }

        setHighlightedNodeIds([]);

        highlightFrameRef.current = window.requestAnimationFrame(() => {
          setHighlightedNodeIds([createdNode.nodeId]);

          highlightTimerRef.current = window.setTimeout(() => {
            setHighlightedNodeIds([]);
            highlightTimerRef.current = null;
          }, 10_000);

          highlightFrameRef.current = null;
        });
      }

      if (result.createdName === "my-project") {
        setTaskComplete(true);
      }
    }
  }

  return (
    <LessonShell
      lessonNumber={1}
      title="mkdir — Create a directory"
      explanation={
        <>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            A <strong>directory</strong> (also called a folder)
            is a container used to organize files and other
            directories — just like folders on a desk keep
            papers organized.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            <code
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--role-accent)",
              }}
            >
              mkdir
            </code>{" "}
            stands for "make directory." It creates a brand
            new, empty directory.
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
              mkdir &lt;directory-name&gt;
            </code>{" "}
            — for example,{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>
              mkdir projects
            </code>{" "}
            creates a folder named "projects."
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> create a directory
          named <code>my-project</code>
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
          ✓ Great job! You created the directory:{" "}
          <strong>my-project</strong>
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