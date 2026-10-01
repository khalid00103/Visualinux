import {
  useRef,
  useState,
} from "react";
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
  runCd,
} from "./localCdFilesystem.js";

export function CdLessonPage() {
  const initial = buildInitialFilesystem();

  const [nodes] = useState<
    FilesystemNodeSummary[]
  >(initial.nodes);

  const [currentDirectoryId, setCurrentDirectoryId] =
    useState(initial.studentId);

  const [history, setHistory] = useState<
    LessonHistoryEntry[]
  >([]);

  const [draft, setDraft] = useState("");

  const [taskComplete, setTaskComplete] =
    useState(false);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const root = nodes.find(
    (node) => node.parentId === null,
  );

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
    setCurrentDirectoryId(initial.studentId);
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

    const result = runCd(
      input,
      nodes,
      currentDirectoryId,
    );

    if (result.success) {
      setCurrentDirectoryId(
        result.currentDirectoryId,
      );
    }

    let output = result.message;

    if (result.success) {
      const newPath = getCurrentPath(
        result.currentDirectoryId,
      );

      output = [
        result.message,
        "",
        "Current directory:",
        newPath,
      ].join("\n");

      if (
        newPath ===
        "/home/student/documents"
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
      lessonNumber={4}
      title="cd — Change directory"
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
              cd
            </code>{" "}
            command changes your current
            directory.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            Think of it as moving yourself into
            another folder.
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
              cd &lt;directory-name&gt;
            </code>
          </p>
        </>
      }
      task={
        <>
          <strong>Your turn:</strong> move into{" "}
          <code>documents</code>
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
          ✓ Great job! You moved into the{" "}
          <strong>documents</strong> directory.
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