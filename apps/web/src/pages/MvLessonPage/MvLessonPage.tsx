
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
  runMv,
} from "./localMvFilesystem.js";

export function MvLessonPage() {
  const initial = buildInitialFilesystem();

  const [nodes, setNodes] = useState<FilesystemNodeSummary[]>(
    initial.nodes,
  );

  const [currentDirectoryId] = useState(initial.studentId);
  const [history, setHistory] = useState<LessonHistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [taskComplete, setTaskComplete] = useState(false);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);

  const [expandNodeIds, setExpandNodeIds] = useState<string[]>([]);

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
    setExpandNodeIds([]);

    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const input = draft.trim();

    if (!input) {
      return;
    }

    const result = runMv(input, nodes, currentDirectoryId);
    let output = result.message;

    if (
      result.success &&
      result.affectedNodeId &&
      result.affectedName &&
      result.action
    ) {
      clearHighlightTimers();

      setNodes(result.nodes);
      setHighlightedNodeIds([]);

        const affectedNode = result.nodes.find(
            (node) => node.nodeId === result.affectedNodeId,
        );

        const parentIdsToExpand = [
            currentDirectoryId,
            affectedNode?.parentId,
        ].filter((id): id is string => id !== null && id !== undefined);

        setExpandNodeIds([...new Set(parentIdsToExpand)]);

      highlightFrameRef.current = window.requestAnimationFrame(() => {
        setHighlightedNodeIds([result.affectedNodeId!]);

        highlightTimerRef.current = window.setTimeout(() => {
          setHighlightedNodeIds([]);
          highlightTimerRef.current = null;
        }, 10_000);

        highlightFrameRef.current = null;
      });

      if (result.action === "rename") {
        output = [
          result.message,
          "",
          "Visualized result:",
          `New name: ${result.affectedName}`,
          "The file keeps its identity and contents.",
        ].join("\n");
      } else {
        output = [
          result.message,
          "",
          "Visualized result:",
          `Moved item: ${result.affectedName}`,
          "The item now belongs to the destination directory.",
        ].join("\n");
      }

      // The lesson task is to move notes.txt into documents/.
      if (
        result.action === "move" &&
        result.affectedName === "notes.txt" &&
        result.nodes.some(
          (node) =>
            node.nodeId === result.affectedNodeId &&
            node.parentId === initial.documentsId,
        )
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
      lessonNumber={8}
      title="mv — Move and rename"
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
              mv
            </code>{" "}
            command moves a file or directory to another location,
            or renames it.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            To rename a file, provide a new name. To move a file,
            provide the name of an existing destination directory.
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
              mv &lt;source&gt; &lt;destination&gt;
            </code>
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> move{" "}
          <code>notes.txt</code> into the{" "}
          <code>documents</code> directory.
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
          ✓ Great job! <strong>notes.txt</strong> is now inside{" "}
          <strong>documents/</strong>.
        </p>
      }
      filesystem={
        root ? (
          <TreeNode
            node={root}
            allNodes={nodes}
            currentDirectoryId={currentDirectoryId}
            highlightedNodeIds={highlightedNodeIds}
            expandNodeIds={expandNodeIds}
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
