import {
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
  runWhoami,
} from "./localWhoamiFilesystem.js";

export function WhoamiLessonPage() {
  const initial = buildInitialFilesystem();

  const [nodes, setNodes] = useState<FilesystemNodeSummary[]>(
    initial.nodes,
  );

  const [currentDirectoryId] = useState(initial.studentId);
  const [history, setHistory] = useState<LessonHistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [taskComplete, setTaskComplete] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const root = nodes.find((node) => node.parentId === null);

  function handleReset() {
    const resetFilesystem = buildInitialFilesystem();

    setNodes(resetFilesystem.nodes);
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

    const result = runWhoami(
      input,
      nodes,
    );

    if (result.success) {
      setNodes(result.nodes);

      if (input === "whoami") {
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
      lessonNumber={18}
      title="whoami — Find the current user"
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
              whoami
            </code>{" "}
            command tells you which user is currently logged
            into the system.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            In Visualinux, the current user is{" "}
            <strong>student</strong>.
          </p>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              margin: "0 0 6px",
            }}
          >
            Example:
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
              <code>whoami</code> — show the current username
            </li>
          </ul>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              margin: "8px 0 0",
            }}
          >
            This command does not change files or directories.
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> find out which user you
          are currently logged in as.
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
          ✓ Great job! You used <strong>whoami</strong> to find
          the current user.
        </p>
      }
      filesystem={
        root ? (
          <TreeNode
            node={root}
            allNodes={nodes}
            currentDirectoryId={currentDirectoryId}
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