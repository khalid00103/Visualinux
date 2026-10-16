import {
  useRef,
  useState,
} from "react";
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
  runTouch,
} from "./localTouchFilesystem.js";
import { useFilesystemAnimationController } from "../../terminal/useFilesystemAnimationController.js";
import { createLessonAnimationPlan, formatVisualizedChildren } from "../../terminal/commandPresentation.js";
import { applyFilesystemAnimationPlan } from "../../terminal/useFilesystemAnimationController.js";

export function TouchLessonPage() {
  const navigate = useNavigate();
  const initial = buildInitialFilesystem();

  const [nodes, setNodes] = useState<
    FilesystemNodeSummary[]
  >(initial.nodes);

  const [currentDirectoryId] = useState(
    initial.studentId,
  );

  const [history, setHistory] = useState<
    LessonHistoryEntry[]
  >([]);

  const [draft, setDraft] = useState("");

  const [taskComplete, setTaskComplete] = useState(false);

  const { highlightedNodeIds, expandNodeIds, highlightNodes, expandNodes, resetAnimations } = useFilesystemAnimationController();
  const inputRef = useRef<HTMLInputElement>(null);

  const root = nodes.find(
    (node) => node.parentId === null,
  );

  function handleReset() {
    const fresh = buildInitialFilesystem();

    resetAnimations();
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

    const result = runTouch(
      input,
      nodes,
      currentDirectoryId,
    );

    setNodes(result.nodes);

    let output = result.message;

    if (
      result.success &&
      result.createdName
    ) {
      const createdNode = result.nodes.find(
        (node) =>
          node.parentId === currentDirectoryId &&
          node.name === result.createdName,
      );

      if (createdNode) {
        applyFilesystemAnimationPlan(
          createLessonAnimationPlan({ commandName: "touch", success: result.success, beforeNodes: nodes, afterNodes: result.nodes, currentDirectoryId, createdNodeId: createdNode.nodeId }),
          { highlightNodes, removeNodes: () => undefined, expandNodes },
        );
      }

      const children = result.nodes.filter(
        (node) =>
          node.parentId === currentDirectoryId,
      );

      const names = children.map(
        (node) => node.name,
      );

      output = formatVisualizedChildren(result.message, "student", names);

      if (result.success && result.createdName) {
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
      lessonNumber={2}
      title="touch — Create a file"
      explanation={
        <>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            A <strong>file</strong> is used to store
            information such as text, code, images,
            or other data.
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
              touch
            </code>{" "}
            creates a new empty file.
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
              touch &lt;file-name&gt;
            </code>{" "}
            — for example,{" "}
            <code
              style={{
                fontFamily: "var(--font-mono)",
              }}
            >
              touch hello.txt
            </code>{" "}
            creates an empty file named
            "hello.txt".
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> create a file
          named <code>hello.txt</code>
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
          ✓ Great job! You created the file:{" "}
          <strong>hello.txt</strong>
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
            expandNodeIds={expandNodeIds}
          //   highlightAnimationKey={
          //      highlightAnimationKey
          //  }
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
      onNext={() => navigate("/learn/pwd")}
    />
  );
}