import { create } from "zustand";
import type { FilesystemNodeSummary } from "@visualinux/shared-types";
import type { FilesystemAnimationPlan } from "../terminal/commandPresentation.js";

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
  /** Command-specific visual instructions waiting for the filesystem panel. */
  pendingAnimationPlan: FilesystemAnimationPlan | null;

  initializeSandbox: (sandboxId: string, nodes: FilesystemNodeSummary[], currentDirectoryId: string) => void;
  setNodes: (nodes: FilesystemNodeSummary[]) => void;
  setCurrentDirectoryId: (id: string) => void;
  pushHistoryEntry: (entry: TerminalHistoryEntry) => void;
  replaceLastHistoryEntry: (entry: TerminalHistoryEntry) => void;
  clearHistory: () => void;
  queueAnimationPlan: (plan: FilesystemAnimationPlan) => void;
  clearAnimationPlan: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sandboxId: null,
  nodes: [],
  currentDirectoryId: null,
  history: [],
  pendingAnimationPlan: null,

  initializeSandbox: (sandboxId, nodes, currentDirectoryId) =>
    set({ sandboxId, nodes, currentDirectoryId, history: [], pendingAnimationPlan: null }),

  setNodes: (nodes) => set({ nodes }),

  setCurrentDirectoryId: (currentDirectoryId) => set({ currentDirectoryId }),

  pushHistoryEntry: (entry) => set((state) => ({ history: [...state.history, entry] })),

  replaceLastHistoryEntry: (entry) =>
    set((state) => ({ history: [...state.history.slice(0, -1), entry] })),

  clearHistory: () => set({ history: [] }),

  queueAnimationPlan: (plan) => set({ pendingAnimationPlan: plan }),

  clearAnimationPlan: () => set({ pendingAnimationPlan: null }),
}));
