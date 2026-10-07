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
  runHead,
} from "./localHeadFilesystem.js";

export function HeadLessonPage() {
  const initial = buildInitialFilesystem();

  const [nodes] = useState<FilesystemNodeSummary[]>(
    initial.nodes,
  );

  const [currentDirectoryId] = useState(initial.studentId);
  const [history, setHistory] = useState<LessonHistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [taskComplete, setTaskComplete] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const root = nodes.find((node) => node.parentId === null);

  function handleReset() {
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

    const result = runHead(
      input,
      nodes,
     // currentDirectoryId,
    );

    if (
      result.success &&
      input === "head notes.txt"
    ) {
      setTaskComplete(true);
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
      lessonNumber={11}
      title="head — Read the beginning of a file"
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
              head
            </code>{" "}
            command displays the beginning of a file.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            By default,{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>
              head
            </code>{" "}
            shows the first 10 lines of a file.
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
              head &lt;filename&gt;
            </code>
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> use{" "}
          <code>head</code> to display the beginning of{" "}
          <code>notes.txt</code>.
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
          ✓ Great job! You used <strong>head</strong> to read
          the beginning of a file.
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