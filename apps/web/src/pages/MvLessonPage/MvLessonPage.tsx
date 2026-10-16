
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useFilesystemAnimationController } from "../../terminal/useFilesystemAnimationController.js";
import { createLessonAnimationPlan, formatMoveExplanation } from "../../terminal/commandPresentation.js";
import { applyFilesystemAnimationPlan } from "../../terminal/useFilesystemAnimationController.js";

export function MvLessonPage() {
  const navigate = useNavigate();
  const initial = buildInitialFilesystem();

  const [nodes, setNodes] = useState<FilesystemNodeSummary[]>(
    initial.nodes,
  );

  const [currentDirectoryId] = useState(initial.studentId);
  const [history, setHistory] = useState<LessonHistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [taskComplete, setTaskComplete] = useState(false);
  const { highlightedNodeIds, expandNodeIds, highlightNodes, expandNodes, resetAnimations } = useFilesystemAnimationController();
  const inputRef = useRef<HTMLInputElement>(null);

  const root = nodes.find((node) => node.parentId === null);

  function handleReset() {
    resetAnimations();

    const fresh = buildInitialFilesystem();

    setNodes(fresh.nodes);
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

    const result = runMv(input, nodes, currentDirectoryId);
    let output = result.message;

    if (
      result.success &&
      result.affectedNodeId &&
      result.affectedName &&
      result.action
    ) {
      setNodes(result.nodes);

      applyFilesystemAnimationPlan(
        createLessonAnimationPlan({ commandName: "mv", success: result.success, beforeNodes: nodes, afterNodes: result.nodes, currentDirectoryId, affectedNodeId: result.affectedNodeId }),
        { highlightNodes, removeNodes: () => undefined, expandNodes },
      );

      if (result.action === "rename") {
        output = formatMoveExplanation(result.message, "rename", result.affectedName);
      } else {
        output = formatMoveExplanation(result.message, "move", result.affectedName);
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
      onNext={() => navigate("/learn/rm")}
    />
  );
}
