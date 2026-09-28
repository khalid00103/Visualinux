import { create } from "zustand";
import type { AnimationEvent, FilesystemNodeSummary } from "@visualinux/shared-types";

export interface TerminalHistoryEntry {
  rawInput: string;
  outputText: string;
  success: boolean;
  /** True only for the brief window between optimistic apply and server reconciliation. */
  isPending: boolean;
}

interface SessionState {
  sandboxId: string | null;
  nodes: FilesystemNodeSummary[];
  currentDirectoryId: string | null;
  history: TerminalHistoryEntry[];
  /**
   * Queued here for Milestone 5's Animation Engine to consume and clear. This
   * milestone's Filesystem Panel renders nodes appearing/disappearing directly
   * (Component Hierarchy §3's explicit scope note: "without full animation
   * choreography yet") but still populates this queue now, since the event
   * stream itself — not just its eventual consumer — is part of what this
   * milestone establishes.
   */
  pendingAnimationEvents: AnimationEvent[];

  initializeSandbox: (sandboxId: string, nodes: FilesystemNodeSummary[], currentDirectoryId: string) => void;
  setNodes: (nodes: FilesystemNodeSummary[]) => void;
  setCurrentDirectoryId: (id: string) => void;
  pushHistoryEntry: (entry: TerminalHistoryEntry) => void;
  replaceLastHistoryEntry: (entry: TerminalHistoryEntry) => void;
  queueAnimationEvents: (events: AnimationEvent[]) => void;
  clearAnimationEvents: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sandboxId: null,
  nodes: [],
  currentDirectoryId: null,
  history: [],
  pendingAnimationEvents: [],

  initializeSandbox: (sandboxId, nodes, currentDirectoryId) =>
    set({ sandboxId, nodes, currentDirectoryId, history: [], pendingAnimationEvents: [] }),

  setNodes: (nodes) => set({ nodes }),

  setCurrentDirectoryId: (currentDirectoryId) => set({ currentDirectoryId }),

  pushHistoryEntry: (entry) => set((state) => ({ history: [...state.history, entry] })),

  replaceLastHistoryEntry: (entry) =>
    set((state) => ({ history: [...state.history.slice(0, -1), entry] })),

  queueAnimationEvents: (events) =>
    set((state) => ({ pendingAnimationEvents: [...state.pendingAnimationEvents, ...events] })),

  clearAnimationEvents: () => set({ pendingAnimationEvents: [] }),
}));
