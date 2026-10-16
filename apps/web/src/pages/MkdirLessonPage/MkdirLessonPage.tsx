import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useFilesystemAnimationController } from "../../terminal/useFilesystemAnimationController.js";
import { createLessonAnimationPlan, formatVisualizedChildren } from "../../terminal/commandPresentation.js";
import { applyFilesystemAnimationPlan } from "../../terminal/useFilesystemAnimationController.js";


import { completeLesson } from "../../api/learning.js";
import { useAuthStore } from "../../store/authStore.js";


export function MkdirLessonPage() {
  const navigate = useNavigate();
  
  const accessToken = useAuthStore((state) => state.accessToken);

  const initial = buildInitialFilesystem();

  const [nodes, setNodes] = useState<FilesystemNodeSummary[]>(initial.nodes);
  const [currentDirectoryId] = useState(initial.studentId);
  const [history, setHistory] = useState<LessonHistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [taskComplete, setTaskComplete] = useState(false);

  
  const [completionSaveStatus, setCompletionSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");


  const { highlightedNodeIds, expandNodeIds, highlightNodes, expandNodes, resetAnimations } = useFilesystemAnimationController();

  const inputRef = useRef<HTMLInputElement>(null);

  const root = nodes.find((node) => node.parentId === null);

  function handleReset() {
    const fresh = buildInitialFilesystem();

    resetAnimations();
    setNodes(fresh.nodes);
    setHistory([]);
    setTaskComplete(false);
    setCompletionSaveStatus("idle");
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

      output = formatVisualizedChildren(result.message, "student", names);
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
        applyFilesystemAnimationPlan(
          createLessonAnimationPlan({ commandName: "mkdir", success: result.success, beforeNodes: nodes, afterNodes: result.nodes, currentDirectoryId, createdNodeId: createdNode.nodeId }),
          { highlightNodes, removeNodes: () => undefined, expandNodes },
        );
      }

      if (result.success && result.createdName === "my-project") {
        setTaskComplete(true);

        if (!accessToken) {
          setCompletionSaveStatus("error");
        } else {
          setCompletionSaveStatus("saving");

          void completeLesson("mkdir", accessToken)
            .then(() => {
              setCompletionSaveStatus("saved");
            })
            .catch((error: unknown) => {
              console.error(
                "Failed to save mkdir lesson completion:",
                error,
              );
              setCompletionSaveStatus("error");
            });
        }
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
        <>
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

          {completionSaveStatus === "saving" && (
            <p role="status">Saving your progress...</p>
          )}

          {completionSaveStatus === "saved" && (
            <p role="status">Your lesson progress has been saved.</p>
          )}

          {completionSaveStatus === "error" && (
            <p role="alert">
              Your lesson is complete, but we couldn't save your progress.
              Please check your login and try again.
            </p>
          )}
        </>
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
      onNext={() => navigate("/learn/ls")}
    />
  );
}