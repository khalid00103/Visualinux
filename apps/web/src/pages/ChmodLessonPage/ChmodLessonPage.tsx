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
  runChmod,
} from "./localChmodFilesystem.js";
import { useFilesystemAnimationController } from "../../terminal/useFilesystemAnimationController.js";
import { createLessonAnimationPlan } from "../../terminal/commandPresentation.js";
import { applyFilesystemAnimationPlan } from "../../terminal/useFilesystemAnimationController.js";

export function ChmodLessonPage() {
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
    const resetFilesystem = buildInitialFilesystem();

    setNodes(resetFilesystem.nodes);
    setHistory([]);
    setDraft("");
    setTaskComplete(false);
    resetAnimations();

    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const input = draft.trim();

    if (!input) {
      return;
    }

    const result = runChmod(
      input,
      nodes,
    );

    if (result.success) {
      setNodes(result.nodes);

      if (result.affectedNodeId) {
        applyFilesystemAnimationPlan(
          createLessonAnimationPlan({ commandName: "chmod", success: result.success, beforeNodes: nodes, afterNodes: result.nodes, currentDirectoryId, affectedNodeId: result.affectedNodeId }),
          { highlightNodes, removeNodes: () => undefined, expandNodes },
        );
      }

      if (
        input === "chmod +x script.sh"
      ) {
        setTaskComplete(true);
      }
    }

    setHistory((previous) => [
      ...previous,
      {
        input,
        output: result.message,
        success: result.success,
      },
    ]);

    setDraft("");
  }

  return (
    <LessonShell
      lessonNumber={16}
      title="chmod — Change file permissions"
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
              chmod
            </code>{" "}
            command changes the permissions of a file or
            directory.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            Permissions control whether a file can be read,
            written, or executed.
          </p>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              margin: "0 0 6px",
            }}
          >
            Examples:
          </p>

          <ul
            style={{
              fontSize: "13px",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              margin: 0,
              paddingLeft: "20px",
            }}
          >
            <li>
              <code>chmod +x script.sh</code> — add execute
              permission
            </li>
            <li>
              <code>chmod -x script.sh</code> — remove execute
              permission
            </li>
            <li>
              <code>chmod 644 notes.txt</code> — set standard
              file permissions
            </li>
            <li>
              <code>chmod 755 script.sh</code> — set executable
              permissions
            </li>
          </ul>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              margin: "8px 0 0",
            }}
          >
            Syntax:{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>
              chmod &lt;mode&gt; &lt;filename&gt;
            </code>
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> make{" "}
          <code>script.sh</code> executable using{" "}
          <code>chmod</code>.
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
          ✓ Great job! You changed the permissions of{" "}
          <strong>script.sh</strong> and made it executable.
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
      onNext={() => navigate("/learn/chown")}
    />
  );
}