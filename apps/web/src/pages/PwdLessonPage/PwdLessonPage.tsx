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
  runPwd,
} from "./localPwdFilesystem.js";

export function PwdLessonPage() {
  const initial = buildInitialFilesystem();

  const [nodes] = useState<FilesystemNodeSummary[]>(
    initial.nodes,
  );

  const [currentDirectoryId] = useState(
    initial.studentId,
  );

  const [history, setHistory] = useState<
    LessonHistoryEntry[]
  >([]);

  const [draft, setDraft] = useState("");

  const [taskComplete, setTaskComplete] =
    useState(false);

  const [highlightedNodeIds, setHighlightedNodeIds] =
    useState<string[]>([]);

  const highlightTimerRef =
    useRef<number | null>(null);

  const highlightFrameRef =
    useRef<number | null>(null);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const root = nodes.find(
    (node) => node.parentId === null,
  );

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(
          highlightTimerRef.current,
        );
      }

      if (highlightFrameRef.current !== null) {
        window.cancelAnimationFrame(
          highlightFrameRef.current,
        );
      }
    };
  }, []);

  function getCurrentPath(
    directoryId: string,
  ): string {
    const pathParts: string[] = [];

    let current = nodes.find(
      (node) => node.nodeId === directoryId,
    );

    while (current) {
      if (current.name !== "/") {
        pathParts.unshift(current.name);
      }

      if (current.parentId === null) {
        break;
      }

      current = nodes.find(
        (node) => node.nodeId === current?.parentId,
      );
    }

    return `/${pathParts.join("/")}`;
  }

  const currentPath =
    getCurrentPath(currentDirectoryId);

  function handleReset() {
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(
        highlightTimerRef.current,
      );

      highlightTimerRef.current = null;
    }

    if (highlightFrameRef.current !== null) {
      window.cancelAnimationFrame(
        highlightFrameRef.current,
      );

      highlightFrameRef.current = null;
    }

    setHistory([]);
    setTaskComplete(false);
    setHighlightedNodeIds([]);
    setDraft("");

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

    const result = runPwd(
      input,
      nodes,
      currentDirectoryId,
    );

    let output = result.message;

    if (result.success) {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(
          highlightTimerRef.current,
        );
      }

      if (highlightFrameRef.current !== null) {
        window.cancelAnimationFrame(
          highlightFrameRef.current,
        );
      }

      setHighlightedNodeIds([]);

      highlightFrameRef.current =
        window.requestAnimationFrame(() => {
          setHighlightedNodeIds(
            result.pathNodeIds,
          );

          highlightTimerRef.current =
            window.setTimeout(() => {
              setHighlightedNodeIds([]);

              highlightTimerRef.current = null;
            }, 10_000);

          highlightFrameRef.current = null;
        });

      output = [
        result.message,
        "",
        "Visualized path:",
        result.currentPath,
      ].join("\n");

      if (
        result.currentPath ===
        "/home/student"
      ) {
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
      lessonNumber={5}
      title="pwd — Print working directory"
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
              pwd
            </code>{" "}
            command shows the full path of your
            current directory.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            It does not move you anywhere. It
            simply tells you where you are.
          </p>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            Syntax:{" "}
            <code
              style={{
                fontFamily: "var(--font-mono)",
              }}
            >
              pwd
            </code>
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> use{" "}
          <code>pwd</code> to find your current
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
          ✓ Great job! You found your current
          directory.
        </p>
      }
      filesystem={
        root ? (
          <TreeNode
            node={root}
            allNodes={nodes}
            currentDirectoryId={
              currentDirectoryId
            }
            highlightedNodeIds={
              highlightedNodeIds
            }
          />
        ) : null
      }
      terminal={
        <LessonTerminal
          history={history}
          promptPath={currentPath}
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={handleSubmit}
          inputRef={inputRef}
        />
      }
      onReset={handleReset}
      onNext={() =>
        alert("Next lesson coming soon.")
      }
    />
  );
}