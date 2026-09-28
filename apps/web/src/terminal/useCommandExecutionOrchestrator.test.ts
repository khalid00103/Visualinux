import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCommandExecutionOrchestrator } from "./useCommandExecutionOrchestrator.js";
import { useSessionStore } from "../store/sessionStore.js";
import { useAuthStore } from "../store/authStore.js";
import { ApiError } from "../api/client.js";
import { terminalApi } from "../api/terminalApi.js";
import type { CommandExecutionResponse, FilesystemNodeSummary } from "@visualinux/shared-types";

vi.mock("../api/terminalApi.js", () => ({
  terminalApi: { executeCommand: vi.fn() },
}));

function homeNode(): FilesystemNodeSummary {
  return {
    nodeId: "home-id",
    parentId: null,
    nodeType: "directory",
    name: "home",
    permissions: "rwxr-xr-x",
    owner: "user",
    groupOwner: "user",
    hasContent: false,
    currentDirectory: true,
  };
}

function emptyResponse(overrides: Partial<CommandExecutionResponse> = {}): CommandExecutionResponse {
  return {
    success: true,
    outputText: "",
    errorType: null,
    suggestion: null,
    diff: { nodesCreated: [], nodesDeleted: [], nodesMoved: [], nodesModified: [] },
    animationEvents: [],
    lessonStepResult: null,
    commandHistoryId: "hist-1",
    newCurrentDirectoryId: null,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: "fake-token", user: null, isInitializing: false });
  useSessionStore.getState().initializeSandbox("sandbox-1", [homeNode()], "home-id");
});

describe("useCommandExecutionOrchestrator — optimistic apply", () => {
  it("applies a structural command's effect to the store immediately, before the server responds", async () => {
    const pending = deferred<CommandExecutionResponse>();
    vi.mocked(terminalApi.executeCommand).mockReturnValue(pending.promise);

    const { result } = renderHook(() => useCommandExecutionOrchestrator());

    act(() => {
      void result.current.execute("mkdir project");
    });

    await waitFor(() => {
      expect(useSessionStore.getState().nodes.some((n) => n.name === "project")).toBe(true);
    });

    pending.resolve(emptyResponse());
  });

  it("reconciles to the server's authoritative diff even when it disagrees with the optimistic guess (different id)", async () => {
    const pending = deferred<CommandExecutionResponse>();
    vi.mocked(terminalApi.executeCommand).mockReturnValue(pending.promise);

    const { result } = renderHook(() => useCommandExecutionOrchestrator());

    act(() => {
      void result.current.execute("mkdir project");
    });

    await waitFor(() => {
      expect(useSessionStore.getState().nodes.some((n) => n.name === "project")).toBe(true);
    });
    const optimisticId = useSessionStore.getState().nodes.find((n) => n.name === "project")!.nodeId;

    const serverNode: FilesystemNodeSummary = {
      nodeId: "server-real-id",
      parentId: "home-id",
      nodeType: "directory",
      name: "project",
      permissions: "rwxr-xr-x",
      owner: "user",
      groupOwner: "user",
      hasContent: false,
      currentDirectory: false,
    };

    act(() => {
      pending.resolve(emptyResponse({ diff: { nodesCreated: [serverNode], nodesDeleted: [], nodesMoved: [], nodesModified: [] } }));
    });

    await waitFor(() => {
      const nodes = useSessionStore.getState().nodes;
      expect(nodes.some((n) => n.nodeId === "server-real-id")).toBe(true);
      expect(nodes.some((n) => n.nodeId === optimisticId)).toBe(false);
    });
  });

  it("skips optimistic apply entirely for content-reading commands, since there is no content to simulate against", async () => {
    const pending = deferred<CommandExecutionResponse>();
    vi.mocked(terminalApi.executeCommand).mockReturnValue(pending.promise);

    const { result } = renderHook(() => useCommandExecutionOrchestrator());
    const nodesBefore = useSessionStore.getState().nodes;

    act(() => {
      void result.current.execute("cat notes.txt");
    });

    expect(useSessionStore.getState().nodes).toBe(nodesBefore);

    act(() => {
      pending.resolve(emptyResponse({ outputText: "file contents" }));
    });

    await waitFor(() => {
      expect(useSessionStore.getState().history.at(-1)?.outputText).toBe("file contents");
    });
  });
});

describe("useCommandExecutionOrchestrator — failure handling", () => {
  it("rolls back the optimistic update entirely on a network failure", async () => {
    vi.mocked(terminalApi.executeCommand).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useCommandExecutionOrchestrator());
    const nodesBefore = useSessionStore.getState().nodes;

    await act(async () => {
      await result.current.execute("mkdir project");
    });

    expect(useSessionStore.getState().nodes).toEqual(nodesBefore);
    expect(useSessionStore.getState().history.at(-1)?.success).toBe(false);
  });

  it("sets pendingConfirmation instead of applying anything when the server requires confirmation", async () => {
    vi.mocked(terminalApi.executeCommand).mockRejectedValue(
      new ApiError(409, "CONFLICT", "This will permanently delete project.")
    );

    const { result } = renderHook(() => useCommandExecutionOrchestrator());
    const nodesBefore = useSessionStore.getState().nodes;

    await act(async () => {
      await result.current.execute("rm project", false);
    });

    expect(result.current.pendingConfirmation).toEqual({
      rawInput: "rm project",
      consequenceMessage: "This will permanently delete project.",
    });
    expect(useSessionStore.getState().nodes).toEqual(nodesBefore);
  });
});
