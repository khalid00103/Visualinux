import { create } from "zustand";
import type { UserProfile } from "@visualinux/shared-types";

interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  isInitializing: boolean;
  setSession: (accessToken: string, user: UserProfile) => void;
  clearSession: () => void;
  setInitializing: (value: boolean) => void;
}

/**
 * Deliberately holds the access token in memory only, not localStorage — an XSS
 * that can read arbitrary JS state could steal it either way, but keeping it out
 * of persistent storage at least means a full page reload never has a stale
 * token lying around. The refresh token never touches JS at all; it's an
 * httpOnly cookie the browser attaches automatically (Architecture §5).
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitializing: true,
  setSession: (accessToken, user) => set({ accessToken, user, isInitializing: false }),
  clearSession: () => set({ accessToken: null, user: null, isInitializing: false }),
  setInitializing: (value) => set({ isInitializing: value }),
}));
