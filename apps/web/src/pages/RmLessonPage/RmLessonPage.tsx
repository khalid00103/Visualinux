import { useLessonProgressSync } from "../../hooks/useLessonProgressSync.js";
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
  runRm,
} from "./localRmFilesystem.js";
import { useFilesystemAnimationController } from "../../terminal/useFilesystemAnimationController.js";
import { createLessonAnimationPlan, formatRemovalExplanation } from "../../terminal/commandPresentation.js";
import { applyFilesystemAnimationPlan } from "../../terminal/useFilesystemAnimationController.js";

export function RmLessonPage() {
  const navigate = useNavigate();
  const initial = buildInitialFilesystem();

  const [nodes, setNodes] =
    useState<FilesystemNodeSummary[]>(
      initial.nodes,
    );

  const [currentDirectoryId] =
    useState(initial.studentId);

  const [history, setHistory] = useState<
    LessonHistoryEntry[]
  >([]);

  const [draft, setDraft] = useState("");

  const [taskComplete, setTaskComplete] =
    useState(false);
  useLessonProgressSync("rm", taskComplete);

  const {
    highlightedNodeIds,
    removingNodeIds,
    expandNodeIds,
    removeNodes,
    expandNodes,
    resetAnimations,
  } = useFilesystemAnimationController();

  const inputRef = useRef<HTMLInputElement>(null);
  const root = nodes.find((node) => node.parentId === null);

  function handleReset() {
    resetAnimations();
    const fresh = buildInitialFilesystem();

    setNodes(fresh.nodes);
    setHistory([]);
    setTaskComplete(false);
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

    const result = runRm(
      input,
      nodes,
      currentDirectoryId,
    );

    let output = result.message;

    if (
      result.success &&
      result.removedNodeId &&
      result.removedName
    ) {
      const removedNodeId =
        result.removedNodeId;

      const removedName =
        result.removedName;

      const animationPlan = createLessonAnimationPlan({
        commandName: "rm", success: result.success, beforeNodes: nodes, afterNodes: result.nodes,
        currentDirectoryId, removedNodeId,
      });
      applyFilesystemAnimationPlan(
        animationPlan,
        { highlightNodes: () => undefined, removeNodes, expandNodes },
        (removedIds) => setNodes((current) => current.filter((node) => !removedIds.includes(node.nodeId))),
      );

      output = formatRemovalExplanation(result.message, removedName);

      if (removedName === "notes.txt") {
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
      lessonNumber={6}
      title="rm — Remove a file"
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
              rm
            </code>{" "}
            command removes a file from the
            current directory.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            Be careful: removing a file changes
            the filesystem.
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
              rm &lt;file&gt;
            </code>
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> remove{" "}
          <code>notes.txt</code>
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
          ✓ Great job! You removed the{" "}
          <strong>notes.txt</strong> file.
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
            removingNodeIds={
              removingNodeIds
            }
             expandNodeIds={
              expandNodeIds
            }
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
      onNext={() =>
        navigate("/learn/chmod")
      }
    />
  );
}
