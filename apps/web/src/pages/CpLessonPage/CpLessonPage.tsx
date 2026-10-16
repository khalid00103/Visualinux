
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
  runCp,
} from "./localCpFilesystem.js";
import { useFilesystemAnimationController } from "../../terminal/useFilesystemAnimationController.js";
import { createLessonAnimationPlan, formatCopyExplanation } from "../../terminal/commandPresentation.js";
import { applyFilesystemAnimationPlan } from "../../terminal/useFilesystemAnimationController.js";

export function CpLessonPage() {
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
      setNodes(result.nodes);
      applyFilesystemAnimationPlan(
        createLessonAnimationPlan({ commandName: "cp", success: result.success, beforeNodes: nodes, afterNodes: result.nodes, currentDirectoryId, createdNodeId: result.createdNodeId }),
        { highlightNodes, removeNodes: () => undefined, expandNodes },
      );

      output = formatCopyExplanation("notes.txt", result.createdName);

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
      onNext={() => navigate("/learn/mv")}
    />
  );
}
